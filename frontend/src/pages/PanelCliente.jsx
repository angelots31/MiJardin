import { Link } from 'react-router-dom';

function PanelCliente() {
  const nombre = localStorage.getItem('mijardin_user_name') || '';
  const email = localStorage.getItem('mijardin_user') || '';

  return (
    <main className="min-h-[calc(100vh-74px)] bg-[#FAF3E7] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-2xl rounded-3xl bg-white p-8 shadow-xl ring-1 ring-[#23392E]/10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D9714E]">Mi cuenta</p>
        <h1 className="mt-1 text-3xl font-bold text-[#23392E]">Hola, {nombre}</h1>
        <div className="mt-6 space-y-3 rounded-2xl bg-[#FAF3E7] p-5 text-sm">
          <p className="text-[#23392E]"><strong>Nombre:</strong> {nombre}</p>
          <p className="text-[#23392E]"><strong>Correo:</strong> {email}</p>
          <p className="text-[#23392E]"><strong>Rol:</strong> Cliente</p>
        </div>
        <Link to="/tienda" className="mt-6 inline-flex rounded-full bg-[#D9714E] px-6 py-3 font-bold text-white hover:bg-[#C15E3D]">Ir a la tienda</Link>
      </div>
    </main>
  );
}

export default PanelCliente;