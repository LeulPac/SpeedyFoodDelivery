const express = require('express');
const router = express.Router();
const { register, registerDriver, updateDriver, deleteDriver, login, googleLogin, me } = require('../controllers/authController');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/register-driver', verifyToken, verifyRole(['owner']), registerDriver);
router.put('/drivers/:id', verifyToken, verifyRole(['owner']), updateDriver);
router.delete('/drivers/:id', verifyToken, verifyRole(['owner']), deleteDriver);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', verifyToken, me);

module.exports = router;
