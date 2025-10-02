import QRCode from 'qrcode';
import { config } from '@/lib/config';

/**
 * Generate QR code as Data URL for WireGuard configuration
 */
export async function generateQRCode(configContent: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(configContent, {
      errorCorrectionLevel: config.qrCode.errorCorrectionLevel,
      type: 'image/png',
      width: config.qrCode.width,
      margin: config.qrCode.margin,
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
      errorCorrectionLevel: config.qrCode.errorCorrectionLevel,
      type: 'svg',
      width: config.qrCode.width,
      margin: config.qrCode.margin,
    });
    return svg;
  } catch (error) {
    console.error('Failed to generate QR code SVG:', error);
    throw new Error('QR code generation failed');
  }
}
