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
    const baseStyles = "relative font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-95";

    const variants = {
        primary: "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40",
        secondary: "bg-obsidian-800 text-white border border-obsidian-700 hover:bg-obsidian-700",
        outline: "bg-transparent border-2 border-violet-500 text-violet-400 hover:bg-violet-500/10",
        ghost: "bg-transparent text-obsidian-300 hover:bg-obsidian-800 hover:text-white",
        danger: "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-500/25",
        success: "bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg shadow-emerald-500/25"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-5 py-2.5 text-base",
        lg: "px-6 py-3 text-lg",
        xl: "px-8 py-4 text-xl"
    };

    return (
        <motion.button
            whileTap={{ scale: disabled ? 1 : 0.95 }}
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
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
                <>
                    {icon && <span className="text-lg">{icon}</span>}
                    {children}
                </>
            )}
        </motion.button>
    );
}