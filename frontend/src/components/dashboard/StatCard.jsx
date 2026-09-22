/**
 * Tarjeta de indicador (Card) para los dashboards.
 *
 * `acento` cambia solo la franja lateral y el color del número, para que
 * las tarjetas se distingan entre sí sin romper la paleta de MiJardín.
 */
const ACENTOS = {
  verde: { barra: 'bg-[#23392E]', valor: 'text-[#23392E]' },
  terracota: { barra: 'bg-[#D9714E]', valor: 'text-[#C15E3D]' },
  salvia: { barra: 'bg-[#7C9473]', valor: 'text-[#5F7657]' },
  mostaza: { barra: 'bg-[#E8AC4F]', valor: 'text-[#B57F24]' },
};

function StatCard({ etiqueta, valor, detalle, icono: Icono, acento = 'verde' }) {
  const colores = ACENTOS[acento] || ACENTOS.verde;

  return (
    <article className="relative overflow-hidden rounded-xl border border-[#E4DCCD] bg-white p-4 shadow-sm">
      <span className={`absolute left-0 top-0 h-full w-1 ${colores.barra}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="text-sm text-[#6B7B70]">{etiqueta}</p>
          <p className={`mt-1 truncate text-2xl font-semibold ${colores.valor}`}>{valor}</p>
          {detalle && <p className="mt-1 text-xs text-[#8C9A8E]">{detalle}</p>}
        </div>
        {Icono && <Icono size={22} className="shrink-0 text-[#7C9473]" aria-hidden="true" />}
      </div>
    </article>
  );
}

export default StatCard;
