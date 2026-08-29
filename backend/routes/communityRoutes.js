const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const {
  communityUpload,
  communityCommentUpload,
  verifyImageContent,
} = require('../middleware/uploadMiddleware');
const {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  addComment,
  updateComment,
  deleteComment,
} = require('../controllers/communityController');

// Reading is open; writing and deleting require a session
router.get('/posts', optionalProtect, listPosts);
router.get('/posts/:id', optionalProtect, getPost);

router.post('/posts', protect, communityUpload.array('images', 5), verifyImageContent, createPost);
router.put('/posts/:id', protect, communityUpload.array('images', 5), verifyImageContent, updatePost);
router.delete('/posts/:id', protect, deletePost);

router.post('/posts/:id/comments', protect, communityCommentUpload.single('image'), verifyImageContent, addComment);
router.put('/posts/:id/comments/:commentId', protect, communityCommentUpload.single('image'), verifyImageContent, updateComment);
router.delete('/posts/:id/comments/:commentId', protect, deleteComment);

module.exports = router;
