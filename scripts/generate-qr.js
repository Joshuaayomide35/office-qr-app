// Regenerates the static office check-in QR code image.
// Run with: npm run generate:qr
// The payload must match src/constants/qrPayload.ts exactly.
const QRCode = require('qrcode');
const path = require('path');

const payload = JSON.stringify({
  type: 'office_checkin',
  token: 'office-checkin-573adffb0ddc671b4eab6031',
});

const outPath = path.join(__dirname, '..', 'assets', 'images', 'office-checkin-qr.png');

QRCode.toFile(outPath, payload, { width: 1000 }, (err) => {
  if (err) {
    console.error('Failed to generate QR code:', err);
    process.exit(1);
  }
  console.log('QR code saved to', outPath);
});
