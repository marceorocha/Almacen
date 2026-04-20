import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { finished } from 'node:stream/promises';
import PDFDocument from 'pdfkit';
import { MovimientoDetalle } from './entities/movimiento-detalle.entity';
import { Movimiento } from './entities/movimiento.entity';

@Injectable()
export class MovimientoPdfService {
  constructor(private readonly configService: ConfigService) {}

  private uploadRoot(): string {
    return (
      this.configService.get<string>('UPLOAD_ROOT') ??
      join(process.cwd(), 'uploads')
    );
  }

  private movimientosDir(): string {
    return join(this.uploadRoot(), 'movimientos');
  }

  private publicBaseUrl(): string {
    const raw =
      this.configService.get<string>('PUBLIC_APP_URL') ??
      `http://localhost:${this.configService.get<string>('PORT') ?? '3000'}`;
    return raw.replace(/\/$/, '');
  }

  /** Public URL stored on `Movimiento.pdfUrl` (served under `/files/...`). */
  buildPdfUrl(movimientoId: string): string {
    return `${this.publicBaseUrl()}/files/movimientos/${movimientoId}.pdf`;
  }

  async writeMovementPdf(mov: Movimiento): Promise<string> {
    const dir = this.movimientosDir();
    await mkdir(dir, { recursive: true });
    const filePath = join(dir, `${mov.id}.pdf`);
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const stream = createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(18).font('Helvetica-Bold').text('Movement document', { underline: true });
    doc.moveDown(0.75);

    doc.fontSize(11).font('Helvetica-Bold').text('Movement ID: ', { continued: true });
    doc.font('Helvetica').text(mov.id);

    doc.font('Helvetica-Bold').text('Date: ', { continued: true });
    doc.font('Helvetica').text(this.formatDate(mov.fecha));

    doc.font('Helvetica-Bold').text('Created by: ', { continued: true });
    doc
      .font('Helvetica')
      .text(
        mov.usuario
          ? `${mov.usuario.name} (${mov.usuario.email})`
          : mov.usuarioId,
      );

    doc.font('Helvetica-Bold').text('Type: ', { continued: true });
    doc.font('Helvetica').text(mov.tipo);

    doc.font('Helvetica-Bold').text('Status: ', { continued: true });
    doc.font('Helvetica').text(mov.estado);

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text('Origin warehouse: ', { continued: true });
    doc.font('Helvetica').text(mov.almacenOrigen?.name ?? '—');

    doc.font('Helvetica-Bold').text('Destination warehouse: ', { continued: true });
    doc.font('Helvetica').text(mov.almacenDestino?.name ?? '—');

    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica-Bold').text('Items');
    doc.moveDown(0.35);
    doc.fontSize(9).font('Helvetica');

    const colCode = 48;
    const colDesc = 130;
    const colQty = 380;
    const colSerie = 430;
    const rowH = 14;
    let y = doc.y;

    doc.font('Helvetica-Bold');
    doc.text('Code', colCode, y);
    doc.text('Description', colDesc, y);
    doc.text('Qty', colQty, y);
    doc.text('Serial', colSerie, y);
    y += rowH;
    doc.font('Helvetica');
    doc.moveTo(colCode, y).lineTo(555, y).stroke();

    const detalles = mov.detalles ?? [];
    for (const line of detalles) {
      if (y > doc.page.height - 180) {
        doc.addPage();
        y = 48;
      }
      const art = line.articulo;
      const code = art?.codigoInterno ?? line.articuloId;
      const desc = this.truncate(art?.descripcion ?? '—', 42);
      const serial = this.serialForLine(line);
      doc.text(code, colCode, y, { width: colDesc - colCode - 4 });
      doc.text(desc, colDesc, y, { width: colQty - colDesc - 4 });
      doc.text(String(line.cantidad), colQty, y, { width: colSerie - colQty - 4 });
      doc.text(serial, colSerie, y, { width: 555 - colSerie });
      y += rowH + 2;
    }

    doc.moveDown(2);
    const sigY = Math.min(y + 36, doc.page.height - 120);
    doc.fontSize(10).font('Helvetica-Bold').text('Signature', 48, sigY);
    doc
      .moveTo(48, sigY + 22)
      .lineTo(320, sigY + 22)
      .lineWidth(0.5)
      .stroke();

    doc.fontSize(8).font('Helvetica').text('Name / date', 48, sigY + 28);

    doc.end();
    await finished(stream);
    return this.buildPdfUrl(mov.id);
  }

  private formatDate(d: Date): string {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(d instanceof Date ? d : new Date(d));
    } catch {
      return String(d);
    }
  }

  private truncate(s: string, max: number): string {
    if (s.length <= max) {
      return s;
    }
    return `${s.slice(0, max - 1)}…`;
  }

  private serialForLine(line: MovimientoDetalle): string {
    if (line.serie?.numeroSerie) {
      return line.serie.numeroSerie;
    }
    if (line.numeroSerie) {
      return line.numeroSerie;
    }
    return '—';
  }
}
