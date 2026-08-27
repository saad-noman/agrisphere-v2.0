const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Expert = require('../models/Expert');
const Notification = require('../models/Notification');
const sendError = require('../utils/sendError');

const isParticipant = (conversation, userId) =>
  conversation.participants.some((p) => p.toString() === userId.toString());

// To shape a conversation for the requesting user (other participant + their unread count)
async function shapeConversation(conversation, meId) {
  const otherId = conversation.participants.find((p) => p.toString() !== meId.toString());
  const other = otherId ? await User.findById(otherId).select('name role profileImage').lean() : null;

  let otherProfileImage = other?.profileImage || null;
  let expertId = null;
  if (other?.role === 'expert') {
    const expert = await Expert.findOne({ userId: otherId }).select('profileImage _id').lean();
    if (expert) {
      expertId = expert._id;
      if (expert.profileImage) otherProfileImage = expert.profileImage;
    }
  }

  const unread =
    (conversation.unreadCounts && conversation.unreadCounts.get
      ? conversation.unreadCounts.get(meId.toString())
      : conversation.unreadCounts?.[meId.toString()]) || 0;

  return {
    _id: conversation._id,
    otherUser: other
      ? { _id: otherId, name: other.name, role: other.role, profileImage: otherProfileImage, expertId }
      : null,
    lastMessage: conversation.lastMessage,
    lastMessageAt: conversation.lastMessageAt,
    lastSender: conversation.lastSender,
    unread,
    updatedAt: conversation.updatedAt,
  };
}

// GET /api/messages/experts
// To get the experts the current user can start a new conversation with (never messaged before)
const getEligibleExperts = async (req, res) => {
  try {
    const existingConversations = await Conversation.find({ participants: req.user._id })
      .select('participants')
      .lean();
    const alreadyMessaged = new Set();
    existingConversations.forEach((c) => {
      c.participants.forEach((p) => {
        if (p.toString() !== req.user._id.toString()) alreadyMessaged.add(p.toString());
      });
    });

    const experts = await Expert.find({ userId: { $ne: null } })
      .select('fullName specialization expertiseCategory district upazila profileImage userId availabilityStatus')
      .sort({ fullName: 1 })
      .lean();

    const list = experts.filter(
      (e) =>
        e.userId &&
        e.userId.toString() !== req.user._id.toString() &&
        !alreadyMessaged.has(e.userId.toString())
    );
    res.json(list);
  } catch (err) {
    sendError(res, 500, 'Failed to load experts', err);
  }
};

// To resolve a target user id from either a userId or an expertId
async function resolveTargetUserId(body) {
  if (body.userId && mongoose.isValidObjectId(body.userId)) return body.userId;
  if (body.expertId && mongoose.isValidObjectId(body.expertId)) {
    const expert = await Expert.findById(body.expertId).select('userId').lean();
    return expert?.userId || null;
  }
  return null;
}

// POST /api/messages/conversations
// To start (or reuse) a conversation between the current user and a recipient
const startConversation = async (req, res) => {
  try {
    const targetUserId = await resolveTargetUserId(req.body || {});
    if (!targetUserId) return res.status(400).json({ message: 'A valid recipient is required' });
    if (targetUserId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot message yourself' });
    }

    const target = await User.findById(targetUserId).select('role').lean();
    if (!target) return res.status(404).json({ message: 'Recipient not found' });

    const pairRoles = [req.user.role, target.role];
    const validPair = pairRoles.includes('expert') && pairRoles.some((r) => r === 'farmer' || r === 'expert');
    if (!validPair) {
      return res.status(403).json({ message: 'Messaging is available between farmers and experts' });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, targetUserId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, targetUserId],
        unreadCounts: {},
      });
    }

    res.json(await shapeConversation(conversation, req.user._id));
  } catch (err) {
    sendError(res, 500, 'Failed to start conversation', err);
  }
};

// GET /api/messages/conversations
// To list the current user's conversations
const listConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(100);

    const shaped = await Promise.all(conversations.map((c) => shapeConversation(c, req.user._id)));
    res.json(shaped);
  } catch (err) {
    sendError(res, 500, 'Failed to load conversations', err);
  }
};

// To load a conversation only if the requesting user is a participant
async function loadAuthorizedConversation(conversationId, userId) {
  if (!mongoose.isValidObjectId(conversationId)) return { error: 400, message: 'Invalid conversation id' };
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return { error: 404, message: 'Conversation not found' };
  if (!isParticipant(conversation, userId)) return { error: 403, message: 'Not authorized for this conversation' };
  return { conversation };
}

// GET /api/messages/conversations/:id/messages
// To get a conversation's messages and mark them read for the current user
const getMessages = async (req, res) => {
  try {
    const { conversation, error, message } = await loadAuthorizedConversation(req.params.id, req.user._id);
    if (error) return res.status(error).json({ message });

    const messages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();

    await Message.updateMany(
      { conversation: conversation._id, sender: { $ne: req.user._id }, read: false },
      { read: true }
    );
    conversation.unreadCounts.set(req.user._id.toString(), 0);
    await conversation.save();

    res.json({
      conversation: await shapeConversation(conversation, req.user._id),
      messages,
    });
  } catch (err) {
    sendError(res, 500, 'Failed to load messages', err);
  }
};

// POST /api/messages/conversations/:id/messages
// To send a message in a conversation and notify the recipient
const sendMessage = async (req, res) => {
  try {
    const text = (req.body?.text || '').toString().trim();
    if (!text) return res.status(400).json({ message: 'Message text is required' });
    if (text.length > 5000) return res.status(400).json({ message: 'Message is too long' });

    const { conversation, error, message } = await loadAuthorizedConversation(req.params.id, req.user._id);
    if (error) return res.status(error).json({ message });

    const created = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      text,
    });

    const otherId = conversation.participants.find((p) => p.toString() !== req.user._id.toString());

    conversation.lastMessage = text.slice(0, 200);
    conversation.lastMessageAt = created.createdAt;
    conversation.lastSender = req.user._id;
    if (otherId) {
      const key = otherId.toString();
      conversation.unreadCounts.set(key, (conversation.unreadCounts.get(key) || 0) + 1);
    }
    await conversation.save();

    if (otherId) {
      await Notification.create({
        userId: otherId,
        message: `New message from ${req.user.name}`,
        link: '/messages',
      });
    }

    res.status(201).json(created);
  } catch (err) {
    sendError(res, 500, 'Failed to send message', err);
  }
};

// GET /api/messages/unread-count
// To get the current user's total unread message count for the navbar badge
const getUnreadCount = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .select('unreadCounts')
      .lean();
    const meId = req.user._id.toString();
    const total = conversations.reduce((sum, c) => {
      const uc = c.unreadCounts || {};
      const n = uc instanceof Map ? uc.get(meId) : uc[meId];
      return sum + (n || 0);
    }, 0);
    res.json({ unread: total });
  } catch (err) {
    sendError(res, 500, 'Failed to load unread count', err);
  }
};

module.exports = {
  getEligibleExperts,
  startConversation,
  listConversations,
  getMessages,
  sendMessage,
  getUnreadCount,
};
