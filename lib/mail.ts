import nodemailer from 'nodemailer';

export async function sendPasswordResetEmail({ to, tempPassword, name }: { to: string; tempPassword: string; name?: string }) {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const SENDER_EMAIL = process.env.EMAIL_FROM || process.env.SENDER_EMAIL;

  // 1) Try SendGrid if configured
  if (SENDGRID_API_KEY && SENDER_EMAIL) {
    const body = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: 'Réinitialisation de votre mot de passe',
        },
      ],
      from: { email: SENDER_EMAIL, name: 'MC Barber' },
      content: [
        {
          type: 'text/plain',
          value: `Bonjour${name ? ' ' + name : ''},\n\nUn administrateur a réinitialisé votre mot de passe. Votre mot de passe temporaire est : ${tempPassword}\n\nVeuillez vous connecter et le changer immédiatement.\n\nCordialement,\nL'équipe MC Barber`,
        },
      ],
    };

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`SendGrid error: ${res.status} ${text}`);
    }

    return true;
  }

  // 2) Try SMTP via nodemailer if configured
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;

  if (SMTP_HOST && SMTP_PORT && SENDER_EMAIL) {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });

    const info = await transporter.sendMail({
      from: `${'MC Barber'} <${SENDER_EMAIL}>`,
      to,
      subject: 'Réinitialisation de votre mot de passe',
      text: `Bonjour${name ? ' ' + name : ''},\n\nUn administrateur a réinitialisé votre mot de passe. Votre mot de passe temporaire est : ${tempPassword}\n\nVeuillez vous connecter et le changer immédiatement.\n\nCordialement,\nL'équipe MC Barber`,
    });

    if (!info.accepted || info.accepted.length === 0) {
      throw new Error('SMTP send failed');
    }

    return true;
  }

  // No provider configured
  return false;
}
