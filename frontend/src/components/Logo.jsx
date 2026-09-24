/**
 * Marca de MiJardín.
 *
 * Es la misma flor estilizada con hoja que vive en `public/logo.svg`, pero
 * como componente para poder cambiar tamaño, color de texto y reutilizarla
 * en el header, el footer, el login y los paneles.
 *
 * `tono` controla el color de la palabra "MiJardín":
 *   · 'claro'  -> crema, para fondos verde oscuro.
 *   · 'oscuro' -> verde, para fondos crema o blancos.
 */
function Logo({ size = 34, wordmark = true, tono = 'claro', className = '' }) {
  const colorTexto = tono === 'oscuro' ? 'text-jardin-verde' : 'text-jardin-fondo';

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        role="img"
        aria-label={wordmark ? undefined : 'MiJardín'}
        aria-hidden={wordmark ? 'true' : undefined}
        className="shrink-0"
      >
        {/* Tallo */}
        <path d="M24 25.5V44" stroke="#7C9473" strokeWidth="2.6" strokeLinecap="round" />
        {/* Hoja */}
        <path d="M24 31.6c6.6-.5 11.6 3.7 12.8 10.7-7.1.7-12-3.3-12.8-10.7Z" fill="#7C9473" />
        <path d="M25.7 34.2l8.2 6.7" stroke="#FAF3E7" strokeWidth="1.1" strokeLinecap="round" opacity=".55" />
        {/* Pétalos */}
        <g fill="#D9714E">
          <ellipse cx="24" cy="9.6" rx="5.1" ry="6.4" />
          <ellipse cx="24" cy="9.6" rx="5.1" ry="6.4" transform="rotate(72 24 17.4)" />
          <ellipse cx="24" cy="9.6" rx="5.1" ry="6.4" transform="rotate(144 24 17.4)" />
          <ellipse cx="24" cy="9.6" rx="5.1" ry="6.4" transform="rotate(216 24 17.4)" />
          <ellipse cx="24" cy="9.6" rx="5.1" ry="6.4" transform="rotate(288 24 17.4)" />
        </g>
        {/* Centro */}
        <circle cx="24" cy="17.4" r="4.3" fill="#E8AC4F" />
        <circle cx="24" cy="17.4" r="1.6" fill="#FAF3E7" opacity=".9" />
      </svg>

      {wordmark && (
        <span className={`font-display text-xl font-semibold leading-none ${colorTexto}`}>
          MiJardín
        </span>
      )}
    </span>
  );
}

export default Logo;
