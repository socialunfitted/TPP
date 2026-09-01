// ============================================================
// TPP DATABASE — IndexedDB wrapper
// Thanjai Paruthi Paal POS System
// ============================================================

const DB_NAME = 'ThanjaiParuthiPaalDB';
const DB_VERSION = 10;

let db = null;

// Open and initialize the database
function openDB() {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }

    function buildSchema(database) {
      // Bills store
      if (!database.objectStoreNames.contains('bills')) {
        const billStore = database.createObjectStore('bills', { keyPath: 'id', autoIncrement: true });
        billStore.createIndex('billNumber', 'billNumber', { unique: true });
        billStore.createIndex('date', 'date', { unique: false });
        billStore.createIndex('customerId', 'customerId', { unique: false });
        billStore.createIndex('status', 'status', { unique: false });
      }

      // Customers store
      if (!database.objectStoreNames.contains('customers')) {
        const custStore = database.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
        custStore.createIndex('mobile', 'mobile', { unique: false });
        custStore.createIndex('name', 'name', { unique: false });
      }

      // Products store
      if (!database.objectStoreNames.contains('products')) {
        const prodStore = database.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
        prodStore.createIndex('category', 'category', { unique: false });
        prodStore.createIndex('active', 'active', { unique: false });
      }

      // Expenses store
      if (!database.objectStoreNames.contains('expenses')) {
        const expStore = database.createObjectStore('expenses', { keyPath: 'id', autoIncrement: true });
        expStore.createIndex('date', 'date', { unique: false });
        expStore.createIndex('category', 'category', { unique: false });
      }

      // Settings store
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }

      // Bill counter store
      if (!database.objectStoreNames.contains('billCounter')) {
        database.createObjectStore('billCounter', { keyPath: 'date' });
      }

      // Categories store
      if (!database.objectStoreNames.contains('categories')) {
        database.createObjectStore('categories', { keyPath: 'id', autoIncrement: true });
      }

      // Branches store
      if (!database.objectStoreNames.contains('branches')) {
        database.createObjectStore('branches', { keyPath: 'id', autoIncrement: true });
      }

      // Subscriptions store
      if (!database.objectStoreNames.contains('subscriptions')) {
        const subStore = database.createObjectStore('subscriptions', { keyPath: 'id', autoIncrement: true });
        subStore.createIndex('customerId', 'customerId', { unique: false });
        subStore.createIndex('status', 'status', { unique: false });
      }
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      buildSchema(event.target.result);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      const err = event.target.error;
      console.warn('IndexedDB open error:', err);

      // Auto-recovery 1: Open existing database without explicit version
      const retryReq = indexedDB.open(DB_NAME);
      retryReq.onupgradeneeded = (e) => buildSchema(e.target.result);
      retryReq.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };
      retryReq.onerror = () => {
        // Auto-recovery 2: Clean database recreation
        console.warn('Re-creating database cleanly...');
        const delReq = indexedDB.deleteDatabase(DB_NAME);
        delReq.onsuccess = () => {
          const freshReq = indexedDB.open(DB_NAME, DB_VERSION);
          freshReq.onupgradeneeded = (fe) => buildSchema(fe.target.result);
          freshReq.onsuccess = (fe) => {
            db = fe.target.result;
            resolve(db);
          };
          freshReq.onerror = (fe) => reject(fe.target.error);
        };
        delReq.onerror = () => reject(err);
      };
    };
  });
}

