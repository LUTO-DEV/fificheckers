import { useEffect, useState, useCallback } from 'react';

export default function useTelegram() {
    const [webApp, setWebApp] = useState(null);
    const [user, setUser] = useState(null);
    const [initData, setInitData] = useState(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const tg = window.Telegram?.WebApp;

        if (tg) {
            tg.ready();
            tg.expand();

            // Set theme
            tg.setHeaderColor('#121316');
            tg.setBackgroundColor('#121316');

            setWebApp(tg);
            setUser(tg.initDataUnsafe?.user || null);
            setInitData(tg.initData || `mock:${Date.now()}`);
            setIsReady(true);

            // Enable closing confirmation
            tg.enableClosingConfirmation();
        } else {
            // Development mode without Telegram
            setInitData(`mock:${Date.now()}`);
            setIsReady(true);
        }
    }, []);

    const hapticFeedback = useCallback((type = 'impact') => {
        if (webApp?.HapticFeedback) {
            switch (type) {
                case 'impact':
                    webApp.HapticFeedback.impactOccurred('medium');
                    break;
                case 'notification':
                    webApp.HapticFeedback.notificationOccurred('success');
                    break;
                case 'selection':
                    webApp.HapticFeedback.selectionChanged();
                    break;
                default:
                    webApp.HapticFeedback.impactOccurred('light');
            }
        }
    }, [webApp]);

    const showAlert = useCallback((message) => {
        if (webApp?.showAlert) {
            webApp.showAlert(message);
        } else {
            alert(message);
        }
    }, [webApp]);

    const showConfirm = useCallback((message, callback) => {
        if (webApp?.showConfirm) {
            webApp.showConfirm(message, callback);
        } else {
            const result = confirm(message);
            callback(result);
        }
    }, [webApp]);

    const close = useCallback(() => {
        if (webApp?.close) {
            webApp.close();
        }
    }, [webApp]);

    const shareUrl = useCallback((url, text) => {
        if (webApp?.openTelegramLink) {
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
            webApp.openTelegramLink(shareUrl);
        }
    }, [webApp]);

    return {
        webApp,
        user,
        initData,
        isReady,
        hapticFeedback,
        showAlert,
        showConfirm,
        close,
        shareUrl
    };
}