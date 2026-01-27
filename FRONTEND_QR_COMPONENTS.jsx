/**
 * QR Code Scanner Component
 * React component for scanning and managing inventory items
 * 
 * Usage:
 * import QRCodeScanner from './QRCodeScanner';
 * <QRCodeScanner baseUrl="https://api.example.com" token={jwtToken} />
 */

import React, { useState, useRef } from 'react';

export function QRCodeScanner({ baseUrl, token }) {
  const [itemCode, setItemCode] = useState('');
  const [itemData, setItemData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scanned, setScanned] = useState(false);
  const inputRef = useRef(null);

  const handleScan = async (e) => {
    e.preventDefault();
    
    if (!itemCode.trim()) {
      setError('Please enter or scan an item code');
      return;
    }

    setLoading(true);
    setError(null);
    setScanned(false);

    try {
      const response = await fetch(
        `${baseUrl}/api/inventory/scan/${itemCode.trim()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Item not found');
        } else if (response.status === 401) {
          throw new Error('Unauthorized - Please log in again');
        }
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      setItemData(data);
      setScanned(true);
    } catch (err) {
      setError(err.message);
      setItemData(null);
    } finally {
      setLoading(false);
      setItemCode('');
      inputRef.current?.focus();
    }
  };

  const handleClear = () => {
    setItemData(null);
    setError(null);
    setItemCode('');
    setScanned(false);
    inputRef.current?.focus();
  };

  const getStatusColor = (status) => {
    const colors = {
      available: '#10b981',
      sold: '#3b82f6',
      damaged: '#ef4444',
      returned: '#f59e0b',
      'in-transit': '#8b5cf6',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      available: '✓ In Stock',
      sold: '✓ Sold',
      damaged: '⚠ Damaged',
      returned: '↩ Returned',
      'in-transit': '→ In Transit',
    };
    return labels[status] || status;
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>📱 QR Code Scanner</h2>
        
        <form onSubmit={handleScan} style={styles.form}>
          <input
            ref={inputRef}
            type="text"
            value={itemCode}
            onChange={(e) => setItemCode(e.target.value)}
            placeholder="Scan or enter item code..."
            disabled={loading}
            style={styles.input}
            autoFocus
          />
          <button 
            type="submit" 
            disabled={loading || !itemCode.trim()}
            style={styles.button}
          >
            {loading ? 'Scanning...' : 'Scan'}
          </button>
        </form>

        {error && (
          <div style={styles.error}>
            <p>❌ {error}</p>
          </div>
        )}

        {scanned && itemData && (
          <div style={styles.result}>
            <h3 style={styles.productName}>
              {itemData.productId?.name || 'Product'}
            </h3>
            
            <div style={styles.grid}>
              <div style={styles.gridItem}>
                <label>Item Code</label>
                <p>{itemData.itemCode}</p>
              </div>
              
              <div style={styles.gridItem}>
                <label>Status</label>
                <p style={{
                  ...styles.statusBadge,
                  backgroundColor: getStatusColor(itemData.status),
                }}>
                  {getStatusLabel(itemData.status)}
                </p>
              </div>

              <div style={styles.gridItem}>
                <label>Location</label>
                <p>{itemData.location}</p>
              </div>

              <div style={styles.gridItem}>
                <label>Price</label>
                <p>${itemData.productId?.price?.toFixed(2) || 'N/A'}</p>
              </div>
            </div>

            {itemData.batchNumber && (
              <div style={styles.infoBox}>
                <strong>Batch:</strong> {itemData.batchNumber}
              </div>
            )}

            {itemData.expiryDate && (
              <div style={styles.infoBox}>
                <strong>Expiry Date:</strong>{' '}
                {new Date(itemData.expiryDate).toLocaleDateString()}
              </div>
            )}

            {itemData.notes && (
              <div style={styles.notesBox}>
                <strong>Notes:</strong> {itemData.notes}
              </div>
            )}

            {itemData.scanHistory && itemData.scanHistory.length > 0 && (
              <div style={styles.historyBox}>
                <h4>Scan History</h4>
                {itemData.scanHistory.slice(0, 5).map((scan, idx) => (
                  <div key={idx} style={styles.historyItem}>
                    <small>
                      {new Date(scan.scannedAt).toLocaleString()} - {scan.action}
                      {scan.notes && ` - ${scan.notes}`}
                    </small>
                  </div>
                ))}
                {itemData.scanHistory.length > 5 && (
                  <small>+{itemData.scanHistory.length - 5} more scans</small>
                )}
              </div>
            )}

            <button 
              onClick={handleClear}
              style={styles.clearButton}
            >
              Clear
            </button>
          </div>
        )}

        {!scanned && !error && !itemData && (
          <div style={styles.placeholder}>
            <p>🔍 Waiting for scan...</p>
            <small>Use a barcode scanner or enter item code manually</small>
          </div>
        )}
      </div>
    </div>
  );
}

export function QRCodeGenerator({ baseUrl, token, productId }) {
  const [itemCode, setItemCode] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const [qrCodeDataURL, setQrCodeDataURL] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    
    if (!itemCode.trim()) {
      setError('Please enter an item code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${baseUrl}/api/inventory/item`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId,
            itemCode: itemCode.trim(),
            batchNumber: batchNumber.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create item');
      }

      const data = await response.json();
      setCreated(data);
      setQrCodeDataURL(data.qrCodeDataURL);
      setItemCode('');
      setBatchNumber('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!qrCodeDataURL) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code Label</title>
          <style>
            body { margin: 20px; }
            .label { text-align: center; margin: 20px; }
            img { max-width: 300px; }
          </style>
        </head>
        <body>
          <div class="label">
            <h3>${created.itemCode}</h3>
            <img src="${qrCodeDataURL}" />
            <p>${created.productId?.name}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>🏷️ Generate QR Code</h2>

        <form onSubmit={handleCreate} style={styles.form}>
          <input
            type="text"
            value={itemCode}
            onChange={(e) => setItemCode(e.target.value)}
            placeholder="Enter item code/SKU..."
            disabled={loading}
            style={styles.input}
          />
          <input
            type="text"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            placeholder="Batch number (optional)..."
            disabled={loading}
            style={styles.input}
          />
          <button 
            type="submit" 
            disabled={loading || !itemCode.trim()}
            style={styles.button}
          >
            {loading ? 'Creating...' : 'Create QR Code'}
          </button>
        </form>

        {error && (
          <div style={styles.error}>
            <p>❌ {error}</p>
          </div>
        )}

        {created && (
          <div style={styles.result}>
            <h3>✓ QR Code Created</h3>
            <div style={styles.qrContainer}>
              <img 
                src={qrCodeDataURL} 
                alt="QR Code"
                style={styles.qrImage}
              />
            </div>
            <p><strong>Item Code:</strong> {created.itemCode}</p>
            <p><strong>QR Code URL:</strong> {created.qrCode}</p>
            <button 
              onClick={handlePrint}
              style={{...styles.button, marginTop: '10px'}}
            >
              🖨️ Print Label
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '600px',
    margin: '20px auto',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  title: {
    margin: '0 0 20px 0',
    fontSize: '24px',
    fontWeight: '600',
    color: '#1f2937',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  button: {
    padding: '10px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  error: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '12px',
  },
  result: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    padding: '16px',
    borderRadius: '6px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px',
  },
  gridItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  statusBadge: {
    display: 'inline-block',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#f3f4f6',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    marginBottom: '8px',
  },
  notesBox: {
    backgroundColor: '#fef3c7',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    marginBottom: '8px',
  },
  historyBox: {
    backgroundColor: '#f9fafb',
    padding: '12px',
    borderRadius: '4px',
    fontSize: '12px',
    marginBottom: '12px',
  },
  historyItem: {
    paddingBottom: '8px',
    borderBottom: '1px solid #e5e7eb',
  },
  clearButton: {
    marginTop: '12px',
    backgroundColor: '#6b7280',
    color: 'white',
    padding: '8px 12px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  placeholder: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#9ca3af',
  },
  productName: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    color: '#1f2937',
  },
  qrContainer: {
    textAlign: 'center',
    margin: '16px 0',
  },
  qrImage: {
    maxWidth: '300px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
  },
};
