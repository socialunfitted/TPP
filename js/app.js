// ============================================================
// MAIN APP — Router, Navigation, Keyboard Shortcuts
// ============================================================

let currentPage = 'dashboard';

// ── NAVIGATION ──
async function navigate(page) {
  currentPage = page;

  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Update mobile nav
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Scroll to top
  document.getElementById('page-content')?.scrollTo(0, 0);

  // Render page
  switch (page) {
    case 'dashboard':     await renderDashboard();     break;
    case 'billing':       await renderBilling();       break;
    case 'sales':         await renderSales();         break;
    case 'customers':     await renderCustomers();     break;
    case 'products':      await renderProducts();      break;
    case 'reports':       await renderReports();       break;
    case 'expenses':      await renderExpenses();      break;
    case 'settings':      await renderSettings();      break;
    case 'subscriptions': await renderSubscriptions(); break;
    default:              await renderDashboard();     break;
  }

  // Close mobile sidebar if open
  closeMobileSidebar();
}

function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('mobile-open');
  document.getElementById('sidebar-overlay')?.classList.remove('active');
}

function toggleMobileSidebar() {
  document.getElementById('sidebar')?.classList.toggle('mobile-open');
  document.getElementById('sidebar-overlay')?.classList.toggle('active');
}

// ── KEYBOARD SHORTCUTS ──
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Don't trigger while typing
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;

    switch (e.key.toUpperCase()) {
      case 'N': e.preventDefault(); navigate('billing'); break;
      case 'C': e.preventDefault(); navigate('customers'); break;
      case 'F':
        e.preventDefault();
        if (currentPage === 'billing') {
          document.getElementById('product-search')?.focus();
        }
        break;
      case 'P':
        e.preventDefault();
        // Print current visible bill if any
        break;
      case 'ESCAPE':
        // Close topmost modal
        const modals = document.querySelectorAll('.modal-overlay.active');
        if (modals.length > 0) modals[modals.length - 1].remove();
        break;
    }
  });
}

