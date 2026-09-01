// ============================================================
// WHATSAPP SERVICE
// Thanjai Paruthi Paal POS System
// ============================================================

const WhatsAppService = {
  // Format Indian phone number for WhatsApp
  formatIndianPhoneNumber(phone) {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return cleaned;
    }
    if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
      return '91' + cleaned;
    }
    return null;
  },

  // Generate bill message text
  generateWhatsAppMessage(bill, settings = {}) {
    const storeName = settings.businessName || 'THANJAI PARUTHI PAAL';
    const tagline = settings.tagline || 'Tradition in Every Sip, Health in Every Cup.';
    const customerName = bill.customerName || 'Valued Customer';

    let itemsText = '';
    if (bill.items && bill.items.length > 0) {
      itemsText = bill.items.map(item =>
        `${item.name} × ${item.qty} = ${formatCurrency(item.amount)}`
      ).join('\n');
    }

    let paymentText = bill.paymentMethod || 'CASH';
    if (bill.paymentStatus === 'DUE' || bill.paymentStatus === 'PARTIAL') {
      paymentText += `\nAmount Paid: ${formatCurrency(bill.amountPaid || 0)}`;
      paymentText += `\nBalance Due: ${formatCurrency(bill.balanceDue || 0)}`;
    }

    const discountLine = bill.discount > 0 ? `Discount: -${formatCurrency(bill.discount)}\n` : '';

    const message = `Hello ${customerName} 👋

Thank you for visiting
*${storeName}*

*Bill No:* ${bill.billNumber}
*Date:* ${bill.date ? formatDate(bill.date) : ''}
*Time:* ${bill.time || ''}

*Your Order:*
${itemsText}

────────────────
${discountLine}*Total: ${formatCurrency(bill.grandTotal)}*
────────────────

*Payment:* ${paymentText}

Thank you for supporting Thanjavur's traditional goodness. ❤️

_${storeName}_
_${tagline}_`;

    return message;
  },

  // Send bill via WhatsApp (manual deep link method)
  sendBillViaWhatsApp(bill, settings = {}) {
    if (!bill.customerMobile) {
      showToast('Please add a customer mobile number to send via WhatsApp.', 'warning');
      return false;
    }

    const phone = this.formatIndianPhoneNumber(bill.customerMobile);
    if (!phone) {
      showToast('Invalid mobile number. Please enter a valid 10-digit Indian number.', 'error');
      return false;
    }

    const message = this.generateWhatsAppMessage(bill, settings);
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${phone}?text=${encoded}`;
    
    window.open(url, '_blank');
    showToast('Opening WhatsApp...', 'success');
    return true;
  },

  // Future: WhatsApp Business Cloud API integration
  // async sendViaAPI(bill, settings) {
  //   // This will use a secure backend/serverless function
  //   // Never expose API keys in frontend code
  //   // const response = await fetch('/api/whatsapp/send', {
  //   //   method: 'POST',
  //   //   body: JSON.stringify({ bill, phone: bill.customerMobile })
  //   // });
  // }
};
