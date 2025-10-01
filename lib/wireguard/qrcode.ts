import QRCode from 'qrcode';

/**
 * Generate QR code as Data URL for WireGuard configuration
 */
export async function generateQRCode(configContent: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(configContent, {
      errorCorrectionLevel: 'L',
      type: 'image/png',
      width: 300,
      margin: 2,
    });
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    throw new Error('QR code generation failed');
  }
}

/**
 * Generate QR code as SVG string
 */
export async function generateQRCodeSVG(configContent: string): Promise<string> {
  try {
    const svg = await QRCode.toString(configContent, {
      errorCorrectionLevel: 'L',
      type: 'svg',
      width: 300,
      margin: 2,
    });
    return svg;
  } catch (error) {
    console.error('Failed to generate QR code SVG:', error);
    throw new Error('QR code generation failed');
  }
}
