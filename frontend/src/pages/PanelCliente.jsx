import { Link } from 'react-router-dom';
import DashboardResumen from '../components/dashboard/DashboardResumen';

function PanelCliente() {
  const nombre = localStorage.getItem('mijardin_user_name') || '';
  const email = localStorage.getItem('mijardin_user') || '';

  const accesos = [
    { a: '/tienda', texto: 'Ir a la tienda', principal: true },
    { a: '/mis-pedidos', texto: 'Mis pedidos' },
    { a: '/mis-compras', texto: 'Mis compras y facturas' },
    { a: '/mis-pqr', texto: 'Mis solicitudes (PQR)' },
  ];

  return (
    <main className="min-h-[calc(100vh-74px)] bg-[#FAF3E7] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl bg-white p-8 shadow-xl ring-1 ring-[#23392E]/10">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D9714E]">Mi cuenta</p>
          <h1 className="mt-1 text-3xl font-bold text-[#23392E]">Hola, {nombre}</h1>
          <div className="mt-6 space-y-3 rounded-2xl bg-[#FAF3E7] p-5 text-sm">
            <p className="text-[#23392E]"><strong>Nombre:</strong> {nombre}</p>
            <p className="text-[#23392E]"><strong>Correo:</strong> {email}</p>
            <p className="text-[#23392E]"><strong>Rol:</strong> Cliente</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {accesos.map(({ a, texto, principal }) => (
              <Link
                key={a}
                to={a}
                className={principal
                  ? 'inline-flex items-center gap-2 rounded-full bg-[#D9714E] px-6 py-3 font-bold text-white hover:bg-[#C15E3D]'
                  : 'inline-flex items-center gap-2 rounded-full border border-[#23392E]/20 px-6 py-3 font-semibold text-[#23392E] hover:bg-[#F1E7D6]'}
              >
                {texto}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-[#23392E]/10">
          <h2 className="mb-4 text-xl font-bold text-[#23392E]">Tu resumen</h2>
          <DashboardResumen rol="Cliente" />
        </section>
      </div>
    </main>
  );
}

export default PanelCliente;