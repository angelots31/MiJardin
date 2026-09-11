import { useState } from 'react';
import Input from './Input';
import Button from './Button';
import { validateField } from './validation';

function RecoverPassword({ onBack }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextError = validateField('email', email);
    setError(nextError);
    if (!nextError) setSent(true);
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-[#FAF3E7] p-7 shadow-xl sm:p-9">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D9714E]">MiJardín</p>
      <h1 className="mt-2 text-3xl font-bold text-[#23392E]">Recuperar contraseña</h1>
      <p className="mt-2 text-sm leading-6 text-[#4a4a3f]">Escribe tu correo para solicitar la recuperación de tu contraseña.</p>
      {sent ? (
        <div className="mt-6 rounded-lg border border-[#7C9473]/40 bg-[#7C9473]/10 p-4 text-sm text-[#23392E]">Si el correo es válido, recibirás las instrucciones de recuperación.</div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <Input label="Correo electrónico" name="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(validateField('email', e.target.value)); }} error={error} maxLength={80} />
          <Button type="submit" className="w-full">Recuperar contraseña</Button>
        </form>
      )}
      <button type="button" onClick={onBack} className="mt-5 w-full text-sm font-semibold text-[#D9714E] hover:underline">← Regresar al inicio de sesión</button>
    </div>
  );
}

export default RecoverPassword;
