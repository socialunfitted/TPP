// ============================================================
// EXPENSES PAGE
// ============================================================

const EXPENSE_CATEGORIES = ['Ingredients', 'Gas', 'Electricity', 'Rent', 'Salary', 'Packaging', 'Transport', 'Maintenance', 'Other'];
let expenseFilter = 'today';

async function renderExpenses() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading expenses...</p></div>`;

  try {
    const [expenses, bills] = await Promise.all([
      ExpensesDB.getAll(),
      BillsDB.getAll()
    ]);
    renderExpensesPage(expenses, bills);
  } catch (err) {
    content.innerHTML = `<div class="error-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

function renderExpensesPage(allExpenses, allBills) {
  const content = document.getElementById('page-content');

  const { start, end } = getDateRange(expenseFilter);
  const expenses = allExpenses.filter(e => isInDateRange(e.date, start, end));
  const bills = allBills.filter(b => b.status === 'COMPLETED' && isInDateRange(b.date, start, end));

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalSales = bills.reduce((s, b) => s + (b.grandTotal || 0), 0);
  const estimatedProfit = totalSales - totalExpenses;

  // Group by category
  const catTotals = {};
  expenses.forEach(e => {
    if (!catTotals[e.category]) catTotals[e.category] = 0;
    catTotals[e.category] += e.amount || 0;
  });

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Expenses</h1>
        <p class="page-subtitle">${expenses.length} entries • ${formatCurrency(totalExpenses)}</p>
      </div>
      <button class="btn btn-primary" onclick="showAddExpenseModal()" id="add-expense-btn">+ Add Expense</button>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <div class="date-filters">
        ${['today', 'yesterday', 'week', 'month'].map(f => `
          <button class="filter-btn ${expenseFilter === f ? 'active' : ''}" 
            onclick="setExpenseFilter('${f}')" id="exp-filter-${f}">
            ${f === 'today' ? 'Today' : f === 'yesterday' ? 'Yesterday' : f === 'week' ? 'This Week' : 'This Month'}
          </button>
        `).join('')}
      </div>
    </div>

    <!-- Summary -->
    <div class="expense-summary">
      <div class="exp-sum-card sales">
        <div class="exp-sum-label">Sales</div>
        <div class="exp-sum-val">${formatCurrency(totalSales)}</div>
      </div>
      <div class="exp-sum-card expenses">
        <div class="exp-sum-label">Expenses</div>
        <div class="exp-sum-val">${formatCurrency(totalExpenses)}</div>
      </div>
      <div class="exp-sum-card ${estimatedProfit >= 0 ? 'profit' : 'loss'}">
        <div class="exp-sum-label">Est. Profit</div>
        <div class="exp-sum-val">${formatCurrency(estimatedProfit)}</div>
      </div>
    </div>

    <!-- Category Breakdown -->
    ${Object.keys(catTotals).length > 0 ? `
      <div class="section-label">By Category</div>
      <div class="cat-breakdown">
        ${Object.entries(catTotals).sort((a,b) => b[1]-a[1]).map(([cat, amt]) => `
          <div class="cat-bar-row">
            <span class="cat-bar-label">${escapeHTML(cat)}</span>
            <div class="cat-bar-track">
              <div class="cat-bar-fill" style="width:${totalExpenses > 0 ? Math.round(amt/totalExpenses*100) : 0}%"></div>
            </div>
            <span class="cat-bar-amount">${formatCurrency(amt)}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- Expense List -->
    <div class="section-label">Expense Entries</div>
    ${expenses.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">💸</div>
        <h3>No expenses recorded</h3>
        <p>Track your expenses to calculate accurate profit.</p>
        <button class="btn btn-primary" onclick="showAddExpenseModal()">+ Add Expense</button>
      </div>
    ` : `
      <!-- Mobile expense cards -->
      <div class="expense-card-list">
        ${expenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(e => {
          const catIcons = { Ingredients:'🌿', Gas:'🔥', Electricity:'⚡', Rent:'🏠', Salary:'👤', Packaging:'📦', Transport:'🚗', Maintenance:'🔧', Other:'💰' };
          const icon = catIcons[e.category] || '💰';
          return `
          <div class="expense-card">
            <div class="expense-card-icon">${icon}</div>
            <div class="expense-card-body">
              <div class="expense-card-cat">${escapeHTML(e.category)}</div>
              ${e.description ? `<div class="expense-card-desc">${escapeHTML(e.description)}</div>` : ''}
              <div class="expense-card-meta">${e.date ? formatDate(e.date) : ''} • ${escapeHTML(e.paymentMethod || 'CASH')}</div>
            </div>
            <div class="expense-card-right">
              <div class="expense-card-amount">-${formatCurrency(e.amount)}</div>
              <div class="expense-card-actions">
                <button class="btn-icon-sm" onclick="showEditExpenseModal(${e.id})" title="Edit">✏️</button>
                <button class="btn-icon-sm danger-btn" onclick="deleteExpenseConfirm(${e.id})" title="Delete">🗑</button>
              </div>
            </div>
          </div>
        `}).join('')}
      </div>
      <!-- Desktop table -->
      <div class="table-container expense-table-desktop">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${expenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(e => `
              <tr>
                <td>${e.date ? formatDate(e.date) : ''}</td>
                <td><span class="category-tag">${escapeHTML(e.category)}</span></td>
                <td>${escapeHTML(e.description || '')}</td>
                <td><strong>${formatCurrency(e.amount)}</strong></td>
                <td>${escapeHTML(e.paymentMethod || 'CASH')}</td>
                <td>
                  <div class="action-btns">
                    <button class="btn-icon-sm" onclick="showEditExpenseModal(${e.id})" title="Edit">✏️</button>
                    <button class="btn-icon-sm danger-btn" onclick="deleteExpenseConfirm(${e.id})" title="Delete">🗑</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  `;
}

function setExpenseFilter(filter) {
  expenseFilter = filter;
  renderExpenses();
}

function showAddExpenseModal(expenseId = null) {
  const isEdit = expenseId !== null;

  const loadAndShow = async () => {
    let expense = null;
    if (isEdit) {
      expense = await ExpensesDB.get(expenseId);
      if (!expense) return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'expense-modal';
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Expense' : 'Add Expense'}</h3>
          <button class="modal-close" onclick="document.getElementById('expense-modal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Date *</label>
              <input type="date" id="exp-date" value="${expense?.date || getCurrentDate()}" max="${getCurrentDate()}">
            </div>
            <div class="form-group">
              <label>Category *</label>
              <select id="exp-category">
                ${EXPENSE_CATEGORIES.map(cat => `
                  <option value="${cat}" ${expense?.category === cat ? 'selected' : ''}>${cat}</option>
                `).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Description</label>
            <input type="text" id="exp-desc" value="${escapeHTML(expense?.description || '')}" placeholder="What was this expense for?">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Amount (₹) *</label>
              <input type="number" id="exp-amount" value="${expense?.amount || ''}" placeholder="0" min="0">
            </div>
            <div class="form-group">
              <label>Payment Method</label>
              <select id="exp-payment">
                ${['CASH', 'UPI', 'CARD', 'BANK'].map(m => `
                  <option value="${m}" ${expense?.paymentMethod === m ? 'selected' : ''}>${m}</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('expense-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="saveExpense(${expenseId})">${isEdit ? 'Save Changes' : 'Add Expense'}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('exp-amount')?.focus();
  };

  loadAndShow();
}

function showEditExpenseModal(expenseId) {
  showAddExpenseModal(expenseId);
}

async function saveExpense(expenseId) {
  const date = document.getElementById('exp-date')?.value;
  const category = document.getElementById('exp-category')?.value;
  const description = document.getElementById('exp-desc')?.value.trim();
  const amount = parseFloat(document.getElementById('exp-amount')?.value);
  const paymentMethod = document.getElementById('exp-payment')?.value;

  if (!date) { showToast('Please select a date.', 'warning'); return; }
  if (!category) { showToast('Please select a category.', 'warning'); return; }
  if (isNaN(amount) || amount < 0) { showToast('Please enter a valid amount.', 'error'); return; }

  const expense = { date, category, description, amount, paymentMethod, createdAt: new Date().toISOString() };

  if (expenseId) {
    const existing = await ExpensesDB.get(expenseId);
    await ExpensesDB.update({ ...existing, ...expense });
    showToast('Expense updated!', 'success');
  } else {
    await ExpensesDB.add(expense);
    showToast('Expense added!', 'success');
  }

  document.getElementById('expense-modal')?.remove();
  renderExpenses();
}

async function deleteExpenseConfirm(expenseId) {
  const expense = await ExpensesDB.get(expenseId);
  if (!expense) return;
  showConfirm(
    'Delete Expense',
    `Delete this ${formatCurrency(expense.amount)} expense?`,
    async () => {
      await ExpensesDB.delete(expenseId);
      showToast('Expense deleted.', 'success');
      renderExpenses();
    },
    null,
    'Delete',
    'btn-danger'
  );
}
