import { useState } from 'react';
import Input from './Input';
import Button from './Button';
import { validateField } from './validation';
import { API_URL } from '../../api/config';

/** Extrae un mensaje legible del error que devuelve FastAPI. */
const mensajeDeError = (data, porDefecto) => {
  if (!data) return porDefecto;
  if (Array.isArray(data.detail) && data.detail.length) {
    return data.detail[0]?.msg || porDefecto;
  }
  return data.message || data.detail || porDefecto;
};

function RecoverPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    const nextError = validateField('email', email);
    setError(nextError);
    if (nextError) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        setServerError(mensajeDeError(data, 'No se pudo iniciar la recuperación.'));
        return;
      }
      setSent(
        data.message ||
          'Si el correo está registrado, recibirás el enlace para restablecer tu contraseña.',
      );
    } catch {
      setServerError('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-[#FAF3E7] p-7 shadow-xl sm:p-9">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D9714E]">MiJardín</p>
      <h1 className="mt-2 text-3xl font-bold text-[#23392E]">Recuperar contraseña</h1>
      <p className="mt-2 text-sm leading-6 text-[#4a4a3f]">
        Escribe tu correo y te enviaremos un enlace para crear una contraseña nueva.
      </p>

      {serverError && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {serverError}
        </div>
      )}

      {sent ? (
        <div className="mt-6 rounded-lg border border-[#7C9473]/40 bg-[#7C9473]/10 p-4 text-sm leading-6 text-[#23392E]" role="status">
          <strong className="block">Revisa tu correo 📩</strong>
          {sent}
          <span className="mt-2 block text-xs text-[#6B7B70]">
            Si no llega en unos minutos, revisa la carpeta de spam o vuelve a intentarlo.
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <Input
            label="Correo electrónico"
            name="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(validateField('email', e.target.value)); }}
            error={error}
            maxLength={80}
            mostrarContador={false}
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Enviando…' : 'Enviar enlace de recuperación'}
          </Button>
        </form>
      )}

      <button
        type="button"
        onClick={onBack}
        className="mt-5 w-full text-sm font-semibold text-[#D9714E] hover:underline"
      >
        ← Regresar al inicio de sesión
      </button>
    </div>
  );
}

export default RecoverPassword;
