import { motion, AnimatePresence } from 'framer-motion';

export default function Modal({ isOpen, onClose, title, children, showClose = true }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 25 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-md bg-luxury-dark rounded-2xl border border-luxury-border overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    {title && (
                        <div className="flex items-center justify-between px-5 py-4 border-b border-luxury-border">
                            <h3 className="text-lg font-display font-semibold text-luxury-white">{title}</h3>
                            {showClose && (
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-luxury-card text-luxury-text hover:text-luxury-white transition-colors"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-5">
                        {children}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}