const crypto = require('crypto');

function validateTelegramInitData(initData, botToken) {
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');

        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();

        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        return calculatedHash === hash;
    } catch (error) {
        console.error('Telegram validation error:', error);
        return false;
    }
}

function parseTelegramInitData(initData) {
    try {
        const urlParams = new URLSearchParams(initData);
        const userStr = urlParams.get('user');

        if (!userStr) return null;

        const user = JSON.parse(userStr);
        return {
            telegramId: user.id.toString(),
            username: user.username || user.first_name || 'Player',
            firstName: user.first_name,
            lastName: user.last_name,
            languageCode: user.language_code,
            avatarUrl: user.photo_url || null
        };
    } catch (error) {
        console.error('Parse init data error:', error);
        return null;
    }
}

function validateBetAmount(betAmount, userCoins) {
    if (typeof betAmount !== 'number' || betAmount < 0) return false;
    if (betAmount > userCoins) return false;
    return true;
}

function sanitizeMessage(message) {
    if (typeof message !== 'string') return '';
    return message.trim().slice(0, 120);
}

module.exports = {
    validateTelegramInitData,
    parseTelegramInitData,
    validateBetAmount,
    sanitizeMessage
};