import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import Chatbot from './components/Chatbot';
import ProtectedRoute from './components/ProtectedRoute';
import Index from './pages/Index';
import QuienesSomos from './pages/QuienesSomos';
import Contacto from './pages/Contacto';
import Login from './pages/Login';
import Tienda from './pages/Tienda';
import AdminDashboard from './pages/AdminDashboard';
import PanelEmpleado from './pages/PanelEmpleado';
import PanelCliente from './pages/PanelCliente';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/quienes-somos" element={<QuienesSomos />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/login" element={<Login />} />
        <Route path="/tienda" element={<Tienda />} />
        <Route path="/admin" element={<ProtectedRoute roles={['Administrador']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/empleado" element={<ProtectedRoute roles={['Empleado']}><PanelEmpleado /></ProtectedRoute>} />
        {/* Todo el panel del cliente vive en una sola página con sidebar. */}
        <Route path="/mi-cuenta" element={<ProtectedRoute roles={['Cliente']}><PanelCliente /></ProtectedRoute>} />
        {/* Rutas anteriores: se conservan como redirecciones para no romper enlaces guardados. */}
        <Route path="/mis-pedidos" element={<Navigate to="/mi-cuenta?seccion=pedidos" replace />} />
        <Route path="/mis-compras" element={<Navigate to="/mi-cuenta?seccion=compras" replace />} />
        <Route path="/mis-pqr" element={<Navigate to="/mi-cuenta?seccion=pqr" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      <WhatsAppButton />
      <Chatbot />
    </BrowserRouter>
  );
}

export default App;
