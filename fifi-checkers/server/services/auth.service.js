const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateTelegramInitData, parseTelegramInitData } = require('../utils/validation.utils');
const { STARTING_COINS } = require('../utils/constants');

class AuthService {
    static async authenticateUser(initData) {
        // In development, allow mock data
        if (process.env.NODE_ENV === 'development' && initData.startsWith('mock:')) {
            const mockId = initData.split(':')[1] || '123456789';
            return this.handleMockAuth(mockId);
        }

        // Validate Telegram init data
        const isValid = validateTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN);

        if (!isValid && process.env.NODE_ENV === 'production') {
            throw new Error('Invalid Telegram authentication');
        }

        // Parse user data
        const telegramUser = parseTelegramInitData(initData);

        if (!telegramUser) {
            throw new Error('Could not parse user data');
        }

        // Find or create user
        let user = await User.findOne({ telegramId: telegramUser.telegramId });

        if (!user) {
            user = new User({
                telegramId: telegramUser.telegramId,
                username: telegramUser.username,
                avatarUrl: telegramUser.avatarUrl,
                coins: STARTING_COINS
            });
            await user.save();
        } else {
            // Update username/avatar if changed
            if (telegramUser.username !== user.username || telegramUser.avatarUrl !== user.avatarUrl) {
                user.username = telegramUser.username;
                user.avatarUrl = telegramUser.avatarUrl;
                await user.save();
            }
        }

        // Generate JWT
        const token = jwt.sign(
            {
                telegramId: user.telegramId,
                username: user.username
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return { user, token };
    }

    static async handleMockAuth(mockId) {
        let user = await User.findOne({ telegramId: mockId });

        if (!user) {
            user = new User({
                telegramId: mockId,
                username: `Player_${mockId.slice(-4)}`,
                coins: STARTING_COINS
            });
            await user.save();
        }

        const token = jwt.sign(
            {
                telegramId: user.telegramId,
                username: user.username
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return { user, token };
    }

    static verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return null;
        }
    }
}

module.exports = AuthService;