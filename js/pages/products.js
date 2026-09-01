// ============================================================
// PRODUCTS PAGE
// ============================================================

async function getCategoryList() {
  const dbCats = await CategoriesDB.getAll();
  if (dbCats.length === 0) {
    return ['PARUTHI PAAL', 'SWEETS', 'SNACKS', 'TAKE HOME', 'COMBOS', 'OTHER'];
  }
  return dbCats.map(c => c.name);
}

async function renderProducts() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading products...</p></div>`;

  try {
    const [products, categories] = await Promise.all([
      ProductsDB.getAll(),
      getCategoryList()
    ]);
    renderProductsPage(products, categories);
  } catch (err) {
    content.innerHTML = `<div class="error-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

function renderProductsPage(products, categories) {
  const content = document.getElementById('page-content');

  // Group by category
  const grouped = {};
  categories.forEach(cat => {
    const catProducts = products.filter(p => p.category === cat);
    if (catProducts.length > 0) grouped[cat] = catProducts;
  });

  // Other categories not in standard list
  products.forEach(p => {
    if (!categories.includes(p.category)) {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    }
  });

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Products & Categories</h1>
        <p class="page-subtitle">${products.length} products • ${products.filter(p => p.active !== false).length} active</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline" onclick="showCategoryManagementModal()" id="manage-cats-btn">🏷️ Manage Categories</button>
        <button class="btn btn-primary" onclick="showProductModal(null)" id="add-product-btn">+ Add Product</button>
      </div>
    </div>

    ${products.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>No products added yet</h3>
        <p>Add your first product to start billing.</p>
        <button class="btn btn-primary" onclick="showProductModal(null)">+ Add Product</button>
      </div>
    ` : Object.entries(grouped).map(([cat, prods]) => `
      <div class="product-category-section">
        <div class="category-header">
          <h3 class="category-title">${escapeHTML(cat)}</h3>
          <span class="category-count">${prods.length} items</span>
        </div>
        <div class="product-table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 50px;">Image</th>
                <th>Product Name</th>
                <th>Tamil Name</th>
                <th>Size</th>
                <th>Cost Price</th>
                <th>Selling Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${prods.sort((a,b) => (a.sortOrder || 99) - (b.sortOrder || 99)).map(p => `
                <tr class="${p.active === false ? 'row-inactive' : ''}">
                  <td>
                    ${p.image ? `
                      <img src="${p.image}" alt="${escapeHTML(p.name)}" class="table-prod-img">
                    ` : `
                      <div class="table-prod-icon">🥛</div>
                    `}
                  </td>
                  <td><strong>${escapeHTML(p.name)}</strong></td>
                  <td>${escapeHTML(p.tamilName || '')}</td>
                  <td>${escapeHTML(p.size || '')}</td>
                  <td>${formatCurrency(p.costPrice || 0)}</td>
                  <td><strong class="price-highlight">${formatCurrency(p.price)}</strong></td>
                  <td>
                    <label class="toggle-switch" title="${p.active !== false ? 'Disable' : 'Enable'}">
                      <input type="checkbox" ${p.active !== false ? 'checked' : ''} 
                        onchange="toggleProduct(${p.id}, this.checked)">
                      <span class="toggle-slider"></span>
                    </label>
                  </td>
                  <td>
                    <div class="action-btns">
                      <button class="btn-icon-sm" onclick="showProductModal(${p.id})" title="Edit">✏️</button>
                      <button class="btn-icon-sm danger-btn" onclick="deleteProductConfirm(${p.id})" title="Delete">🗑</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `).join('')}
  `;
}

function showProductModal(productId) {
  const isEdit = productId !== null;

  const loadAndShow = async () => {
    let product = null;
    const categories = await getCategoryList();

    if (isEdit) {
      product = await ProductsDB.get(productId);
      if (!product) return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'product-modal';
    overlay.innerHTML = `
      <div class="modal-box modal-lg">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Product' : 'Add Product'}</h3>
          <button class="modal-close" onclick="document.getElementById('product-modal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <!-- Image Upload Area -->
          <div class="form-group">
            <label>Product Image</label>
            <div class="image-upload-wrap">
              <div class="img-preview-box" id="img-preview-box">
                ${product?.image ? `<img src="${product.image}" id="img-preview">` : `<div class="img-preview-placeholder">🖼️ No image selected</div>`}
              </div>
              <div class="img-upload-controls">
                <input type="file" id="prod-img-file" accept="image/*" onchange="handleProductImageFile(this)" style="display:none">
                <button class="btn btn-sm btn-outline" type="button" onclick="document.getElementById('prod-img-file').click()">📁 Choose Image File</button>
                <span style="font-size:12px;color:var(--text-muted);">or enter image URL:</span>
                <input type="url" id="prod-img-url" value="${product?.image && !product.image.startsWith('data:') ? escapeHTML(product.image) : ''}" 
                  placeholder="https://example.com/image.jpg" oninput="handleProductImageUrl(this.value)">
                ${product?.image ? `<button class="btn btn-sm btn-danger" type="button" onclick="removeProductImage()">✕ Remove</button>` : ''}
              </div>
            </div>
            <input type="hidden" id="prod-img-data" value="${product?.image || ''}">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Product Name *</label>
              <input type="text" id="prod-name" value="${escapeHTML(product?.name || '')}" placeholder="e.g. Paruthi Paal 250 ml">
            </div>
            <div class="form-group">
              <label>Tamil Name</label>
              <input type="text" id="prod-tamil" value="${escapeHTML(product?.tamilName || '')}" placeholder="Tamil name">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Category</label>
              <select id="prod-category">
                ${categories.map(cat => `<option value="${cat}" ${product?.category === cat ? 'selected' : ''}>${cat}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Size / Unit</label>
              <input type="text" id="prod-size" value="${escapeHTML(product?.size || '')}" placeholder="e.g. 250 ml, 1 kg">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Selling Price (₹) *</label>
              <input type="number" id="prod-price" value="${product?.price || ''}" placeholder="0" min="0">
            </div>
            <div class="form-group">
              <label>Cost Price (₹)</label>
              <input type="number" id="prod-cost" value="${product?.costPrice || ''}" placeholder="0" min="0">
            </div>
          </div>

          <div class="form-group">
            <label class="toggle-label">
              <input type="checkbox" id="prod-active" ${!isEdit || product?.active !== false ? 'checked' : ''}>
              <span>Active (show in billing)</span>
            </label>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('product-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="saveProduct(${productId})">
            ${isEdit ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('prod-name')?.focus();
  };

  loadAndShow();
}

function handleProductImageFile(input) {
  const file = input.files[0];
  if (!file) return;
  
  if (file.size > 2 * 1024 * 1024) {
    showToast('Image size should be under 2MB.', 'warning');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    document.getElementById('prod-img-data').value = dataUrl;
    document.getElementById('img-preview-box').innerHTML = `<img src="${dataUrl}" id="img-preview">`;
  };
  reader.readAsDataURL(file);
}

function handleProductImageUrl(url) {
  if (!url) return;
  document.getElementById('prod-img-data').value = url.trim();
  document.getElementById('img-preview-box').innerHTML = `<img src="${url.trim()}" id="img-preview" onerror="this.src='assets/logo.png'">`;
}

function removeProductImage() {
  document.getElementById('prod-img-data').value = '';
  document.getElementById('img-preview-box').innerHTML = `<div class="img-preview-placeholder">🖼️ No image selected</div>`;
}

async function saveProduct(productId) {
  const name = document.getElementById('prod-name')?.value.trim();
  const tamilName = document.getElementById('prod-tamil')?.value.trim();
  const category = document.getElementById('prod-category')?.value;
  const size = document.getElementById('prod-size')?.value.trim();
  const price = parseFloat(document.getElementById('prod-price')?.value);
  const costPrice = parseFloat(document.getElementById('prod-cost')?.value) || 0;
  const active = document.getElementById('prod-active')?.checked !== false;
  const image = document.getElementById('prod-img-data')?.value || '';

  if (!name) { showToast('Please enter product name.', 'warning'); return; }
  if (isNaN(price) || price < 0) { showToast('Please enter a valid price.', 'error'); return; }

  const payload = { name, tamilName, category, size, price, costPrice, active, image };

  if (productId) {
    const existing = await ProductsDB.get(productId);
    await ProductsDB.update({ ...existing, ...payload });
    showToast('Product updated!', 'success');
  } else {
    await ProductsDB.add({ ...payload, createdAt: new Date().toISOString() });
    showToast('Product added!', 'success');
  }

  document.getElementById('product-modal')?.remove();
  renderProducts();
}

async function toggleProduct(productId, active) {
  const product = await ProductsDB.get(productId);
  if (!product) return;
  await ProductsDB.update({ ...product, active });
  showToast(`Product ${active ? 'enabled' : 'disabled'}.`, 'info');
}

async function deleteProductConfirm(productId) {
  const product = await ProductsDB.get(productId);
  if (!product) return;
  showConfirm(
    'Delete Product',
    `Delete "${product.name}"? This cannot be undone.`,
    async () => {
      await ProductsDB.delete(productId);
      showToast('Product deleted.', 'success');
      renderProducts();
    },
    null,
    'Delete',
    'btn-danger'
  );
}

// ── CATEGORY MANAGEMENT ──
async function showCategoryManagementModal() {
  const categories = await CategoriesDB.getAll();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay active';
  overlay.id = 'category-modal';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-header">
        <h3>Manage Product Categories</h3>
        <button class="modal-close" onclick="document.getElementById('category-modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Add New Category</label>
          <div class="customer-search-row">
            <input type="text" id="new-cat-input" placeholder="Category name (e.g. DESSERTS, JUICES)">
            <button class="btn btn-primary" onclick="addNewCategory()">+ Add</button>
          </div>
        </div>

        <div class="section-label" style="margin-top:16px;">Existing Categories</div>
        <div class="category-list-manage">
          ${categories.map(c => `
            <div class="cat-manage-item">
              <span>🏷️ <strong>${escapeHTML(c.name)}</strong></span>
              <button class="btn-icon-sm danger-btn" onclick="deleteCategoryConfirm(${c.id}, '${escapeHTML(c.name)}')">🗑</button>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('category-modal').remove()">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('new-cat-input')?.focus();
}

async function addNewCategory() {
  const input = document.getElementById('new-cat-input');
  const name = input?.value.trim().toUpperCase();
  if (!name) { showToast('Please enter a category name.', 'warning'); return; }

  const existing = await CategoriesDB.getAll();
  if (existing.some(c => c.name === name)) {
    showToast('Category already exists.', 'warning');
    return;
  }

  await CategoriesDB.add({ name, active: true });
  showToast('Category added!', 'success');
  document.getElementById('category-modal')?.remove();
  showCategoryManagementModal();
  renderProducts();
}

async function deleteCategoryConfirm(catId, catName) {
  showConfirm(
    'Delete Category',
    `Delete category "${catName}"? Existing products in this category will remain intact.`,
    async () => {
      await CategoriesDB.delete(catId);
      showToast('Category deleted.', 'success');
      document.getElementById('category-modal')?.remove();
      showCategoryManagementModal();
      renderProducts();
    },
    null,
    'Delete',
    'btn-danger'
  );
}
