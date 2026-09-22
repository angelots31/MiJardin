import { motion, AnimatePresence } from 'framer-motion';

export default function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  danger = false
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onCancel}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-md rounded-2xl bg-[#FAF3E7] p-6 shadow-2xl ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold font-display text-[#23392E] mb-3">
              {title}
            </h3>
            <p className="text-[#23392E]/80 mb-6 leading-6">
              {message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg font-medium text-[#23392E] hover:bg-black/5 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 rounded-lg font-medium text-[#FAF3E7] shadow-sm hover:shadow transition-all hover:-translate-y-0.5 active:translate-y-0 ${
                  danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#D9714E] hover:bg-[#C15E3D]'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
