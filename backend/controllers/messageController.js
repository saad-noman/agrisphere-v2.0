const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Expert = require('../models/Expert');
const Notification = require('../models/Notification');
const sendError = require('../utils/sendError');

// True when the user takes part in the conversation
function isParticipant(conversation, userId) {
  for (let i = 0; i < conversation.participants.length; i++) {
    if (conversation.participants[i].toString() === userId.toString()) {
      return true;
    }
  }

  return false;
}

// To shape a conversation for the requesting user (other participant + their unread count)
async function shapeConversation(conversation, meId) {
  // The other participant is whoever in the pair is not me
  let otherId = null;
  for (let i = 0; i < conversation.participants.length; i++) {
    if (conversation.participants[i].toString() !== meId.toString()) {
      otherId = conversation.participants[i];
      break;
    }
  }

  let other = null;
  if (otherId) {
    other = await User.findById(otherId).select('name role profileImage').lean();
  }

  let otherProfileImage = null;
  if (other && other.profileImage) {
    otherProfileImage = other.profileImage;
  }

  let expertId = null;
  if (other && other.role === 'expert') {
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
    // Collect everyone this user already has a conversation with
    const alreadyMessaged = new Set();
    for (let i = 0; i < existingConversations.length; i++) {
      const participants = existingConversations[i].participants;

      for (let j = 0; j < participants.length; j++) {
        const participantId = participants[j].toString();

        if (participantId !== req.user._id.toString()) {
          alreadyMessaged.add(participantId);
        }
      }
    }

    const experts = await Expert.find({ userId: { $ne: null } })
      .select('fullName specialization expertiseCategory address profileImage userId availabilityStatus')
      .sort({ fullName: 1 })
      .lean();

    // Keep only experts who are someone else and not already messaged
    const list = [];
    for (let i = 0; i < experts.length; i++) {
      const expert = experts[i];

      if (!expert.userId) continue;

      const expertUserId = expert.userId.toString();
      if (expertUserId === req.user._id.toString()) continue;
      if (alreadyMessaged.has(expertUserId)) continue;

      list.push(expert);
    }
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

    // Conversations are between farmers and experts, in any combination.
    // Farmer-to-farmer is allowed so a marketplace buyer can contact a seller.
    const pairRoles = [req.user.role, target.role];

    let bothAllowed = true;
    for (let i = 0; i < pairRoles.length; i++) {
      const role = pairRoles[i];
      if (role !== 'farmer' && role !== 'expert') bothAllowed = false;
    }

    const validPair = bothAllowed;
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
  if (!mongoose.isValidObjectId(conversationId)) {
    return { error: 400, message: 'Invalid conversation id' };
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    return { error: 404, message: 'Conversation not found' };
  }

  if (!isParticipant(conversation, userId)) {
    return { error: 403, message: 'Not authorized for this conversation' };
  }

  return { conversation };
}

// GET /api/messages/conversations/:id/messages
// To get a conversation's messages and mark them read for the current user
const getMessages = async (req, res) => {
  try {
    const { conversation, error, message } = await loadAuthorizedConversation(req.params.id, req.user._id);
    if (error) return res.status(error).json({ message });

    const raw = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .limit(500)
      .lean();

    // Removed messages keep their place without exposing the original text
    const messages = [];
    for (let i = 0; i < raw.length; i++) {
      const message = raw[i];

      if (message.deleted) {
        messages.push({ ...message, text: '', deleted: true });
      } else {
        messages.push(message);
      }
    }

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

// DELETE /api/messages/messages/:messageId
// To remove one of the current user's own messages (soft delete)
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ message: 'Invalid message id' });
    }

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    // Only the sender may remove their own message.
    if (msg.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    const conversation = await Conversation.findById(msg.conversation);
    if (!conversation || !isParticipant(conversation, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized for this conversation' });
    }

    if (!msg.deleted) {
      msg.deleted = true;
      msg.deletedAt = new Date();
      msg.text = '';
      await msg.save();

      // Refresh the preview if this was the last message
      const latest = await Message.findOne({ conversation: conversation._id })
        .sort({ createdAt: -1 })
        .lean();
      if (latest && latest._id.toString() === msg._id.toString()) {
        conversation.lastMessage = 'Message removed';
        await conversation.save();
      }
    }

    res.json({ _id: msg._id, deleted: true, deletedAt: msg.deletedAt, text: '' });
  } catch (err) {
    sendError(res, 500, 'Failed to delete message', err);
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
    // Add up my unread count across every conversation
    let total = 0;
    for (let i = 0; i < conversations.length; i++) {
      const unreadCounts = conversations[i].unreadCounts || {};

      let count;
      if (unreadCounts instanceof Map) {
        count = unreadCounts.get(meId);
      } else {
        count = unreadCounts[meId];
      }

      if (count) {
        total = total + count;
      }
    }
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
  deleteMessage,
  getUnreadCount,
};
