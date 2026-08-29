const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getEligibleExperts,
  startConversation,
  listConversations,
  getMessages,
  sendMessage,
  deleteMessage,
  getUnreadCount,
} = require('../controllers/messageController');

router.get('/experts', protect, getEligibleExperts);
router.get('/unread-count', protect, getUnreadCount);
router.get('/conversations', protect, listConversations);
router.post('/conversations', protect, startConversation);
router.get('/conversations/:id/messages', protect, getMessages);
router.post('/conversations/:id/messages', protect, sendMessage);
router.delete('/messages/:messageId', protect, deleteMessage);

module.exports = router;
