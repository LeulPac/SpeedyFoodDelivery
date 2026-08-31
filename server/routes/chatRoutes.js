const express = require('express');
const router = express.Router();
const { getChatHistory, sendMessage } = require('../controllers/chatController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/:order_id', verifyToken, getChatHistory);
router.post('/', verifyToken, sendMessage);

module.exports = router;
