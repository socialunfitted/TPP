// ============================================================
// UTILITIES — Currency, Date, Formatting
// ============================================================

// INR Currency formatting
function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

// Indian date format: 31 Aug 2026
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

// Indian time format: 09:15 PM
function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  }).toUpperCase();
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return `${formatDate(dateStr)}, ${formatTime(dateStr)}`;
}

function getCurrentDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentDateTime() {
  return new Date().toISOString();
}

function getDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getTodayLabel() {
  return formatDate(new Date().toISOString());
}

// Get date range
function getDateRange(filter) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = getDateString(today);

  switch (filter) {
    case 'today':
      return { start: todayStr, end: todayStr };
    case 'yesterday': {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      const s = getDateString(d);
      return { start: s, end: s };
    }
    case 'week': {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      return { start: getDateString(d), end: todayStr };
    }
    case 'month': {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: getDateString(d), end: todayStr };
    }
    default:
      return { start: todayStr, end: todayStr };
  }
}

function isInDateRange(dateStr, start, end) {
  if (!dateStr) return false;
  const d = dateStr.slice(0, 10);
  return d >= start && d <= end;
}

// Phone number formatting for India
function formatIndianPhone(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.length === 10) return cleaned;
  return cleaned;
}

function isValidIndianPhone(phone) {
  const cleaned = formatIndianPhone(phone);
  return /^[6-9]\d{9}$/.test(cleaned);
}

// Escape HTML
function escapeHTML(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Debounce
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Round off amount
function roundOff(amount) {
  const rounded = Math.round(amount);
  return { roundOff: +(rounded - amount).toFixed(2), total: rounded };
}

// Get initials for avatar
function getInitials(name) {
  if (!name) return 'G';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// Capitalize
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Payment method badge color
function getPaymentBadgeClass(method) {
  const map = {
    'CASH': 'badge-cash',
    'UPI': 'badge-upi',
    'CARD': 'badge-card',
    'CREDIT': 'badge-credit',
  };
  return map[method] || 'badge-cash';
}

// Status badge class
function getStatusBadgeClass(status) {
  const map = {
    'PAID': 'badge-paid',
    'PARTIAL': 'badge-partial',
    'DUE': 'badge-due',
  };
  return map[status] || 'badge-paid';
}

// LocalStorage helpers
const LS = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ'}</span>
    <span class="toast-msg">${escapeHTML(message)}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================
// CONFIRM DIALOG
// ============================================================
function showConfirm(title, message, onConfirm, onCancel, confirmText = 'Confirm', confirmClass = 'btn-danger') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.innerHTML = `
    <div class="modal-box confirm-modal">
      <div class="confirm-icon">⚠️</div>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(message)}</p>
      <div class="confirm-actions">
        <button class="btn btn-outline" id="confirm-cancel">Cancel</button>
        <button class="btn ${confirmClass}" id="confirm-ok">${escapeHTML(confirmText)}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#confirm-ok').onclick = () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  };
  overlay.querySelector('#confirm-cancel').onclick = () => {
    overlay.remove();
    if (onCancel) onCancel();
  };
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
      if (onCancel) onCancel();
    }
  };
}

// ============================================================
// ONLINE STATUS
// ============================================================
function updateOnlineStatus() {
  const indicator = document.getElementById('online-indicator');
  if (!indicator) return;
  if (navigator.onLine) {
    indicator.innerHTML = '<span class="status-dot online"></span> Online';
    indicator.className = 'online-status online';
  } else {
    indicator.innerHTML = '<span class="status-dot offline"></span> Offline — Local Billing Active';
    indicator.className = 'online-status offline';
  }
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// ============================================================
// UPI & QR CODE HELPERS
// ============================================================
function generateUPIString(upiId, storeName = 'THANJAI PARUTHI PAAL', amount = 0, billNumber = '') {
  if (!upiId) return '';
  const cleanUpi = upiId.trim();
  const cleanName = encodeURIComponent(storeName.trim());
  const amtStr = amount > 0 ? Number(amount).toFixed(2) : '';
  const note = billNumber ? encodeURIComponent(`Bill ${billNumber}`) : 'ParuthiPaalBill';
  
  let url = `upi://pay?pa=${cleanUpi}&pn=${cleanName}`;
  if (amtStr) url += `&am=${amtStr}`;
  url += `&cu=INR&tn=${note}`;
  return url;
}

function generateQRCodeDataURL(text, width = 150, height = 150) {
  return new Promise((resolve) => {
    if (!text) { resolve(null); return; }
    
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);
    
    try {
      if (typeof QRCode !== 'undefined') {
        new QRCode(container, {
          text: text,
          width: width,
          height: height,
          colorDark: '#1A1A1A',
          colorLight: '#FFFFFF',
          correctLevel: QRCode.CorrectLevel.M
        });
        
        setTimeout(() => {
          const img = container.querySelector('img');
          const canvas = container.querySelector('canvas');
          let dataUrl = null;
          if (canvas) {
            dataUrl = canvas.toDataURL('image/png');
          } else if (img) {
            dataUrl = img.src;
          }
          if (container.parentNode) document.body.removeChild(container);
          resolve(dataUrl);
        }, 100);
      } else {
        if (container.parentNode) document.body.removeChild(container);
        resolve(null);
      }
    } catch (err) {
      console.warn('QR Code generation error:', err);
      if (container.parentNode) document.body.removeChild(container);
      resolve(null);
    }
  });
}

