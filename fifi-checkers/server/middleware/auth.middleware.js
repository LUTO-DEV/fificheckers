const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findOne({ telegramId: decoded.telegramId });

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user;
        req.telegramId = decoded.telegramId;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
}

function socketAuthMiddleware(socket, next) {
    try {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.telegramId = decoded.telegramId;
        socket.username = decoded.username;

        next();
    } catch (error) {
        console.error('Socket auth error:', error);
        next(new Error('Authentication failed'));
    }
}

module.exports = { authMiddleware, socketAuthMiddleware };