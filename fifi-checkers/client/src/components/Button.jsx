import { motion } from 'framer-motion';

export default function Button({
    children,
    onClick,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    icon,
    className = ''
}) {
    const baseStyles = "relative font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 btn-press";

    const variants = {
        primary: "bg-gradient-to-r from-gold-500 to-gold-600 text-black shadow-lg shadow-gold-500/20 hover:shadow-gold-500/40 border border-gold-400/20",
        secondary: "bg-luxury-card text-luxury-white border border-luxury-border hover:border-gold-500/30 hover:bg-luxury-muted",
        outline: "bg-transparent border-2 border-gold-500/50 text-gold-400 hover:bg-gold-500/10",
        ghost: "bg-transparent text-luxury-text hover:bg-luxury-card hover:text-luxury-white",
        danger: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/20",
        success: "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/20"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-5 py-2.5 text-base",
        lg: "px-6 py-3 text-lg",
        xl: "px-8 py-4 text-xl"
    };

    return (
        <motion.button
            whileTap={{ scale: disabled ? 1 : 0.97 }}
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            onClick={onClick}
            disabled={disabled || loading}
            className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
        >
            {loading ? (
                <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
            ) : (
                <>
                    {icon && <span className="text-lg">{icon}</span>}
                    {children}
                </>
            )}
        </motion.button>
    );
}