// Generic CRUD helpers
function getStore(storeName, mode = 'readonly') {
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

function dbAdd(storeName, data) {
  return new Promise((resolve, reject) => {
    const store = getStore(storeName, 'readwrite');
    const request = store.add(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbPut(storeName, data) {
  return new Promise((resolve, reject) => {
    const store = getStore(storeName, 'readwrite');
    const request = store.put(data);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbGet(storeName, key) {
  return new Promise((resolve, reject) => {
    const store = getStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const store = getStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbDelete(storeName, key) {
  return new Promise((resolve, reject) => {
    const store = getStore(storeName, 'readwrite');
    const request = store.delete(key);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

function dbGetByIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    const store = getStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dbClear(storeName) {
  return new Promise((resolve, reject) => {
    const store = getStore(storeName, 'readwrite');
    const request = store.clear();
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================
// BILLS API
// ============================================================
const BillsDB = {
  async add(bill) {
    return await dbAdd('bills', bill);
  },
  async update(bill) {
    return await dbPut('bills', bill);
  },
  async get(id) {
    return await dbGet('bills', id);
  },
  async getAll() {
    return await dbGetAll('bills');
  },
  async delete(id) {
    return await dbDelete('bills', id);
  },
  async getByDate(dateStr) {
    const all = await dbGetAll('bills');
    return all.filter(b => b.date && b.date.startsWith(dateStr));
  },
  async getByCustomer(customerId) {
    return await dbGetByIndex('bills', 'customerId', customerId);
  },
  async getByBillNumber(billNumber) {
    return new Promise((resolve, reject) => {
      const store = getStore('bills');
      const index = store.index('billNumber');
      const request = index.get(billNumber);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
};

// ============================================================
// CUSTOMERS API
// ============================================================
const CustomersDB = {
  async add(customer) {
    return await dbAdd('customers', customer);
  },
  async update(customer) {
    return await dbPut('customers', customer);
  },
  async get(id) {
    return await dbGet('customers', id);
  },
  async getAll() {
    return await dbGetAll('customers');
  },
  async delete(id) {
    return await dbDelete('customers', id);
  },
  async search(query) {
    const all = await dbGetAll('customers');
    const q = query.toLowerCase();
    return all.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.mobile && c.mobile.includes(q))
    );
  }
};

// ============================================================
// PRODUCTS API
// ============================================================
const ProductsDB = {
  async add(product) {
    return await dbAdd('products', product);
  },
  async update(product) {
    return await dbPut('products', product);
  },
  async get(id) {
    return await dbGet('products', id);
  },
  async getAll() {
    return await dbGetAll('products');
  },
  async getActive() {
    const all = await dbGetAll('products');
    return all.filter(p => p.active !== false);
  },
  async delete(id) {
    return await dbDelete('products', id);
  },
  async getByCategory(category) {
    return await dbGetByIndex('products', 'category', category);
  }
};

// ============================================================
// EXPENSES API
// ============================================================
const ExpensesDB = {
  async add(expense) {
    return await dbAdd('expenses', expense);
  },
  async update(expense) {
    return await dbPut('expenses', expense);
  },
  async get(id) {
    return await dbGet('expenses', id);
  },
  async getAll() {
    return await dbGetAll('expenses');
  },
  async delete(id) {
    return await dbDelete('expenses', id);
  },
  async getByDate(dateStr) {
    const all = await dbGetAll('expenses');
    return all.filter(e => e.date && e.date.startsWith(dateStr));
  }
};

// ============================================================
// SETTINGS API
// ============================================================
const SettingsDB = {
  async get(key) {
    const record = await dbGet('settings', key);
    return record ? record.value : null;
  },
  async set(key, value) {
    return await dbPut('settings', { key, value });
  },
  async getAll() {
    const all = await dbGetAll('settings');
    const obj = {};
    all.forEach(item => { obj[item.key] = item.value; });
    return obj;
  }
};

// ============================================================
// CATEGORIES API
// ============================================================
const CategoriesDB = {
  async add(category) {
    return await dbAdd('categories', typeof category === 'string' ? { name: category, active: true } : category);
  },
  async update(category) {
    return await dbPut('categories', category);
  },
  async get(id) {
    return await dbGet('categories', id);
  },
  async getAll() {
    const all = await dbGetAll('categories');
    return all.filter(c => c.active !== false);
  },
  async delete(id) {
    return await dbDelete('categories', id);
  }
};

// ============================================================
// BRANCHES API
// ============================================================
const BranchesDB = {
  async add(branch) {
    return await dbAdd('branches', branch);
  },
  async update(branch) {
    return await dbPut('branches', branch);
  },
  async get(id) {
    return await dbGet('branches', id);
  },
  async getAll() {
    return await dbGetAll('branches');
  },
  async delete(id) {
    return await dbDelete('branches', id);
  }
};

// ============================================================
// SUBSCRIPTIONS API
// ============================================================
const SubscriptionsDB = {
  async add(subscription) {
    return await dbAdd('subscriptions', subscription);
  },
  async update(subscription) {
    return await dbPut('subscriptions', subscription);
  },
  async get(id) {
    return await dbGet('subscriptions', id);
  },
  async getAll() {
    return await dbGetAll('subscriptions');
  },
  async getByCustomer(customerId) {
    const all = await dbGetAll('subscriptions');
    return all.filter(s => s.customerId === customerId);
  },
  async delete(id) {
    return await dbDelete('subscriptions', id);
  }
};

// ============================================================
// BILL NUMBER GENERATOR
// ============================================================
const BillNumberDB = {
  async getNext(prefix = 'TPP') {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const counterKey = dateStr;
    
    let record = await dbGet('billCounter', counterKey);
    let counter = record ? record.counter + 1 : 1;
    
    await dbPut('billCounter', { date: counterKey, counter });
    
    const padded = String(counter).padStart(3, '0');
    return `${prefix}-${dateStr}-${padded}`;
  }
};

// ============================================================
// DEFAULT DATA INITIALIZATION
// ============================================================
const DEFAULT_PRODUCTS = [
  { name: 'Paruthi Paal 150 ml', tamilName: 'பருத்திப்பால் 150 மி.லி', category: 'PARUTHI PAAL', size: '150 ml', price: 20, costPrice: 10, active: true, isDemo: false, sortOrder: 1 },
  { name: 'Paruthi Paal 250 ml', tamilName: 'பருத்திப்பால் 250 மி.லி', category: 'PARUTHI PAAL', size: '250 ml', price: 30, costPrice: 15, active: true, isDemo: false, sortOrder: 2 },
  { name: 'Paruthi Paal 350 ml', tamilName: 'பருத்திப்பால் 350 மி.லி', category: 'PARUTHI PAAL', size: '350 ml', price: 40, costPrice: 20, active: true, isDemo: false, sortOrder: 3 },
  { name: 'Paruthi Paal 500 ml', tamilName: 'பருத்திப்பால் 500 மி.லி', category: 'PARUTHI PAAL', size: '500 ml', price: 60, costPrice: 30, active: true, isDemo: false, sortOrder: 4 },
  { name: 'Paruthi Paal 1 Litre', tamilName: 'பருத்திப்பால் 1 லிட்டர்', category: 'PARUTHI PAAL', size: '1 Litre', price: 110, costPrice: 55, active: true, isDemo: false, sortOrder: 5 },
];

const DEFAULT_CATEGORIES = ['PARUTHI PAAL', 'SWEETS', 'SNACKS', 'TAKE HOME', 'COMBOS', 'OTHER'];

const DEFAULT_SETTINGS = {
  businessName: 'THANJAI PARUTHI PAAL',
  tamilName: 'தஞ்சை பருத்திப்பால்',
  tagline: 'Tradition in Every Sip, Health in Every Cup.',
  phone: '9876543210',
  whatsapp: '9876543210',
  address: '12, Old Bus Stand Road, Thanjavur - 613001',
  gstin: '',
  fssai: '',
  upiId: 'thanjai.paruthipaal@upi',
  receiptFooter: 'Thank you for visiting Thanjai Paruthi Paal!',
  billPrefix: 'TPP',
  taxEnabled: false,
  taxRate: 0,
  currency: '₹',
};

async function initializeDefaultData() {
  await openDB();
  
  // Check if products exist
  const products = await ProductsDB.getAll();
  if (products.length === 0) {
    for (const product of DEFAULT_PRODUCTS) {
      await ProductsDB.add(product);
    }
  }

  // Check if categories exist
  const categories = await CategoriesDB.getAll();
  if (categories.length === 0) {
    for (const catName of DEFAULT_CATEGORIES) {
      await CategoriesDB.add({ name: catName, active: true });
    }
  }

  // Check if branches exist
  const branches = await BranchesDB.getAll();
  if (branches.length === 0) {
    await BranchesDB.add({
      name: 'Main Branch - Thanjavur',
      address: '12, Old Bus Stand Road, Thanjavur - 613001',
      phone: '9876543210',
      isDefault: true
    });
  }

  // Initialize settings if not present
  const settings = await SettingsDB.getAll();
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (settings[key] === undefined) {
      await SettingsDB.set(key, value);
    }
  }
}

// ============================================================
// DEMO DATA
// ============================================================
async function loadDemoData() {
  const demoCustomers = [
    { name: 'Arjun Krishnamurthy', mobile: '9876543210', address: '12, Anna Nagar, Thanjavur', email: 'arjun@email.com', totalBills: 0, totalPurchases: 0, outstandingDue: 0, isDemo: true, createdAt: new Date().toISOString() },
    { name: 'Priya Subramanian', mobile: '9865432109', address: '45, Ganesh Nagar, Kumbakonam', email: '', totalBills: 0, totalPurchases: 0, outstandingDue: 0, isDemo: true, createdAt: new Date().toISOString() },
    { name: 'Ravi Shankar', mobile: '9754321098', address: '78, Temple Street, Thanjavur', email: '', totalBills: 0, totalPurchases: 0, outstandingDue: 0, isDemo: true, createdAt: new Date().toISOString() },
  ];

  const insertedCustomers = [];
  for (const c of demoCustomers) {
    const id = await CustomersDB.add(c);
    insertedCustomers.push({ ...c, id });
  }

  const today = new Date().toISOString().slice(0, 10);
  const settings = await SettingsDB.getAll();
  const prefix = settings.billPrefix || 'TPP';
  const products = await ProductsDB.getAll();

  const demoBills = [
    {
      billNumber: `${prefix}-${today.replace(/-/g, '')}-D01`,
      date: today,
      time: '10:30 AM',
      dateTime: new Date().toISOString(),
      customerId: insertedCustomers[0].id,
      customerName: insertedCustomers[0].name,
      customerMobile: insertedCustomers[0].mobile,
      items: [
        { productId: products[1]?.id, name: '250 ml Paruthi Paal', qty: 2, rate: 30, amount: 60 },
        { productId: products[3]?.id, name: '500 ml Paruthi Paal', qty: 1, rate: 60, amount: 60 },
      ],
      subtotal: 120, discount: 0, tax: 0, grandTotal: 120, roundOff: 0,
      paymentMethod: 'UPI', paymentStatus: 'PAID', amountPaid: 120, balanceDue: 0,
      notes: '', isDemo: true, status: 'COMPLETED', createdAt: new Date().toISOString()
    },
    {
      billNumber: `${prefix}-${today.replace(/-/g, '')}-D02`,
      date: today,
      time: '12:15 PM',
      dateTime: new Date().toISOString(),
      customerId: insertedCustomers[1].id,
      customerName: insertedCustomers[1].name,
      customerMobile: insertedCustomers[1].mobile,
      items: [
        { productId: products[0]?.id, name: '150 ml Paruthi Paal', qty: 3, rate: 20, amount: 60 },
        { productId: products[2]?.id, name: '350 ml Paruthi Paal', qty: 1, rate: 40, amount: 40 },
      ],
      subtotal: 100, discount: 10, tax: 0, grandTotal: 90, roundOff: 0,
      paymentMethod: 'CASH', paymentStatus: 'PAID', amountPaid: 90, balanceDue: 0,
      notes: '', isDemo: true, status: 'COMPLETED', createdAt: new Date().toISOString()
    },
    {
      billNumber: `${prefix}-${today.replace(/-/g, '')}-D03`,
      date: today,
      time: '03:45 PM',
      dateTime: new Date().toISOString(),
      customerId: insertedCustomers[2].id,
      customerName: insertedCustomers[2].name,
      customerMobile: insertedCustomers[2].mobile,
      items: [
        { productId: products[4]?.id, name: '1 Litre Paruthi Paal', qty: 2, rate: 110, amount: 220 },
      ],
      subtotal: 220, discount: 0, tax: 0, grandTotal: 220, roundOff: 0,
      paymentMethod: 'CREDIT', paymentStatus: 'DUE', amountPaid: 0, balanceDue: 220,
      notes: 'Will pay tomorrow', isDemo: true, status: 'COMPLETED', createdAt: new Date().toISOString()
    },
  ];

  for (const bill of demoBills) {
    await BillsDB.add(bill);
  }

  // Update customers
  for (let i = 0; i < insertedCustomers.length; i++) {
    const c = insertedCustomers[i];
    const bill = demoBills[i];
    await CustomersDB.update({
      ...c,
      totalBills: 1,
      totalPurchases: bill.grandTotal,
      outstandingDue: bill.balanceDue,
      lastPurchase: today,
    });
  }

  // Demo expense
  await ExpensesDB.add({
    date: today,
    category: 'Ingredients',
    description: 'Cotton seeds and milk supply',
    amount: 800,
    paymentMethod: 'CASH',
    isDemo: true,
    createdAt: new Date().toISOString()
  });

  showToast('Demo data loaded successfully!', 'success');
}

async function clearDemoData() {
  const bills = await BillsDB.getAll();
  for (const b of bills.filter(b => b.isDemo)) await BillsDB.delete(b.id);
  
  const customers = await CustomersDB.getAll();
  for (const c of customers.filter(c => c.isDemo)) await CustomersDB.delete(c.id);
  
  const expenses = await ExpensesDB.getAll();
  for (const e of expenses.filter(e => e.isDemo)) await ExpensesDB.delete(e.id);
  
  showToast('Demo data cleared!', 'success');
}
