// ============================================================
// CUSTOMERS PAGE — Enhanced UI & Subscription Management
// ============================================================

let customerSearch = '';
let customerFilterTab = 'ALL'; // ALL | DUES | SUBSCRIPTIONS

async function renderCustomers() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading customers & subscriptions...</p></div>`;

  try {
    const [customers, subscriptions] = await Promise.all([
      CustomersDB.getAll(),
      SubscriptionsDB.getAll()
    ]);
    renderCustomersPage(customers, subscriptions);
  } catch (err) {
    content.innerHTML = `<div class="error-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

function renderCustomersPage(customers, subscriptions) {
  const content = document.getElementById('page-content');

  // Attach subscriptions to customers
  const customerSubMap = {};
  subscriptions.forEach(sub => {
    if (!customerSubMap[sub.customerId]) customerSubMap[sub.customerId] = [];
    customerSubMap[sub.customerId].push(sub);
  });

  let filtered = customers;

  // Filter tab
  if (customerFilterTab === 'DUES') {
    filtered = filtered.filter(c => (c.outstandingDue || 0) > 0);
  } else if (customerFilterTab === 'SUBSCRIPTIONS') {
    filtered = filtered.filter(c => customerSubMap[c.id] && customerSubMap[c.id].some(s => s.status === 'ACTIVE'));
  }

  // Search filter
  if (customerSearch) {
    const q = customerSearch.toLowerCase();
    filtered = filtered.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.mobile && c.mobile.includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  }

  // Sort by name
  filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const totalDue = customers.reduce((s, c) => s + (c.outstandingDue || 0), 0);
  const activeSubsCount = subscriptions.filter(s => s.status === 'ACTIVE').length;

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Customers & Memberships</h1>
        <p class="page-subtitle">${customers.length} customers • ${activeSubsCount} active subscriptions • ${totalDue > 0 ? `${formatCurrency(totalDue)} total due` : 'All dues clear'}</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline" onclick="showAddSubscriptionModal()" id="add-sub-header-btn">⭐ New Subscription</button>
        <button class="btn btn-primary" onclick="showEditCustomerModal(null)" id="add-customer-btn">+ Add Customer</button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="date-filters">
        <button class="filter-btn ${customerFilterTab === 'ALL' ? 'active' : ''}" onclick="setCustFilter('ALL')">All (${customers.length})</button>
        <button class="filter-btn ${customerFilterTab === 'DUES' ? 'active' : ''}" onclick="setCustFilter('DUES')">With Dues (${customers.filter(c => (c.outstandingDue || 0) > 0).length})</button>
        <button class="filter-btn ${customerFilterTab === 'SUBSCRIPTIONS' ? 'active' : ''}" onclick="setCustFilter('SUBSCRIPTIONS')">Active Subscriptions (${activeSubsCount})</button>
      </div>
      <div class="search-box">
        <input type="text" id="customer-search-main" placeholder="🔍 Search name, mobile, address..." 
          value="${escapeHTML(customerSearch)}" oninput="setCustomerSearch(this.value)">
      </div>
    </div>

    ${filtered.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>${customerSearch ? 'No matching customers' : 'No customers found'}</h3>
        <p>${customerSearch ? 'Try adjusting your search query.' : 'Add your first customer to get started.'}</p>
        <button class="btn btn-primary" onclick="showEditCustomerModal(null)">+ Add Customer</button>
      </div>
    ` : `
      <div class="customer-cards-grid">
        ${filtered.map(c => {
          const userSubs = customerSubMap[c.id] || [];
          const activeSub = userSubs.find(s => s.status === 'ACTIVE');

          return `
            <div class="customer-card-v2" id="cust-card-${c.id}">
              <!-- Header Row -->
              <div class="cust-card-header">
                <div class="cust-avatar-large">${getInitials(c.name)}</div>
                <div class="cust-card-title-group">
                  <div class="cust-card-name">${escapeHTML(c.name)}</div>
                  <div class="cust-card-phone">${c.mobile ? '📞 ' + escapeHTML(c.mobile) : 'No phone number'}</div>
                </div>
                <div class="cust-card-badges">
                  ${c.isDemo ? '<span class="demo-tag">DEMO</span>' : ''}
                  ${(c.outstandingDue || 0) > 0 ? `<span class="badge badge-due">Due: ${formatCurrency(c.outstandingDue)}</span>` : ''}
                  ${activeSub ? `<span class="sub-active-badge">⭐ ${activeSub.planType} Sub</span>` : ''}
                </div>
              </div>

              <!-- Content Row -->
              <div class="cust-card-body">
                ${c.address ? `<div class="cust-card-address">📍 ${escapeHTML(c.address)}</div>` : ''}
                
                ${activeSub ? `
                  <div class="cust-sub-banner">
                    <div class="csb-left">
                      <strong>⭐ ${activeSub.planType} Plan:</strong> ${escapeHTML(activeSub.productName || 'Paruthi Paal')} (${activeSub.dailyQty || 1} daily)
                    </div>
                    <div class="csb-right">
                      Expires: ${formatDate(activeSub.endDate)}
                    </div>
                  </div>
                ` : ''}

                <!-- Stats Grid -->
                <div class="cust-card-stats-grid">
                  <div class="cust-card-stat">
                    <div class="cc-stat-val">${c.totalBills || 0}</div>
                    <div class="cc-stat-lbl">Bills</div>
                  </div>
                  <div class="cust-card-stat">
                    <div class="cc-stat-val">${formatCurrency(c.totalPurchases || 0)}</div>
                    <div class="cc-stat-lbl">Total Spent</div>
                  </div>
                  <div class="cust-card-stat ${(c.outstandingDue || 0) > 0 ? 'due' : ''}">
                    <div class="cc-stat-val">${formatCurrency(c.outstandingDue || 0)}</div>
                    <div class="cc-stat-lbl">Balance Due</div>
                  </div>
                </div>
              </div>

              <!-- Footer Actions Row -->
              <div class="cust-card-footer">
                <button class="btn btn-sm btn-outline" onclick="showAddSubscriptionModal(${c.id})">⭐ Subscription</button>
                <button class="btn btn-sm btn-outline" onclick="viewCustomerHistory(${c.id})">📜 History</button>
                <button class="btn btn-sm btn-outline" onclick="showEditCustomerModal(${c.id})">✏️ Edit</button>
                ${(c.outstandingDue || 0) > 0 ? `<button class="btn btn-sm btn-success" onclick="markCustomerPaid(${c.id})">💳 Mark Paid</button>` : ''}
                <button class="btn btn-sm btn-danger" onclick="deleteCustomerConfirm(${c.id})">🗑</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;
}

function setCustFilter(tab) {
  customerFilterTab = tab;
  renderCustomers();
}

function setCustomerSearch(value) {
  customerSearch = value;
  debounce(async () => {
    const [customers, subscriptions] = await Promise.all([
      CustomersDB.getAll(),
      SubscriptionsDB.getAll()
    ]);
    renderCustomersPage(customers, subscriptions);
  }, 300)();
}

function showEditCustomerModal(customerId) {
  let customer = null;
  const isEdit = customerId !== null;

  const loadAndShow = async () => {
    if (isEdit) {
      customer = await CustomersDB.get(customerId);
      if (!customer) return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'edit-customer-modal';
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Customer' : 'Add Customer'}</h3>
          <button class="modal-close" onclick="document.getElementById('edit-customer-modal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Name *</label>
            <input type="text" id="ec-name" value="${escapeHTML(customer?.name || '')}" placeholder="Customer name">
          </div>
          <div class="form-group">
            <label>Mobile Number</label>
            <input type="tel" id="ec-mobile" value="${escapeHTML(customer?.mobile || '')}" placeholder="10-digit mobile" maxlength="10">
          </div>
          <div class="form-group">
            <label>Branch / Delivery Address</label>
            <input type="text" id="ec-address" value="${escapeHTML(customer?.address || '')}" placeholder="Full address / landmark">
          </div>
          <div class="form-group">
            <label>Email <span class="optional">(optional)</span></label>
            <input type="email" id="ec-email" value="${escapeHTML(customer?.email || '')}" placeholder="Email address">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('edit-customer-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="saveCustomer(${customerId})">
            ${isEdit ? 'Save Changes' : 'Add Customer'}
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('ec-name')?.focus();
  };

  loadAndShow();
}

async function saveCustomer(customerId) {
  const name = document.getElementById('ec-name')?.value.trim();
  const mobile = document.getElementById('ec-mobile')?.value.trim();
  const address = document.getElementById('ec-address')?.value.trim();
  const email = document.getElementById('ec-email')?.value.trim();

  if (!name) { showToast('Please enter customer name.', 'warning'); return; }
  if (mobile && !isValidIndianPhone(mobile)) {
    showToast('Invalid mobile number.', 'error');
    return;
  }

  if (customerId) {
    const existing = await CustomersDB.get(customerId);
    await CustomersDB.update({ ...existing, name, mobile, address, email });
    showToast('Customer updated!', 'success');
  } else {
    await CustomersDB.add({
      name, mobile, address, email,
      totalBills: 0, totalPurchases: 0, outstandingDue: 0,
      createdAt: new Date().toISOString()
    });
    showToast('Customer added!', 'success');
  }

  document.getElementById('edit-customer-modal')?.remove();
  renderCustomers();
}

async function viewCustomerHistory(customerId) {
  const [customer, allBills] = await Promise.all([
    CustomersDB.get(customerId),
    BillsDB.getAll()
  ]);

  if (!customer) return;
  const bills = allBills.filter(b => b.customerId === customerId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = 'history-modal';
  overlay.innerHTML = `
    <div class="modal-box modal-lg">
      <div class="modal-header">
        <h3>Purchase History — ${escapeHTML(customer.name)}</h3>
        <button class="modal-close" onclick="document.getElementById('history-modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="customer-history-stats">
          <div class="hs-card"><div class="hs-val">${bills.length}</div><div class="hs-label">Total Bills</div></div>
          <div class="hs-card"><div class="hs-val">${formatCurrency(customer.totalPurchases || 0)}</div><div class="hs-label">Total Purchased</div></div>
          <div class="hs-card ${(customer.outstandingDue || 0) > 0 ? 'due' : ''}"><div class="hs-val">${formatCurrency(customer.outstandingDue || 0)}</div><div class="hs-label">Outstanding Due</div></div>
        </div>
        ${bills.length === 0 ? '<div class="empty-state small"><p>No purchase history found.</p></div>' : `
          <div class="table-container">
            <table class="data-table">
              <thead><tr><th>Bill No</th><th>Date</th><th>Amount</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${bills.map(b => `
                  <tr>
                    <td>${escapeHTML(b.billNumber)}</td>
                    <td>${b.date ? formatDate(b.date) : ''}</td>
                    <td>${formatCurrency(b.grandTotal)}</td>
                    <td><span class="badge ${getPaymentBadgeClass(b.paymentMethod)}">${escapeHTML(b.paymentMethod)}</span></td>
                    <td><span class="badge ${getStatusBadgeClass(b.paymentStatus)}">${escapeHTML(b.paymentStatus)}</span></td>
                    <td>
                      <button class="btn-icon-sm" onclick="viewBillModal(${b.id})">👁</button>
                      <button class="btn-icon-sm" onclick="downloadBillPDF(${b.id})">📄</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function markCustomerPaid(customerId) {
  const customer = await CustomersDB.get(customerId);
  if (!customer) return;
  showConfirm(
    'Mark as Paid',
    `Mark ${formatCurrency(customer.outstandingDue)} as paid for ${customer.name}?`,
    async () => {
      await CustomersDB.update({ ...customer, outstandingDue: 0 });
      showToast('Marked as paid!', 'success');
      renderCustomers();
    },
    null,
    'Mark Paid',
    'btn-success'
  );
}

async function deleteCustomerConfirm(customerId) {
  const customer = await CustomersDB.get(customerId);
  if (!customer) return;
  showConfirm(
    'Delete Customer',
    `Delete ${customer.name}? Their bill history will remain but the customer record will be removed.`,
    async () => {
      await CustomersDB.delete(customerId);
      showToast('Customer deleted.', 'success');
      renderCustomers();
    },
    null,
    'Delete',
    'btn-danger'
  );
}

// ============================================================
// SUBSCRIPTION / MEMBERSHIP MANAGEMENT
// ============================================================

async function showAddSubscriptionModal(targetCustomerId = null) {
  const [customers, products] = await Promise.all([
    CustomersDB.getAll(),
    ProductsDB.getActive()
  ]);

  if (customers.length === 0) {
    showToast('Please add a customer first.', 'warning');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = 'subscription-modal';
  overlay.innerHTML = `
    <div class="modal-box modal-lg">
      <div class="modal-header">
        <h3>⭐ Create Customer Membership Subscription</h3>
        <button class="modal-close" onclick="document.getElementById('subscription-modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Select Customer *</label>
          <select id="sub-customer-id">
            ${customers.map(c => `
              <option value="${c.id}" ${targetCustomerId === c.id ? 'selected' : ''}>
                ${escapeHTML(c.name)} ${c.mobile ? '(' + c.mobile + ')' : ''}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Subscription Plan *</label>
            <select id="sub-plan-type" onchange="calculateSubPrice()">
              <option value="Monthly">Monthly (30 Days)</option>
              <option value="Quarterly">Quarterly (90 Days)</option>
              <option value="Half-Yearly">Half-Yearly (180 Days)</option>
              <option value="Yearly">Yearly (365 Days)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Daily Milk Product *</label>
            <select id="sub-product-name" onchange="calculateSubPrice()">
              ${products.map(p => `<option value="${escapeHTML(p.name)}" data-price="${p.price}">${escapeHTML(p.name)} - ${formatCurrency(p.price)}/day</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Daily Quantity</label>
            <input type="number" id="sub-daily-qty" value="1" min="1" oninput="calculateSubPrice()">
          </div>
          <div class="form-group">
            <label>Start Date</label>
            <input type="date" id="sub-start-date" value="${getCurrentDate()}" onchange="calculateSubPrice()">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Total Plan Price (₹) *</label>
            <input type="number" id="sub-amount" placeholder="0" min="0">
          </div>
          <div class="form-group">
            <label>Payment Status</label>
            <select id="sub-payment-status">
              <option value="PAID">✅ Paid in Full</option>
              <option value="PENDING">⏳ Payment Pending</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Delivery / Special Notes</label>
          <input type="text" id="sub-notes" placeholder="e.g. Morning 7:00 AM delivery to doorstep">
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('subscription-modal').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="saveSubscription()">Save Subscription</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  calculateSubPrice();
}

function calculateSubPrice() {
  const planType = document.getElementById('sub-plan-type')?.value;
  const prodSelect = document.getElementById('sub-product-name');
  const selectedOption = prodSelect?.options[prodSelect.selectedIndex];
  const unitPrice = parseFloat(selectedOption?.dataset?.price || 30);
  const qty = parseInt(document.getElementById('sub-daily-qty')?.value || 1);

  let days = 30;
  if (planType === 'Quarterly') days = 90;
  else if (planType === 'Half-Yearly') days = 180;
  else if (planType === 'Yearly') days = 365;

  // Calculate estimated total price with small subscription discount
  const fullPrice = unitPrice * qty * days;
  const discountFactor = planType === 'Yearly' ? 0.85 : planType === 'Half-Yearly' ? 0.90 : planType === 'Quarterly' ? 0.95 : 1.0;
  const calculatedAmount = Math.round(fullPrice * discountFactor);

  const amountInput = document.getElementById('sub-amount');
  if (amountInput) amountInput.value = calculatedAmount;
}

async function saveSubscription() {
  const customerId = parseInt(document.getElementById('sub-customer-id')?.value);
  const planType = document.getElementById('sub-plan-type')?.value;
  const productName = document.getElementById('sub-product-name')?.value;
  const dailyQty = parseInt(document.getElementById('sub-daily-qty')?.value || 1);
  const startDate = document.getElementById('sub-start-date')?.value || getCurrentDate();
  const amount = parseFloat(document.getElementById('sub-amount')?.value || 0);
  const paymentStatus = document.getElementById('sub-payment-status')?.value;
  const notes = document.getElementById('sub-notes')?.value.trim() || '';

  const customer = await CustomersDB.get(customerId);
  if (!customer) { showToast('Invalid customer.', 'error'); return; }
  if (isNaN(amount) || amount <= 0) { showToast('Please enter a valid plan amount.', 'warning'); return; }

  // Calculate end date
  let days = 30;
  if (planType === 'Quarterly') days = 90;
  else if (planType === 'Half-Yearly') days = 180;
  else if (planType === 'Yearly') days = 365;

  const startObj = new Date(startDate);
  startObj.setDate(startObj.getDate() + days);
  const endDate = getDateString(startObj);

  const sub = {
    customerId: customer.id,
    customerName: customer.name,
    customerMobile: customer.mobile,
    planType,
    productName,
    dailyQty,
    startDate,
    endDate,
    amount,
    paymentStatus,
    status: 'ACTIVE',
    notes,
    createdAt: new Date().toISOString()
  };

  await SubscriptionsDB.add(sub);

  if (paymentStatus === 'PENDING') {
    // Add to customer due
    await CustomersDB.update({
      ...customer,
      outstandingDue: (customer.outstandingDue || 0) + amount
    });
  }

  showToast(`Subscription activated for ${customer.name}!`, 'success');
  document.getElementById('subscription-modal')?.remove();
  renderCustomers();
}
