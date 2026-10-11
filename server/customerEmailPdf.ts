import PDFDocument from 'pdfkit';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export type CustomerEmailCopy = { subject: string; text: string; html: string };

/** In-memory, text-faithful admin copy; no public files or customer attachments. */
export async function customerEmailPdf(email: CustomerEmailCopy): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: email.subject, Author: 'The Crunch Era', Subject: 'Customer email content copy (not proof of inbox delivery)' } });
  const chunks: Buffer[] = [];
  const complete = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  try {
    doc.registerFont('Body', require.resolve('@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff'));
    doc.registerFont('Hindi', require.resolve('@fontsource/noto-sans-devanagari/files/noto-sans-devanagari-devanagari-400-normal.woff'));
    doc.registerFont('Emoji', require.resolve('@fontsource/noto-emoji/files/noto-emoji-3-400-normal.woff'));
    const paragraph = (text: string, size = 11, color = '#2d193d') => {
      const runs = text.match(new RegExp('[\u0900-\u097f\u200c\u200d]+|📦|[^\u0900-\u097f\u200c\u200d📦]+', 'gu')) || [];
      runs.forEach((run, i) => {
        const font = run === '📦' ? 'Emoji' : /^[\u0900-\u097f\u200c\u200d]/.test(run) ? 'Hindi' : 'Body';
        doc.font(font).fontSize(size).fillColor(color).text(run, { continued: i < runs.length - 1, lineGap: 3 });
      });
      doc.moveDown(.55);
    };
    paragraph('The Crunch Era', 23, '#542878');
    paragraph('Customer tracking email - admin copy', 12, '#542878');
    paragraph('This PDF reproduces the email content. It does not confirm inbox delivery. Email-app formatting may differ.', 9, '#666666');
    paragraph(`Subject: ${email.subject}`, 12);
    doc.moveDown(.3);
    for (const text of email.text.split('\n\n')) paragraph(text);
    doc.end();
  } catch (error) {
    doc.destroy(error instanceof Error ? error : new Error('PDF generation failed'));
  }
  return complete;
}
