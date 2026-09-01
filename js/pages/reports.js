// ============================================================
// REPORTS PAGE
// ============================================================

let reportFilter = 'today';
let reportCustomStart = '';
let reportCustomEnd = '';

async function renderReports() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Generating report...</p></div>`;

  try {
    const [allBills, allExpenses] = await Promise.all([
      BillsDB.getAll(),
      ExpensesDB.getAll()
    ]);
    renderReportPage(allBills, allExpenses);
  } catch (err) {
    content.innerHTML = `<div class="error-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

function renderReportPage(allBills, allExpenses) {
  const content = document.getElementById('page-content');

  let { start, end } = getDateRange(reportFilter);
  if (reportFilter === 'custom') { start = reportCustomStart; end = reportCustomEnd; }

  const bills = allBills.filter(b => b.status === 'COMPLETED' && isInDateRange(b.date, start, end));
  const expenses = allExpenses.filter(e => isInDateRange(e.date, start, end));

  // Revenue
  const totalRevenue = bills.reduce((s, b) => s + (b.grandTotal || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const estimatedProfit = totalRevenue - totalExpenses;
  const avgBill = bills.length > 0 ? totalRevenue / bills.length : 0;

  // Payment breakdown
  const cashTotal = bills.filter(b => b.paymentMethod === 'CASH').reduce((s, b) => s + b.grandTotal, 0);
  const upiTotal = bills.filter(b => b.paymentMethod === 'UPI').reduce((s, b) => s + b.grandTotal, 0);
  const cardTotal = bills.filter(b => b.paymentMethod === 'CARD').reduce((s, b) => s + b.grandTotal, 0);
  const creditTotal = bills.filter(b => b.paymentMethod === 'CREDIT').reduce((s, b) => s + b.grandTotal, 0);
  const outstanding = bills.filter(b => b.paymentStatus !== 'PAID').reduce((s, b) => s + (b.balanceDue || 0), 0);

  // Product sales
  const productSales = {};
  bills.forEach(b => {
    (b.items || []).forEach(item => {
      if (!productSales[item.name]) productSales[item.name] = { qty: 0, revenue: 0 };
      productSales[item.name].qty += item.qty;
      productSales[item.name].revenue += item.amount;
    });
  });
  const sortedProducts = Object.entries(productSales).sort((a, b) => b[1].revenue - a[1].revenue);

  // Daily trend (for this period)
  const dailyMap = {};
  bills.forEach(b => {
    if (!b.date) return;
    if (!dailyMap[b.date]) dailyMap[b.date] = 0;
    dailyMap[b.date] += b.grandTotal;
  });
  const dailyData = Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0])).slice(-14);

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Reports</h1>
        <p class="page-subtitle">${bills.length} bills • ${formatCurrency(totalRevenue)}</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline" onclick="exportReportCSV()" id="export-report-csv">📊 Export CSV</button>
        <button class="btn btn-primary" onclick="exportReportPDF()" id="export-report-pdf">📄 Export PDF</button>
      </div>
    </div>

    <!-- Date Filter -->
    <div class="filter-bar">
      <div class="date-filters">
        ${['today', 'yesterday', 'week', 'month', 'custom'].map(f => `
          <button class="filter-btn ${reportFilter === f ? 'active' : ''}" 
            onclick="setReportFilter('${f}')" id="report-filter-${f}">
            ${f === 'today' ? 'Today' : f === 'yesterday' ? 'Yesterday' : f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : 'Custom'}
          </button>
        `).join('')}
      </div>
    </div>

    ${reportFilter === 'custom' ? `
      <div class="custom-date-row">
        <input type="date" id="rpt-start" value="${reportCustomStart}" onchange="reportCustomStart=this.value">
        <span>to</span>
        <input type="date" id="rpt-end" value="${reportCustomEnd}" onchange="reportCustomEnd=this.value">
        <button class="btn btn-sm btn-primary" onclick="renderReports()">Apply</button>
      </div>
    ` : ''}

    <!-- Summary KPIs -->
    <div class="section-label">Period Summary</div>
    <div class="kpi-grid">
      <div class="kpi-card kpi-primary">
        <div class="kpi-icon">₹</div>
        <div class="kpi-value">${formatCurrency(totalRevenue)}</div>
        <div class="kpi-label">Total Revenue</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">🧾</div>
        <div class="kpi-value">${bills.length}</div>
        <div class="kpi-label">Total Bills</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon">📊</div>
        <div class="kpi-value">${formatCurrency(avgBill)}</div>
        <div class="kpi-label">Avg Bill</div>
      </div>
      <div class="kpi-card ${estimatedProfit >= 0 ? 'kpi-success' : 'kpi-danger'}">
        <div class="kpi-icon">💰</div>
        <div class="kpi-value">${formatCurrency(estimatedProfit)}</div>
        <div class="kpi-label">Est. Profit</div>
      </div>
    </div>

    <!-- Payment Breakdown -->
    <div class="section-label">Payment Breakdown</div>
    <div class="report-grid">
      <div class="report-card">
        <div class="report-rows">
          <div class="report-row">
            <span>💵 Cash</span><span>${formatCurrency(cashTotal)}</span>
          </div>
          <div class="report-row">
            <span>📱 UPI</span><span>${formatCurrency(upiTotal)}</span>
          </div>
          <div class="report-row">
            <span>💳 Card</span><span>${formatCurrency(cardTotal)}</span>
          </div>
          <div class="report-row">
            <span>📋 Credit</span><span>${formatCurrency(creditTotal)}</span>
          </div>
          <div class="report-row">
            <span>💸 Expenses</span><span>${formatCurrency(totalExpenses)}</span>
          </div>
          <div class="report-row highlight">
            <span>Outstanding Due</span><span class="due-text">${formatCurrency(outstanding)}</span>
          </div>
        </div>
      </div>

      <!-- Product Sales -->
      <div class="report-card">
        <h4 class="report-card-title">Product Sales</h4>
        ${sortedProducts.length === 0 ? `<div class="empty-state small"><p>No product data</p></div>` : `
          <div class="report-rows">
            ${sortedProducts.map(([name, data]) => `
              <div class="report-row">
                <span>${escapeHTML(name.replace('Paruthi Paal ', ''))}</span>
                <span>${data.qty} units • ${formatCurrency(data.revenue)}</span>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>

    <!-- Daily Trend -->
    ${dailyData.length > 1 ? `
      <div class="section-label">Daily Sales Trend</div>
      <div class="chart-card">
        <div class="bar-chart">
          ${(() => {
            const max = Math.max(...dailyData.map(d => d[1]));
            return dailyData.map(([date, amt]) => `
              <div class="bar-col">
                <div class="bar-amount">${formatCurrency(amt)}</div>
                <div class="bar-bar" style="height:${max > 0 ? Math.round(amt / max * 100) : 0}%"></div>
                <div class="bar-label">${new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
              </div>
            `).join('');
          })()}
        </div>
      </div>
    ` : ''}
  `;
}

function setReportFilter(filter) {
  reportFilter = filter;
  renderReports();
}

async function exportReportCSV() {
  let { start, end } = getDateRange(reportFilter);
  if (reportFilter === 'custom') { start = reportCustomStart; end = reportCustomEnd; }
  const allBills = await BillsDB.getAll();
  const filtered = allBills.filter(b => b.status === 'COMPLETED' && isInDateRange(b.date, start, end));
  await BackupService.exportCSV(filtered);
}

async function exportReportPDF() {
  let { start, end } = getDateRange(reportFilter);
  if (reportFilter === 'custom') { start = reportCustomStart; end = reportCustomEnd; }
  const allBills = await BillsDB.getAll();
  const settings = await SettingsDB.getAll();
  const filtered = allBills.filter(b => b.status === 'COMPLETED' && isInDateRange(b.date, start, end));

  const totalRevenue = filtered.reduce((acc, b) => acc + (b.grandTotal || 0), 0);
  const totalBills = filtered.length;

  const productMap = {};
  const paymentStats = { CASH: 0, UPI: 0, CARD: 0, CREDIT: 0 };

  filtered.forEach(b => {
    if (b.paymentMethod && paymentStats[b.paymentMethod] !== undefined) {
      paymentStats[b.paymentMethod] += (b.grandTotal || 0);
    }
    (b.items || []).forEach(item => {
      if (!productMap[item.name]) {
        productMap[item.name] = { qty: 0, revenue: 0 };
      }
      productMap[item.name].qty += item.qty;
      productMap[item.name].revenue += item.amount;
    });
  });

  const products = Object.entries(productMap)
    .map(([name, data]) => ({ name, qty: data.qty, revenue: data.revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  const filterName = reportFilter === 'today' ? 'Today' :
    reportFilter === 'yesterday' ? 'Yesterday' :
    reportFilter === 'week' ? 'This Week' :
    reportFilter === 'month' ? 'This Month' : `${start} to ${end}`;

  const reportData = {
    periodLabel: `Sales Summary (${filterName})`,
    totalRevenue,
    totalBills,
    products,
    paymentStats
  };

  await PDFService.generateReportPDF(reportData, settings);
}
