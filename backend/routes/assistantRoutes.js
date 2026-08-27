const express = require('express');
const router = express.Router();
const { optionalProtect } = require('../middleware/authMiddleware');
const { chat } = require('../controllers/assistantController');

// Works for guests too — optionalProtect just attaches a user if logged in
router.post('/chat', optionalProtect, chat);

module.exports = router;
