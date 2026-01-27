const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

/**
 * Generate QR code as data URL
 * @param {string} data - The data to encode in QR code (typically a URL or unique ID)
 * @returns {Promise<string>} - Data URL of the QR code
 */
async function generateQRCodeDataURL(data) {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrCodeDataURL;
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
}

/**
 * Generate QR code and save as PNG file
 * @param {string} data - The data to encode in QR code
 * @param {string} fileName - The file name (without extension)
 * @returns {Promise<string>} - Path to the saved QR code file
 */
async function generateQRCodeFile(data, fileName) {
  try {
    const qrDir = path.join(__dirname, '../qr-codes');
    
    // Create directory if it doesn't exist
    await fs.mkdir(qrDir, { recursive: true });
    
    const filePath = path.join(qrDir, `${fileName}.png`);
    
    await QRCode.toFile(filePath, data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    
    return filePath;
  } catch (error) {
    throw new Error(`Failed to generate QR code file: ${error.message}`);
  }
}

/**
 * Generate a unique QR code URL for an inventory item
 * @param {string} itemCode - The unique item code
 * @param {string} baseUrl - The base URL (e.g., 'https://yourdomain.com')
 * @returns {string} - The complete QR code URL
 */
function generateQRCodeURL(itemCode, baseUrl = process.env.API_URL || 'http://localhost:4000') {
  return `${baseUrl}/api/inventory/scan/${itemCode}`;
}

/**
 * Generate QR code for a batch of items
 * @param {Array<{itemCode: string, productId: string}>} items - Array of items to generate QR codes for
 * @param {string} baseUrl - The base URL
 * @returns {Promise<Array<{itemCode: string, qrCode: string, qrCodeURL: string}>>}
 */
async function generateBatchQRCodes(items, baseUrl = process.env.API_URL || 'http://localhost:4000') {
  try {
    const results = [];
    
    for (const item of items) {
      const qrCodeURL = generateQRCodeURL(item.itemCode, baseUrl);
      const qrCodeDataURL = await generateQRCodeDataURL(qrCodeURL);
      
      results.push({
        itemCode: item.itemCode,
        productId: item.productId,
        qrCode: qrCodeURL,
        qrCodeDataURL: qrCodeDataURL,
      });
    }
    
    return results;
  } catch (error) {
    throw new Error(`Failed to generate batch QR codes: ${error.message}`);
  }
}

/**
 * Validate QR code format (checks if it's a valid URL pointing to the scan endpoint)
 * @param {string} qrCode - The QR code to validate
 * @returns {boolean} - True if valid
 */
function validateQRCode(qrCode) {
  try {
    const url = new URL(qrCode);
    return url.pathname.includes('/api/inventory/scan/');
  } catch {
    return false;
  }
}

module.exports = {
  generateQRCodeDataURL,
  generateQRCodeFile,
  generateQRCodeURL,
  generateBatchQRCodes,
  validateQRCode,
};
