import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import { validateField, validateRegister } from './validation';
import { API_URL } from '../../api/config';

const initialForm = {
  nombre: '', apellido: '', tipoDocumento: '', numeroDocumento: '', direccion: '',
  telefono: '', correo: '', contraseña: '', confirmPassword: ''
};

function RegisterModal({ open, onClose, returnTo = '/', onRegistered }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const navigate = useNavigate();

  if (!open) return null;

  const handleClose = () => {
    setForm(initialForm);
    setErrors({});
    setSubmitted(false);
    onClose();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value, { ...form, [name]: value }) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    const nextErrors = validateRegister(form);
    setErrors(nextErrors);
    setSubmitted(true);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    try {
      // El backend (FastAPI) espera los campos con estos nombres exactos
      // (ver RegisterUser en backend/main.py), distintos a los del formulario.
      const payload = {
        nombres: form.nombre,
        apellidos: form.apellido,
        tipo_documento: form.tipoDocumento,
        numero_documento: form.numeroDocumento,
        direccion: form.direccion,
        telefono: form.telefono,
        email: form.correo,
        password: form.contraseña,
      };

      const response = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        // El backend responde con { success: false, message: '...' }
        // cuando hay un correo/documento duplicado o datos inválidos.
        setServerError(data.message || 'No se pudo completar el registro.');
        return;
      }

      onRegistered?.();
      handleClose();
      navigate('/login', { replace: true, state: { registered: true, returnTo } });
    } catch (error) {
      // Esto ocurre si el backend no está corriendo o hay un problema de red.
      setServerError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1a2b22]/70 p-4" role="dialog" aria-modal="true" aria-labelledby="registro-titulo">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[#FAF3E7] p-5 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D9714E]">MiJardín</p>
            <h2 id="registro-titulo" className="mt-1 text-2xl font-bold text-[#23392E]">Crear una cuenta</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full px-3 py-1 text-2xl text-[#23392E] hover:bg-[#F1E7D6]">×</button>
        </div>

        {submitted && Object.keys(errors).length > 0 && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Revisa los campos marcados antes de continuar.</div>
        )}

        {serverError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
        )}

        <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Nombre" name="nombre" value={form.nombre} onChange={handleChange} error={errors.nombre} maxLength={40} />
          <Input label="Apellido" name="apellido" value={form.apellido} onChange={handleChange} error={errors.apellido} maxLength={40} />
          <Select label="Tipo de documento" name="tipoDocumento" value={form.tipoDocumento} onChange={handleChange} error={errors.tipoDocumento} options={[{value:'CC',label:'Cédula de ciudadanía'}, {value:'TI',label:'Tarjeta de identidad'}, {value:'CE',label:'Cédula de extranjería'}, {value:'Pasaporte',label:'Pasaporte'}]} />
          <Input label="Número de documento" name="numeroDocumento" value={form.numeroDocumento} onChange={handleChange} error={errors.numeroDocumento} maxLength={12} />
          <div className="sm:col-span-2"><Input label="Dirección" name="direccion" value={form.direccion} onChange={handleChange} error={errors.direccion} maxLength={100} /></div>
          <Input label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} error={errors.telefono} maxLength={10} />
          <Input label="Correo electrónico" name="correo" type="email" value={form.correo} onChange={handleChange} error={errors.correo} maxLength={80} />
          <Input label="Contraseña" name="contraseña" type="password" value={form.contraseña} onChange={handleChange} error={errors.contraseña} maxLength={20} />
          <Input label="Confirmación de contraseña" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} error={errors.confirmPassword} maxLength={20} />
          <div className="flex flex-col gap-2 pt-2 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Registrando...' : 'Registrarme'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterModal;