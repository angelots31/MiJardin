function Input({ label, name, value, onChange, error, type = 'text', placeholder, maxLength, minLength, required = true }) {
  const length = String(value ?? '').length;
  // El contador solo aparece cuando el campo tiene un límite definido, para
  // que el usuario sepa cuántos caracteres lleva y cuántos le faltan.
  const mostrarContador = typeof maxLength === 'number';
  const cumpleMinimo = typeof minLength !== 'number' || length >= minLength;
  const alcanzoLimite = mostrarContador && length >= maxLength;
  const contadorClase = alcanzoLimite
    ? 'text-[#C15E3D]'
    : length > 0 && cumpleMinimo
      ? 'text-[#5F7657]'
      : 'text-[#8C9A8E]';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={name} className="text-sm font-semibold text-[#23392E]">
          {label}{required ? ' *' : ''}
        </label>
        {mostrarContador && (
          <span className={`text-xs font-semibold tabular-nums ${contadorClase}`} aria-hidden="true">
            {length}/{maxLength}
          </span>
        )}
      </div>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        minLength={minLength}
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
