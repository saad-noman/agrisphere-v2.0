const mongoose = require('mongoose');

// A private 1-to-1 conversation between two users (farmer <-> expert)
const conversationSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ],
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date },
    lastSender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

// Fast lookup of a user's conversations, most recent first.
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
