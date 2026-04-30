import { Resend } from 'resend';
import { env } from '../config/env';

// Initialize Resend conditionally.
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const fromEmail = env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'; // Default to Resend testing email

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email using Resend if configured, otherwise logs to the console (fallback).
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from: `Intecnia <${fromEmail}>`,
        to,
        subject,
        html,
      });

      if (error) {
        console.error('❌ Error sending email via Resend:', error);
      } else {
        console.log(`✅ Email sent via Resend to ${to}: "${subject}"`);
      }
    } catch (err) {
      console.error('❌ Unexpected error sending email:', err);
    }
  } else {
    // Fallback mode
    console.log(`\n=== 📧 EMAIL SIMULATION (Console Fallback) ===`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (HTML length: ${html.length} chars)`);
    console.log(`==============================================\n`);
  }
}

// ─── Email Templates ────────────────────────────────────────────────────────

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; color: #18181b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; color: #09090b; text-decoration: none; }
    .logo-accent { color: #2DBCFE; }
    .btn { display: inline-block; background-color: #09090b; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-top: 16px; }
    .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #71717a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Intecnia<span class="logo-accent">.</span></div>
    </div>
    ${content}
    <div class="footer">
      <p>© ${new Date().getFullYear()} Intecnia. Todos los derechos reservados.</p>
    </div>
  </div>
</body>
</html>
`;

export const emailTemplates = {
  welcome: (name: string, role: string) => baseTemplate(`
    <h2 style="color: #09090b; margin-bottom: 16px;">¡Bienvenido a Intecnia, ${name}!</h2>
    <p>Estamos emocionados de tenerte en nuestra plataforma.</p>
    ${role === 'PROFESSIONAL' 
      ? '<p>Como profesional, el siguiente paso es completar tu perfil y subir tus documentos para verificación. Esto te permitirá aparecer en nuestro directorio y empezar a recibir solicitudes.</p><a href="' + env.APP_URL + '/verification" class="btn">Completar Verificación</a>'
      : '<p>Explora nuestro directorio para encontrar a los mejores profesionales verificados en México.</p><a href="' + env.APP_URL + '/directory" class="btn">Explorar Directorio</a>'
    }
  `),

  resetPassword: (token: string) => baseTemplate(`
    <h2 style="color: #09090b; margin-bottom: 16px;">Recuperación de Contraseña</h2>
    <p>Hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el siguiente botón para crear una nueva.</p>
    <p>Este enlace expirará en 15 minutos.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${env.APP_URL}/reset-password?token=${token}" class="btn">Restablecer Contraseña</a>
    </div>
    <p style="font-size: 14px; color: #71717a;">Si no solicitaste esto, puedes ignorar este correo de forma segura.</p>
  `),

  verificationApproved: (name: string) => baseTemplate(`
    <h2 style="color: #09090b; margin-bottom: 16px;">¡Verificación Aprobada! 🎉</h2>
    <p>Hola ${name},</p>
    <p>Nos complace informarte que tus documentos han sido revisados y tu perfil ahora está <strong>Oficialmente Verificado</strong>.</p>
    <p>Ya apareces en el directorio público y los clientes pueden empezar a contactarte.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${env.APP_URL}/dashboard" class="btn">Ir a mi Dashboard</a>
    </div>
  `),

  verificationRejected: (name: string, reason: string) => baseTemplate(`
    <h2 style="color: #dc2626; margin-bottom: 16px;">Atención requerida con tu Verificación</h2>
    <p>Hola ${name},</p>
    <p>Hemos revisado los documentos que enviaste, pero lamentablemente no pudimos aprobarlos por el siguiente motivo:</p>
    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0; border-radius: 4px;">
      <p style="margin: 0; color: #991b1b;"><strong>${reason}</strong></p>
    </div>
    <p>Por favor, ingresa a tu panel y vuelve a subir los documentos correspondientes para que podamos verificar tu cuenta.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${env.APP_URL}/verification" class="btn">Actualizar Documentos</a>
    </div>
  `),
};
