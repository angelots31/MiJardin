function Input({ label, name, value, onChange, error, type = 'text', placeholder, maxLength, required = true }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-semibold text-[#23392E]">
        {label}{required ? ' *' : ''}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#D9714E]/30 ${
          error ? 'border-red-500' : 'border-[#7C9473]/50 focus:border-[#D9714E]'
        }`}
      />
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </div>
  );
}

export default Input;
