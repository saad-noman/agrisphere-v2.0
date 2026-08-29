const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const CommunityPost = require('../models/CommunityPost');
const sendError = require('../utils/sendError');

const TOPICS = CommunityPost.TOPICS;
const MAX_POST_IMAGES = CommunityPost.MAX_POST_IMAGES;

// Escapes user input before using it in a regex search
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Maps uploaded files to their public paths
function toImagePaths(files) {
  const paths = [];
  if (!files) return paths;

  for (let i = 0; i < files.length; i++) {
    paths.push(`/uploads/community/${files[i].filename}`);
  }

  return paths;
}

// Removes attachment files from storage
function removeImageFiles(imagePaths) {
  if (!imagePaths) return;

  for (let i = 0; i < imagePaths.length; i++) {
    const imagePath = imagePaths[i];
    if (!imagePath) continue;

    const relativePath = String(imagePath).replace(/^\//, '');
    const fullPath = path.join(__dirname, '..', relativePath);

    fs.unlink(fullPath, () => {});
  }
}

// Discards uploads that were rejected before being saved to a post
function discardUploads(files) {
  if (!files) return;

  for (let i = 0; i < files.length; i++) {
    fs.unlink(files[i].path, () => {});
  }
}

// Shapes a post for list views, without its comments
function shapeSummary(post, meId) {
  let isOwner = false;
  if (meId) {
    isOwner = String(post.author) === String(meId);
  }

  let commentCount = post.commentCount;
  if (commentCount === undefined || commentCount === null) {
    commentCount = post.comments ? post.comments.length : 0;
  }

  return {
    _id: post._id,
    title: post.title,
    body: post.body,
    topic: post.topic,
    images: post.images || [],
    author: post.author,
    authorName: post.authorName,
    authorRole: post.authorRole,
    edited: Boolean(post.edited),
    editedAt: post.editedAt || null,
    commentCount,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    isOwner,
  };
}

// Shapes a comment for the client
function shapeComment(comment, meId) {
  let isOwner = false;
  if (meId) {
    isOwner = String(comment.author) === String(meId);
  }

  return {
    _id: comment._id,
    author: comment.author,
    authorName: comment.authorName,
    authorRole: comment.authorRole,
    content: comment.content,
    image: comment.image || null,
    edited: Boolean(comment.edited),
    editedAt: comment.editedAt || null,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    isOwner,
  };
}

// GET /api/community/posts
// Lists and searches discussions
const listPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const search = String(req.query.search || '').trim();
    const topic = String(req.query.topic || '').trim();

    const filter = {};
    if (topic && TOPICS.includes(topic)) filter.topic = topic;

    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ title: rx }, { body: rx }, { topic: rx }];
    }

    const [posts, total] = await Promise.all([
      CommunityPost.find(filter)
        .select('-comments')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CommunityPost.countDocuments(filter),
    ]);

    const meId = req.user ? req.user._id : undefined;

    const shapedPosts = [];
    for (let i = 0; i < posts.length; i++) {
      shapedPosts.push(shapeSummary(posts[i], meId));
    }

    res.json({
      posts: shapedPosts,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      topics: TOPICS,
    });
  } catch (err) {
    sendError(res, 500, 'Failed to load discussions', err);
  }
};

// GET /api/community/posts/:id
const getPost = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid post id' });
    }
    const post = await CommunityPost.findById(req.params.id).lean();
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const meId = req.user ? req.user._id : undefined;

    const comments = post.comments || [];
    const shapedComments = [];
    for (let i = 0; i < comments.length; i++) {
      shapedComments.push(shapeComment(comments[i], meId));
    }

    res.json({
      ...shapeSummary(post, meId),
      comments: shapedComments,
    });
  } catch (err) {
    sendError(res, 500, 'Failed to load discussion', err);
  }
};

