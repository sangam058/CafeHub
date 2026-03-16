import { motion } from 'framer-motion';

export default function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 border-3 border-amber-500/30 border-t-amber-500 rounded-full"
        style={{ borderWidth: 3 }}
      />
      <p className="text-amber-400/60 text-sm">{text}</p>
    </div>
  );
}
