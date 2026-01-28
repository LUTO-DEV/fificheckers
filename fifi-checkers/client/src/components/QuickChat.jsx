import { motion } from 'framer-motion';

const QUICK_MESSAGES = [
    "GG! 🎮",
    "Nice! 👏",
    "Wow! 😮",
    "Oops 😅",
    "🔥",
    "👀"
];

export default function QuickChat({ onSend }) {
    return (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1">
            {QUICK_MESSAGES.map((text, i) => (
                <motion.button
                    key={i}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onSend(text)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full bg-luxury-card border border-luxury-border text-sm text-luxury-light hover:border-gold-500/30 transition-colors"
                >
                    {text}
                </motion.button>
            ))}
        </div>
    );
}