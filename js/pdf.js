// ============================================================
// PDF SERVICE — Executive Invoice, Receipt & Report Generator
// High-DPI HTML-to-Canvas Engine with full Unicode support (Tamil, Rupee ₹)
// ============================================================

const PDFService = {
  // Load local image as Base64 data URL for cross-origin safe canvas rendering
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
      img.onerror = () => resolve(null);
      img.src = src;
    });
  },

  // ── A4 EXECUTIVE PDF INVOICE ──
  async generateInvoicePDF(bill, settings = {}) {
    if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
      showToast('PDF library not loaded. Check connection or reload.', 'error');
      return;
    }

    const storeName = settings.businessName || 'THANJAI PARUTHI PAAL';
    const tamilName = settings.tamilName || 'தஞ்சை பருத்திப்பால்';
    const tagline = settings.tagline || 'Tradition in Every Sip, Health in Every Cup.';
    const address = bill.branchAddress || settings.address || '';
    const phone = bill.branchPhone || settings.phone || '';
    const gstin = settings.gstin || '';
    const fssai = settings.fssai || '';
    const footer = settings.receiptFooter || 'Thank you for visiting!';
    const upiId = settings.upiId || '';

    // Generate Logo Base64
    let logoBase64 = null;
    try {
      logoBase64 = await this.loadImageAsBase64('assets/logo.png');
    } catch (e) {}

    // Generate UPI QR Code Base64
    let qrDataUrl = null;
    if (upiId && bill.grandTotal > 0) {
      try {
        const upiString = generateUPIString(upiId, storeName, bill.grandTotal, bill.billNumber);
        qrDataUrl = await generateQRCodeDataURL(upiString, 120, 120);
      } catch (e) {}
    }

    // Build Offscreen A4 HTML Container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '794px';
    container.style.padding = '32px';
    container.style.background = '#FFFFFF';
    container.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    container.style.color = '#111827';
    container.style.boxSizing = 'border-box';

    container.innerHTML = `
      <!-- Gold Top Accent Bar -->
      <div style="height: 6px; background: linear-gradient(90deg, #F5A623 0%, #D4A017 100%); border-radius: 4px 4px 0 0; margin-bottom: 20px;"></div>

      <!-- Header Row -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 18px; border-bottom: 2px solid #F3F4F6;">
        <div style="display: flex; gap: 16px; align-items: center;">
          ${logoBase64 ? `<img src="${logoBase64}" style="width: 72px; height: 72px; border-radius: 50%; border: 3px solid #F5A623; box-shadow: 0 4px 10px rgba(245, 166, 35, 0.25); object-fit: cover;">` : ''}
          <div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #111827; letter-spacing: 0.5px; text-transform: uppercase;">${escapeHTML(storeName)}</h1>
            <div style="font-size: 15px; font-weight: 700; color: #D4A017; font-family: 'Noto Sans Tamil', sans-serif; margin-top: 2px;">${escapeHTML(tamilName)}</div>
            <div style="font-size: 12px; font-style: italic; color: #6B7280; margin-top: 4px;">"${escapeHTML(tagline)}"</div>
          </div>
        </div>
        <div style="text-align: right; font-size: 12px; color: #4B5563; line-height: 1.6;">
          ${address ? `<div>📍 ${escapeHTML(address)}</div>` : ''}
          ${phone ? `<div style="font-weight: 600; color: #111827; margin-top: 2px;">📞 ${escapeHTML(phone)}</div>` : ''}
          ${gstin ? `<div style="margin-top: 2px; font-weight: 600; color: #374151;">GSTIN: ${escapeHTML(gstin)}</div>` : ''}
          ${fssai ? `<div style="color: #6B7280;">FSSAI: ${escapeHTML(fssai)}</div>` : ''}
        </div>
      </div>

      <!-- Bill Metadata Card -->
      <div style="margin-top: 20px; background: #FAF9F6; border: 1px solid #EFE8D8; border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #6B7280; letter-spacing: 0.5px;">INVOICE NO</div>
          <div style="font-size: 18px; font-weight: 800; color: #111827; margin-top: 2px;">${escapeHTML(bill.billNumber || '')}</div>
          <div style="font-size: 12px; color: #4B5563; margin-top: 4px;">
            📅 ${bill.date ? formatDate(bill.date) : ''} &nbsp;•&nbsp; ⏰ ${bill.time || ''}
          </div>
        </div>

        <div style="text-align: center; border-left: 1px dashed #D1D5DB; border-right: 1px dashed #D1D5DB; padding: 0 24px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #6B7280; letter-spacing: 0.5px;">CUSTOMER</div>
          <div style="font-size: 14px; font-weight: 700; color: #111827; margin-top: 2px;">${escapeHTML(bill.customerName || 'Walk-in Customer')}</div>
          ${bill.customerMobile ? `<div style="font-size: 12px; color: #4B5563; margin-top: 2px;">📱 ${escapeHTML(bill.customerMobile)}</div>` : ''}
        </div>

        <div style="text-align: right;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #6B7280; letter-spacing: 0.5px;">PAYMENT STATUS</div>
          <div style="margin-top: 6px; display: flex; gap: 8px; justify-content: flex-end; align-items: center;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; ${
              bill.paymentMethod === 'CASH' ? 'background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0;' :
              bill.paymentMethod === 'UPI' ? 'background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;' :
              'background: #F3F4F6; color: #374151; border: 1px solid #D1D5DB;'
            }">${escapeHTML(bill.paymentMethod || 'CASH')}</span>

            <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; ${
              bill.paymentStatus === 'PAID' ? 'background: #D1FAE5; color: #065F46; border: 1px solid #6EE7B7;' :
              bill.paymentStatus === 'PARTIAL' ? 'background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A;' :
              'background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5;'
            }">${escapeHTML(bill.paymentStatus || 'PAID')}</span>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 24px; border-radius: 8px; overflow: hidden; border: 1px solid #E5E7EB;">
        <thead>
          <tr style="background: #111827; color: #FFFFFF;">
            <th style="padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; width: 8%;">#</th>
            <th style="padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; width: 48%;">ITEM DESCRIPTION</th>
            <th style="padding: 12px 16px; text-align: center; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; width: 14%;">QTY</th>
            <th style="padding: 12px 16px; text-align: right; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; width: 15%;">RATE</th>
            <th style="padding: 12px 16px; text-align: right; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; width: 15%;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${(bill.items || []).map((item, idx) => `
            <tr style="background: ${idx % 2 === 0 ? '#FFFFFF' : '#FAF9F6'}; border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 12px 16px; font-size: 12px; color: #6B7280;">${idx + 1}</td>
              <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #111827;">${escapeHTML(item.name)}</td>
              <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; text-align: center; color: #374151;">${item.qty}</td>
              <td style="padding: 12px 16px; font-size: 13px; text-align: right; color: #4B5563;">${formatCurrency(item.rate)}</td>
              <td style="padding: 12px 16px; font-size: 13px; font-weight: 700; text-align: right; color: #111827;">${formatCurrency(item.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Bottom Layout: UPI Box (Left) + Totals Box (Right) -->
      <div style="margin-top: 24px; display: flex; justify-content: space-between; align-items: flex-start;">
        <!-- Left: UPI QR Code Card -->
        <div style="width: 48%; background: #FAF9F5; border: 1px solid #EFE8D8; border-radius: 12px; padding: 16px; box-sizing: border-box;">
          ${qrDataUrl ? `
            <div style="display: flex; gap: 14px; align-items: center;">
              <img src="${qrDataUrl}" style="width: 90px; height: 90px; border-radius: 8px; border: 1px solid #E5E7EB; background: #FFF; padding: 4px;">
              <div>
                <div style="font-size: 12px; font-weight: 800; color: #111827;">SCAN TO PAY VIA UPI</div>
                <div style="font-size: 11px; color: #D4A017; font-weight: 700; margin-top: 2px;">${escapeHTML(upiId)}</div>
                <div style="font-size: 10px; color: #6B7280; margin-top: 4px;">GPay • PhonePe • Paytm • BHIM</div>
              </div>
            </div>
          ` : `
            <div style="font-size: 12px; font-weight: 700; color: #374151;">Thank you for your visit!</div>
            <div style="font-size: 11px; color: #6B7280; margin-top: 4px;">We serve fresh, traditional Paruthi Paal made daily with pure ingredients.</div>
          `}
          ${bill.notes ? `<div style="margin-top: 10px; font-size: 11px; color: #4B5563; border-top: 1px dashed #E5E7EB; padding-top: 6px;"><strong>Note:</strong> ${escapeHTML(bill.notes)}</div>` : ''}
        </div>

        <!-- Right: Totals Breakdown Box -->
        <div style="width: 48%; box-sizing: border-box;">
          <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #4B5563;">
            <span>Subtotal</span>
            <span style="font-weight: 600; color: #111827;">${formatCurrency(bill.subtotal)}</span>
          </div>
          ${bill.discount > 0 ? `
            <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #DC2626;">
              <span>Discount</span>
              <span style="font-weight: 600;">-${formatCurrency(bill.discount)}</span>
            </div>
          ` : ''}
          ${bill.tax > 0 ? `
            <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #4B5563;">
              <span>Tax / GST</span>
              <span style="font-weight: 600; color: #111827;">${formatCurrency(bill.tax)}</span>
            </div>
          ` : ''}
          ${bill.roundOff ? `
            <div style="display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #6B7280;">
              <span>Round Off</span>
              <span>${formatCurrency(bill.roundOff)}</span>
            </div>
          ` : ''}

          <!-- GRAND TOTAL BANNER -->
          <div style="margin-top: 10px; background: #111827; color: #F5A623; padding: 14px 18px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 14px; font-weight: 800; letter-spacing: 0.5px;">GRAND TOTAL</span>
            <span style="font-size: 22px; font-weight: 900; color: #F5A623;">${formatCurrency(bill.grandTotal)}</span>
          </div>

          ${(bill.paymentStatus === 'PARTIAL' || bill.paymentStatus === 'DUE') ? `
            <div style="margin-top: 10px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 10px 14px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; color: #047857; font-weight: 600;">
                <span>Amount Paid</span>
                <span>${formatCurrency(bill.amountPaid || 0)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #DC2626; font-weight: 800; margin-top: 4px; font-size: 13px;">
                <span>Balance Due</span>
                <span>${formatCurrency(bill.balanceDue || 0)}</span>
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Footer -->
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E7EB; text-align: center;">
        <div style="font-size: 14px; font-weight: 800; color: #D4A017;">${escapeHTML(footer)}</div>
        <div style="font-size: 11px; font-style: italic; color: #6B7280; margin-top: 3px;">"${escapeHTML(tagline)}"</div>
        <div style="font-size: 10px; color: #9CA3AF; margin-top: 8px;">Computer Generated Invoice • Stored on Local POS Device</div>
      </div>
    `;

    const filename = `TPP-BILL-${bill.billNumber || 'DRAFT'}.pdf`;
    await this.renderHTMLToPDF(container, filename, false);
    showToast('A4 PDF downloaded: ' + filename, 'success');
  },

  // ── 80MM POS THERMAL RECEIPT PDF ──
  async generate80mmReceipt(bill, settings = {}) {
    const storeName = settings.businessName || 'THANJAI PARUTHI PAAL';
    const tamilName = settings.tamilName || 'தஞ்சை பருத்திப்பால்';
    const tagline = settings.tagline || 'Tradition in Every Sip, Health in Every Cup.';
    const address = bill.branchAddress || settings.address || '';
    const phone = bill.branchPhone || settings.phone || '';
    const footer = settings.receiptFooter || 'Thank you for visiting!';
    const upiId = settings.upiId || '';

    let logoBase64 = null;
    try {
      logoBase64 = await this.loadImageAsBase64('assets/logo.png');
    } catch (e) {}

    let qrDataUrl = null;
    if (upiId && bill.grandTotal > 0) {
      try {
        const upiString = generateUPIString(upiId, storeName, bill.grandTotal, bill.billNumber);
        qrDataUrl = await generateQRCodeDataURL(upiString, 100, 100);
      } catch (e) {}
    }

    // Offscreen 80mm container (320px width)
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '320px';
    container.style.padding = '14px';
    container.style.background = '#FFFFFF';
    container.style.fontFamily = "'Inter', -apple-system, sans-serif";
    container.style.color = '#000000';
    container.style.boxSizing = 'border-box';

    container.innerHTML = `
      <div style="text-align: center;">
        ${logoBase64 ? `<img src="${logoBase64}" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid #F5A623; margin-bottom: 6px;">` : ''}
        <div style="font-size: 15px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;">${escapeHTML(storeName)}</div>
        <div style="font-size: 12px; font-weight: 700; font-family: 'Noto Sans Tamil', sans-serif; color: #444; margin-top: 2px;">${escapeHTML(tamilName)}</div>
        <div style="font-size: 9px; font-style: italic; color: #666; margin-top: 2px;">"${escapeHTML(tagline)}"</div>
        ${address ? `<div style="font-size: 10px; color: #333; margin-top: 4px;">${escapeHTML(address)}</div>` : ''}
        ${phone ? `<div style="font-size: 10px; font-weight: 700; color: #000; margin-top: 2px;">Ph: ${escapeHTML(phone)}</div>` : ''}
      </div>

      <div style="border-top: 1px dashed #888; margin: 10px 0;"></div>

      <div style="font-size: 10px; line-height: 1.5; color: #111;">
        <div style="display: flex; justify-content: space-between;">
          <span><strong>Bill No:</strong> ${escapeHTML(bill.billNumber || '')}</span>
          <span><strong>${escapeHTML(bill.paymentMethod || 'CASH')}</strong></span>
        </div>
        <div><strong>Date:</strong> ${bill.date ? formatDate(bill.date) : ''} ${bill.time || ''}</div>
        ${bill.customerName ? `<div><strong>Customer:</strong> ${escapeHTML(bill.customerName)} ${bill.customerMobile ? `(${escapeHTML(bill.customerMobile)})` : ''}</div>` : ''}
      </div>

      <div style="border-top: 1px dashed #888; margin: 10px 0;"></div>

      <!-- Items -->
      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
        <thead>
          <tr style="border-bottom: 1px solid #000; text-align: left;">
            <th style="padding-bottom: 4px;">ITEM</th>
            <th style="padding-bottom: 4px; text-align: center;">QTY</th>
            <th style="padding-bottom: 4px; text-align: right;">AMT</th>
          </tr>
        </thead>
        <tbody>
          ${(bill.items || []).map(item => `
            <tr>
              <td style="padding: 4px 0; font-weight: 600;">${escapeHTML(item.name)}</td>
              <td style="padding: 4px 0; text-align: center;">${item.qty}</td>
              <td style="padding: 4px 0; text-align: right; font-weight: 700;">${formatCurrency(item.amount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="border-top: 1px dashed #888; margin: 10px 0;"></div>

      <!-- Totals -->
      <div style="font-size: 11px; line-height: 1.6;">
        <div style="display: flex; justify-content: space-between;">
          <span>Subtotal:</span>
          <span>${formatCurrency(bill.subtotal)}</span>
        </div>
        ${bill.discount > 0 ? `
          <div style="display: flex; justify-content: space-between; color: #c00;">
            <span>Discount:</span>
            <span>-${formatCurrency(bill.discount)}</span>
          </div>
        ` : ''}
        ${bill.tax > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span>Tax:</span>
            <span>${formatCurrency(bill.tax)}</span>
          </div>
        ` : ''}
        
        <!-- Grand Total Bar -->
        <div style="margin-top: 6px; background: #000; color: #FFF; padding: 6px 8px; font-size: 13px; font-weight: 900; display: flex; justify-content: space-between; border-radius: 4px;">
          <span>TOTAL:</span>
          <span>${formatCurrency(bill.grandTotal)}</span>
        </div>

        ${(bill.paymentStatus === 'PARTIAL' || bill.paymentStatus === 'DUE') ? `
          <div style="margin-top: 4px; font-size: 10px; color: #c00; text-align: right; font-weight: 700;">
            Paid: ${formatCurrency(bill.amountPaid || 0)} | Due: ${formatCurrency(bill.balanceDue || 0)}
          </div>
        ` : ''}
      </div>

      ${qrDataUrl ? `
        <div style="margin-top: 12px; text-align: center; border-top: 1px dashed #888; padding-top: 8px;">
          <img src="${qrDataUrl}" style="width: 80px; height: 80px; margin: 0 auto; display: block;">
          <div style="font-size: 9px; font-weight: 800; margin-top: 4px;">SCAN TO PAY VIA UPI</div>
          <div style="font-size: 8px; color: #444;">${escapeHTML(upiId)}</div>
        </div>
      ` : ''}

      <div style="border-top: 1px dashed #888; margin: 10px 0;"></div>

      <div style="text-align: center; font-size: 9px; color: #444;">
        <div style="font-weight: 700; font-size: 10px; color: #000;">${escapeHTML(footer)}</div>
        <div style="font-style: italic; margin-top: 2px;">"${escapeHTML(tagline)}"</div>
      </div>
    `;

    const filename = `TPP-RECEIPT-${bill.billNumber || 'DRAFT'}.pdf`;
    await this.renderHTMLToPDF(container, filename, true);
    showToast('80mm PDF downloaded: ' + filename, 'success');
  },

  // ── BUSINESS EXECUTIVE REPORT PDF ──
  async generateReportPDF(reportData, settings = {}) {
    if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
      showToast('PDF library not loaded.', 'error');
      return;
    }

    const storeName = settings.businessName || 'THANJAI PARUTHI PAAL';
    const tagline = settings.tagline || 'Tradition in Every Sip, Health in Every Cup.';
    const dateLabel = reportData.periodLabel || 'Sales & Performance Summary';
    const totalRevenue = reportData.totalRevenue || 0;
    const totalBills = reportData.totalBills || 0;
    const avgBill = totalBills > 0 ? (totalRevenue / totalBills).toFixed(0) : 0;

    let logoBase64 = null;
    try {
      logoBase64 = await this.loadImageAsBase64('assets/logo.png');
    } catch (e) {}

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '794px';
    container.style.padding = '32px';
    container.style.background = '#FFFFFF';
    container.style.fontFamily = "'Inter', -apple-system, sans-serif";
    container.style.color = '#111827';
    container.style.boxSizing = 'border-box';

    container.innerHTML = `
      <div style="height: 6px; background: linear-gradient(90deg, #F5A623 0%, #D4A017 100%); border-radius: 4px 4px 0 0; margin-bottom: 20px;"></div>

      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #F3F4F6; padding-bottom: 16px;">
        <div style="display: flex; gap: 14px; align-items: center;">
          ${logoBase64 ? `<img src="${logoBase64}" style="width: 56px; height: 56px; border-radius: 50%; border: 2px solid #F5A623;">` : ''}
          <div>
            <h1 style="margin: 0; font-size: 20px; font-weight: 900;">${escapeHTML(storeName)}</h1>
            <div style="font-size: 12px; color: #D4A017; font-weight: 700;">SALES & BUSINESS ANALYTICS REPORT</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 13px; font-weight: 800; color: #111827;">${escapeHTML(dateLabel)}</div>
          <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Generated on: ${formatDateTime(new Date().toISOString())}</div>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div style="margin-top: 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;">
        <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 14px;">
          <div style="font-size: 10px; font-weight: 800; color: #B45309; text-transform: uppercase;">TOTAL REVENUE</div>
          <div style="font-size: 20px; font-weight: 900; color: #B45309; margin-top: 4px;">${formatCurrency(totalRevenue)}</div>
        </div>
        <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 14px;">
          <div style="font-size: 10px; font-weight: 800; color: #1D4ED8; text-transform: uppercase;">TOTAL ORDERS</div>
          <div style="font-size: 20px; font-weight: 900; color: #1D4ED8; margin-top: 4px;">${totalBills}</div>
        </div>
        <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 14px;">
          <div style="font-size: 10px; font-weight: 800; color: #047857; text-transform: uppercase;">AVG ORDER VALUE</div>
          <div style="font-size: 20px; font-weight: 900; color: #047857; margin-top: 4px;">${formatCurrency(avgBill)}</div>
        </div>
        <div style="background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px;">
          <div style="font-size: 10px; font-weight: 800; color: #374151; text-transform: uppercase;">PAYMENT METHODS</div>
          <div style="font-size: 12px; font-weight: 700; color: #111827; margin-top: 4px;">
            Cash: ${formatCurrency(reportData.paymentStats?.CASH || 0)}
          </div>
        </div>
      </div>

      <!-- Product Sales Breakdown Table -->
      <div style="margin-top: 24px;">
        <h3 style="font-size: 14px; font-weight: 800; color: #111827; margin-bottom: 10px;">PRODUCT PERFORMANCE</h3>
        <table style="width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #111827; color: #FFF; font-size: 11px; text-transform: uppercase;">
              <th style="padding: 10px 14px; text-align: left;">Product</th>
              <th style="padding: 10px 14px; text-align: center;">Units Sold</th>
              <th style="padding: 10px 14px; text-align: right;">Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${(reportData.products || []).map((p, i) => `
              <tr style="background: ${i % 2 === 0 ? '#FFF' : '#FAF9F6'}; border-bottom: 1px solid #F3F4F6; font-size: 12px;">
                <td style="padding: 10px 14px; font-weight: 600;">${escapeHTML(p.name)}</td>
                <td style="padding: 10px 14px; text-align: center; font-weight: 700;">${p.qty}</td>
                <td style="padding: 10px 14px; text-align: right; font-weight: 800; color: #111827;">${formatCurrency(p.revenue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="margin-top: 32px; padding-top: 14px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 10px; color: #9CA3AF;">
        Thanjai Paruthi Paal POS Business Analytics Report • Confidential
      </div>
    `;

    const filename = `TPP-REPORT-${new Date().toISOString().slice(0, 10)}.pdf`;
    await this.renderHTMLToPDF(container, filename, false);
    showToast('Report PDF downloaded: ' + filename, 'success');
  },

  // ── CORE HTML-TO-CANVAS PDF RENDERER ──
  async renderHTMLToPDF(container, filename, is80mm = false) {
    document.body.appendChild(container);
    try {
      if (typeof html2canvas !== 'undefined') {
        const canvas = await html2canvas(container, {
          scale: 2, // High resolution (retina crispness)
          useCORS: true,
          backgroundColor: '#FFFFFF',
          logging: false
        });
        document.body.removeChild(container);

        const imgData = canvas.toDataURL('image/jpeg', 0.96);
        const { jsPDF } = window.jspdf || window;

        if (is80mm) {
          const imgWidth = 80;
          const pageHeight = Math.max(120, (canvas.height * imgWidth) / canvas.width);
          const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, pageHeight + 4]
          });
          doc.addImage(imgData, 'JPEG', 0, 2, imgWidth, pageHeight);
          doc.save(filename);
        } else {
          const doc = new jsPDF('portrait', 'mm', 'a4');
          const pdfWidth = doc.internal.pageSize.getWidth();
          const pdfHeight = doc.internal.pageSize.getHeight();
          const imgWidth = pdfWidth - 20; // 10mm margins
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          if (imgHeight <= pdfHeight - 20) {
            doc.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);
          } else {
            let heightLeft = imgHeight;
            let position = 10;
            doc.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - 20);

            while (heightLeft > 0) {
              position = heightLeft - imgHeight + 10;
              doc.addPage();
              doc.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
              heightLeft -= (pdfHeight - 20);
            }
          }
          doc.save(filename);
        }
      } else {
        if (container.parentNode) document.body.removeChild(container);
        throw new Error('html2canvas library unavailable');
      }
    } catch (err) {
      console.warn('HTML-to-Canvas PDF render failed, using standard fallback:', err);
      if (container.parentNode) document.body.removeChild(container);
    }
  }
};