// POST /api/community/posts
const createPost = async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    const topic = TOPICS.includes(req.body?.topic) ? req.body.topic : 'general';

    if (title.length < 5) {
      discardUploads(req.files);
      return res.status(400).json({ message: 'Title must be at least 5 characters' });
    }
    if (body.length < 10) {
      discardUploads(req.files);
      return res.status(400).json({ message: 'Description must be at least 10 characters' });
    }
    if ((req.files || []).length > MAX_POST_IMAGES) {
      discardUploads(req.files);
      return res.status(400).json({ message: `A post can have at most ${MAX_POST_IMAGES} images` });
    }

    const post = await CommunityPost.create({
      author: req.user._id,
      authorName: req.user.name,
      authorRole: req.user.role,
      title: title.slice(0, 180),
      body: body.slice(0, 10000),
      topic,
      images: toImagePaths(req.files),
    });

    res.status(201).json(shapeSummary(post.toObject(), req.user._id));
  } catch (err) {
    discardUploads(req.files);
    sendError(res, 500, 'Failed to create discussion', err);
  }
};

// Loads a post and confirms the requesting user authored it
async function loadOwnedPost(id, userId) {
  if (!mongoose.isValidObjectId(id)) return { error: 400, message: 'Invalid post id' };
  const post = await CommunityPost.findById(id);
  if (!post) return { error: 404, message: 'Post not found' };
  if (post.author.toString() !== userId.toString()) {
    return { error: 403, message: 'You can only modify your own posts' };
  }
  return { post };
}

// PUT /api/community/posts/:id
const updatePost = async (req, res) => {
  try {
    const { post, error, message } = await loadOwnedPost(req.params.id, req.user._id);
    if (error) {
      discardUploads(req.files);
      return res.status(error).json({ message });
    }

    if (req.body?.title !== undefined) {
      const title = String(req.body.title).trim();
      if (title.length < 5) {
        discardUploads(req.files);
        return res.status(400).json({ message: 'Title must be at least 5 characters' });
      }
      post.title = title.slice(0, 180);
    }
    if (req.body?.body !== undefined) {
      const body = String(req.body.body).trim();
      if (body.length < 10) {
        discardUploads(req.files);
        return res.status(400).json({ message: 'Description must be at least 10 characters' });
      }
      post.body = body.slice(0, 10000);
    }
    if (req.body?.topic !== undefined && TOPICS.includes(req.body.topic)) {
      post.topic = req.body.topic;
    }

    // Images the author chose to keep, plus any newly uploaded ones
    const existing = post.images || [];
    let keptImages = existing;
    if (req.body?.keepImages !== undefined) {
      const raw = req.body.keepImages;
      const requested = Array.isArray(raw) ? raw : String(raw).split(',');
      const wanted = [];
      for (let i = 0; i < requested.length; i++) {
        const value = String(requested[i]).trim();
        if (value) {
          wanted.push(value);
        }
      }

      keptImages = [];
      for (let i = 0; i < existing.length; i++) {
        if (wanted.includes(existing[i])) {
          keptImages.push(existing[i]);
        }
      }
    }

    const added = toImagePaths(req.files);
    if (keptImages.length + added.length > MAX_POST_IMAGES) {
      discardUploads(req.files);
      return res.status(400).json({ message: `A post can have at most ${MAX_POST_IMAGES} images` });
    }

    const removed = [];
    for (let i = 0; i < existing.length; i++) {
      if (!keptImages.includes(existing[i])) {
        removed.push(existing[i]);
      }
    }
    post.images = [...keptImages, ...added];

    post.edited = true;
    post.editedAt = new Date();
    await post.save();

    removeImageFiles(removed);
    res.json(shapeSummary(post.toObject(), req.user._id));
  } catch (err) {
    discardUploads(req.files);
    sendError(res, 500, 'Failed to update discussion', err);
  }
};

