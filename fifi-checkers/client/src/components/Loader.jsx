import { motion } from 'framer-motion';

export default function Loader({ size = 'md', text = '' }) {
    const sizes = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-16 h-16' };

    return (
        <div className="flex flex-col items-center justify-center gap-4">
            <motion.div
                className={`${sizes[size]} relative`}
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            >
                <div className="absolute inset-0 rounded-full border-2 border-luxury-border" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold-500" />
            </motion.div>
            {text && (
                <motion.p
                    className="text-luxury-text text-sm"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    {text}
                </motion.p>
            )}
        </div>
    );
}

export function FullScreenLoader({ text = 'Loading...' }) {
    return (
        <div className="fixed inset-0 bg-luxury-black flex flex-col items-center justify-center z-50">
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-6xl mb-6"
            >
                ♟️
            </motion.div>
            <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-2xl font-display font-bold gradient-gold-text mb-8"
            >
                FiFi Checkers
            </motion.h1>
            <Loader size="md" text={text} />
        </div>
    );
}