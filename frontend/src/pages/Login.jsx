import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import Input from '../components/auth/Input';
import Button from '../components/auth/Button';
import RegisterModal from '../components/auth/RegisterModal';
import RecoverPassword from '../components/auth/RecoverPassword';
import { validateField } from '../components/auth/validation';
import { API_URL } from '../api/config';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [remember, setRemember] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [recover, setRecover] = useState(false);
  const [pageMessage, setPageMessage] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const returnTo = location.state?.returnTo || '/';

  useEffect(() => {
    if (location.state?.registered) {
      setPageMessage('¡Registro exitoso! Tu cuenta ya fue creada. Ahora inicia sesión para continuar.');
      navigate(location.pathname, { replace: true, state: { returnTo } });
    }
  }, [location, navigate, returnTo]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    const validationName = name === 'email' ? 'email' : 'password';
    setErrors((prev) => ({ ...prev, [name]: validateField(validationName, value) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    const nextErrors = {
      email: validateField('email', form.email),
      password: validateField('password', form.password)
    };
    setErrors(nextErrors);

    if (nextErrors.email || nextErrors.password) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setServerError(data.message || 'Credenciales incorrectas.');
        return;
      }

      const usuario = data.usuario;

      localStorage.setItem('mijardin_logged', 'true');
      localStorage.setItem('mijardin_token', data.token);
      localStorage.setItem('mijardin_user', usuario.email);
      localStorage.setItem('mijardin_user_name', usuario.nombres);
      localStorage.setItem('mijardin_user_id', usuario.id_usuario);
      localStorage.setItem('mijardin_user_role', String(usuario.rol_id));
      localStorage.setItem('mijardin_user_role_nombre', usuario.rol_nombre);
      localStorage.setItem('mijardin_remember', remember ? 'true' : 'false');

      // Si nadie pidió una ruta concreta, tras iniciar sesión siempre volvemos
      // al inicio; cada rol entra a su panel desde el menú del encabezado.
      const destination = returnTo.startsWith('/') && returnTo !== '/' ? returnTo : '/';
      navigate(destination, { state: { loginSuccess: true, userName: usuario.nombres } });
    } catch (error) {
      setServerError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegistered = () => {
    setRegisterOpen(false);
    setPageMessage('');
  };

  if (recover) return <main className="min-h-[calc(100vh-74px)] bg-[#FAF3E7] px-4 py-12"><RecoverPassword onBack={() => setRecover(false)} /></main>;

  return (
    <main className="min-h-[calc(100vh-74px)] bg-[#FAF3E7] px-4 py-12">
      <section className="mx-auto w-full max-w-md rounded-2xl bg-[#FAF3E7] p-7 shadow-xl ring-1 ring-[#23392E]/10 sm:p-9">
        {pageMessage && (
          <div className="mb-6 rounded-2xl border border-[#7C9473]/30 bg-[#E7EFE2] p-4 text-sm leading-6 text-[#23392E]" role="status">
            <strong className="block text-base">¡Cuenta creada! 🌷</strong>
            <span>{pageMessage.replace('¡Registro exitoso! ', '')}</span>
          </div>
        )}

        {serverError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {serverError}
          </div>
        )}

        <div className="mb-7 text-center">
          <div className="mb-4 flex justify-center">
            <Logo size={58} tono="oscuro" />
          </div>
          <h1 className="text-3xl font-bold text-[#23392E]">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-[#4a4a3f]">Accede a tu cuenta para continuar.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Input label="Correo electrónico" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} maxLength={80} />
          <Input label="Contraseña" name="password" type="password" value={form.password} onChange={handleChange} error={errors.password} maxLength={20} />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#4a4a3f]">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-[#D9714E]" />
            Recordarme / No cerrar sesión
          </label>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Ingresando...' : 'Iniciar sesión'}</Button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-3 text-sm">
          <button type="button" onClick={() => setRecover(true)} className="font-semibold text-[#D9714E] hover:underline">¿Olvidaste tu contraseña?</button>
          <span className="text-[#4a4a3f]">¿No tienes una cuenta?</span>
          <button type="button" onClick={() => setRegisterOpen(true)} className="font-semibold text-[#D9714E] hover:underline">Crear una cuenta</button>
        </div>
      </section>
      <RegisterModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        returnTo={returnTo}
        onRegistered={handleRegistered}
      />
    </main>
  );
}

export default Login;