// ============================================================
// PDF SERVICE — Invoice & Receipt Generation
// Uses jsPDF (loaded via CDN)
// ============================================================

const PDFService = {
  async generateInvoicePDF(bill, settings = {}) {
    if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
      showToast('PDF library not loaded. Please check your internet connection.', 'error');
      return;
    }

    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const storeName = settings.businessName || 'THANJAI PARUTHI PAAL';
    const tamilName = settings.tamilName || 'தஞ்சை பருத்திப்பால்';
    const tagline = settings.tagline || 'Tradition in Every Sip, Health in Every Cup.';
    const address = bill.branchAddress || settings.address || '';
    const phone = bill.branchPhone || settings.phone || '';
    const gstin = settings.gstin || '';
    const fssai = settings.fssai || '';
    const footer = settings.receiptFooter || 'Thank you for visiting!';
    const upiId = settings.upiId || '';

    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentW = pageW - 2 * margin;
    let y = 15;

    // ── HEADER ──
    // Logo
    try {
      const logoImg = await this.loadImageAsBase64('assets/logo.png');
      doc.addImage(logoImg, 'PNG', pageW / 2 - 15, y, 30, 30);
      y += 35;
    } catch {
      y += 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text(storeName, pageW / 2, y, { align: 'center' });
    y += 7;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 80, 0);
    doc.text(tamilName, pageW / 2, y, { align: 'center' });
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(tagline, pageW / 2, y, { align: 'center' });
    y += 4;

    if (address) {
      doc.setFontSize(8);
      doc.text(address, pageW / 2, y, { align: 'center' });
      y += 4;
    }
    if (phone) {
      doc.text('📞 ' + phone, pageW / 2, y, { align: 'center' });
      y += 4;
    }

    // ── DIVIDER ──
    y += 2;
    doc.setDrawColor(200, 160, 0);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    // ── BILL INFO ──
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);

    const col1 = margin;
    const col2 = pageW / 2;

    doc.text(`Bill No: ${bill.billNumber || ''}`, col1, y);
    doc.text(`Date: ${bill.date ? formatDate(bill.date) : ''}`, col2, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(`Time: ${bill.time || ''}`, col1, y);
    doc.text(`Payment: ${bill.paymentMethod || 'CASH'}`, col2, y);
    y += 4;

    if (bill.customerName) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Customer: ${bill.customerName}`, col1, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      if (bill.customerMobile) {
        doc.text(`Mobile: ${bill.customerMobile}`, col1, y);
        y += 5;
      }
    }

    if (gstin) { doc.text(`GSTIN: ${gstin}`, col1, y); y += 4; }
    if (fssai) { doc.text(`FSSAI: ${fssai}`, col1, y); y += 4; }

    // ── ITEMS TABLE ──
    y += 2;
    doc.setLineWidth(0.3);
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    // Table header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setFillColor(245, 165, 35);
    doc.setTextColor(30, 30, 30);
    doc.rect(margin, y - 4, contentW, 7, 'F');
    
    const cols = {
      item: margin + 2,
      qty: margin + contentW * 0.55,
      rate: margin + contentW * 0.70,
      amount: margin + contentW * 0.85,
    };

    doc.text('ITEM', cols.item, y);
    doc.text('QTY', cols.qty, y);
    doc.text('RATE', cols.rate, y);
    doc.text('AMOUNT', cols.amount, y);
    y += 6;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);

    if (bill.items && bill.items.length > 0) {
      bill.items.forEach((item, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(252, 248, 235);
          doc.rect(margin, y - 4, contentW, 6, 'F');
        }
        doc.text(item.name || '', cols.item, y, { maxWidth: contentW * 0.5 });
        doc.text(String(item.qty), cols.qty, y);
        doc.text(formatCurrency(item.rate), cols.rate, y);
        doc.text(formatCurrency(item.amount), cols.amount, y);
        y += 6;
      });
    }

    // ── TOTALS ──
    y += 2;
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    const totCol1 = margin + contentW * 0.5;
    const totCol2 = pageW - margin;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    doc.text('Subtotal:', totCol1, y);
    doc.text(formatCurrency(bill.subtotal), totCol2, y, { align: 'right' });
    y += 5;

    if (bill.discount > 0) {
      doc.text('Discount:', totCol1, y);
      doc.text('-' + formatCurrency(bill.discount), totCol2, y, { align: 'right' });
      y += 5;
    }

    if (bill.tax > 0) {
      doc.text(`Tax:`, totCol1, y);
      doc.text(formatCurrency(bill.tax), totCol2, y, { align: 'right' });
      y += 5;
    }

    if (bill.roundOff && bill.roundOff !== 0) {
      doc.text('Round Off:', totCol1, y);
      doc.text(formatCurrency(bill.roundOff), totCol2, y, { align: 'right' });
      y += 5;
    }

    // Grand total
    doc.setFillColor(30, 30, 30);
    doc.rect(margin, y - 4, contentW, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(245, 165, 35);
    doc.text('GRAND TOTAL:', totCol1, y + 1);
    doc.text(formatCurrency(bill.grandTotal), totCol2, y + 1, { align: 'right' });
    y += 12;

    doc.setTextColor(30, 30, 30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    if (bill.paymentStatus === 'PARTIAL' || bill.paymentStatus === 'DUE') {
      doc.text(`Amount Paid: ${formatCurrency(bill.amountPaid || 0)}`, totCol1, y);
      y += 5;
      doc.setTextColor(200, 50, 50);
      doc.text(`Balance Due: ${formatCurrency(bill.balanceDue || 0)}`, totCol1, y);
      doc.setTextColor(30, 30, 30);
      y += 5;
    }

    // ── UPI QR CODE ──
    if (upiId) {
      try {
        const upiString = generateUPIString(upiId, storeName, bill.grandTotal, bill.billNumber);
        const qrDataUrl = await generateQRCodeDataURL(upiString, 120, 120);
        if (qrDataUrl) {
          y += 3;
          doc.addImage(qrDataUrl, 'PNG', pageW / 2 - 12, y, 24, 24);
          y += 26;
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.text(`Scan & Pay via UPI: ${upiId}`, pageW / 2, y, { align: 'center' });
          y += 4;
        }
      } catch (err) {
        console.warn('PDF QR render error:', err);
      }
    }

    // ── FOOTER ──
    y += 4;
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(100, 70, 0);
    doc.text(footer, pageW / 2, y, { align: 'center' });
    y += 5;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(tagline, pageW / 2, y, { align: 'center' });
    y += 5;

    doc.setFontSize(7);
    doc.text('Local Data — Stored on This Device', pageW / 2, y, { align: 'center' });

    const filename = `TPP-BILL-${bill.billNumber || 'DRAFT'}.pdf`;
    doc.save(filename);
    showToast('PDF downloaded: ' + filename, 'success');
  },

  async generate80mmReceipt(bill, settings = {}) {
    const { jsPDF } = window.jspdf || window;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 220] });

    const storeName = settings.businessName || 'THANJAI PARUTHI PAAL';
    const tagline = settings.tagline || 'Tradition in Every Sip, Health in Every Cup.';
    const footer = settings.receiptFooter || 'Thank you for visiting!';
    const upiId = settings.upiId || '';

    const margin = 5;
    const pageW = 80;
    let y = 8;

    // Header
    try {
      const logoImg = await this.loadImageAsBase64('assets/logo.png');
      doc.addImage(logoImg, 'PNG', pageW / 2 - 8, y, 16, 16);
      y += 19;
    } catch { y += 3; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(storeName, pageW / 2, y, { align: 'center' });
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(tagline, pageW / 2, y, { align: 'center' });
    y += 4;

    // Divider
    doc.setDrawColor(180, 140, 0);
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    // Bill info
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(`Bill No: ${bill.billNumber || ''}`, margin, y);
    y += 4;
    doc.text(`Date: ${bill.date ? formatDate(bill.date) : ''} ${bill.time || ''}`, margin, y);
    y += 4;
    if (bill.customerName) {
      doc.text(`Customer: ${bill.customerName}`, margin, y);
      y += 4;
    }
    if (bill.customerMobile) {
      doc.text(`Mobile: ${bill.customerMobile}`, margin, y);
      y += 4;
    }

    // Items
    doc.line(margin, y, pageW - margin, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('ITEM', margin, y);
    doc.text('QTY', margin + 35, y);
    doc.text('AMT', pageW - margin, y, { align: 'right' });
    y += 3;
    doc.line(margin, y, pageW - margin, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    if (bill.items) {
      bill.items.forEach(item => {
        doc.text(item.name.substring(0, 22), margin, y);
        doc.text(String(item.qty), margin + 35, y);
        doc.text(formatCurrency(item.amount), pageW - margin, y, { align: 'right' });
        y += 5;
      });
    }

    doc.line(margin, y, pageW - margin, y);
    y += 4;

    if (bill.discount > 0) {
      doc.text('Discount:', margin, y);
      doc.text('-' + formatCurrency(bill.discount), pageW - margin, y, { align: 'right' });
      y += 4;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TOTAL:', margin, y);
    doc.text(formatCurrency(bill.grandTotal), pageW - margin, y, { align: 'right' });
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Payment: ${bill.paymentMethod || 'CASH'}`, margin, y);
    y += 6;

    // UPI QR Code on Thermal receipt
    if (upiId) {
      try {
        const upiString = generateUPIString(upiId, storeName, bill.grandTotal, bill.billNumber);
        const qrDataUrl = await generateQRCodeDataURL(upiString, 100, 100);
        if (qrDataUrl) {
          doc.addImage(qrDataUrl, 'PNG', pageW / 2 - 10, y, 20, 20);
          y += 22;
          doc.setFontSize(6);
          doc.text(`Pay via UPI: ${upiId}`, pageW / 2, y, { align: 'center' });
          y += 4;
        }
      } catch (e) {}
    }

    doc.line(margin, y, pageW - margin, y);
    y += 4;
    doc.text(footer, pageW / 2, y, { align: 'center' });
    y += 4;
    doc.setFont('helvetica', 'italic');
    doc.text(tagline, pageW / 2, y, { align: 'center' });

    const filename = `TPP-RECEIPT-${bill.billNumber || 'DRAFT'}.pdf`;
    doc.save(filename);
    showToast('Receipt downloaded: ' + filename, 'success');
  },

  loadImageAsBase64(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = src;
    });
  }
};
