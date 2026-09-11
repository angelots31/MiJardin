function Select({ label, name, value, onChange, options, error }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-semibold text-[#23392E]">{label} *</label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-[#D9714E] focus:ring-2 focus:ring-[#D9714E]/30 ${error ? 'border-red-500' : 'border-[#7C9473]/50'}`}
      >
        <option value="">Selecciona una opción</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error && <span className="text-xs font-medium text-red-600">{error}</span>}
    </div>
  );
}

export default Select;
