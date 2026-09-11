function Button({ children, type = 'button', onClick, disabled = false, variant = 'primary', className = '' }) {
  const styles = variant === 'secondary'
    ? 'border border-[#D9714E] text-[#D9714E] hover:bg-[#D9714E]/10'
    : 'bg-[#D9714E] text-white hover:bg-[#C15E3D]';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2.5 font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#D9714E]/40 disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export default Button;
