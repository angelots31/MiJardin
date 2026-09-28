import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import Input from '../components/auth/Input';
import Button from '../components/auth/Button';
import { validateField } from '../components/auth/validation';
import { API_URL } from '../api/config';

/** Extrae un mensaje legible del error que devuelve FastAPI. */
const mensajeDeError = (data, porDefecto) => {
  if (!data) return porDefecto;
  if (Array.isArray(data.detail) && data.detail.length) {
    return data.detail[0]?.msg || porDefecto;
  }
  return data.message || data.detail || porDefecto;
};

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const siguiente = { ...form, [name]: value };
    setForm(siguiente);
    setErrors((prev) => {
      const next = { ...prev, [name]: validateField(name, value, siguiente) };
      // Al cambiar la contraseña se vuelve a comparar la confirmación.
      if (name === 'password' && siguiente.confirmPassword) {
        next.confirmPassword = validateField('confirmPassword', siguiente.confirmPassword, siguiente);
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    const nextErrors = {
      password: validateField('password', form.password),
      confirmPassword: validateField('confirmPassword', form.confirmPassword, form),
    };
    setErrors(nextErrors);
    if (nextErrors.password || nextErrors.confirmPassword) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: form.password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        setServerError(mensajeDeError(data, 'No se pudo actualizar la contraseña.'));
        return;
      }
      setDone(data.message || 'Tu contraseña se actualizó correctamente.');
    } catch {
      setServerError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-74px)] bg-[#FAF3E7] px-4 py-12">
      <section className="mx-auto w-full max-w-md rounded-2xl bg-[#FAF3E7] p-7 shadow-xl ring-1 ring-[#23392E]/10 sm:p-9">
        <div className="mb-7 text-center">
          <div className="mb-4 flex justify-center">
            <Logo size={58} tono="oscuro" />
          </div>
          <h1 className="text-3xl font-bold text-[#23392E]">Contraseña nueva</h1>
          <p className="mt-2 text-sm text-[#4a4a3f]">Crea una contraseña segura para tu cuenta.</p>
        </div>

        {!token && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700" role="alert">
            <strong className="block">Enlace inválido</strong>
            El enlace de recuperación está incompleto. Solicita uno nuevo desde la opción
            &quot;¿Olvidaste tu contraseña?&quot;.
          </div>
        )}

        {serverError && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
            {serverError}
          </div>
        )}

        {done ? (
          <div className="rounded-2xl border border-[#7C9473]/40 bg-[#E7EFE2] p-4 text-sm leading-6 text-[#23392E]" role="status">
            <strong className="block">¡Listo! 🌷</strong>
            {done}
          </div>
        ) : (
          token && (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Input
                label="Nueva contraseña"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                error={errors.password}
                maxLength={20}
                minLength={9}
                mostrarContador={false}
              />
              <Input
                label="Confirmar contraseña"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                maxLength={20}
                minLength={9}
                mostrarContador={false}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Guardando…' : 'Guardar contraseña'}
              </Button>
            </form>
          )
        )}

        <Link
          to="/login"
          className="mt-5 block w-full text-center text-sm font-semibold text-[#D9714E] hover:underline"
        >
          ← Ir a iniciar sesión
        </Link>
      </section>
    </main>
  );
}

export default ResetPassword;
