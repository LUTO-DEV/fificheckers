import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useGameStore from '../stores/gameStore';
import useSocket from '../hooks/useSocket';
import { QUICK_CHAT } from '../utils/constants';

export default function Chat({ isOpen, onClose }) {
    const [message, setMessage] = useState('');
    const [showQuickChat, setShowQuickChat] = useState(true);
    const messagesEndRef = useRef(null);
    const { matchId, chatMessages, myPlayerNum } = useGameStore();
    const { sendChat } = useSocket();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleSend = (text, isQuick = false) => {
        if (!text.trim()) return;
        sendChat(matchId, text, isQuick);
        setMessage('');
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-x-0 bottom-0 z-40 glass border-t border-obsidian-700 rounded-t-3xl max-h-[60vh] flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-obsidian-700">
                <h3 className="font-semibold text-white">Chat</h3>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-obsidian-700 text-obsidian-400"
                >
                    ✕
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {chatMessages.length === 0 ? (
                    <p className="text-center text-obsidian-500 text-sm py-4">
                        No messages yet. Say hello! 👋
                    </p>
                ) : (
                    chatMessages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: msg.player === myPlayerNum ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex ${msg.player === myPlayerNum ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`
                max-w-[80%] px-3 py-2 rounded-2xl text-sm
                ${msg.player === myPlayerNum
                                    ? 'bg-violet-600 text-white rounded-br-sm'
                                    : 'bg-obsidian-700 text-white rounded-bl-sm'
                                }
              `}>
                                <p className="text-xs opacity-70 mb-0.5">{msg.username}</p>
                                <p>{msg.message}</p>
                            </div>
                        </motion.div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick chat */}
            {showQuickChat && (
                <div className="px-4 py-2 border-t border-obsidian-700">
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                        {QUICK_CHAT.map((text, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(text, true)}
                                className="flex-shrink-0 px-3 py-1.5 rounded-full bg-obsidian-700 text-sm text-white hover:bg-obsidian-600 transition-colors"
                            >
                                {text}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="flex items-center gap-2 p-4 border-t border-obsidian-700 safe-area-bottom">
                <button
                    onClick={() => setShowQuickChat(!showQuickChat)}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl ${showQuickChat ? 'bg-violet-600' : 'bg-obsidian-700'}`}
                >
                    ⚡
                </button>

                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend(message)}
                    placeholder="Type a message..."
                    maxLength={120}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-obsidian-800 border border-obsidian-700 text-white placeholder:text-obsidian-500 focus:outline-none focus:border-violet-500"
                />

                <button
                    onClick={() => handleSend(message)}
                    disabled={!message.trim()}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-violet-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    →
                </button>
            </div>
        </motion.div>
    );
}