// ============================================================
// SALES HISTORY PAGE
// ============================================================

let salesFilter = 'today';
let salesSearchQuery = '';
let salesCustomStart = '';
let salesCustomEnd = '';

async function renderSales() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading sales...</p></div>`;

  try {
    const allBills = await BillsDB.getAll();
    renderSalesPage(allBills);
  } catch (err) {
    content.innerHTML = `<div class="error-state"><h3>Error loading sales</h3><p>${err.message}</p></div>`;
  }
}

function renderSalesPage(allBills) {
  const content = document.getElementById('page-content');

  // Filter by date
  let { start, end } = getDateRange(salesFilter);
  if (salesFilter === 'custom') {
    start = salesCustomStart;
    end = salesCustomEnd;
  }

  let filtered = allBills.filter(b =>
    b.status === 'COMPLETED' && isInDateRange(b.date, start, end)
  );

  // Search
  if (salesSearchQuery) {
    const q = salesSearchQuery.toLowerCase();
    filtered = filtered.filter(b =>
      (b.billNumber && b.billNumber.toLowerCase().includes(q)) ||
      (b.customerName && b.customerName.toLowerCase().includes(q)) ||
      (b.customerMobile && b.customerMobile.includes(q))
    );
  }

  // Sort newest first
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Totals
  const totalSales = filtered.reduce((s, b) => s + (b.grandTotal || 0), 0);
  const totalBills = filtered.length;

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Sales History</h1>
        <p class="page-subtitle">${totalBills} bills • ${formatCurrency(totalSales)}</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline" onclick="exportSalesCSV()" id="export-sales-csv">📊 Export CSV</button>
        <button class="btn btn-primary" onclick="navigate('billing')" id="new-bill-from-sales">+ New Bill</button>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <div class="date-filters">
        ${['today', 'yesterday', 'week', 'month', 'custom'].map(f => `
          <button class="filter-btn ${salesFilter === f ? 'active' : ''}" 
            onclick="setSalesFilter('${f}')" id="sales-filter-${f}">
            ${f === 'today' ? 'Today' : f === 'yesterday' ? 'Yesterday' : f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : 'Custom'}
          </button>
        `).join('')}
      </div>
      <div class="search-box">
        <input type="text" id="sales-search" placeholder="🔍 Search bill, customer, mobile..." 
          value="${escapeHTML(salesSearchQuery)}" oninput="setSalesSearch(this.value)">
      </div>
    </div>

    ${salesFilter === 'custom' ? `
      <div class="custom-date-row">
        <input type="date" id="custom-start" value="${salesCustomStart}" onchange="setSalesCustomDate('start', this.value)">
        <span>to</span>
        <input type="date" id="custom-end" value="${salesCustomEnd}" onchange="setSalesCustomDate('end', this.value)">
        <button class="btn btn-sm btn-primary" onclick="applySalesCustomDate()">Apply</button>
      </div>
    ` : ''}

    ${filtered.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No bills found</h3>
        <p>${salesSearchQuery ? 'No results for your search.' : 'No bills for this period.'}</p>
        <button class="btn btn-primary" onclick="navigate('billing')">+ Create Bill</button>
      </div>
    ` : `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Bill No</th>
              <th>Date / Time</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(b => `
              <tr>
                <td>
                  <span class="bill-no">${escapeHTML(b.billNumber)}</span>
                  ${b.isDemo ? '<span class="demo-tag">DEMO</span>' : ''}
                </td>
                <td>
                  <div>${b.date ? formatDate(b.date) : ''}</div>
                  <small class="text-muted">${b.time || ''}</small>
                </td>
                <td>${escapeHTML(b.customerName || 'Walk-in')}<br>
                  <small class="text-muted">${escapeHTML(b.customerMobile || '')}</small>
                </td>
                <td><small>${(b.items || []).slice(0, 2).map(i => `${i.name.replace('Paruthi Paal ', '')} ×${i.qty}`).join(', ')}${b.items?.length > 2 ? '...' : ''}</small></td>
                <td><strong>${formatCurrency(b.grandTotal)}</strong></td>
                <td><span class="badge ${getPaymentBadgeClass(b.paymentMethod)}">${escapeHTML(b.paymentMethod)}</span></td>
                <td><span class="badge ${getStatusBadgeClass(b.paymentStatus)}">${escapeHTML(b.paymentStatus)}</span></td>
                <td>
                  <div class="action-btns">
                    <button class="btn-icon-sm" onclick="viewBillModal(${b.id})" title="View">👁</button>
                    <button class="btn-icon-sm" onclick="downloadBillPDF(${b.id})" title="PDF">📄</button>
                    <button class="btn-icon-sm" onclick="printBill(${b.id})" title="Print">🖨</button>
                    <button class="btn-icon-sm whatsapp-btn" onclick="whatsappBill(${b.id})" title="WhatsApp">💬</button>
                    <button class="btn-icon-sm danger-btn" onclick="deleteBillConfirm(${b.id})" title="Delete">🗑</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <span>${totalBills} bills • Total: ${formatCurrency(totalSales)}</span>
      </div>
    `}
  `;
}

function setSalesFilter(filter) {
  salesFilter = filter;
  salesSearchQuery = '';
  renderSales();
}

function setSalesSearch(value) {
  salesSearchQuery = value;
  debounce(async () => {
    const allBills = await BillsDB.getAll();
    renderSalesPage(allBills);
  }, 300)();
}

function setSalesCustomDate(type, value) {
  if (type === 'start') salesCustomStart = value;
  else salesCustomEnd = value;
}

function applySalesCustomDate() {
  if (!salesCustomStart || !salesCustomEnd) {
    showToast('Please select both start and end dates.', 'warning');
    return;
  }
  renderSales();
}

async function deleteBillConfirm(billId) {
  const bill = await BillsDB.get(billId);
  if (!bill) return;
  showConfirm(
    'Delete Bill',
    `Are you sure you want to delete bill ${bill.billNumber}? This cannot be undone.`,
    async () => {
      await BillsDB.delete(billId);
      showToast('Bill deleted.', 'success');
      renderSales();
    },
    null,
    'Delete Bill',
    'btn-danger'
  );
}

async function exportSalesCSV() {
  const allBills = await BillsDB.getAll();
  let { start, end } = getDateRange(salesFilter);
  if (salesFilter === 'custom') { start = salesCustomStart; end = salesCustomEnd; }
  const filtered = allBills.filter(b => b.status === 'COMPLETED' && isInDateRange(b.date, start, end));
  await BackupService.exportCSV(filtered);
}