// ── RENDER LAYOUT ──
function renderAppLayout() {
  document.body.innerHTML = `
    <!-- Sidebar Overlay (mobile) -->
    <div id="sidebar-overlay" class="sidebar-overlay" onclick="closeMobileSidebar()"></div>

    <!-- Sidebar -->
    <aside id="sidebar" class="sidebar">
      <div class="sidebar-logo" onclick="navigate('dashboard')">
        <img src="assets/logo.png" alt="TPP Logo" class="sidebar-logo-img" onerror="this.style.display='none'">
        <div class="sidebar-brand">
          <div class="sidebar-brand-name" id="header-store-name">THANJAI PARUTHI PAAL</div>
          <div class="sidebar-brand-tamil">தஞ்சை பருத்திப்பால்</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <a class="nav-item active" data-page="dashboard" onclick="navigate('dashboard')" id="nav-dashboard">
          <span class="nav-icon">🏠</span>
          <span class="nav-label">Dashboard</span>
        </a>
        <a class="nav-item nav-highlight" data-page="billing" onclick="navigate('billing')" id="nav-billing">
          <span class="nav-icon">🧾</span>
          <span class="nav-label">New Bill</span>
        </a>
        <a class="nav-item" data-page="sales" onclick="navigate('sales')" id="nav-sales">
          <span class="nav-icon">📋</span>
          <span class="nav-label">Sales History</span>
        </a>
        <a class="nav-item" data-page="customers" onclick="navigate('customers')" id="nav-customers">
          <span class="nav-icon">👥</span>
          <span class="nav-label">Customers</span>
        </a>
        <a class="nav-item" data-page="subscriptions" onclick="navigate('subscriptions')" id="nav-subscriptions">
          <span class="nav-icon">⭐</span>
          <span class="nav-label">Subscriptions</span>
        </a>
        <a class="nav-item" data-page="products" onclick="navigate('products')" id="nav-products">
          <span class="nav-icon">📦</span>
          <span class="nav-label">Products</span>
        </a>
        <a class="nav-item" data-page="reports" onclick="navigate('reports')" id="nav-reports">
          <span class="nav-icon">📈</span>
          <span class="nav-label">Reports</span>
        </a>
        <a class="nav-item" data-page="expenses" onclick="navigate('expenses')" id="nav-expenses">
          <span class="nav-icon">💸</span>
          <span class="nav-label">Expenses</span>
        </a>
        <a class="nav-item" data-page="settings" onclick="navigate('settings')" id="nav-settings">
          <span class="nav-icon">⚙️</span>
          <span class="nav-label">Settings</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <div id="online-indicator" class="online-status online">
          <span class="status-dot online"></span> Online
        </div>
        <div class="sidebar-tagline">Tradition in Every Sip</div>
      </div>
    </aside>

    <!-- Main Area -->
    <div class="main-area">
      <!-- Top Bar -->
      <header class="top-bar">
        <button class="hamburger-btn" onclick="toggleMobileSidebar()" aria-label="Menu" id="hamburger-btn">☰</button>
        <div class="topbar-title" onclick="navigate('dashboard')" style="cursor:pointer">
          <img src="assets/logo.png" alt="Logo" class="topbar-logo" onerror="this.style.display='none'">
          <span id="topbar-store-name">THANJAI PARUTHI PAAL</span>
        </div>
        <div class="topbar-actions">
          <div id="online-indicator-top" class="online-badge online">🟢</div>
          <button class="btn btn-primary btn-sm topbar-new-bill" onclick="navigate('billing')" id="topbar-new-bill">+ Bill</button>
        </div>
      </header>

      <!-- Page Content -->
      <main id="page-content" class="page-content">
        <div class="loading-spinner"><div class="spinner"></div><p>Loading...</p></div>
      </main>
    </div>

    <!-- Mobile Bottom Navigation -->
    <nav class="mobile-bottom-nav">
      <div class="mobile-nav-inner">
        <a class="mobile-nav-item active" data-page="dashboard" onclick="navigate('dashboard')" id="mobile-nav-dashboard">
          <span class="mobile-nav-icon-wrap"><span class="mobile-nav-icon">🏠</span></span>
          <span class="mobile-nav-label">Home</span>
        </a>
        <a class="mobile-nav-item" data-page="billing" onclick="navigate('billing')" id="mobile-nav-billing">
          <span class="mobile-nav-icon-wrap"><span class="mobile-nav-icon">🧾</span></span>
          <span class="mobile-nav-label">Bill</span>
        </a>
        <a class="mobile-nav-item" data-page="subscriptions" onclick="navigate('subscriptions')" id="mobile-nav-subscriptions">
          <span class="mobile-nav-icon-wrap"><span class="mobile-nav-icon">⭐</span></span>
          <span class="mobile-nav-label">Subs</span>
        </a>
        <a class="mobile-nav-item" data-page="sales" onclick="navigate('sales')" id="mobile-nav-sales">
          <span class="mobile-nav-icon-wrap"><span class="mobile-nav-icon">📋</span></span>
          <span class="mobile-nav-label">Sales</span>
        </a>
        <a class="mobile-nav-item" data-page="settings" onclick="navigate('settings')" id="mobile-nav-settings">
          <span class="mobile-nav-icon-wrap"><span class="mobile-nav-icon">⚙️</span></span>
          <span class="mobile-nav-label">Settings</span>
        </a>
      </div>
    </nav>

    <!-- Toast Container -->
    <div id="toast-container"></div>
  `;
}

// ── STARTUP ──
async function initApp() {
  try {
    // Render layout shell
    renderAppLayout();

    // Initialize DB
    await openDB();
    await initializeDefaultData();

    // Update online status
    updateOnlineStatus();

    // Load settings for header
    const settings = await SettingsDB.getAll();
    const name = settings.businessName || 'THANJAI PARUTHI PAAL';
    const headerName = document.getElementById('header-store-name');
    const topbarName = document.getElementById('topbar-store-name');
    if (headerName) headerName.textContent = name;
    if (topbarName) topbarName.textContent = name;

    // Keyboard shortcuts
    initKeyboardShortcuts();

    // Navigate to dashboard
    await navigate('dashboard');

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('Service worker registration failed:', err);
      });
    }

    console.log('✅ Thanjai Paruthi Paal POS initialized successfully!');
  } catch (err) {
    console.error('App initialization error:', err);
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;font-family:sans-serif;color:#333;background:#fffbf0;padding:20px;text-align:center;">
        <h2 style="font-size:24px;margin-bottom:8px;">⚠️ Startup Error</h2>
        <p style="color:#666;max-width:500px;margin-bottom:16px;">Could not initialize the app: ${escapeHTML(err.message)}</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
          <button onclick="location.reload()" style="padding:12px 24px;background:#f5a623;color:#1a1a1a;font-weight:bold;border:none;border-radius:8px;cursor:pointer;font-size:15px;">
            🔄 Retry & Reload
          </button>
          <button onclick="if(confirm('Reset local database? This will fix database conflicts.')){indexedDB.deleteDatabase('ThanjaiParuthiPaalDB');location.reload();}" style="padding:12px 24px;background:#ef4444;color:white;font-weight:bold;border:none;border-radius:8px;cursor:pointer;font-size:15px;">
            🧹 Reset Database & Reload
          </button>
        </div>
      </div>
    `;
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
