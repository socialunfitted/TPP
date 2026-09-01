// ============================================================
// SUBSCRIPTIONS PAGE — Complete Subscription Management
// ============================================================

let subFilter = 'ACTIVE'; // ACTIVE | EXPIRING | EXPIRED | ALL
let subSearch = '';

async function renderSubscriptions() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading subscriptions...</p></div>`;

  try {
    const [subscriptions, customers] = await Promise.all([
      SubscriptionsDB.getAll(),
      CustomersDB.getAll()
    ]);
    renderSubscriptionsPage(subscriptions, customers);
  } catch (err) {
    content.innerHTML = `<div class="error-state"><h3>Error loading subscriptions</h3><p>${err.message}</p></div>`;
  }
}

function renderSubscriptionsPage(subscriptions, customers) {
  const content = document.getElementById('page-content');
  const today = getDateString();

  // Attach customer info
  const custMap = {};
  customers.forEach(c => { custMap[c.id] = c; });

  // Tag each subscription with status
  const tagged = subscriptions.map(s => {
    const endDate = s.endDate || '';
    const daysLeft = endDate ? Math.ceil((new Date(endDate) - new Date(today)) / 86400000) : 0;
    let computedStatus = s.status;
    if (s.status === 'ACTIVE' && daysLeft < 0) computedStatus = 'EXPIRED';
    return { ...s, daysLeft, computedStatus };
  });

  // Filter
  let filtered = tagged;
  if (subFilter === 'ACTIVE') filtered = tagged.filter(s => s.computedStatus === 'ACTIVE' && s.daysLeft >= 0);
  else if (subFilter === 'EXPIRING') filtered = tagged.filter(s => s.computedStatus === 'ACTIVE' && s.daysLeft >= 0 && s.daysLeft <= 7);
  else if (subFilter === 'EXPIRED') filtered = tagged.filter(s => s.computedStatus === 'EXPIRED' || s.daysLeft < 0);
  else if (subFilter === 'PAUSED') filtered = tagged.filter(s => s.status === 'PAUSED');

  if (subSearch) {
    const q = subSearch.toLowerCase();
    filtered = filtered.filter(s =>
      (s.customerName && s.customerName.toLowerCase().includes(q)) ||
      (s.customerMobile && s.customerMobile.includes(q)) ||
      (s.productName && s.productName.toLowerCase().includes(q))
    );
  }

  filtered.sort((a, b) => a.daysLeft - b.daysLeft);

  const activeCount = tagged.filter(s => s.computedStatus === 'ACTIVE' && s.daysLeft >= 0).length;
  const expiringCount = tagged.filter(s => s.computedStatus === 'ACTIVE' && s.daysLeft >= 0 && s.daysLeft <= 7).length;
  const expiredCount = tagged.filter(s => s.computedStatus === 'EXPIRED' || s.daysLeft < 0).length;
  const pausedCount = tagged.filter(s => s.status === 'PAUSED').length;
  const totalRevenue = tagged.filter(s => s.computedStatus === 'ACTIVE' && s.daysLeft >= 0).reduce((s, sub) => s + (sub.amount || 0), 0);

  // Today's delivery list
  const todayDelivery = tagged.filter(s => s.computedStatus === 'ACTIVE' && s.daysLeft >= 0);

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">⭐ Subscriptions</h1>
        <p class="page-subtitle">${activeCount} active • ${expiringCount > 0 ? `<span style="color:var(--warning)">${expiringCount} expiring soon</span> •` : ''} ${formatCurrency(totalRevenue)} committed</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline" onclick="showTodayDeliveryModal()" id="delivery-list-btn">📋 Today's Delivery</button>
        <button class="btn btn-primary" onclick="showAddSubscriptionModal()" id="new-sub-btn">+ New Subscription</button>
      </div>
    </div>

    <!-- Stats Bar -->
    <div class="sub-stats-bar">
      <div class="sub-stat-card">
        <div class="sub-stat-val">${activeCount}</div>
        <div class="sub-stat-lbl">Active</div>
      </div>
      <div class="sub-stat-card expiring">
        <div class="sub-stat-val" style="color:var(--warning)">${expiringCount}</div>
        <div class="sub-stat-lbl">Expiring in 7 Days</div>
      </div>
      <div class="sub-stat-card">
        <div class="sub-stat-val" style="color:var(--danger)">${expiredCount}</div>
        <div class="sub-stat-lbl">Expired</div>
      </div>
      <div class="sub-stat-card">
        <div class="sub-stat-val">${formatCurrency(totalRevenue)}</div>
        <div class="sub-stat-lbl">Total Committed</div>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="filter-bar">
      <div class="date-filters">
        <button class="filter-btn ${subFilter === 'ACTIVE' ? 'active' : ''}" onclick="setSubFilter('ACTIVE')">Active (${activeCount})</button>
        <button class="filter-btn ${subFilter === 'EXPIRING' ? 'active' : ''}" onclick="setSubFilter('EXPIRING')" style="${expiringCount > 0 ? 'border-color:var(--warning);color:var(--warning)' : ''}">⚠ Expiring (${expiringCount})</button>
        <button class="filter-btn ${subFilter === 'EXPIRED' ? 'active' : ''}" onclick="setSubFilter('EXPIRED')">Expired (${expiredCount})</button>
        <button class="filter-btn ${subFilter === 'PAUSED' ? 'active' : ''}" onclick="setSubFilter('PAUSED')">Paused (${pausedCount})</button>
        <button class="filter-btn ${subFilter === 'ALL' ? 'active' : ''}" onclick="setSubFilter('ALL')">All (${tagged.length})</button>
      </div>
      <div class="search-box">
        <input type="text" placeholder="🔍 Search customer, product..." value="${escapeHTML(subSearch)}" oninput="setSubSearch(this.value)" id="sub-search-input">
      </div>
    </div>

    ${filtered.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">⭐</div>
        <h3>${subSearch ? 'No subscriptions found' : 'No subscriptions in this category'}</h3>
        <p>${subSearch ? 'Try a different search.' : 'Create a subscription to get started.'}</p>
        <button class="btn btn-primary" onclick="showAddSubscriptionModal()">+ New Subscription</button>
      </div>
    ` : `
      <div class="sub-cards-grid">
        ${filtered.map(sub => renderSubCard(sub)).join('')}
      </div>
    `}
  `;
}

function renderSubCard(sub) {
  const isExpiring = sub.computedStatus === 'ACTIVE' && sub.daysLeft >= 0 && sub.daysLeft <= 7;
  const isExpired = sub.computedStatus === 'EXPIRED' || sub.daysLeft < 0;
  const isPaused = sub.status === 'PAUSED';

  let statusBadge = '';
  let cardClass = 'sub-card';
  if (isExpired) { statusBadge = `<span class="sub-badge expired">Expired</span>`; cardClass += ' sub-card-expired'; }
  else if (isPaused) { statusBadge = `<span class="sub-badge paused">Paused</span>`; cardClass += ' sub-card-paused'; }
  else if (isExpiring) { statusBadge = `<span class="sub-badge expiring">⚠ ${sub.daysLeft} days left</span>`; cardClass += ' sub-card-expiring'; }
  else { statusBadge = `<span class="sub-badge active">${sub.daysLeft} days left</span>`; }

  const payBadge = sub.paymentStatus === 'PENDING'
    ? `<span class="sub-badge pending">💰 ${formatCurrency(sub.amount)} Pending</span>`
    : `<span class="sub-badge paid">✅ Paid ${formatCurrency(sub.amount)}</span>`;

  return `
    <div class="${cardClass}" id="sub-card-${sub.id}">
      <div class="sub-card-header">
        <div class="sub-avatar">${getInitials(sub.customerName)}</div>
        <div class="sub-card-info">
          <div class="sub-customer-name">${escapeHTML(sub.customerName)}</div>
          <div class="sub-customer-phone">${sub.customerMobile ? '📞 ' + escapeHTML(sub.customerMobile) : 'No phone'}</div>
        </div>
        <div class="sub-card-badges">
          ${statusBadge}
          ${payBadge}
        </div>
      </div>

      <div class="sub-card-details">
        <div class="sub-detail-item">
          <span class="sub-detail-icon">🥛</span>
          <span>${escapeHTML(sub.productName || 'Paruthi Paal')} × ${sub.dailyQty || 1} daily</span>
        </div>
        <div class="sub-detail-item">
          <span class="sub-detail-icon">📅</span>
          <span>${escapeHTML(sub.planType)} Plan · ${formatDate(sub.startDate)} → ${formatDate(sub.endDate)}</span>
        </div>
        ${sub.notes ? `<div class="sub-detail-item"><span class="sub-detail-icon">📝</span><span>${escapeHTML(sub.notes)}</span></div>` : ''}
      </div>

      <div class="sub-card-actions">
        ${!isExpired && !isPaused ? `
          <button class="btn btn-sm btn-primary" onclick="renewSubscription(${sub.id})" id="renew-sub-${sub.id}">🔄 Renew</button>
          <button class="btn btn-sm btn-outline" onclick="createSubBill(${sub.id})" id="bill-sub-${sub.id}">🧾 Bill</button>
          <button class="btn btn-sm btn-outline" onclick="pauseSubscription(${sub.id})" id="pause-sub-${sub.id}">⏸ Pause</button>
        ` : ''}
        ${isPaused ? `<button class="btn btn-sm btn-success" onclick="resumeSubscription(${sub.id})" id="resume-sub-${sub.id}">▶ Resume</button>` : ''}
        ${sub.paymentStatus === 'PENDING' ? `<button class="btn btn-sm btn-success" onclick="collectSubPayment(${sub.id})" id="pay-sub-${sub.id}">💳 Collect</button>` : ''}
        ${isExpired ? `<button class="btn btn-sm btn-primary" onclick="renewSubscription(${sub.id})">🔄 Renew Now</button>` : ''}
        <button class="btn btn-sm btn-danger" onclick="cancelSubscription(${sub.id})" id="cancel-sub-${sub.id}">✕</button>
      </div>
    </div>
  `;
}

// ── FILTERS ──
function setSubFilter(filter) {
  subFilter = filter;
  renderSubscriptions();
}

function setSubSearch(value) {
  subSearch = value;
  debounce(async () => {
    const [subs, customers] = await Promise.all([SubscriptionsDB.getAll(), CustomersDB.getAll()]);
    renderSubscriptionsPage(subs, customers);
  }, 300)();
}

// ── TODAY'S DELIVERY MODAL ──
async function showTodayDeliveryModal() {
  const subs = await SubscriptionsDB.getAll();
  const today = getDateString();
  const active = subs.filter(s => s.status === 'ACTIVE' && s.endDate >= today);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = 'delivery-modal';
  overlay.innerHTML = `
    <div class="modal-box modal-lg">
      <div class="modal-header">
        <h3>📋 Today's Delivery List — ${getTodayLabel()}</h3>
        <button class="modal-close" onclick="document.getElementById('delivery-modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        ${active.length === 0 ? `<div class="empty-state small"><p>No active deliveries today.</p></div>` : `
          <div class="delivery-summary">
            <strong>${active.length} deliveries</strong> to complete today
          </div>
          <div class="delivery-list">
            ${active.map((s, i) => `
              <div class="delivery-item" id="delivery-${s.id}">
                <div class="delivery-num">${i + 1}</div>
                <div class="delivery-info">
                  <div class="delivery-name">${escapeHTML(s.customerName)}</div>
                  <div class="delivery-product">${escapeHTML(s.productName || 'Paruthi Paal')} × ${s.dailyQty || 1}</div>
                  ${s.notes ? `<div class="delivery-notes">📝 ${escapeHTML(s.notes)}</div>` : ''}
                  ${s.customerMobile ? `<div class="delivery-phone">📞 ${escapeHTML(s.customerMobile)}</div>` : ''}
                </div>
                <div class="delivery-status">
                  <button class="delivery-done-btn" onclick="markDelivered(${s.id})" id="del-done-${s.id}">✓ Done</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('delivery-modal').remove()">Close</button>
        <button class="btn btn-primary" onclick="printDeliveryList()">🖨 Print List</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function markDelivered(subId) {
  const btn = document.getElementById(`del-done-${subId}`);
  if (btn) {
    btn.textContent = '✅ Delivered';
    btn.disabled = true;
    btn.style.background = 'var(--success)';
    btn.style.color = 'white';
    btn.style.border = 'none';
  }
  const item = document.getElementById(`delivery-${subId}`);
  if (item) item.style.opacity = '0.6';
}

function printDeliveryList() {
  window.print();
}

// ── RENEWAL ──
async function renewSubscription(subId) {
  const sub = await SubscriptionsDB.get(subId);
  if (!sub) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = 'renew-modal';

  const today = getDateString();
  // Renew from today or from end date (whichever is later)
  const renewFrom = (sub.endDate && sub.endDate > today) ? sub.endDate : today;

  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3>🔄 Renew Subscription</h3>
        <button class="modal-close" onclick="document.getElementById('renew-modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="sub-renew-info">
          <strong>${escapeHTML(sub.customerName)}</strong><br>
          <span style="color:var(--text-muted)">${escapeHTML(sub.productName || 'Paruthi Paal')} × ${sub.dailyQty || 1} daily</span>
        </div>
        <div class="form-group">
          <label>Renewal Plan</label>
          <select id="renew-plan" onchange="calcRenewPrice()">
            <option value="Monthly" ${sub.planType === 'Monthly' ? 'selected' : ''}>Monthly (30 Days)</option>
            <option value="Quarterly" ${sub.planType === 'Quarterly' ? 'selected' : ''}>Quarterly (90 Days)</option>
            <option value="Half-Yearly" ${sub.planType === 'Half-Yearly' ? 'selected' : ''}>Half-Yearly (180 Days)</option>
            <option value="Yearly" ${sub.planType === 'Yearly' ? 'selected' : ''}>Yearly (365 Days)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Start From</label>
          <input type="date" id="renew-start" value="${renewFrom}">
        </div>
        <div class="form-group">
          <label>Renewal Amount (₹)</label>
          <div class="input-with-symbol">
            <span>₹</span>
            <input type="number" id="renew-amount" value="${sub.amount}" min="0">
          </div>
        </div>
        <div class="form-group">
          <label>Payment Status</label>
          <select id="renew-payment-status">
            <option value="PAID">✅ Paid in Full</option>
            <option value="PENDING">⏳ Payment Pending</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('renew-modal').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveRenewal(${sub.id})">🔄 Renew Subscription</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Pre-store sub data for price calc
  overlay.dataset.unitPrice = sub.unitPrice || 30;
  overlay.dataset.dailyQty = sub.dailyQty || 1;
}

function calcRenewPrice() {
  const modal = document.getElementById('renew-modal');
  const plan = document.getElementById('renew-plan')?.value;
  const unitPrice = parseFloat(modal?.dataset?.unitPrice || 30);
  const qty = parseInt(modal?.dataset?.dailyQty || 1);

  let days = 30;
  if (plan === 'Quarterly') days = 90;
  else if (plan === 'Half-Yearly') days = 180;
  else if (plan === 'Yearly') days = 365;

  const discount = plan === 'Yearly' ? 0.85 : plan === 'Half-Yearly' ? 0.90 : plan === 'Quarterly' ? 0.95 : 1.0;
  const amt = Math.round(unitPrice * qty * days * discount);

  const amtInput = document.getElementById('renew-amount');
  if (amtInput) amtInput.value = amt;
}

async function saveRenewal(oldSubId) {
  const oldSub = await SubscriptionsDB.get(oldSubId);
  if (!oldSub) return;

  const plan = document.getElementById('renew-plan')?.value;
  const startDate = document.getElementById('renew-start')?.value || getDateString();
  const amount = parseFloat(document.getElementById('renew-amount')?.value || 0);
  const paymentStatus = document.getElementById('renew-payment-status')?.value;

  let days = 30;
  if (plan === 'Quarterly') days = 90;
  else if (plan === 'Half-Yearly') days = 180;
  else if (plan === 'Yearly') days = 365;

  const startObj = new Date(startDate);
  startObj.setDate(startObj.getDate() + days);
  const endDate = getDateString(startObj);

  // Mark old subscription as expired
  await SubscriptionsDB.update({ ...oldSub, status: 'EXPIRED' });

  // Create new subscription
  const newSub = {
    customerId: oldSub.customerId,
    customerName: oldSub.customerName,
    customerMobile: oldSub.customerMobile,
    planType: plan,
    productName: oldSub.productName,
    unitPrice: oldSub.unitPrice,
    dailyQty: oldSub.dailyQty,
    startDate,
    endDate,
    amount,
    paymentStatus,
    status: 'ACTIVE',
    notes: oldSub.notes || '',
    createdAt: new Date().toISOString()
  };

  await SubscriptionsDB.add(newSub);

  if (paymentStatus === 'PENDING') {
    const customer = await CustomersDB.get(oldSub.customerId);
    if (customer) {
      await CustomersDB.update({ ...customer, outstandingDue: (customer.outstandingDue || 0) + amount });
    }
  }

  showToast(`Subscription renewed for ${oldSub.customerName}!`, 'success');
  document.getElementById('renew-modal')?.remove();
  renderSubscriptions();
}

// ── SUBSCRIPTION BILL ──
async function createSubBill(subId) {
  const sub = await SubscriptionsDB.get(subId);
  if (!sub) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = 'sub-bill-modal';

  const settings = await SettingsDB.getAll();
  const prefix = settings.billPrefix || 'TPP';

  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3>🧾 Create Subscription Bill</h3>
        <button class="modal-close" onclick="document.getElementById('sub-bill-modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="sub-renew-info">
          <strong>${escapeHTML(sub.customerName)}</strong> — ${escapeHTML(sub.planType)} Plan<br>
          <span style="color:var(--text-muted)">${escapeHTML(sub.productName || 'Paruthi Paal')} × ${sub.dailyQty || 1} daily</span>
        </div>
        <div class="form-group">
          <label>Bill For Period</label>
          <select id="sb-period">
            <option value="monthly">Monthly — ${formatCurrency(sub.amount)}</option>
            <option value="custom">Custom Amount</option>
          </select>
        </div>
        <div class="form-group" id="sb-custom-wrap" style="display:none">
          <label>Custom Amount (₹)</label>
          <div class="input-with-symbol">
            <span>₹</span>
            <input type="number" id="sb-custom-amount" value="${sub.amount}" min="0">
          </div>
        </div>
        <div class="form-group">
          <label>Payment Method</label>
          <div class="payment-methods">
            ${['CASH','UPI','CARD','CREDIT'].map(m => `
              <button class="pay-method-btn ${m === 'CASH' ? 'active' : ''}" onclick="sbSelectPay('${m}', this)">
                ${m === 'CASH' ? '💵 Cash' : m === 'UPI' ? '📱 UPI' : m === 'CARD' ? '💳 Card' : '📋 Credit'}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label>Notes (optional)</label>
          <input type="text" id="sb-notes" placeholder="e.g. Oct 2026 subscription">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('sub-bill-modal').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveSubBill(${sub.id})">✓ Create Bill</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Period change handler
  document.getElementById('sb-period').addEventListener('change', function() {
    document.getElementById('sb-custom-wrap').style.display = this.value === 'custom' ? 'block' : 'none';
  });

  overlay.dataset.selectedPay = 'CASH';
}

function sbSelectPay(method, btn) {
  btn.closest('.payment-methods').querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('sub-bill-modal').dataset.selectedPay = method;
}

async function saveSubBill(subId) {
  const sub = await SubscriptionsDB.get(subId);
  if (!sub) return;

  const modal = document.getElementById('sub-bill-modal');
  const period = document.getElementById('sb-period')?.value;
  const amount = period === 'custom'
    ? parseFloat(document.getElementById('sb-custom-amount')?.value || sub.amount)
    : sub.amount;
  const paymentMethod = modal.dataset.selectedPay || 'CASH';
  const notes = document.getElementById('sb-notes')?.value.trim() || `${sub.planType} Subscription`;

  const settings = await SettingsDB.getAll();
  const prefix = settings.billPrefix || 'TPP';
  const billNumber = await BillNumberDB.getNext(prefix);
  const now = new Date();
  const dateStr = getDateString(now);
  const timeStr = formatTime(now.toISOString());

  const bill = {
    billNumber,
    date: dateStr,
    time: timeStr,
    dateTime: now.toISOString(),
    customerId: sub.customerId || null,
    customerName: sub.customerName || '',
    customerMobile: sub.customerMobile || '',
    items: [{
      productId: null,
      name: `${sub.planType} Subscription — ${sub.productName || 'Paruthi Paal'} (${sub.dailyQty || 1}/day)`,
      qty: 1,
      rate: amount,
      amount: amount
    }],
    subtotal: amount,
    discount: 0,
    tax: 0,
    roundOff: 0,
    grandTotal: amount,
    paymentMethod,
    paymentStatus: 'PAID',
    amountPaid: amount,
    balanceDue: 0,
    orderType: 'Subscription',
    notes,
    status: 'COMPLETED',
    isSubscriptionBill: true,
    subscriptionId: sub.id,
    createdAt: now.toISOString()
  };

  const billId = await BillsDB.add(bill);
  bill.id = billId;

  // Update customer stats
  if (sub.customerId) {
    const customer = await CustomersDB.get(sub.customerId);
    if (customer) {
      await CustomersDB.update({
        ...customer,
        totalBills: (customer.totalBills || 0) + 1,
        totalPurchases: (customer.totalPurchases || 0) + amount,
        lastPurchase: dateStr
      });
    }
  }

  showToast(`Subscription bill created: ${billNumber}`, 'success');
  document.getElementById('sub-bill-modal')?.remove();

  // Show success with print option
  showBillSuccess(bill, 'only');
}

// ── PAUSE / RESUME / CANCEL ──
async function pauseSubscription(subId) {
  const sub = await SubscriptionsDB.get(subId);
  if (!sub) return;
  showConfirm('Pause Subscription',
    `Pause ${sub.planType} subscription for ${sub.customerName}? You can resume it later.`,
    async () => {
      await SubscriptionsDB.update({ ...sub, status: 'PAUSED', pausedAt: getDateString() });
      showToast(`Subscription paused for ${sub.customerName}.`, 'info');
      renderSubscriptions();
    }, null, 'Pause', 'btn-secondary');
}

async function resumeSubscription(subId) {
  const sub = await SubscriptionsDB.get(subId);
  if (!sub) return;
  await SubscriptionsDB.update({ ...sub, status: 'ACTIVE', pausedAt: null });
  showToast(`Subscription resumed for ${sub.customerName}!`, 'success');
  renderSubscriptions();
}

async function cancelSubscription(subId) {
  const sub = await SubscriptionsDB.get(subId);
  if (!sub) return;
  showConfirm('Cancel Subscription',
    `Cancel ${sub.planType} subscription for ${sub.customerName}? This cannot be undone.`,
    async () => {
      await SubscriptionsDB.update({ ...sub, status: 'CANCELLED' });
      showToast(`Subscription cancelled.`, 'info');
      renderSubscriptions();
    }, null, 'Cancel Subscription', 'btn-danger');
}

// ── PAYMENT COLLECTION ──
async function collectSubPayment(subId) {
  const sub = await SubscriptionsDB.get(subId);
  if (!sub) return;

  showConfirm('Collect Payment',
    `Mark ${formatCurrency(sub.amount)} as collected for ${sub.customerName}'s ${sub.planType} subscription?`,
    async () => {
      await SubscriptionsDB.update({ ...sub, paymentStatus: 'PAID' });
      // Reduce customer outstanding due
      if (sub.customerId) {
        const customer = await CustomersDB.get(sub.customerId);
        if (customer) {
          const newDue = Math.max(0, (customer.outstandingDue || 0) - sub.amount);
          await CustomersDB.update({ ...customer, outstandingDue: newDue });
        }
      }
      showToast(`Payment collected from ${sub.customerName}!`, 'success');
      renderSubscriptions();
    }, null, 'Mark as Paid', 'btn-success');
}
