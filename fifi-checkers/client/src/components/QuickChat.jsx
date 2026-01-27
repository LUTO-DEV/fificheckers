import { motion } from 'framer-motion';
import { QUICK_CHAT } from '../utils/constants';

export default function QuickChat({ onSend }) {
    return (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar py-2 px-1">
            {QUICK_CHAT.slice(0, 6).map((text, i) => (
                <motion.button
                    key={i}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSend(text)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full bg-obsidian-800 border border-obsidian-700 text-sm text-white hover:bg-obsidian-700 transition-colors"
                >
                    {text}
                </motion.button>
            ))}
        </div>
    );
}