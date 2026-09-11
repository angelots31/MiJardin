import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { productos, tiendas } from '../data/productos';
import Toast from '../components/ui/Toast';
import { API_URL } from '../api/config';

const money = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

function Tienda() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loginMessage, setLoginMessage] = useState('');
  const [storeMessage, setStoreMessage] = useState('');
  const [catalogo, setCatalogo] = useState(productos);
  const userRole = localStorage.getItem('mijardin_user_role');
  const token = localStorage.getItem('mijardin_token');
  const puedePublicar = userRole === '1' || userRole === '4'; // Administrador o Empleado
  const fetchProductos = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/productos`);
      const json = await res.json();
      // La BD usa id_producto como llave primaria; se mapea a `id` para que
      // el carrito y las `key` de React puedan identificar cada producto.
      if (json.success) setCatalogo([...productos, ...json.data.map(p => ({...p, id: p.id_producto, esDb: true, imagen: p.imagen || productos[0].imagen, tienda: 'Tienda Nueva'}))]);
    } catch (e) {}
  };
  useEffect(() => { fetchProductos(); }, []);
  const [cart, setCart] = useState([]);
  const [filtro, setFiltro] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [pedidoConfirmado, setPedidoConfirmado] = useState(false);
  const [custom, setCustom] = useState({ flores: [], envoltura: 'Kraft', nota: '' });
  const [seller, setSeller] = useState({ tienda: '', producto: '', categoria: 'Flores', precio: '', descripcion: '' });

  const logged = localStorage.getItem('mijardin_logged') === 'true';

  useEffect(() => {
    if (location.state?.loginSuccess) {
      setLoginMessage(`¡Bienvenido, ${location.state.userName}! Ya puedes comprar y armar tus ramos.`);
      navigate('/tienda', { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!loginMessage) return;
    const timer = setTimeout(() => setLoginMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [loginMessage]);

  const categorias = ['Todos', 'Flores', 'Ramos', 'Plantas'];
  const productosFiltrados = useMemo(() => catalogo.filter((producto) => {
    const coincideCategoria = filtro === 'Todos' || producto.categoria === filtro;
    const texto = `${producto.nombre} ${producto.tienda} ${producto.descripcion}`.toLowerCase();
    return coincideCategoria && texto.includes(busqueda.toLowerCase());
  }), [catalogo, filtro, busqueda]);

  const addToCart = (producto) => {
    setCart((actual) => {
      const encontrado = actual.find((item) => item.id === producto.id);
      if (encontrado) return actual.map((item) => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      return [...actual, { ...producto, cantidad: 1 }];
    });
    setStoreMessage(`✨ ${producto.nombre} agregado al carrito.`);
  };

  const changeQuantity = (id, delta) => {
    setCart((actual) => actual.map((item) => item.id === id ? { ...item, cantidad: Math.max(0, item.cantidad + delta) } : item).filter((item) => item.cantidad > 0));
  };

  const cartCount = cart.reduce((total, item) => total + item.cantidad, 0);
  const subtotal = cart.reduce((total, item) => total + item.precio * item.cantidad, 0);

  const toggleCustomFlower = (nombre) => {
    setCustom((actual) => ({ ...actual, flores: actual.flores.includes(nombre) ? actual.flores.filter((f) => f !== nombre) : [...actual.flores, nombre] }));
  };

  const addCustomBouquet = () => {
    if (!custom.flores.length) { setStoreMessage('Selecciona al menos una flor para crear tu ramo personalizado.'); return; }
    const precio = 20000 + custom.flores.length * 7000;
    addToCart({ id: `custom-${Date.now()}`, nombre: `Ramo personalizado (${custom.flores.length} flores)`, categoria: 'Ramos', precio, tienda: 'MiJardín - Varias tiendas', imagen: productos[3].imagen, descripcion: `${custom.flores.join(', ')} · Envoltura ${custom.envoltura}` });
    setCustom({ flores: [], envoltura: 'Kraft', nota: '' });
    setStoreMessage('Tu ramo personalizado fue agregado al carrito.');
  };

  const checkout = async () => {
    if (!cart.length) { setStoreMessage('Agrega al menos un producto antes de solicitar la compra.'); return; }
    const authToken = localStorage.getItem('mijardin_token');
    if (!authToken) { setStoreMessage('Debes iniciar sesión para realizar el pedido.'); return; }
    try {
      const items = cart.map((item) => ({
        id_producto: item.esDb ? Number(item.id) : null,
        nombre_producto: item.nombre,
        cantidad: item.cantidad,
        precio: Number(item.precio),
      }));
      const res = await fetch(`${API_URL}/api/v1/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ items, observaciones: '' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.detail || data.message || 'No fue posible crear el pedido.');
      setPedidoConfirmado(true);
      setCart([]);
      setCartOpen(false);
      setStoreMessage(`Pedido #${data.id_pedido} creado correctamente.`);
    } catch (error) {
      setStoreMessage(error.message || 'Error al crear el pedido.');
    }
  };

  if (!logged) {
    return (
      <main className="min-h-[calc(100vh-74px)] bg-[#FAF3E7] px-4 py-16">
        <section className="mx-auto max-w-2xl rounded-3xl bg-[#23392E] p-8 text-center text-[#FAF3E7] shadow-xl sm:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E8AC4F]">Tienda MiJardín</p>
          <h1 className="mt-3 text-4xl font-bold">Compra flores desde casa</h1>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-[#F1E7D6]">Regístrate o inicia sesión para descubrir flores de diferentes tiendas, armar tu propio ramo y solicitar la entrega.</p>
          <Link to="/login" state={{ returnTo: '/tienda' }} className="mt-7 inline-flex rounded-full bg-[#D9714E] px-7 py-3 font-bold text-white transition hover:bg-[#C15E3D]">Iniciar sesión</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF3E7] text-[#2A2A22]">
      <Toast message={loginMessage} onClose={() => setLoginMessage('')} />
      <Toast message={storeMessage} onClose={() => setStoreMessage('')} type="success" />
      <section className="bg-[#23392E] px-5 py-12 text-[#FAF3E7] sm:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E8AC4F]">Compra flores desde casa</p>
            <h1 className="mt-2 text-4xl font-bold sm:text-5xl">Todo lo que necesitas para crear tu ramo ideal.</h1>
            <p className="mt-4 max-w-3xl leading-7 text-[#F1E7D6]">MiJardín reúne la oferta de diferentes floristerías físicas para que puedas comparar flores, elegir ramos ya preparados o combinar tus favoritas. Nuestro objetivo es facilitar la compra desde casa y conectar cada pedido con las tiendas donde están disponibles los productos.</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
              <div className="text-2xl">✿</div>
              <h2 className="mt-3 text-lg font-bold">Elige tus flores</h2>
              <p className="mt-2 text-sm leading-6 text-[#F1E7D6]">Encuentra flores, plantas y ramos ofrecidos por distintas tiendas aliadas.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
              <div className="text-2xl">✿</div>
              <h2 className="mt-3 text-lg font-bold">Crea tu combinación</h2>
              <p className="mt-2 text-sm leading-6 text-[#F1E7D6]">Agrega productos de una o varias floristerías y arma una propuesta personalizada.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
              <div className="text-2xl">✿</div>
              <h2 className="mt-3 text-lg font-bold">Nos encargamos de recoger</h2>
              <p className="mt-2 text-sm leading-6 text-[#F1E7D6]">El servicio de reparto puede coordinar la recogida en los establecimientos seleccionados y llevar tu pedido.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {categorias.map((categoria) => <button key={categoria} onClick={() => setFiltro(categoria)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filtro === categoria ? 'bg-[#D9714E] text-white' : 'bg-[#F1E7D6] text-[#23392E] hover:bg-[#E8AC4F]'}`}>{categoria}</button>)}
          </div>
          <div className="flex gap-2">
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar flores o tiendas..." className="w-full rounded-full border border-[#7C9473]/30 bg-white px-5 py-2.5 outline-none focus:ring-2 focus:ring-[#D9714E] sm:w-72" />
            <button onClick={() => setCartOpen(true)} className="cursor-pointer whitespace-nowrap rounded-full bg-[#23392E] px-5 py-2.5 font-bold text-white">🛒 Carrito ({cartCount})</button>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {productosFiltrados.map((producto) => (
            <article key={producto.id} className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-[#23392E]/10">
              <img src={producto.imagen} alt={producto.nombre} className="h-52 w-full object-cover" />
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#7C9473]">{producto.tienda}</p>
                <h2 className="mt-1 text-xl font-bold text-[#23392E]">{producto.nombre}</h2>
                <p className="mt-2 min-h-12 text-sm leading-5 text-[#5b5b50]">{producto.descripcion}</p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <strong className="text-lg text-[#D9714E]">{money(producto.precio)}</strong>
                  <button onClick={() => addToCart(producto)} className="cursor-pointer rounded-full bg-[#D9714E] px-4 py-2 text-sm font-bold text-white hover:bg-[#C15E3D]">Agregar</button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <section className="mt-10 grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#23392E]/10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D9714E]">Variedad</p>
            <h2 className="mt-2 text-xl font-bold text-[#23392E]">Más opciones para elegir</h2>
            <p className="mt-3 text-sm leading-6 text-[#5b5b50]">Consulta productos de diferentes establecimientos sin tener que desplazarte entre varias tiendas físicas.</p>
          </article>
          <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#23392E]/10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D9714E]">Personalización</p>
            <h2 className="mt-2 text-xl font-bold text-[#23392E]">Tu ramo, a tu manera</h2>
            <p className="mt-3 text-sm leading-6 text-[#5b5b50]">Puedes comprar un ramo prefabricado o seleccionar las flores que prefieras para construir una combinación propia.</p>
          </article>
          <article className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#23392E]/10">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D9714E]">Red local</p>
            <h2 className="mt-2 text-xl font-bold text-[#23392E]">Apoya floristerías físicas</h2>
            <p className="mt-3 text-sm leading-6 text-[#5b5b50]">MiJardín conecta a clientes con negocios locales para darles un espacio donde mostrar y ofrecer sus productos.</p>
          </article>
        </section>

        <section className="mt-12 rounded-3xl bg-[#F1E7D6] p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D9714E]">Arma tu ramo</p>
              <h2 className="mt-2 text-3xl font-bold text-[#23392E]">Elige las flores que más te gustan</h2>
              <p className="mt-3 leading-6 text-[#4a4a3f]">Selecciona varias flores y MiJardín puede reunirlas en un pedido. Es una propuesta de compra personalizada para que no tengas que visitar cada tienda.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['Rosas', 'Girasoles', 'Tulipanes', 'Lirios', 'Orquídeas'].map((flor) => <button key={flor} onClick={() => toggleCustomFlower(flor)} className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold ${custom.flores.includes(flor) ? 'border-[#D9714E] bg-[#D9714E] text-white' : 'border-[#7C9473] bg-[#FAF3E7] text-[#23392E]'}`}>{flor}</button>)}
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <select value={custom.envoltura} onChange={(e) => setCustom((a) => ({ ...a, envoltura: e.target.value }))} className="rounded-xl border-0 bg-[#FAF3E7] px-4 py-3 text-sm"><option>Kraft</option><option>Crema</option><option>Natural</option></select>
                <button onClick={addCustomBouquet} disabled={!custom.flores.length} className="cursor-pointer rounded-xl bg-[#23392E] px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Agregar ramo personalizado</button>
              </div>
            </div>
            <div className="rounded-2xl bg-[#FAF3E7] p-6">
              <h3 className="text-xl font-bold text-[#23392E]">¿Cómo funciona?</h3>
              <ol className="mt-4 space-y-4 text-sm leading-6 text-[#4a4a3f]">
                <li><strong>1. Explora:</strong> elige flores o ramos de nuestras tiendas asociadas.</li>
                <li><strong>2. Combina:</strong> agrega productos de una o varias tiendas al carrito.</li>
                <li><strong>3. Recolección:</strong> un repartidor visita los sitios indicados y recoge las flores.</li>
                <li><strong>4. Entrega:</strong> recibes tu pedido en casa para disfrutarlo o armar tu ramo.</li>
              </ol>
            </div>
          </div>
        </section>

        {puedePublicar && (
        <section className="mt-12 rounded-3xl bg-[#23392E] p-6 text-[#FAF3E7] sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E8AC4F]">Gestión de catálogo</p>
              <h2 className="mt-2 text-3xl font-bold">Publica flores en MiJardín</h2>
              <p className="mt-3 leading-6 text-[#F1E7D6]">Disponible para Administradores y Empleados. El producto se guarda directamente en la base de datos.</p>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!seller.tienda || !seller.producto || !seller.precio || !seller.descripcion) { setStoreMessage('Completa todos los datos del producto antes de publicarlo.'); return; }
              try {
                const res = await fetch(`${API_URL}/api/v1/productos`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({ nombre: seller.producto, descripcion: seller.descripcion, precio: Number(seller.precio), imagen: '' }),
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.detail || data.message || 'No fue posible publicar el producto.');
                await fetchProductos();
                setSeller({ tienda: '', producto: '', categoria: 'Flores', precio: '', descripcion: '' });
                setStoreMessage('Producto publicado en el catálogo.');
              } catch (err) {
                setStoreMessage(err.message || 'No fue posible publicar el producto.');
              }
            }} className="grid gap-3 sm:grid-cols-2">
              <input value={seller.tienda} onChange={(e) => setSeller((a) => ({ ...a, tienda: e.target.value }))} placeholder="Nombre de la tienda" className="rounded-xl border-0 bg-[#FAF3E7] px-4 py-3 text-sm text-[#2A2A22] outline-none focus:ring-2 focus:ring-[#D9714E]" />
              <input value={seller.producto} onChange={(e) => setSeller((a) => ({ ...a, producto: e.target.value }))} placeholder="Nombre de la flor o ramo" className="rounded-xl border-0 bg-[#FAF3E7] px-4 py-3 text-sm text-[#2A2A22] outline-none focus:ring-2 focus:ring-[#D9714E]" />
              <select value={seller.categoria} onChange={(e) => setSeller((a) => ({ ...a, categoria: e.target.value }))} className="rounded-xl border-0 bg-[#FAF3E7] px-4 py-3 text-sm text-[#2A2A22]"><option>Flores</option><option>Ramos</option><option>Plantas</option></select>
              <input type="number" min="1" value={seller.precio} onChange={(e) => setSeller((a) => ({ ...a, precio: e.target.value }))} placeholder="Precio en COP" className="rounded-xl border-0 bg-[#FAF3E7] px-4 py-3 text-sm text-[#2A2A22] outline-none focus:ring-2 focus:ring-[#D9714E]" />
              <textarea value={seller.descripcion} onChange={(e) => setSeller((a) => ({ ...a, descripcion: e.target.value }))} placeholder="Descripción del producto" rows="3" className="sm:col-span-2 rounded-xl border-0 bg-[#FAF3E7] px-4 py-3 text-sm text-[#2A2A22] outline-none focus:ring-2 focus:ring-[#D9714E]" />
              <button type="submit" className="sm:col-span-2 cursor-pointer rounded-xl bg-[#D9714E] px-5 py-3 font-bold text-white hover:bg-[#C15E3D]">Publicar producto</button>
            </form>
          </div>
        </section>
        )}

        <section className="mt-12">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D9714E]">Red de aliados</p>
          <h2 className="mt-2 text-3xl font-bold text-[#23392E]">Tiendas que pueden publicar sus flores</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {tiendas.map((tienda) => <div key={tienda.nombre} className="rounded-2xl border border-[#7C9473]/20 bg-white p-5 shadow-sm"><h3 className="text-xl font-bold text-[#23392E]">{tienda.nombre}</h3><p className="mt-1 text-sm font-semibold text-[#D9714E]">{tienda.zona}</p><p className="mt-3 text-sm leading-6 text-[#5b5b50]">{tienda.descripcion}</p></div>)}
          </div>
        </section>
      </section>

      {cartOpen && <div className="fixed inset-0 z-50 flex items-end justify-end bg-[#1a2b22]/60 p-0 sm:p-5" onClick={() => setCartOpen(false)}>
        <aside className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#FAF3E7] p-6 shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between"><h2 className="text-2xl font-bold text-[#23392E]">Tu carrito</h2><button onClick={() => setCartOpen(false)} className="cursor-pointer text-2xl text-[#23392E]">×</button></div>
          {!cart.length ? <p className="py-12 text-center text-[#5b5b50]">Aún no has agregado flores.</p> : <>
            <div className="mt-5 space-y-3">{cart.map((item) => <div key={item.id} className="flex gap-3 rounded-2xl bg-white p-3"><img src={item.imagen} alt="" className="h-16 w-16 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="font-bold text-[#23392E]">{item.nombre}</p><p className="text-sm text-[#D9714E]">{money(item.precio)}</p><div className="mt-1 flex items-center gap-2"><button onClick={() => changeQuantity(item.id, -1)} className="cursor-pointer h-7 w-7 rounded-full bg-[#F1E7D6]">−</button><span>{item.cantidad}</span><button onClick={() => changeQuantity(item.id, 1)} className="cursor-pointer h-7 w-7 rounded-full bg-[#F1E7D6]">+</button></div></div></div>)}</div>
            <div className="mt-6 border-t border-[#7C9473]/20 pt-4"><div className="flex justify-between text-lg font-bold text-[#23392E]"><span>Total</span><span>{money(subtotal)}</span></div><button onClick={checkout} className="mt-4 w-full cursor-pointer rounded-full bg-[#D9714E] py-3 font-bold text-white hover:bg-[#C15E3D]">Solicitar compra y reparto</button></div>
          </>}
        </aside>
      </div>}

      {pedidoConfirmado && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#1a2b22]/70 p-4"><div className="max-w-md rounded-3xl bg-[#FAF3E7] p-8 text-center shadow-2xl"><div className="text-5xl">🌷</div><h2 className="mt-3 text-2xl font-bold text-[#23392E]">¡Pedido recibido!</h2><p className="mt-3 leading-6 text-[#5b5b50]">La solicitud quedó registrada correctamente. Puedes consultar el estado y los cambios realizados por el equipo desde “Mis pedidos”.</p><button onClick={() => setPedidoConfirmado(false)} className="mt-6 cursor-pointer rounded-full bg-[#D9714E] px-6 py-3 font-bold text-white">Continuar comprando</button></div></div>}
    </main>
  );
}

export default Tienda;
