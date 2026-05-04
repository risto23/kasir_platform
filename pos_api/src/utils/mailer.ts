import nodemailer from 'nodemailer';
import { env } from '../config/env';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPassword,
      },
    });
  }
  return transporter;
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPassword) {
    console.warn('[mailer] SMTP not configured, skipping email to', options.to);
    return;
  }

  await getTransporter().sendMail({
    from: `"${env.appName}" <${env.smtpFrom}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}
