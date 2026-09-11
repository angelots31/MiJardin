import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import ProtectedRoute from './components/ProtectedRoute';
import Index from './pages/Index';
import QuienesSomos from './pages/QuienesSomos';
import Contacto from './pages/Contacto';
import Login from './pages/Login';
import Tienda from './pages/Tienda';
import AdminDashboard from './pages/AdminDashboard';
import PanelEmpleado from './pages/PanelEmpleado';
import PanelCliente from './pages/PanelCliente';
import MisPedidos from './pages/MisPedidos';

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
        <Route path="/mi-cuenta" element={<ProtectedRoute roles={['Cliente']}><PanelCliente /></ProtectedRoute>} />
        <Route path="/mis-pedidos" element={<ProtectedRoute roles={['Cliente']}><MisPedidos /></ProtectedRoute>} />
      </Routes>
      <Footer />
      <WhatsAppButton />
    </BrowserRouter>
  );
}

export default App;
