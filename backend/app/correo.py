"""Envío de correos por SMTP para la recuperación de contraseña.

Usa solo la librería estándar (smtplib + email), así que no agrega
dependencias al proyecto. Se configura con variables de entorno:

    SMTP_HOST      servidor SMTP (p. ej. smtp.gmail.com)     [obligatoria]
    SMTP_PORT      puerto (587 con STARTTLS, 465 con SSL)    [opcional]
    SMTP_USER      usuario/correo que envía                  [obligatoria]
    SMTP_PASSWORD  contraseña o "app password" del proveedor [obligatoria]
    SMTP_FROM      remitente visible (por defecto SMTP_USER) [opcional]
    SMTP_SSL       "true" para usar SSL directo (puerto 465) [opcional]
    SMTP_STARTTLS  "true" (por defecto) para usar STARTTLS   [opcional]

Con Gmail hay que crear una "contraseña de aplicación" (no sirve la
contraseña normal de la cuenta).
"""

import os
import smtplib
import ssl
from email.message import EmailMessage


class CorreoNoConfigurado(Exception):
    """El servidor no tiene credenciales SMTP configuradas."""


def _verdadero(valor, por_defecto=False):
    if valor is None or str(valor).strip() == "":
        return por_defecto
    return str(valor).strip().lower() in ("1", "true", "si", "sí", "yes", "on")


def smtp_configurado():
    """Indica si hay lo mínimo para intentar enviar correos."""
    return bool(
        os.getenv("SMTP_HOST")
        and os.getenv("SMTP_USER")
        and os.getenv("SMTP_PASSWORD")
    )


def enviar_correo(destinatario, asunto, texto, html=None):
    """Envía un correo de texto (y opcionalmente HTML).

    Lanza CorreoNoConfigurado si faltan variables y la excepción original de
    smtplib si el envío falla, para que quien llame decida el mensaje.
    """
    if not smtp_configurado():
        raise CorreoNoConfigurado(
            "El envío de correos no está configurado. Define SMTP_HOST, "
            "SMTP_USER y SMTP_PASSWORD en backend/.env."
        )

    usar_ssl = _verdadero(os.getenv("SMTP_SSL"))
    host = os.getenv("SMTP_HOST")
    puerto = int(os.getenv("SMTP_PORT") or ("465" if usar_ssl else "587"))
    remitente = os.getenv("SMTP_FROM") or os.getenv("SMTP_USER")

    mensaje = EmailMessage()
    mensaje["From"] = remitente
    mensaje["To"] = destinatario
    mensaje["Subject"] = asunto
    mensaje.set_content(texto)
    if html:
        mensaje.add_alternative(html, subtype="html")

    contexto = ssl.create_default_context()
    if usar_ssl:
        with smtplib.SMTP_SSL(host, puerto, context=contexto, timeout=20) as servidor:
            servidor.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
            servidor.send_message(mensaje)
    else:
        with smtplib.SMTP(host, puerto, timeout=20) as servidor:
            if _verdadero(os.getenv("SMTP_STARTTLS"), True):
                servidor.starttls(context=contexto)
            servidor.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
            servidor.send_message(mensaje)


def enviar_correo_recuperacion(destinatario, nombre, enlace, minutos_vigencia):
    """Correo con el enlace para restablecer la contraseña."""
    nombre = (nombre or "hola").strip().split(" ")[0]
    asunto = "MiJardín · Recupera tu contraseña"

    texto = (
        f"Hola {nombre},\n\n"
        "Recibimos una solicitud para restablecer la contraseña de tu cuenta "
        "en MiJardín.\n\n"
        f"Abre este enlace para crear una contraseña nueva (vence en "
        f"{minutos_vigencia} minutos):\n{enlace}\n\n"
        "Si no fuiste tú, ignora este mensaje: tu contraseña seguirá igual.\n\n"
        "— Equipo MiJardín 🌷"
    )

    html = f"""\
<div style="font-family:Arial,sans-serif;background:#FAF3E7;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px">
    <p style="margin:0;color:#D9714E;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px">MiJardín</p>
    <h1 style="color:#23392E;font-size:22px;margin:8px 0 16px">Recupera tu contraseña</h1>
    <p style="color:#4a4a3f;font-size:15px;line-height:1.6">Hola {nombre}, recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
    <p style="text-align:center;margin:24px 0">
      <a href="{enlace}" style="background:#23392E;color:#FAF3E7;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700">Crear contraseña nueva</a>
    </p>
    <p style="color:#6B7B70;font-size:13px;line-height:1.6">El enlace vence en {minutos_vigencia} minutos. Si no fuiste tú, ignora este mensaje: tu contraseña seguirá igual.</p>
    <p style="color:#6B7B70;font-size:12px;word-break:break-all">Si el botón no funciona, copia y pega este enlace:<br>{enlace}</p>
  </div>
</div>"""

    enviar_correo(destinatario, asunto, texto, html)
