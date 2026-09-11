const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]+$/;
const documentRegex = /^\d{6,12}$/;
const phoneRegex = /^\d{7,10}$/;
// El backend (main.py) exige mínimo 9 caracteres; el frontend debe validar igual
// para no dejar pasar contraseñas que luego el servidor va a rechazar.
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{9,20}$/;

export const validateField = (name, value, form = {}) => {
  const v = value.trim();
  if (!v && name !== 'confirmPassword') return 'Este campo es obligatorio.';
  if (name === 'confirmPassword' && !v) return 'Confirma tu contraseña.';

  if (['nombre', 'apellido'].includes(name)) {
    if (v.length < 2 || v.length > 40) return 'Debe tener entre 2 y 40 caracteres.';
    if (!nameRegex.test(v)) return 'Solo se permiten letras y espacios.';
  }
  if (name === 'tipoDocumento' && !v) return 'Selecciona un tipo de documento.';
  if (name === 'numeroDocumento' && !documentRegex.test(v)) return 'Usa entre 6 y 12 números.';
  if (name === 'direccion') {
    if (v.length < 5 || v.length > 100) return 'Debe tener entre 5 y 100 caracteres.';
  }
  if (name === 'telefono' && !phoneRegex.test(v)) return 'Usa entre 7 y 10 números.';
  if (['correo', 'email'].includes(name) && !emailRegex.test(v)) return 'Ingresa un correo válido.';
  if (name === 'contraseña' || name === 'password') {
    if (!passwordRegex.test(v)) return '9-20 caracteres, al menos una letra y un número.';
  }
  if (name === 'confirmPassword' && v !== form.contraseña) return 'Las contraseñas no coinciden.';
  return '';
};

export const validateRegister = (form) => {
  const errors = {};
  Object.keys(form).forEach((key) => {
    const error = validateField(key, form[key], form);
    if (error) errors[key] = error;
  });
  return errors;
};