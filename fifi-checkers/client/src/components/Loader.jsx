import { motion } from 'framer-motion';

export default function Loader({ size = 'md', text = '' }) {
    const sizes = {
        sm: 'w-6 h-6',
        md: 'w-10 h-10',
        lg: 'w-16 h-16'
    };

    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <motion.div
                className={`${sizes[size]} relative`}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
                <div className="absolute inset-0 rounded-full border-2 border-obsidian-700" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500" />
            </motion.div>

            {text && (
                <p className="text-obsidian-400 text-sm animate-pulse">{text}</p>
            )}
        </div>
    );
}

export function FullScreenLoader({ text = 'Loading...' }) {
    return (
        <div className="fixed inset-0 bg-obsidian-950 flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-6xl"
                >
                    ♟️
                </motion.div>
                <Loader size="md" text={text} />
            </div>
        </div>
    );
}