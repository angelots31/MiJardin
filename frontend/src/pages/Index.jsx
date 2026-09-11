import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Carousel from '../components/Carousel';
import imagenesCarrusel from '../data/imagenesCarrusel';
import './Index.css';
import Toast from '../components/ui/Toast';

import { motion } from 'framer-motion';
function Index() {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (location.state?.loginSuccess) {
      setMessage(`¡Bienvenido, ${location.state.userName}! Iniciaste sesión correctamente.`);
      navigate('/', { replace: true, state: {} });
    }
  }, [location, navigate]);

  return (
    <main className="bg-[#FAF3E7]">
      <motion.section className="inicio-carrusel relative w-full overflow-hidden">
      <Toast message={message} onClose={() => setMessage('')} />
        <Carousel items={imagenesCarrusel} />
      </motion.section>
      <motion.section initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <p className="eyebrow">Descubre MiJardín</p>
        <h1 className="mt-2 text-3xl font-bold text-[#23392E] sm:text-4xl">Flores, inspiración y compras en un solo lugar</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#4a4a3f]">Explora nuestra colección de flores, conoce la historia de MiJardín y visita la tienda para descubrir productos de diferentes floristerías. Puedes elegir un ramo ya preparado o combinar flores para crear una propuesta más personal.</p>
        <div className="mt-7 grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#23392E]/10"><h2 className="text-xl font-bold text-[#23392E]">Inspírate</h2><p className="mt-2 text-sm leading-6 text-[#5b5b50]">Conoce diferentes flores, colores y estilos para encontrar una idea que combine contigo.</p></article>
          <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#23392E]/10"><h2 className="text-xl font-bold text-[#23392E]">Personaliza</h2><p className="mt-2 text-sm leading-6 text-[#5b5b50]">Elige flores individuales o ramos prefabricados y construye una compra a tu medida.</p></article>
          <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#23392E]/10"><h2 className="text-xl font-bold text-[#23392E]">Apoya negocios locales</h2><p className="mt-2 text-sm leading-6 text-[#5b5b50]">La propuesta conecta floristerías físicas con nuevos clientes mediante un catálogo digital.</p></article>
        </div>
      </motion.section>
    </main>
  );
}

export default Index;
