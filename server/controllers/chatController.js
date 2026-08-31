const db = require('../db');
const socketManager = require('../socket');

const getChatHistory = async (req, res) => {
    try {
        const { order_id } = req.params;
        const result = await db.query(
            'SELECT c.*, u.name as sender_name, u.role as sender_role FROM chat_messages c JOIN users u ON c.sender_id = u.id WHERE c.order_id = $1 ORDER BY c.created_at ASC',
            [order_id]
        );
        res.json(result.rows);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Server error fetching chat' });
    }
};

const sendMessage = async (req, res) => {
    try {
        const { order_id, content } = req.body;
        const sender_id = req.user.id;

        // Save to postgres
        const result = await db.query(
            'INSERT INTO chat_messages (order_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
            [order_id, sender_id, content]
        );
        const newMessage = result.rows[0];

        // Fetch sender details for the socket emit
        const userRes = await db.query('SELECT name, role FROM users WHERE id = $1', [sender_id]);
        const enrichedMessage = { ...newMessage, sender_name: userRes.rows[0].name, sender_role: userRes.rows[0].role };

        // Emit real-time event
        try { socketManager.getIo().emit('receive_message', enrichedMessage); } catch(_) {}

        res.status(201).json(enrichedMessage);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Server error sending message' });
    }
}

module.exports = { getChatHistory, sendMessage };
