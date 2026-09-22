import { useCallback, useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  BadgeDollarSign, FileText, Flower2, MessageCircleQuestion,
  Package, Receipt, ShoppingBag, Users,
} from 'lucide-react';

import { api, pesos, toQuery } from '../../api/client';
import StatCard from './StatCard';

const VERDE = '#23392E';
const TERRACOTA = '#D9714E';
const SALVIA = '#7C9473';

/** Rango por defecto: los últimos 30 días. */
const rangoInicial = () => {
  const fin = new Date();
  const inicio = new Date();
  inicio.setDate(fin.getDate() - 29);
  return { inicio: inicio.toISOString().slice(0, 10), fin: fin.toISOString().slice(0, 10) };
};

/**
 * Dashboard con indicadores y gráficos.
 *
 * Todos los números salen de FastAPI (/estadisticas/dashboard y
 * /estadisticas/ventas): no hay ni un dato escrito a mano en el frontend.
 * El backend decide qué devuelve según el rol del token, así que el mismo
 * componente sirve para el administrador, el empleado y el cliente.
 */
function DashboardResumen({ rol = 'Administrador' }) {
  const [tarjetas, setTarjetas] = useState(null);
  const [analitica, setAnalitica] = useState(null);
  const [filtros, setFiltros] = useState({ ...rangoInicial(), agrupar: 'dia' });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    try {
      const query = toQuery({
        agrupar: filtros.agrupar,
        fecha_inicio: filtros.inicio,
        fecha_fin: filtros.fin,
      });
      const [resumen, ventas] = await Promise.all([
        api('/api/v1/estadisticas/dashboard'),
        api(`/api/v1/estadisticas/ventas${query}`),
      ]);
      setTarjetas(resumen.data);
      setAnalitica(ventas);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando && !tarjetas) {
    return <p className="py-10 text-center text-[#6B7B70]">Cargando indicadores…</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#E8B4A0] bg-[#FDF0EA] p-4 text-[#C15E3D]">
        <p className="font-medium">No se pudieron cargar los indicadores.</p>
        <p className="mt-1 text-sm">{error}</p>
        <button onClick={cargar} className="mt-3 rounded-lg bg-[#23392E] px-4 py-2 text-sm text-white">
          Reintentar
        </button>
      </div>
    );
  }

  const t = tarjetas || {};
  const serie = analitica?.serie || [];
  const topItems = analitica?.top_items || [];
  const esCliente = rol === 'Cliente';

  const cards = esCliente
    ? [
        { etiqueta: 'Mis pedidos', valor: t.mis_pedidos ?? 0, icono: Package, acento: 'verde' },
        { etiqueta: 'Compras realizadas', valor: t.mis_compras ?? 0, icono: ShoppingBag, acento: 'salvia' },
        { etiqueta: 'Total comprado', valor: pesos(t.total_comprado), icono: BadgeDollarSign, acento: 'terracota' },
        { etiqueta: 'Mis facturas', valor: t.mis_facturas ?? 0, icono: Receipt, acento: 'mostaza' },
        { etiqueta: 'PQR abiertas', valor: t.pqr_abiertas ?? 0, icono: MessageCircleQuestion, acento: 'verde' },
      ]
    : [
        { etiqueta: 'Ventas registradas', valor: t.ventas_total ?? 0, detalle: `${t.ventas_hoy ?? 0} hoy`, icono: ShoppingBag, acento: 'verde' },
        { etiqueta: 'Ingresos totales', valor: pesos(t.ingresos_total), detalle: `${pesos(t.ingresos_hoy)} hoy`, icono: BadgeDollarSign, acento: 'terracota' },
        { etiqueta: 'Facturación', valor: pesos(t.facturado_total), detalle: `${t.facturas_emitidas ?? 0} facturas emitidas`, icono: Receipt, acento: 'mostaza' },
        { etiqueta: 'Pedidos por atender', valor: t.pedidos_pendientes ?? 0, icono: Package, acento: 'salvia' },
        { etiqueta: 'Productos', valor: t.productos ?? 0, icono: Flower2, acento: 'verde' },
        { etiqueta: 'Servicios', valor: t.servicios ?? 0, icono: FileText, acento: 'salvia' },
        { etiqueta: 'PQR recibidas', valor: t.pqr_recibidas ?? 0, detalle: `${t.pqr_pendientes ?? 0} sin resolver`, icono: MessageCircleQuestion, acento: 'terracota' },
        ...(t.usuarios !== undefined
          ? [{ etiqueta: 'Usuarios', valor: t.usuarios, detalle: `${t.usuarios_activos ?? 0} activos · ${t.clientes ?? 0} clientes`, icono: Users, acento: 'mostaza' }]
          : []),
      ];

  return (
    <div className="space-y-6">
      <section>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => <StatCard key={card.etiqueta} {...card} />)}
        </div>
      </section>

      {/* Filtros: alimentan los dos gráficos de abajo */}
      <section className="rounded-xl border border-[#E4DCCD] bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-[#23392E]">
            Desde
            <input
              type="date" value={filtros.inicio}
              onChange={(e) => setFiltros((f) => ({ ...f, inicio: e.target.value }))}
              className="mt-1 block rounded-lg border border-[#E4DCCD] px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-[#23392E]">
            Hasta
            <input
              type="date" value={filtros.fin}
              onChange={(e) => setFiltros((f) => ({ ...f, fin: e.target.value }))}
              className="mt-1 block rounded-lg border border-[#E4DCCD] px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm text-[#23392E]">
            Agrupar por
            <select
              value={filtros.agrupar}
              onChange={(e) => setFiltros((f) => ({ ...f, agrupar: e.target.value }))}
              className="mt-1 block rounded-lg border border-[#E4DCCD] px-3 py-2 text-sm"
            >
              <option value="dia">Día</option>
              <option value="semana">Semana</option>
              <option value="mes">Mes</option>
            </select>
          </label>
          <button
            onClick={() => setFiltros({ ...rangoInicial(), agrupar: 'dia' })}
            className="rounded-lg border border-[#E4DCCD] px-4 py-2 text-sm text-[#23392E] hover:bg-[#FAF3E7]"
          >
            Últimos 30 días
          </button>
          {analitica && (
            <p className="ml-auto text-sm text-[#6B7B70]">
              {analitica.totales.ventas} ventas · {pesos(analitica.totales.ingresos)} en el periodo
            </p>
          )}
        </div>
      </section>

      {serie.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#E4DCCD] bg-white p-8 text-center text-[#6B7B70]">
          No hay ventas en este periodo. Cambia las fechas o registra una venta para ver los gráficos.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* Gráfico de barras: ingresos por periodo */}
          <section className="rounded-xl border border-[#E4DCCD] bg-white p-4">
            <h3 className="mb-3 text-base font-semibold text-[#23392E]">Ingresos por periodo</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={serie} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE5D6" vertical={false} />
                <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#6B7B70' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7B70' }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v) => pesos(v)} labelStyle={{ color: VERDE }} />
                <Bar dataKey="ingresos" name="Ingresos" fill={TERRACOTA} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* Gráfico lineal: número de ventas por periodo */}
          <section className="rounded-xl border border-[#E4DCCD] bg-white p-4">
            <h3 className="mb-3 text-base font-semibold text-[#23392E]">Cantidad de ventas</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={serie} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDE5D6" vertical={false} />
                <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: '#6B7B70' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7B70' }} />
                <Tooltip labelStyle={{ color: VERDE }} />
                <Legend />
                <Line type="monotone" dataKey="ventas" name="Ventas" stroke={VERDE} strokeWidth={2} dot={{ r: 3, fill: VERDE }} />
              </LineChart>
            </ResponsiveContainer>
          </section>

          {topItems.length > 0 && !esCliente && (
            <section className="rounded-xl border border-[#E4DCCD] bg-white p-4 xl:col-span-2">
              <h3 className="mb-3 text-base font-semibold text-[#23392E]">Lo más vendido del periodo</h3>
              <ResponsiveContainer width="100%" height={Math.max(200, topItems.length * 38)}>
                <BarChart data={topItems} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EDE5D6" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7B70' }} />
                  <YAxis type="category" dataKey="item" width={170} tick={{ fontSize: 11, fill: '#23392E' }} />
                  <Tooltip labelStyle={{ color: VERDE }} />
                  <Bar dataKey="unidades" name="Unidades" fill={SALVIA} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default DashboardResumen;
