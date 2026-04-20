import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendPasswordReset(to: string, resetToken: string): Promise<void> {
    const base = (this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173').replace(
      /\/$/,
      '',
    );
    const url = `${base}/restablecer-contrasena?token=${encodeURIComponent(resetToken)}`;
    const subject = 'Restablecer contraseña — OSE Inventario';
    const text = `Hola,\n\nPara crear una nueva contraseña, abre este enlace (válido por tiempo limitado):\n\n${url}\n\nSi no solicitaste este cambio, ignora este mensaje.\n`;
    const html = `<p>Hola,</p><p>Para crear una nueva contraseña, haz clic en el enlace siguiente (válido por tiempo limitado):</p><p><a href="${url}">${url}</a></p><p>Si no solicitaste este cambio, ignora este mensaje.</p>`;

    const logOnly = this.configService.get<string>('MAIL_LOG_ONLY') === 'true';
    const host = this.configService.get<string>('SMTP_HOST');

    if (logOnly || !host) {
      this.logger.warn(`[simulación de correo] Restablecer contraseña para ${to}: ${url}`);
      return;
    }

    const port = Number(this.configService.get<string>('SMTP_PORT') ?? '587');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const from = this.configService.get<string>('SMTP_FROM') ?? user;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
  }
}