// DELETE /api/community/posts/:id
// Removes the post with its comments and every attached image
const deletePost = async (req, res) => {
  try {
    const { post, error, message } = await loadOwnedPost(req.params.id, req.user._id);
    if (error) return res.status(error).json({ message });

    // Collect the post's own images plus every comment's image
    const attachments = [];

    const postImages = post.images || [];
    for (let i = 0; i < postImages.length; i++) {
      attachments.push(postImages[i]);
    }

    const comments = post.comments || [];
    for (let i = 0; i < comments.length; i++) {
      attachments.push(comments[i].image);
    }

    await post.deleteOne();
    removeImageFiles(attachments);

    res.json({ message: 'Discussion deleted' });
  } catch (err) {
    sendError(res, 500, 'Failed to delete discussion', err);
  }
};

// POST /api/community/posts/:id/comments
const addComment = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      discardUploads(req.file ? [req.file] : []);
      return res.status(400).json({ message: 'Invalid post id' });
    }
    const content = String(req.body?.content || '').trim();
    if (!content) {
      discardUploads(req.file ? [req.file] : []);
      return res.status(400).json({ message: 'Comment cannot be empty' });
    }
    if (content.length > 5000) {
      discardUploads(req.file ? [req.file] : []);
      return res.status(400).json({ message: 'Comment is too long' });
    }

    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      discardUploads(req.file ? [req.file] : []);
      return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push({
      author: req.user._id,
      authorName: req.user.name,
      authorRole: req.user.role,
      content,
      image: req.file ? `/uploads/community/${req.file.filename}` : null,
    });
    post.commentCount = post.comments.length;
    await post.save();

    const created = post.comments[post.comments.length - 1];
    res.status(201).json(shapeComment(created, req.user._id));
  } catch (err) {
    discardUploads(req.file ? [req.file] : []);
    sendError(res, 500, 'Failed to add comment', err);
  }
};

// PUT /api/community/posts/:id/comments/:commentId
const updateComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(commentId)) {
      discardUploads(req.file ? [req.file] : []);
      return res.status(400).json({ message: 'Invalid id' });
    }

    const post = await CommunityPost.findById(id);
    if (!post) {
      discardUploads(req.file ? [req.file] : []);
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      discardUploads(req.file ? [req.file] : []);
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Only the comment's author may edit it
    if (comment.author.toString() !== req.user._id.toString()) {
      discardUploads(req.file ? [req.file] : []);
      return res.status(403).json({ message: 'You can only edit your own comments' });
    }

    if (req.body?.content !== undefined) {
      const content = String(req.body.content).trim();
      if (!content) {
        discardUploads(req.file ? [req.file] : []);
        return res.status(400).json({ message: 'Comment cannot be empty' });
      }
      comment.content = content.slice(0, 5000);
    }

    // A new upload replaces the old file; removeImage clears it
    const previousImage = comment.image;
    let removedImage = null;
    if (req.file) {
      comment.image = `/uploads/community/${req.file.filename}`;
      removedImage = previousImage;
    } else if (String(req.body?.removeImage) === 'true') {
      comment.image = null;
      removedImage = previousImage;
    }

    comment.edited = true;
    comment.editedAt = new Date();
    await post.save();

    if (removedImage) removeImageFiles([removedImage]);
    res.json(shapeComment(comment, req.user._id));
  } catch (err) {
    discardUploads(req.file ? [req.file] : []);
    sendError(res, 500, 'Failed to update comment', err);
  }
};

// DELETE /api/community/posts/:id/comments/:commentId
// Removes the comment and its attached image
const deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const post = await CommunityPost.findById(id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const isCommentAuthor = comment.author.toString() === req.user._id.toString();
    const isPostAuthor = post.author.toString() === req.user._id.toString();
    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }

    const attachedImage = comment.image;
    comment.deleteOne();
    post.commentCount = post.comments.length;
    await post.save();

    if (attachedImage) removeImageFiles([attachedImage]);
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    sendError(res, 500, 'Failed to delete comment', err);
  }
};

module.exports = {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  addComment,
  updateComment,
  deleteComment,
};
