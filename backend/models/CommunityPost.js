const mongoose = require('mongoose');

// Comments are embedded so a post and its replies are read and removed together
const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, trim: true, default: '' },
    authorRole: { type: String, trim: true, default: '' },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    image: { type: String, default: null },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const TOPICS = [
  'crop-disease',
  'pests',
  'soil',
  'irrigation',
  'fertilizer',
  'farming-methods',
  'crop-management',
  'weather',
  'general',
];

const MAX_POST_IMAGES = 5;

const communityPostSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorName: { type: String, trim: true, default: '' },
    authorRole: { type: String, trim: true, default: '' },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    body: { type: String, required: true, trim: true, maxlength: 10000 },
    topic: { type: String, enum: TOPICS, default: 'general', index: true },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (value) => value.length <= MAX_POST_IMAGES,
        message: `A post can have at most ${MAX_POST_IMAGES} images`,
      },
    },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
    comments: { type: [commentSchema], default: [] },
    commentCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Backs knowledge-hub search across title, body and topic.
communityPostSchema.index({ title: 'text', body: 'text', topic: 'text' });
communityPostSchema.index({ createdAt: -1 });

communityPostSchema.statics.TOPICS = TOPICS;
communityPostSchema.statics.MAX_POST_IMAGES = MAX_POST_IMAGES;

module.exports = mongoose.model('CommunityPost', communityPostSchema);
