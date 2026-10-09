// Static, non-expiring check-in QR payload. Print the generated image
// (see assets/images/office-checkin-qr.png) and display it at the office
// entrance; ScannerScreen validates scans against this fixed token.
export const OFFICE_CHECKIN_TOKEN = 'office-checkin-573adffb0ddc671b4eab6031';

export const OFFICE_CHECKIN_PAYLOAD = JSON.stringify({
  type: 'office_checkin',
  token: OFFICE_CHECKIN_TOKEN,
});
