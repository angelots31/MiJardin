function Toast({ message, onClose, type = 'success' }) {
  if (!message) return null;

  const styles = type === 'success'
    ? 'border-[#7C9473]/30 bg-[#E7EFE2] text-[#23392E]'
    : 'border-[#D9714E]/30 bg-[#FAE8E0] text-[#7A3B29]';

  return (
    <div className="fixed bottom-5 right-5 z-[80] w-[calc(100%-2.5rem)] max-w-sm animate-[fadeIn_.25s_ease-out]" role="status" aria-live="polite">
      <div className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-sm ${styles}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-lg">{type === 'success' ? '✓' : '!'}</div>
        <p className="flex-1 pt-1 text-sm font-semibold leading-5">{message}</p>
        <button type="button" onClick={onClose} className="cursor-pointer rounded-full px-2 py-1 text-lg font-bold opacity-70 transition hover:bg-black/5 hover:opacity-100" aria-label="Cerrar notificación">×</button>
      </div>
    </div>
  );
}

export default Toast;
