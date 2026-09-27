import { API_URL } from './config';

/**
 * Cliente HTTP del proyecto.
 *
 * Centraliza tres cosas que antes se repetían en cada componente:
 * el token JWT, la lectura de la respuesta y el mensaje de error.
 * Así los paneles nuevos solo se preocupan por los datos.
 */

export const getToken = () => localStorage.getItem('mijardin_token');

export const authHeaders = () => {
  const token = getToken();
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

/** Claves de sesión que se borran al cerrarla o al expirar el token. */
const CLAVES_SESION = [
  'mijardin_logged', 'mijardin_token', 'mijardin_user', 'mijardin_user_name',
  'mijardin_user_id', 'mijardin_user_role', 'mijardin_user_role_nombre', 'mijardin_remember',
];

/** Borra la sesión y manda al login cuando el token ya no sirve. */
export const cerrarSesionExpirada = () => {
  CLAVES_SESION.forEach((clave) => localStorage.removeItem(clave));
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};

/** Lee el `exp` del JWT sin dependencias externas. */
export const tokenPorExpirar = () => {
  const token = getToken();
  if (!token) return false;
  try {
    const base = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const datos = JSON.parse(atob(base));
    if (!datos.exp) return false;
    // Se renueva cuando queda menos de una hora de sesión.
    return datos.exp - Date.now() / 1000 < 3600;
  } catch {
    return false;
  }
};

/** Pide un token nuevo con el token actual. Devuelve true si lo consiguió. */
export const refrescarToken = async () => {
  const token = getToken();
  if (!token) return false;
  try {
    const respuesta = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    if (!respuesta.ok) return false;
    const datos = await respuesta.json();
    if (!datos.success || !datos.token) return false;
    localStorage.setItem('mijardin_token', datos.token);
    return true;
  } catch {
    return false;
  }
};

/** Convierte un objeto en query string, ignorando los campos vacíos. */
export const toQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([clave, valor]) => {
    if (valor !== '' && valor !== null && valor !== undefined) query.append(clave, valor);
  });
  const texto = query.toString();
  return texto ? `?${texto}` : '';
};

/**
 * Hace la petición y devuelve el JSON ya validado.
 * Si el backend responde con error, lanza un Error con su mensaje,
 * para que quien llame solo tenga que envolver en try/catch.
 */
export async function api(ruta, opciones = {}) {
  // Antes de pedir nada, si la sesión está por vencer se renueva en silencio.
  if (tokenPorExpirar()) await refrescarToken();

  const hacerPeticion = () => fetch(`${API_URL}${ruta}`, { headers: authHeaders(), ...opciones });

  let respuesta;
  try {
    respuesta = await hacerPeticion();
  } catch {
    throw new Error('No hay conexión con el servidor. Revisa que el backend esté corriendo.');
  }

  if (respuesta.status === 401) {
    // Reintento único por si el token acababa de vencer.
    if (await refrescarToken()) {
      try {
        respuesta = await hacerPeticion();
      } catch {
        throw new Error('No hay conexión con el servidor. Revisa que el backend esté corriendo.');
      }
    }
    if (respuesta.status === 401) {
      cerrarSesionExpirada();
      throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
    }
  }

  let datos;
  try {
    datos = await respuesta.json();
  } catch {
    datos = {};
  }

  if (!respuesta.ok || datos.success === false) {
    throw new Error(datos.detail || datos.message || 'No fue posible completar la operación.');
  }
  return datos;
}

/**
 * Descarga un archivo (PDF o Excel) desde un endpoint protegido.
 *
 * No se puede usar un <a href> normal porque la ruta exige el header
 * Authorization: se pide el archivo con fetch, se convierte en blob y se
 * dispara la descarga con un enlace temporal.
 */
export async function descargarArchivo(ruta, nombreSugerido) {
  const respuesta = await fetch(`${API_URL}${ruta}`, { headers: authHeaders() });
  if (!respuesta.ok) {
    let mensaje = 'No fue posible generar el archivo.';
    try {
      const error = await respuesta.json();
      mensaje = error.detail || error.message || mensaje;
    } catch { /* la respuesta no era JSON */ }
    throw new Error(mensaje);
  }

  const blob = await respuesta.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreSugerido;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

/** Formatea un número como pesos colombianos. */
export const pesos = (valor) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(valor) || 0);

/** Formatea una fecha que viene del backend. */
export const fechaCorta = (valor) => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime())
    ? String(valor)
    : fecha.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
};

/** Fecha de hoy en formato AAAA-MM-DD, para los inputs type="date". */
export const hoyISO = () => new Date().toISOString().slice(0, 10);
