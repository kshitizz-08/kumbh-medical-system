import QRCode from 'qrcode';

/**
 * Generates a QR code as a PNG data URL from the given text.
 * @param text - The string to encode in the QR code
 * @param size - The width/height of the generated image in pixels (default: 256)
 * @returns A base64-encoded PNG data URL
 */
export async function generateQRDataURL(text: string, size = 256): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

/**
 * Renders a QR code onto an existing <canvas> element.
 * @param canvas - The canvas element to draw onto
 * @param text - The string to encode
 * @param size - Canvas width/height in pixels (default: 200)
 */
export async function renderQRToCanvas(canvas: HTMLCanvasElement, text: string, size = 200): Promise<void> {
  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 2,
    color: {
      dark: '#1a1a2e',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });
}

/**
 * Triggers a browser download of the given data URL as a PNG file.
 * @param dataURL - The base64 PNG data URL to download
 * @param filename - The download filename (without extension)
 */
export function downloadQR(dataURL: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Opens a print window with a styled Kumbh Mela ID Pass card.
 * @param params - Devotee details and the QR data URL to embed
 */
export function printKumbhPass(params: {
  name: string;
  registrationNumber: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  phone?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  photoUrl?: string;
  qrDataURL: string;
}): void {
  const {
    name, registrationNumber, age, gender, bloodGroup,
    phone, emergencyContact, emergencyPhone, photoUrl, qrDataURL
  } = params;

  const printWindow = window.open('', '_blank', 'width=600,height=800');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Kumbh Mela Health Pass — ${name}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.15);
          width: 340px;
          overflow: hidden;
          page-break-inside: avoid;
        }
        .card-header {
          background: linear-gradient(135deg, #c2410c 0%, #ea580c 50%, #f59e0b 100%);
          padding: 16px 20px;
          text-align: center;
          color: white;
        }
        .card-header .event-name { font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; opacity: 0.9; margin-bottom: 4px; }
        .card-header h1 { font-size: 18px; font-weight: 800; letter-spacing: 0.5px; }
        .card-header .subtitle { font-size: 10px; opacity: 0.8; margin-top: 2px; }
        .card-body { padding: 16px 20px; }
        .identity { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px dashed #e5e7eb; }
        .photo { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 3px solid #f59e0b; flex-shrink: 0; }
        .photo-placeholder { width: 70px; height: 70px; border-radius: 50%; background: #f3f4f6; border: 3px solid #f59e0b; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: #9ca3af; font-size: 28px; }
        .identity-text .name { font-size: 18px; font-weight: 700; color: #111827; line-height: 1.2; }
        .identity-text .reg { font-size: 11px; color: #6b7280; margin-top: 3px; }
        .identity-text .reg span { font-weight: 700; color: #c2410c; font-family: monospace; font-size: 12px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
        .info-item label { display: block; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #9ca3af; margin-bottom: 2px; }
        .info-item span { font-size: 13px; font-weight: 600; color: #111827; }
        .blood-group span { color: #dc2626; font-size: 16px; font-weight: 800; }
        .emergency { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px; margin-bottom: 14px; }
        .emergency label { display: block; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #dc2626; margin-bottom: 4px; }
        .emergency .ec-name { font-size: 13px; font-weight: 600; color: #7f1d1d; }
        .emergency .ec-phone { font-size: 14px; font-weight: 800; color: #dc2626; }
        .qr-section { text-align: center; padding: 10px 0; border-top: 1px dashed #e5e7eb; }
        .qr-section img { width: 110px; height: 110px; display: block; margin: 0 auto 6px; }
        .qr-section .scan-text { font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; }
        .card-footer { background: linear-gradient(135deg, #1e1b4b, #312e81); color: white; text-align: center; padding: 8px; font-size: 10px; opacity: 0.9; }
        @media print {
          body { background: white; }
          .card { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="card-header">
          <div class="event-name">🔱 Kumbh Mela 2025</div>
          <h1>Health Registration Pass</h1>
          <div class="subtitle">Kumbh Medical Management System</div>
        </div>
        <div class="card-body">
          <div class="identity">
            ${photoUrl
              ? `<img class="photo" src="${photoUrl}" alt="${name}" />`
              : `<div class="photo-placeholder">👤</div>`}
            <div class="identity-text">
              <div class="name">${name}</div>
              <div class="reg">Registration No: <span>${registrationNumber}</span></div>
            </div>
          </div>
          <div class="info-grid">
            ${age ? `<div class="info-item"><label>Age</label><span>${age} yrs</span></div>` : ''}
            ${gender ? `<div class="info-item"><label>Gender</label><span>${gender}</span></div>` : ''}
            ${bloodGroup ? `<div class="info-item blood-group"><label>Blood Group</label><span>${bloodGroup}</span></div>` : ''}
            ${phone ? `<div class="info-item"><label>Phone</label><span>${phone}</span></div>` : ''}
          </div>
          ${(emergencyContact || emergencyPhone) ? `
          <div class="emergency">
            <label>🆘 Emergency Contact</label>
            ${emergencyContact ? `<div class="ec-name">${emergencyContact}</div>` : ''}
            ${emergencyPhone ? `<div class="ec-phone">📞 ${emergencyPhone}</div>` : ''}
          </div>` : ''}
          <div class="qr-section">
            <img src="${qrDataURL}" alt="QR Code" />
            <div class="scan-text">Scan to access medical profile</div>
          </div>
        </div>
        <div class="card-footer">
          Kumbh Mela Medical Authority · Keep this card safe
        </div>
      </div>
      <script>window.onload = () => { window.print(); }</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Opens a print window with a styled lost-person QR wristband.
 */
export function printQRWristband(params: {
  name: string;
  caseId: string;
  age?: number;
  gender?: string;
  emergencyContact?: string;
  photoUrl?: string;
  qrDataURL: string;
}): void {
  const { name, caseId, age, gender, emergencyContact, photoUrl, qrDataURL } = params;

  const printWindow = window.open('', '_blank', 'width=700,height=400');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>QR Wristband — ${name}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f4; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .wristband {
          background: white;
          border: 3px dashed #dc2626;
          border-radius: 50px;
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 16px 30px;
          max-width: 620px;
          width: 100%;
        }
        .qr-img { width: 90px; height: 90px; flex-shrink: 0; }
        .info { flex: 1; }
        .tag { display: inline-block; background: #dc2626; color: white; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; padding: 2px 8px; border-radius: 99px; margin-bottom: 6px; }
        .name { font-size: 20px; font-weight: 800; color: #111827; margin-bottom: 4px; }
        .case-id { font-size: 11px; color: #6b7280; font-family: monospace; }
        .details { display: flex; gap: 12px; margin-top: 6px; flex-wrap: wrap; }
        .detail { font-size: 12px; color: #374151; }
        .detail strong { color: #111827; }
        .emergency-line { margin-top: 8px; font-size: 13px; color: #dc2626; font-weight: 700; }
        .photo { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 3px solid #dc2626; flex-shrink: 0; }
        @media print {
          body { background: white; }
          .wristband { border-style: solid; }
        }
      </style>
    </head>
    <body>
      <div class="wristband">
        <img class="qr-img" src="${qrDataURL}" alt="QR Code" />
        <div class="info">
          <span class="tag">🔴 Missing Person</span>
          <div class="name">${name}</div>
          <div class="case-id">Case: ${caseId}</div>
          <div class="details">
            ${age ? `<div class="detail"><strong>Age:</strong> ${age}</div>` : ''}
            ${gender ? `<div class="detail"><strong>Gender:</strong> ${gender}</div>` : ''}
          </div>
          ${emergencyContact ? `<div class="emergency-line">📞 ${emergencyContact}</div>` : ''}
        </div>
        ${photoUrl ? `<img class="photo" src="${photoUrl}" alt="${name}" />` : ''}
      </div>
      <script>window.onload = () => { window.print(); }</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
