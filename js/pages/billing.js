// ============================================================
// BILLING / POS PAGE — The Core of the App
// ============================================================

let cart = [];
let currentCustomer = null;
let selectedCategory = 'ALL';
let allProducts = [];
let billSettings = {};

async function renderBilling() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading POS...</p></div>`;

  try {
    [allProducts, billSettings] = await Promise.all([
      ProductsDB.getActive(),
      SettingsDB.getAll()
    ]);

    // Restore cart from session
    const savedCart = LS.get('tpp_current_cart', []);
    if (savedCart.length > 0) cart = savedCart;

    renderPOSLayout();
  } catch (err) {
    content.innerHTML = `<div class="error-state"><h3>Error loading billing</h3><p>${err.message}</p></div>`;
  }
}

function renderPOSLayout() {
  const content = document.getElementById('page-content');
  const categories = ['ALL', ...new Set(allProducts.map(p => p.category))];

  content.innerHTML = `
    <div class="pos-layout">
      <!-- LEFT: Product Grid -->
      <div class="pos-left">
        <div class="pos-header">
          <h2 class="pos-title">New Bill</h2>
          <div class="pos-search">
            <input type="text" id="product-search" placeholder="🔍 Search products (F)" oninput="filterProducts(this.value)">
          </div>
        </div>

        <!-- Category Tabs -->
        <div class="category-tabs" id="category-tabs">
          ${categories.map(cat => `
            <button class="cat-tab ${cat === selectedCategory ? 'active' : ''}" 
              onclick="selectCategory('${cat}')" id="cat-${cat.replace(/\s/g, '-')}">
              ${cat === 'PARUTHI PAAL' ? '🥛 Paruthi Paal' : cat === 'SWEETS' ? '🍬 Sweets' : cat === 'SNACKS' ? '🍿 Snacks' : cat === 'TAKE HOME' ? '🛍 Take Home' : cat === 'COMBOS' ? '🎁 Combos' : cat === 'ALL' ? 'All' : cat}
            </button>
          `).join('')}
        </div>

        <!-- Product Grid -->
        <div class="product-grid" id="product-grid">
          ${renderProductCards()}
        </div>
      </div>

      <!-- RIGHT: Cart -->
      <div class="pos-right" id="pos-cart-panel">
        <!-- Customer Info -->
        <div class="cart-customer" id="cart-customer-section">
          ${renderCustomerSection()}
        </div>

        <!-- Cart Header -->
        <div class="cart-header">
          <h3>Current Bill</h3>
          <button class="btn-clear" onclick="clearCart()" id="clear-cart-btn" title="Clear Cart">🗑 Clear</button>
        </div>

        <!-- Cart Items -->
        <div class="cart-items" id="cart-items">
          ${renderCartItems()}
        </div>

        <!-- Bill Summary -->
        <div class="bill-summary" id="bill-summary">
          ${renderBillSummary()}
        </div>

        <!-- Complete Bill -->
        <div class="cart-footer">
          <button class="btn btn-complete" onclick="showPaymentModal()" id="complete-bill-btn">
            💳 Complete Bill
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Cart Toggle -->
    <div class="mobile-cart-toggle" id="mobile-cart-toggle" onclick="toggleMobileCart()">
      <span>🛒 Cart (${cart.length})</span>
      <span class="cart-total-badge">${formatCurrency(getCartGrandTotal())}</span>
    </div>
  `;

  // Focus search
  document.getElementById('product-search')?.focus();
}

function renderProductCards(filter = '') {
  let products = allProducts;

  if (selectedCategory !== 'ALL') {
    products = products.filter(p => p.category === selectedCategory);
  }

  if (filter) {
    const q = filter.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.tamilName && p.tamilName.includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  }

  if (products.length === 0) {
    return `<div class="empty-state small"><div class="empty-icon">📦</div><p>No products found</p></div>`;
  }

  return products.map(p => {
    const inCart = cart.find(c => c.productId === p.id);
    return `
      <div class="product-card ${inCart ? 'in-cart' : ''} ${p.image ? 'has-image' : ''}" onclick="addToCart(${p.id})" id="prod-${p.id}">
        ${p.image ? `
          <div class="product-img-wrap">
            <img src="${p.image}" class="product-card-img" alt="${escapeHTML(p.name)}">
          </div>
        ` : ''}
        <div class="product-name">${escapeHTML(p.name)}</div>
        ${p.tamilName ? `<div class="product-tamil">${escapeHTML(p.tamilName)}</div>` : ''}
        <div class="product-price">${formatCurrency(p.price)}</div>
        ${p.size ? `<div class="product-size">${escapeHTML(p.size)}</div>` : ''}
        ${inCart ? `<div class="product-qty-badge">${inCart.qty}</div>` : `<div class="product-add-btn">+</div>`}
      </div>
    `;
  }).join('');
}

function renderCartItems() {
  if (cart.length === 0) {
    return `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <p>Cart is empty</p>
        <small>Tap a product to add it</small>
      </div>
    `;
  }

  return cart.map((item, idx) => `
    <div class="cart-item" id="cart-item-${idx}">
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHTML(item.name)}</div>
        <div class="cart-item-rate">${formatCurrency(item.rate)} each</div>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="changeQty(${idx}, -1)">−</button>
        <span class="qty-display">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
        <button class="qty-del" onclick="removeFromCart(${idx})">🗑</button>
      </div>
      <div class="cart-item-amount">${formatCurrency(item.amount)}</div>
    </div>
  `).join('');
}

function renderBillSummary() {
  const subtotal = cart.reduce((s, i) => s + i.amount, 0);
  const discount = parseFloat(document.getElementById('discount-input')?.value || 0) || 0;
  const taxEnabled = billSettings.taxEnabled;
  const taxRate = parseFloat(billSettings.taxRate || 0);
  const tax = taxEnabled ? Math.round((subtotal - discount) * taxRate / 100 * 100) / 100 : 0;
  const afterTax = subtotal - discount + tax;
  const { roundOff: ro, total: grandTotal } = roundOff(afterTax);

  return `
    <div class="summary-row">
      <span>Subtotal</span>
      <span>${formatCurrency(subtotal)}</span>
    </div>
    <div class="summary-row discount-row">
      <span>Discount</span>
      <div class="discount-input-wrap">
        <span class="currency-sym">₹</span>
        <input type="number" id="discount-input" value="${discount}" min="0" max="${subtotal}" 
          placeholder="0" oninput="updateSummary()" class="discount-field">
      </div>
    </div>
    ${taxEnabled ? `
      <div class="summary-row">
        <span>Tax (${taxRate}%)</span>
        <span>${formatCurrency(tax)}</span>
      </div>
    ` : ''}
    ${ro !== 0 ? `
      <div class="summary-row">
        <span>Round Off</span>
        <span>${ro > 0 ? '+' : ''}${formatCurrency(ro)}</span>
      </div>
    ` : ''}
    <div class="summary-row grand-total-row">
      <span>Grand Total</span>
      <span>${formatCurrency(grandTotal)}</span>
    </div>
  `;
}

function renderCustomerSection() {
  if (currentCustomer) {
    return `
      <div class="customer-attached">
        <div class="customer-avatar">${getInitials(currentCustomer.name)}</div>
        <div class="customer-details">
          <div class="customer-name">${escapeHTML(currentCustomer.name)}</div>
          <div class="customer-mobile">${currentCustomer.mobile || 'No mobile'}</div>
        </div>
        <button class="btn-icon-sm" onclick="clearCustomer()" title="Remove customer">✕</button>
      </div>
    `;
  }
  return `
    <div class="customer-search-row">
      <input type="text" id="customer-search-input" placeholder="👤 Search or add customer (C)" 
        oninput="searchCustomerInline(this.value)" autocomplete="off">
      <button class="btn btn-sm btn-outline" onclick="showAddCustomerModal()">+ New</button>
    </div>
    <div id="customer-dropdown" class="customer-dropdown"></div>
  `;
}

function getCartGrandTotal() {
  const subtotal = cart.reduce((s, i) => s + i.amount, 0);
  const discount = parseFloat(document.getElementById('discount-input')?.value || 0) || 0;
  const taxEnabled = billSettings.taxEnabled;
  const taxRate = parseFloat(billSettings.taxRate || 0);
  const tax = taxEnabled ? Math.round((subtotal - discount) * taxRate / 100 * 100) / 100 : 0;
  const { total } = roundOff(subtotal - discount + tax);
  return total;
}

// ── CART OPERATIONS ──
function addToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(c => c.productId === productId);
  if (existing) {
    existing.qty++;
    existing.amount = existing.qty * existing.rate;
  } else {
    cart.push({
      productId: product.id,
      name: product.name,
      qty: 1,
      rate: product.price,
      amount: product.price
    });
  }

  saveCartToSession();
  refreshCart();
}

function changeQty(idx, delta) {
  if (!cart[idx]) return;
  const newQty = cart[idx].qty + delta;
  if (newQty <= 0) {
    cart.splice(idx, 1);
  } else {
    cart[idx].qty = newQty;
    cart[idx].amount = newQty * cart[idx].rate;
  }
  saveCartToSession();
  refreshCart();
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  saveCartToSession();
  refreshCart();
}

function clearCart() {
  if (cart.length === 0) return;
  showConfirm('Clear Cart', 'Remove all items from the cart?', () => {
    cart = [];
    currentCustomer = null;
    saveCartToSession();
    refreshCart();
    document.getElementById('cart-customer-section').innerHTML = renderCustomerSection();
  }, null, 'Clear Cart', 'btn-danger');
}

function refreshCart() {
  const cartItems = document.getElementById('cart-items');
  const billSummary = document.getElementById('bill-summary');
  const productGrid = document.getElementById('product-grid');
  const mobileToggle = document.getElementById('mobile-cart-toggle');

  if (cartItems) cartItems.innerHTML = renderCartItems();
  if (billSummary) billSummary.innerHTML = renderBillSummary();
  if (productGrid) productGrid.innerHTML = renderProductCards(document.getElementById('product-search')?.value || '');
  if (mobileToggle) {
    mobileToggle.innerHTML = `<span>🛒 Cart (${cart.length})</span><span class="cart-total-badge">${formatCurrency(getCartGrandTotal())}</span>`;
  }
}

function updateSummary() {
  const billSummary = document.getElementById('bill-summary');
  if (billSummary) billSummary.innerHTML = renderBillSummary();
}

function saveCartToSession() {
  LS.set('tpp_current_cart', cart);
}

function selectCategory(cat) {
  selectedCategory = cat;
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`cat-${cat.replace(/\s/g, '-')}`)?.classList.add('active');
  document.getElementById('product-grid').innerHTML = renderProductCards(document.getElementById('product-search')?.value || '');
}

function filterProducts(value) {
  document.getElementById('product-grid').innerHTML = renderProductCards(value);
}

// ── CUSTOMER SEARCH ──
async function searchCustomerInline(query) {
  const dropdown = document.getElementById('customer-dropdown');
  if (!dropdown) return;

  if (!query || query.length < 2) {
    dropdown.innerHTML = '';
    return;
  }

  const results = await CustomersDB.search(query);
  if (results.length === 0) {
    dropdown.innerHTML = `<div class="dropdown-item no-result">No customers found. <button class="link-btn" onclick="showAddCustomerModal()">Add New</button></div>`;
    return;
  }

  dropdown.innerHTML = results.slice(0, 5).map(c => `
    <div class="dropdown-item" onclick="selectCustomer(${c.id})">
      <span class="dropdown-avatar">${getInitials(c.name)}</span>
      <span class="dropdown-name">${escapeHTML(c.name)}</span>
      <span class="dropdown-mobile">${c.mobile || ''}</span>
      ${c.outstandingDue > 0 ? `<span class="due-badge">Due: ${formatCurrency(c.outstandingDue)}</span>` : ''}
    </div>
  `).join('');
}

async function selectCustomer(customerId) {
  const customer = await CustomersDB.get(customerId);
  if (!customer) return;
  currentCustomer = customer;
  document.getElementById('cart-customer-section').innerHTML = renderCustomerSection();
}

function clearCustomer() {
  currentCustomer = null;
  document.getElementById('cart-customer-section').innerHTML = renderCustomerSection();
}

// ── ADD CUSTOMER MODAL ──
function showAddCustomerModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = 'customer-modal';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3>Add Customer</h3>
        <button class="modal-close" onclick="document.getElementById('customer-modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Name</label>
          <input type="text" id="new-cust-name" placeholder="Customer name" autocomplete="name">
        </div>
        <div class="form-group">
          <label>Mobile Number</label>
          <input type="tel" id="new-cust-mobile" placeholder="10-digit mobile" maxlength="10" autocomplete="tel">
        </div>
        <div class="form-group">
          <label>Address <span class="optional">(optional)</span></label>
          <input type="text" id="new-cust-address" placeholder="Address">
        </div>
        <div class="form-group">
          <label>Email <span class="optional">(optional)</span></label>
          <input type="email" id="new-cust-email" placeholder="Email">
        </div>
        <div class="form-check">
          <input type="checkbox" id="save-customer-check" checked>
          <label for="save-customer-check">Save customer to database</label>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('customer-modal').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveNewCustomer()">Add Customer</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('new-cust-name')?.focus();
}

async function saveNewCustomer() {
  const name = document.getElementById('new-cust-name')?.value.trim();
  const mobile = document.getElementById('new-cust-mobile')?.value.trim();
  const address = document.getElementById('new-cust-address')?.value.trim();
  const email = document.getElementById('new-cust-email')?.value.trim();
  const saveToDb = document.getElementById('save-customer-check')?.checked;

  if (!name && !mobile) {
    showToast('Please enter at least a name or mobile number.', 'warning');
    return;
  }

  if (mobile && !isValidIndianPhone(mobile)) {
    showToast('Please enter a valid 10-digit Indian mobile number.', 'error');
    return;
  }

  const customer = {
    name: name || 'Walk-in Customer',
    mobile: mobile || '',
    address: address || '',
    email: email || '',
    totalBills: 0,
    totalPurchases: 0,
    outstandingDue: 0,
    createdAt: new Date().toISOString()
  };

  if (saveToDb && (name || mobile)) {
    const id = await CustomersDB.add(customer);
    customer.id = id;
    showToast('Customer saved!', 'success');
  }

  currentCustomer = customer;
  document.getElementById('customer-modal')?.remove();
  document.getElementById('cart-customer-section').innerHTML = renderCustomerSection();
}

// ── PAYMENT MODAL ──
function showPaymentModal() {
  if (cart.length === 0) {
    showToast('Please add at least one item before creating the bill.', 'warning');
    return;
  }

  const subtotal = cart.reduce((s, i) => s + i.amount, 0);
  const discount = parseFloat(document.getElementById('discount-input')?.value || 0) || 0;
  const taxEnabled = billSettings.taxEnabled;
  const taxRate = parseFloat(billSettings.taxRate || 0);
  const tax = taxEnabled ? Math.round((subtotal - discount) * taxRate / 100 * 100) / 100 : 0;
  const { roundOff: ro, total: grandTotal } = roundOff(subtotal - discount + tax);

  const lastPayment = LS.get('tpp_last_payment', 'CASH');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = 'payment-modal';
  overlay.innerHTML = `
    <div class="modal-box payment-modal">
      <div class="modal-header">
        <h3>Complete Bill</h3>
        <button class="modal-close" onclick="document.getElementById('payment-modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        <!-- Bill Total -->
        <div class="bill-total-display">
          <div class="bill-total-label">Bill Total</div>
          <div class="bill-total-amount">${formatCurrency(grandTotal)}</div>
        </div>

        <!-- Customer Summary -->
        <div class="customer-summary">
          <div class="cs-label">Customer</div>
          <div class="cs-value">${currentCustomer ? `${escapeHTML(currentCustomer.name)} ${currentCustomer.mobile ? '• ' + currentCustomer.mobile : ''}` : 'Walk-in Customer'}</div>
        </div>

        <!-- Payment Method -->
        <div class="form-group">
          <label>Payment Method</label>
          <div class="payment-methods" id="payment-methods">
            ${['CASH', 'UPI', 'CARD', 'CREDIT'].map(m => `
              <button class="pay-method-btn ${m === lastPayment ? 'active' : ''}" 
                onclick="selectPaymentMethod('${m}')" id="pm-${m}">
                ${m === 'CASH' ? '💵 Cash' : m === 'UPI' ? '📱 UPI' : m === 'CARD' ? '💳 Card' : '📋 Credit/Due'}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- UPI QR Code Display -->
        <div id="upi-qr-section" style="${lastPayment === 'UPI' ? '' : 'display:none;'}" class="upi-qr-section">
          <div class="upi-qr-title">📱 Scan to Pay via UPI</div>
          <div class="upi-qr-box" id="modal-upi-qr-box"></div>
          <div class="upi-qr-sub">Scan using Google Pay, PhonePe, Paytm or BHIM</div>
        </div>

        <!-- Payment Status -->
        <div class="form-group">
          <label>Payment Status</label>
          <div class="payment-status-btns" id="payment-status-btns">
            ${['PAID', 'PARTIAL', 'DUE'].map(s => `
              <button class="status-method-btn ${s === 'PAID' ? 'active' : ''}" 
                onclick="selectPaymentStatus('${s}')" id="ps-${s}">
                ${s === 'PAID' ? '✅ Paid' : s === 'PARTIAL' ? '⏳ Partial' : '❌ Due'}
              </button>
            `).join('')}
          </div>
        </div>

        <div id="partial-amount-section" style="display:none;" class="form-group">
          <label>Amount Paid</label>
          <div class="input-with-symbol">
            <span>₹</span>
            <input type="number" id="amount-paid-input" placeholder="0" min="0" max="${grandTotal}">
          </div>
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label>Notes <span class="optional">(optional)</span></label>
          <input type="text" id="bill-notes" placeholder="Any additional notes...">
        </div>

        <!-- Order Type -->
        <div class="form-group">
          <label>Order Type</label>
          <div class="payment-methods">
            ${['Dine-in', 'Takeaway', 'Delivery'].map(t => `
              <button class="pay-method-btn ${t === 'Dine-in' ? 'active' : ''}" 
                onclick="selectOrderType('${t}', this)">
                ${t === 'Dine-in' ? '🍽 Dine-in' : t === 'Takeaway' ? '🛍 Takeaway' : '🛵 Delivery'}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="modal-footer payment-actions">
        <button class="btn btn-outline" onclick="document.getElementById('payment-modal').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="completeBill('only')" id="btn-complete-only">✓ Complete</button>
        <button class="btn btn-success" onclick="completeBill('print')" id="btn-complete-print">🖨 Complete & Print</button>
        <button class="btn btn-info" onclick="completeBill('pdf')" id="btn-complete-pdf">📄 Complete & PDF</button>
        <button class="btn btn-whatsapp" onclick="completeBill('whatsapp')" id="btn-complete-wa">💬 Complete & WhatsApp</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Set hidden data
  overlay.dataset.grandTotal = grandTotal;
  overlay.dataset.subtotal = subtotal;
  overlay.dataset.discount = discount;
  overlay.dataset.tax = tax;
  overlay.dataset.roundOff = ro;
  overlay.dataset.selectedPayment = lastPayment;
  overlay.dataset.selectedStatus = 'PAID';
  overlay.dataset.orderType = 'Dine-in';

  if (lastPayment === 'UPI') {
    renderModalUPIQR(grandTotal);
  }
}

async function renderModalUPIQR(grandTotal) {
  const container = document.getElementById('modal-upi-qr-box');
  if (!container) return;
  
  const upiId = billSettings.upiId || 'thanjai.paruthipaal@upi';
  const storeName = billSettings.businessName || 'THANJAI PARUTHI PAAL';
  
  container.innerHTML = '<div class="loading-spinner small" style="height:80px;"><div class="spinner"></div></div>';
  
  const upiStr = generateUPIString(upiId, storeName, grandTotal, 'POS');
  const dataUrl = await generateQRCodeDataURL(upiStr, 150, 150);
  
  if (dataUrl) {
    container.innerHTML = `
      <img src="${dataUrl}" class="qr-img" alt="UPI QR Code">
      <div class="qr-amt-badge">Scan & Pay ${formatCurrency(grandTotal)}</div>
      <div class="qr-upi-text"><strong>UPI ID:</strong> ${escapeHTML(upiId)}</div>
    `;
  } else {
    container.innerHTML = `
      <div class="qr-fallback-box">
        <div><strong>UPI ID:</strong> ${escapeHTML(upiId)}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Amount: ${formatCurrency(grandTotal)}</div>
      </div>
    `;
  }
}

function selectPaymentMethod(method) {
  document.querySelectorAll('.pay-method-btn').forEach(b => {
    if (b.id && b.id.startsWith('pm-')) b.classList.remove('active');
  });
  document.getElementById(`pm-${method}`)?.classList.add('active');
  document.getElementById('payment-modal').dataset.selectedPayment = method;
  LS.set('tpp_last_payment', method);

  const qrSection = document.getElementById('upi-qr-section');
  if (qrSection) {
    qrSection.style.display = method === 'UPI' ? 'block' : 'none';
    if (method === 'UPI') {
      const grandTotal = parseFloat(document.getElementById('payment-modal')?.dataset.grandTotal || 0);
      renderModalUPIQR(grandTotal);
    }
  }

  // Auto-set status to DUE for CREDIT
  if (method === 'CREDIT') {
    selectPaymentStatus('DUE');
  }
}

function selectPaymentStatus(status) {
  document.querySelectorAll('.status-method-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`ps-${status}`)?.classList.add('active');
  document.getElementById('payment-modal').dataset.selectedStatus = status;

  const partial = document.getElementById('partial-amount-section');
  if (partial) {
    partial.style.display = status === 'PARTIAL' ? 'block' : 'none';
  }
}

function selectOrderType(type, btn) {
  btn.closest('.payment-methods').querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('payment-modal').dataset.orderType = type;
}

async function completeBill(action) {
  const modal = document.getElementById('payment-modal');
  const grandTotal = parseFloat(modal.dataset.grandTotal);
  const subtotal = parseFloat(modal.dataset.subtotal);
  const discount = parseFloat(modal.dataset.discount);
  const tax = parseFloat(modal.dataset.tax);
  const ro = parseFloat(modal.dataset.roundOff);
  const paymentMethod = modal.dataset.selectedPayment || 'CASH';
  const paymentStatus = modal.dataset.selectedStatus || 'PAID';
  const orderType = modal.dataset.orderType || 'Dine-in';
  const notes = document.getElementById('bill-notes')?.value.trim() || '';

  let amountPaid = grandTotal;
  let balanceDue = 0;

  if (paymentStatus === 'PARTIAL') {
    amountPaid = parseFloat(document.getElementById('amount-paid-input')?.value || 0) || 0;
    if (amountPaid >= grandTotal) { amountPaid = grandTotal; }
    balanceDue = grandTotal - amountPaid;
  } else if (paymentStatus === 'DUE') {
    amountPaid = 0;
    balanceDue = grandTotal;
  }

  const prefix = billSettings.billPrefix || 'TPP';
  const billNumber = await BillNumberDB.getNext(prefix);
  const now = new Date();
  const dateStr = getDateString(now);
  const timeStr = formatTime(now.toISOString());

  const bill = {
    billNumber,
    date: dateStr,
    time: timeStr,
    dateTime: now.toISOString(),
    customerId: currentCustomer?.id || null,
    customerName: currentCustomer?.name || '',
    customerMobile: currentCustomer?.mobile || '',
    items: [...cart],
    subtotal,
    discount,
    tax,
    roundOff: ro,
    grandTotal,
    paymentMethod,
    paymentStatus,
    amountPaid,
    balanceDue,
    orderType,
    notes,
    status: 'COMPLETED',
    createdAt: now.toISOString()
  };

  // Save bill
  const billId = await BillsDB.add(bill);
  bill.id = billId;

  // Update customer
  if (currentCustomer?.id) {
    const existing = await CustomersDB.get(currentCustomer.id);
    if (existing) {
      await CustomersDB.update({
        ...existing,
        totalBills: (existing.totalBills || 0) + 1,
        totalPurchases: (existing.totalPurchases || 0) + grandTotal,
        outstandingDue: (existing.outstandingDue || 0) + balanceDue,
        lastPurchase: dateStr
      });
    }
  }

  // Clear cart
  cart = [];
  currentCustomer = null;
  LS.remove('tpp_current_cart');

  // Close modal
  modal.remove();

  // Show success screen
  showBillSuccess(bill, action);
}

function showBillSuccess(bill, action) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = 'success-modal';
  overlay.innerHTML = `
    <div class="modal-box success-modal">
      <div class="success-icon">✅</div>
      <h2>Bill Created Successfully!</h2>
      <div class="success-bill-no">${escapeHTML(bill.billNumber)}</div>
      <div class="success-amount">${formatCurrency(bill.grandTotal)}</div>
      <div class="success-details">
        ${bill.customerName ? `<span>${escapeHTML(bill.customerName)}</span> •` : ''}
        <span>${escapeHTML(bill.paymentMethod)}</span> •
        <span>${bill.time}</span>
      </div>
      <div class="success-actions">
        <button class="btn btn-outline" onclick="viewBillModal(${bill.id});document.getElementById('success-modal').remove();">👁 View</button>
        <button class="btn btn-primary" onclick="printBill(${bill.id})">🖨 Print</button>
        <button class="btn btn-info" onclick="downloadBillPDF(${bill.id})">📄 PDF</button>
        <button class="btn btn-whatsapp" onclick="whatsappBill(${bill.id})">💬 WhatsApp</button>
        <button class="btn btn-success" onclick="document.getElementById('success-modal').remove();renderBilling();" id="success-new-bill">+ New Bill</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Auto-trigger action
  if (action === 'print') {
    setTimeout(() => printBill(bill.id), 300);
  } else if (action === 'pdf') {
    setTimeout(() => downloadBillPDF(bill.id), 300);
  } else if (action === 'whatsapp') {
    setTimeout(() => whatsappBill(bill.id), 300);
  }
}

function toggleMobileCart() {
  const cartPanel = document.getElementById('pos-cart-panel');
  if (cartPanel) cartPanel.classList.toggle('mobile-open');
}

// ── GLOBAL BILL ACTIONS ──
async function viewBillModal(billId) {
  const bill = await BillsDB.get(billId);
  const settings = await SettingsDB.getAll();
  if (!bill) { showToast('Bill not found.', 'error'); return; }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = 'view-bill-modal';
  overlay.innerHTML = `
    <div class="modal-box bill-view-modal">
      <div class="modal-header">
        <h3>Bill — ${escapeHTML(bill.billNumber)}</h3>
        <button class="modal-close" onclick="document.getElementById('view-bill-modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="invoice-preview" id="invoice-print-${billId}">
          ${generateInvoiceHTML(bill, settings)}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('view-bill-modal').remove()">Close</button>
        <button class="btn btn-primary" onclick="printBill(${billId})">🖨 Print</button>
        <button class="btn btn-info" onclick="downloadBillPDF(${billId})">📄 A4 PDF</button>
        <button class="btn btn-secondary" onclick="download80mmPDF(${billId})">🧾 80mm</button>
        <button class="btn btn-whatsapp" onclick="whatsappBill(${billId})">💬 WhatsApp</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function generateInvoiceHTML(bill, settings = {}) {
  const storeName = settings.businessName || 'THANJAI PARUTHI PAAL';
  const tamilName = settings.tamilName || 'தஞ்சை பருத்திப்பால்';
  const tagline = settings.tagline || 'Tradition in Every Sip, Health in Every Cup.';
  const address = settings.address || '';
  const phone = settings.phone || '';
  const footer = settings.receiptFooter || 'Thank you for visiting!';

  return `
    <div class="invoice-doc">
      <div class="inv-header">
        <img src="assets/logo.png" alt="Logo" class="inv-logo" onerror="this.style.display='none'">
        <h2 class="inv-store-name">${escapeHTML(storeName)}</h2>
        <div class="inv-tamil">${escapeHTML(tamilName)}</div>
        <div class="inv-tagline">"${escapeHTML(tagline)}"</div>
        ${address ? `<div class="inv-address">📍 ${escapeHTML(address)}</div>` : ''}
        ${phone ? `<div class="inv-phone">📞 ${escapeHTML(phone)}</div>` : ''}
      </div>
      <div class="inv-divider"></div>
      <div class="inv-meta">
        <div><strong>Bill No:</strong> ${escapeHTML(bill.billNumber || '')}</div>
        <div><strong>Date:</strong> ${bill.date ? formatDate(bill.date) : ''} • ${bill.time || ''}</div>
        ${bill.customerName ? `<div><strong>Customer:</strong> ${escapeHTML(bill.customerName)} ${bill.customerMobile ? `(${escapeHTML(bill.customerMobile)})` : ''}</div>` : ''}
        ${bill.orderType ? `<div><strong>Type:</strong> ${escapeHTML(bill.orderType)}</div>` : ''}
      </div>
      <div class="inv-divider"></div>
      <table class="inv-table">
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Rate</th>
            <th style="text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${(bill.items || []).map(item => `
            <tr>
              <td><strong>${escapeHTML(item.name)}</strong></td>
              <td style="text-align:center;">${item.qty}</td>
              <td style="text-align:right;">${formatCurrency(item.rate)}</td>
              <td style="text-align:right;"><strong>${formatCurrency(item.amount)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="inv-divider"></div>
      <div class="inv-totals">
        <div class="inv-total-row"><span>Subtotal</span><span>${formatCurrency(bill.subtotal)}</span></div>
        ${bill.discount > 0 ? `<div class="inv-total-row" style="color:var(--danger);"><span>Discount</span><span>-${formatCurrency(bill.discount)}</span></div>` : ''}
        ${bill.tax > 0 ? `<div class="inv-total-row"><span>Tax</span><span>${formatCurrency(bill.tax)}</span></div>` : ''}
        ${bill.roundOff ? `<div class="inv-total-row"><span>Round Off</span><span>${formatCurrency(bill.roundOff)}</span></div>` : ''}
        <div class="inv-total-row grand"><span>Grand Total</span><span>${formatCurrency(bill.grandTotal)}</span></div>
        ${bill.paymentStatus !== 'PAID' ? `
          <div class="inv-total-row"><span>Amount Paid</span><span>${formatCurrency(bill.amountPaid)}</span></div>
          <div class="inv-total-row due-row"><span>Balance Due</span><span>${formatCurrency(bill.balanceDue)}</span></div>
        ` : ''}
      </div>
      <div class="inv-divider"></div>
      <div class="inv-payment">Payment: <strong>${escapeHTML(bill.paymentMethod || 'CASH')}</strong> • <strong>${escapeHTML(bill.paymentStatus || 'PAID')}</strong></div>
      ${bill.notes ? `<div class="inv-notes">Notes: ${escapeHTML(bill.notes)}</div>` : ''}
      <div class="inv-divider"></div>
      <div class="inv-footer">
        <p><strong>${escapeHTML(footer)}</strong></p>
        <p class="inv-footer-tagline">"${escapeHTML(tagline)}"</p>
        <p class="inv-store-footer">${escapeHTML(storeName)}</p>
      </div>
    </div>
  `;
}

async function downloadBillPDF(billId) {
  const bill = await BillsDB.get(billId);
  const settings = await SettingsDB.getAll();
  if (!bill) { showToast('Bill not found.', 'error'); return; }
  await PDFService.generateInvoicePDF(bill, settings);
}

async function download80mmPDF(billId) {
  const bill = await BillsDB.get(billId);
  const settings = await SettingsDB.getAll();
  if (!bill) { showToast('Bill not found.', 'error'); return; }
  await PDFService.generate80mmReceipt(bill, settings);
}

async function printBill(billId) {
  const bill = await BillsDB.get(billId);
  const settings = await SettingsDB.getAll();
  if (!bill) { showToast('Bill not found.', 'error'); return; }

  const printWin = window.open('', '_blank', 'width=800,height=900');
  const invoiceHTML = generateInvoiceHTML(bill, settings);

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Bill ${bill.billNumber}</title>
      <link rel="stylesheet" href="${window.location.origin}${window.location.pathname.replace('index.html','')}css/style.css">
      <style>
        body { margin: 0; padding: 20px; background: white; }
        .invoice-doc { max-width: 600px; margin: 0 auto; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      ${invoiceHTML}
      <script>
        window.onload = function() {
          window.print();
          setTimeout(() => window.close(), 1000);
        };
      <\/script>
    </body>
    </html>
  `);
  printWin.document.close();
}

async function whatsappBill(billId) {
  const bill = await BillsDB.get(billId);
  const settings = await SettingsDB.getAll();
  if (!bill) { showToast('Bill not found.', 'error'); return; }

  if (!bill.customerMobile) {
    showToast('No mobile number on this bill. Please add a customer mobile number.', 'warning');
    return;
  }

  WhatsAppService.sendBillViaWhatsApp(bill, settings);
}
