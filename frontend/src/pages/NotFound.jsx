import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-74px)] bg-jardin-fondo text-jardin-verde flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-64 h-64 rounded-full bg-jardin-terracota/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 rounded-full bg-jardin-verde/5 blur-3xl pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center relative z-10"
      >
        <h1 className="text-9xl font-display font-bold text-jardin-terracota mb-4 flex items-center justify-center gap-4">
          404 <span className="text-7xl">🌸</span>
        </h1>
        <h2 className="text-2xl font-bold mb-4 font-display">Página no encontrada</h2>
        <p className="text-lg mb-8 max-w-md mx-auto text-jardin-verde/80">
          Esta página no existe o fue movida. ¿Te perdiste en el jardín?
        </p>
        <Link
          to="/"
          className="inline-block bg-jardin-terracota text-white px-8 py-3.5 rounded-full font-semibold hover:bg-jardin-terracota/90 transition-all shadow-sm hover:shadow-lg hover:shadow-jardin-terracota/25 hover:-translate-y-0.5"
        >
          Volver al inicio
        </Link>
      </motion.div>
    </div>
  );
}
