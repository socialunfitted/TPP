// ============================================================
// DASHBOARD PAGE
// ============================================================

async function renderDashboard() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading dashboard...</p></div>`;

  try {
    const [allBills, allExpenses, settings] = await Promise.all([
      BillsDB.getAll(),
      ExpensesDB.getAll(),
      SettingsDB.getAll()
    ]);

    const todayStr = getCurrentDate();
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStr = getDateString(monthStart);

    const todayBills = allBills.filter(b => b.date === todayStr && b.status === 'COMPLETED');
    const monthBills = allBills.filter(b => b.date >= monthStr && b.status === 'COMPLETED');
    const todayExpenses = allExpenses.filter(e => e.date === todayStr);

    // Metrics
    const todaySales = todayBills.reduce((s, b) => s + (b.grandTotal || 0), 0);
    const monthSales = monthBills.reduce((s, b) => s + (b.grandTotal || 0), 0);
    const todayExpenseTotal = todayExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const todayProfit = todaySales - todayExpenseTotal;

    const cashSales = todayBills.filter(b => b.paymentMethod === 'CASH').reduce((s, b) => s + b.grandTotal, 0);
    const upiSales = todayBills.filter(b => b.paymentMethod === 'UPI').reduce((s, b) => s + b.grandTotal, 0);
    const cardSales = todayBills.filter(b => b.paymentMethod === 'CARD').reduce((s, b) => s + b.grandTotal, 0);
    const creditSales = todayBills.filter(b => b.paymentMethod === 'CREDIT').reduce((s, b) => s + b.grandTotal, 0);

    const avgBill = todayBills.length > 0 ? todaySales / todayBills.length : 0;

    // Total items sold today
    let itemsSold = 0;
    todayBills.forEach(b => { (b.items || []).forEach(i => { itemsSold += i.qty || 0; }); });

    // Best selling item today
    const itemMap = {};
    todayBills.forEach(b => {
      (b.items || []).forEach(i => {
        if (!itemMap[i.name]) itemMap[i.name] = 0;
        itemMap[i.name] += i.qty;
      });
    });
    const bestItem = Object.entries(itemMap).sort((a, b) => b[1] - a[1])[0];

    // Unique customers today
    const uniqueCustomers = new Set(todayBills.map(b => b.customerMobile || b.customerName || 'walkin').filter(Boolean)).size;

    // Recent bills
    const recentBills = [...allBills]
      .filter(b => b.status === 'COMPLETED')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">${getTodayLabel()} • ${formatTime(new Date().toISOString())}</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary btn-lg" onclick="navigate('billing')" id="dash-new-bill">
            <span class="btn-icon">+</span> New Bill
          </button>
        </div>
      </div>

      <!-- TODAY'S SUMMARY -->
      <div class="section-label">Today's Summary</div>
      <div class="kpi-grid">
        <div class="kpi-card kpi-primary">
          <div class="kpi-icon">₹</div>
          <div class="kpi-value">${formatCurrency(todaySales)}</div>
          <div class="kpi-label">Today's Sales</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🧾</div>
          <div class="kpi-value">${todayBills.length}</div>
          <div class="kpi-label">Today's Bills</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">👥</div>
          <div class="kpi-value">${uniqueCustomers}</div>
          <div class="kpi-label">Customers</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">📦</div>
          <div class="kpi-value">${itemsSold}</div>
          <div class="kpi-label">Items Sold</div>
        </div>
      </div>

      <!-- PAYMENT BREAKDOWN -->
      <div class="section-label">Payment Breakdown</div>
      <div class="payment-grid">
        <div class="payment-card cash">
          <div class="pay-label">Cash</div>
          <div class="pay-amount">${formatCurrency(cashSales)}</div>
        </div>
        <div class="payment-card upi">
          <div class="pay-label">UPI</div>
          <div class="pay-amount">${formatCurrency(upiSales)}</div>
        </div>
        <div class="payment-card card-pay">
          <div class="pay-label">Card</div>
          <div class="pay-amount">${formatCurrency(cardSales)}</div>
        </div>
        <div class="payment-card credit">
          <div class="pay-label">Credit/Due</div>
          <div class="pay-amount">${formatCurrency(creditSales)}</div>
        </div>
      </div>

      <!-- STATS ROW -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-label">This Month</div>
          <div class="stat-value">${formatCurrency(monthSales)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Avg Bill Value</div>
          <div class="stat-value">${formatCurrency(avgBill)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Best Seller</div>
          <div class="stat-value">${bestItem ? bestItem[0].replace('Paruthi Paal ', '') + ` (${bestItem[1]})` : '—'}</div>
        </div>
        <div class="stat-card ${todayProfit >= 0 ? 'profit' : 'loss'}">
          <div class="stat-label">Est. Profit Today</div>
          <div class="stat-value">${formatCurrency(todayProfit)}</div>
        </div>
      </div>

      <!-- QUICK ACTIONS -->
      <div class="section-label">Quick Actions</div>
      <div class="quick-actions">
        <button class="quick-btn" onclick="navigate('billing')" id="qa-new-bill">
          <div class="qa-icon">🧾</div><div class="qa-text">New Bill</div>
        </button>
        <button class="quick-btn" onclick="navigate('customers')" id="qa-customers">
          <div class="qa-icon">👥</div><div class="qa-text">Customers</div>
        </button>
        <button class="quick-btn" onclick="navigate('products')" id="qa-products">
          <div class="qa-icon">📦</div><div class="qa-text">Products</div>
        </button>
        <button class="quick-btn" onclick="navigate('sales')" id="qa-sales">
          <div class="qa-icon">📊</div><div class="qa-text">Sales History</div>
        </button>
        <button class="quick-btn" onclick="navigate('expenses')" id="qa-expenses">
          <div class="qa-icon">💸</div><div class="qa-text">Expenses</div>
        </button>
        <button class="quick-btn" onclick="navigate('reports')" id="qa-reports">
          <div class="qa-icon">📈</div><div class="qa-text">Reports</div>
        </button>
        <button class="quick-btn" onclick="navigate('settings')" id="qa-settings">
          <div class="qa-icon">⚙️</div><div class="qa-text">Settings</div>
        </button>
        <button class="quick-btn demo-btn" onclick="handleLoadDemo()" id="qa-demo">
          <div class="qa-icon">🎭</div><div class="qa-text">Load Demo</div>
        </button>
      </div>

      <!-- RECENT BILLS -->
      <div class="section-label">Recent Bills</div>
      ${recentBills.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">🧾</div>
          <h3>No bills yet</h3>
          <p>Create your first bill to start tracking sales.</p>
          <button class="btn btn-primary" onclick="navigate('billing')">+ New Bill</button>
        </div>
      ` : `
        <!-- Mobile card view -->
        <div class="bill-card-list">
          ${recentBills.map(b => `
            <div class="bill-card">
              <div class="bill-card-top">
                <div class="bill-card-left">
                  <div class="bill-card-number">${escapeHTML(b.billNumber)}${b.isDemo ? ' <span class="demo-tag">DEMO</span>' : ''}</div>
                  <div class="bill-card-customer">${escapeHTML(b.customerName || 'Walk-in Customer')}</div>
                  <div class="bill-card-time">${b.time || ''}${b.date ? ' • ' + formatDate(b.date) : ''}</div>
                </div>
                <div>
                  <div class="bill-card-amount">${formatCurrency(b.grandTotal)}</div>
                  <div style="text-align:right;margin-top:4px;">
                    <span class="badge ${getPaymentBadgeClass(b.paymentMethod)}">${escapeHTML(b.paymentMethod)}</span>
                  </div>
                </div>
              </div>
              <div class="bill-card-middle">
                <span class="bill-card-items">📦 ${(b.items || []).slice(0,3).map(i => i.name.replace('Paruthi Paal ','') + ' ×' + i.qty).join(', ')}${(b.items||[]).length > 3 ? '…' : ''}</span>
                <span class="badge ${getStatusBadgeClass(b.paymentStatus)}">${escapeHTML(b.paymentStatus)}</span>
              </div>
              <div class="bill-card-actions">
                <button class="bill-card-action-btn view" onclick="viewBillModal(${b.id})">👁 View</button>
                <button class="bill-card-action-btn pdf" onclick="downloadBillPDF(${b.id})">📄 PDF</button>
                <button class="bill-card-action-btn whatsapp" onclick="whatsappBill(${b.id})">💬 WA</button>
              </div>
            </div>
          `).join('')}
        </div>
        <!-- Desktop table view -->
        <div class="table-container bill-table-desktop">
          <table class="data-table">
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${recentBills.map(b => `
                <tr>
                  <td><span class="bill-no">${escapeHTML(b.billNumber)}</span><br><small>${b.time || ''}</small></td>
                  <td>${escapeHTML(b.customerName || 'Walk-in Customer')}</td>
                  <td><strong>${formatCurrency(b.grandTotal)}</strong></td>
                  <td><span class="badge ${getPaymentBadgeClass(b.paymentMethod)}">${escapeHTML(b.paymentMethod)}</span></td>
                  <td><span class="badge ${getStatusBadgeClass(b.paymentStatus)}">${escapeHTML(b.paymentStatus)}</span></td>
                  <td>
                    <div class="action-btns">
                      <button class="btn-icon-sm" onclick="viewBillModal(${b.id})" title="View">👁</button>
                      <button class="btn-icon-sm" onclick="downloadBillPDF(${b.id})" title="PDF">📄</button>
                      <button class="btn-icon-sm" onclick="printBill(${b.id})" title="Print">🖨</button>
                      <button class="btn-icon-sm whatsapp-btn" onclick="whatsappBill(${b.id})" title="WhatsApp">💬</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="text-align:center;margin-top:12px;">
          <button class="btn btn-outline" onclick="navigate('sales')">View All Bills →</button>
        </div>
      `}
    `;

  } catch (err) {
    content.innerHTML = `<div class="error-state"><h3>Error loading dashboard</h3><p>${err.message}</p></div>`;
  }
}

async function handleLoadDemo() {
  showConfirm(
    'Load Demo Data',
    'This will add sample bills, customers, and expenses tagged as demo data. You can clear them later. Continue?',
    async () => {
      await loadDemoData();
      await renderDashboard();
    },
    null,
    'Load Demo Data',
    'btn-primary'
  );
}
