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

export async function sendReceiptEmail({
  to,
  receiptNumber,
  total,
  date,
  customerName,
  type = 'barber',
}: {
  to: string;
  receiptNumber: string;
  total: number;
  date: Date;
  customerName?: string;
  type?: 'barber' | 'store';
}) {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const SENDER_EMAIL = process.env.EMAIL_FROM || process.env.SENDER_EMAIL;

  const formattedDate = date.toLocaleDateString('fr-FR');
  const formattedTotal = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'HTG',
  }).format(total);

  const subject = `Reçu ${type === 'barber' ? 'Service Barber' : 'Vente Boutique'} - ${receiptNumber}`;
  const typeLabel = type === 'barber' ? 'service barber' : 'vente boutique';

  if (SENDGRID_API_KEY && SENDER_EMAIL) {
    const body = {
      personalizations: [
        {
          to: [{ email: to }],
          subject,
        },
      ],
      from: { email: SENDER_EMAIL, name: 'MC Multi-Service' },
      content: [
        {
          type: 'text/html',
          value: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #000; color: #d4af37; padding: 20px; text-align: center; border-radius: 8px;">
              <h1 style="margin: 0; font-size: 24px;">MC-Multi-Service</h1>
              <p style="margin: 5px 0; font-size: 14px;">Reçu de ${typeLabel}</p>
            </div>
            <div style="border: 1px solid #ddd; padding: 20px; margin-top: 20px; border-radius: 8px;">
              <p>Bonjour${customerName ? ' ' + customerName : ''},</p>
              <p>Merci pour votre ${type === 'barber' ? 'visite' : 'achat'} chez MC-Multi-Service !</p>
              <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <p><strong>Numéro de reçu :</strong> ${receiptNumber}</p>
                <p><strong>Date :</strong> ${formattedDate}</p>
                <p><strong>Montant total :</strong> ${formattedTotal}</p>
              </div>
              <p style="color: #666; font-size: 12px;">Ce reçu est valide. Conservez-le à titre de preuve d'achat.</p>
              <p style="margin-top: 30px; color: #999; font-size: 12px;">Au plaisir de vous revoir bientôt !<br>L'équipe MC-Multi-Service</p>
            </div>
          </div>`,
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

  // Fallback to SMTP
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
      from: `MC Multi-Service <${SENDER_EMAIL}>`,
      to,
      subject,
      text: `Bonjour${customerName ? ' ' + customerName : ''},\n\nMerci pour votre ${type === 'barber' ? 'visite' : 'achat'} chez MC-Multi-Service !\n\nReçu : ${receiptNumber}\nDate : ${formattedDate}\nMontant : ${formattedTotal}\n\nAu plaisir de vous revoir !\nL'équipe MC-Multi-Service`,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #000; color: #d4af37; padding: 20px; text-align: center; border-radius: 8px;">
          <h1 style="margin: 0; font-size: 24px;">MC-Multi-Service</h1>
          <p style="margin: 5px 0; font-size: 14px;">Reçu de ${typeLabel}</p>
        </div>
        <div style="border: 1px solid #ddd; padding: 20px; margin-top: 20px; border-radius: 8px;">
          <p>Bonjour${customerName ? ' ' + customerName : ''},</p>
          <p>Merci pour votre ${type === 'barber' ? 'visite' : 'achat'} chez MC-Multi-Service !</p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Numéro de reçu :</strong> ${receiptNumber}</p>
            <p><strong>Date :</strong> ${formattedDate}</p>
            <p><strong>Montant :</strong> ${formattedTotal}</p>
          </div>
          <p style="color: #666; font-size: 12px;">Au plaisir de vous revoir bientôt !</p>
        </div>
      </div>`,
    });

    if (!info.accepted || info.accepted.length === 0) {
      throw new Error('SMTP send failed');
    }

    return true;
  }

  return false;
}
