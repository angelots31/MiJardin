const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const nameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]+$/;
const documentRegex = /^\d{6,12}$/;
const phoneRegex = /^\d{7,10}$/;
// El backend (main.py) exige mínimo 9 caracteres; el frontend debe validar igual
// para no dejar pasar contraseñas que luego el servidor va a rechazar.
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{9,20}$/;

// El registro usa nombres en camelCase y el panel de admin los usa en
// snake_case; aquí se normalizan para validar igual en ambos formularios.
const ALIAS = {
  nombres: 'nombre',
  apellidos: 'apellido',
  tipo_documento: 'tipoDocumento',
  numero_documento: 'numeroDocumento',
  email: 'correo',
  password: 'contraseña',
};

export const validateField = (name, value, form = {}) => {
  const campo = ALIAS[name] || name;
  const v = String(value ?? '').trim();
  if (!v && campo !== 'confirmPassword') return 'Este campo es obligatorio.';
  if (campo === 'confirmPassword' && !v) return 'Confirma tu contraseña.';

  if (['nombre', 'apellido'].includes(campo)) {
    if (v.length < 2 || v.length > 40) return 'Debe tener entre 2 y 40 caracteres.';
    if (!nameRegex.test(v)) return 'Solo se permiten letras y espacios.';
  }
  if (campo === 'tipoDocumento' && !v) return 'Selecciona un tipo de documento.';
  if (campo === 'numeroDocumento' && !documentRegex.test(v)) return 'Usa entre 6 y 12 números.';
  if (campo === 'direccion') {
    if (v.length < 5 || v.length > 100) return 'Debe tener entre 5 y 100 caracteres.';
  }
  if (campo === 'telefono' && !phoneRegex.test(v)) return 'Usa entre 7 y 10 números.';
  if (campo === 'correo' && !emailRegex.test(v)) return 'Ingresa un correo válido.';
  if (campo === 'contraseña') {
    if (!passwordRegex.test(v)) return '9-20 caracteres, al menos una letra y un número.';
  }
  if (campo === 'rol_id' && !['1', '2', '4'].includes(v)) return 'Selecciona un rol válido.';
  // El registro usa `contraseña` y el panel de admin `password`; la
  // confirmación debe compararse con la que exista en cada formulario.
  if (campo === 'confirmPassword' && v !== (form.contraseña ?? form.password)) return 'Las contraseñas no coinciden.';
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

/**
 * Progreso del formulario: cuántos datos ya están completos y cuántos se
 * piden en total (p. ej. "3 de 9"). Sirve para la barra de registro y para
 * la de creación de usuarios desde el panel de administración.
 */
export const progresoFormulario = (form) => {
  const campos = Object.keys(form);
  const completados = campos.filter((campo) => !validateField(campo, form[campo], form)).length;
  return { completados, total: campos.length };
};
