// ============================================================
// SETTINGS PAGE — Branches, UPI QR & Configuration
// ============================================================

async function renderSettings() {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading settings...</p></div>`;

  try {
    const [settings, branches] = await Promise.all([
      SettingsDB.getAll(),
      BranchesDB.getAll()
    ]);
    renderSettingsPage(settings, branches);
  } catch (err) {
    content.innerHTML = `<div class="error-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

function renderSettingsPage(s, branches) {
  const content = document.getElementById('page-content');

  content.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Settings & Branches</h1>
        <p class="page-subtitle">Manage business store info, multiple branches, UPI payment QR, and data backup</p>
      </div>
    </div>

    <!-- Local Data Warning -->
    <div class="settings-warning">
      <span>🗄️</span>
      <div>
        <strong>Local Data — Stored on This Device</strong>
        <p>If browser data is cleared, local data may be lost. Export a backup regularly using the Backup section below.</p>
      </div>
    </div>

    <!-- Business Info -->
    <div class="settings-section">
      <div class="settings-section-title">🏪 Business Information</div>
      <div class="settings-grid">
        <div class="form-group">
          <label>Business Name</label>
          <input type="text" id="s-name" value="${escapeHTML(s.businessName || '')}" placeholder="Your store name">
        </div>
        <div class="form-group">
          <label>Tamil Name</label>
          <input type="text" id="s-tamil" value="${escapeHTML(s.tamilName || '')}" placeholder="Tamil name">
        </div>
        <div class="form-group">
          <label>Tagline</label>
          <input type="text" id="s-tagline" value="${escapeHTML(s.tagline || '')}" placeholder="Your tagline">
        </div>
        <div class="form-group">
          <label>Bill Number Prefix</label>
          <input type="text" id="s-prefix" value="${escapeHTML(s.billPrefix || 'TPP')}" placeholder="TPP" maxlength="5">
          <small>Format: PREFIX-YYYYMMDD-001</small>
        </div>
        <div class="form-group">
          <label>Main Store Phone</label>
          <input type="tel" id="s-phone" value="${escapeHTML(s.phone || '')}" placeholder="Store phone">
        </div>
        <div class="form-group">
          <label>WhatsApp Billing Number</label>
          <input type="tel" id="s-whatsapp" value="${escapeHTML(s.whatsapp || '')}" placeholder="WhatsApp number">
        </div>
        <div class="form-group full-width">
          <label>Main Branch Address</label>
          <textarea id="s-address" rows="2" placeholder="Full store address">${escapeHTML(s.address || '')}</textarea>
        </div>
        <div class="form-group">
          <label>GSTIN <span class="optional">(optional)</span></label>
          <input type="text" id="s-gstin" value="${escapeHTML(s.gstin || '')}" placeholder="GST number">
        </div>
        <div class="form-group">
          <label>FSSAI License <span class="optional">(optional)</span></label>
          <input type="text" id="s-fssai" value="${escapeHTML(s.fssai || '')}" placeholder="FSSAI number">
        </div>
        <div class="form-group full-width">
          <label>Receipt Footer Message</label>
          <input type="text" id="s-footer" value="${escapeHTML(s.receiptFooter || '')}" placeholder="Thank you message">
        </div>
      </div>
    </div>

    <!-- Store Branches Section -->
    <div class="settings-section">
      <div class="settings-section-header-row">
        <div class="settings-section-title" style="margin-bottom:0;border-bottom:none;">📍 Store Branches Management</div>
        <button class="btn btn-sm btn-primary" onclick="showBranchModal(null)">+ Add Branch</button>
      </div>
      <div class="branches-list" style="margin-top:16px;">
        ${branches.length === 0 ? `
          <div class="empty-state small"><p>No separate branches added. Main branch address will be used.</p></div>
        ` : `
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Branch Name</th>
                  <th>Address</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${branches.map(b => `
                  <tr>
                    <td><strong>${escapeHTML(b.name)}</strong></td>
                    <td>${escapeHTML(b.address || '')}</td>
                    <td>${escapeHTML(b.phone || '')}</td>
                    <td>${b.isDefault ? '<span class="badge badge-paid">Default Branch</span>' : '<span class="badge">Branch</span>'}</td>
                    <td>
                      <div class="action-btns">
                        <button class="btn-icon-sm" onclick="showBranchModal(${b.id})" title="Edit">✏️</button>
                        ${!b.isDefault ? `<button class="btn-icon-sm danger-btn" onclick="deleteBranchConfirm(${b.id})" title="Delete">🗑</button>` : ''}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>

    <!-- UPI QR Code Settings -->
    <div class="settings-section">
      <div class="settings-section-title">📱 UPI Payment QR Code Setup</div>
      <div class="settings-grid">
        <div class="form-group">
          <label>Store UPI ID (VPA) *</label>
          <input type="text" id="s-upi" value="${escapeHTML(s.upiId || '')}" placeholder="e.g. thanjai.paruthipaal@upi" oninput="previewSettingsUPIQR(this.value)">
          <small>Dynamic QR codes with amount will be printed on PDFs & shown in POS payment modal.</small>
        </div>
        <div class="form-group">
          <label>UPI QR Code Preview</label>
          <div class="upi-settings-preview-box" id="settings-upi-qr-preview">
            <div class="loading-spinner small"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tax Settings -->
    <div class="settings-section">
      <div class="settings-section-title">💰 Tax Settings</div>
      <div class="settings-grid">
        <div class="form-group">
          <label class="toggle-label">
            <input type="checkbox" id="s-tax-enabled" ${s.taxEnabled ? 'checked' : ''} onchange="toggleTaxSetting(this.checked)">
            <span>Enable Tax on Bills</span>
          </label>
        </div>
        <div class="form-group" id="tax-rate-group" style="${s.taxEnabled ? '' : 'display:none'}">
          <label>Tax Rate (%)</label>
          <input type="number" id="s-tax-rate" value="${s.taxRate || 0}" min="0" max="100" step="0.1">
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div class="settings-actions">
      <button class="btn btn-primary btn-lg" onclick="saveSettings()" id="save-settings-btn">💾 Save All Settings</button>
    </div>

    <!-- Backup Section -->
    <div class="settings-section">
      <div class="settings-section-title">🔒 Backup & Restore</div>
      <div class="backup-actions">
        <div class="backup-card">
          <div class="backup-icon">📤</div>
          <div class="backup-info">
            <strong>Export Backup</strong>
            <p>Download all your data as a JSON file. Save it regularly.</p>
          </div>
          <button class="btn btn-primary" onclick="BackupService.exportBackup()" id="export-backup-btn">Export Backup</button>
        </div>
        <div class="backup-card">
          <div class="backup-icon">📥</div>
          <div class="backup-info">
            <strong>Import Backup</strong>
            <p>Restore data from a previously exported JSON file.</p>
          </div>
          <label class="btn btn-outline" for="import-file-input">Import Backup</label>
          <input type="file" id="import-file-input" accept=".json" onchange="handleImportFile(this)" style="display:none">
        </div>
      </div>
    </div>

    <!-- App Info -->
    <div class="settings-section app-info-section">
      <div class="settings-section-title">ℹ️ App Information</div>
      <div class="app-info">
        <div><strong>App:</strong> Thanjai Paruthi Paal POS & Billing</div>
        <div><strong>Version:</strong> 2.0.0 (With UPI QR & Subscriptions)</div>
        <div><strong>Storage:</strong> IndexedDB (Browser Local Storage)</div>
        <div><strong>Mode:</strong> Offline-First PWA</div>
      </div>
    </div>
  `;

  // Render initial QR preview
  previewSettingsUPIQR(s.upiId || 'thanjai.paruthipaal@upi');
}

async function previewSettingsUPIQR(upiId) {
  const container = document.getElementById('settings-upi-qr-preview');
  if (!container) return;

  if (!upiId) {
    container.innerHTML = '<span style="font-size:12px;color:var(--text-muted);">Enter UPI ID above to generate preview</span>';
    return;
  }

  const upiString = generateUPIString(upiId, 'THANJAI PARUTHI PAAL', 120, 'DEMO');
  const dataUrl = await generateQRCodeDataURL(upiString, 110, 110);

  if (dataUrl) {
    container.innerHTML = `
      <img src="${dataUrl}" style="width:100px;height:100px;border:1px solid #ccc;border-radius:6px;padding:4px;background:white;" alt="UPI QR">
      <div style="font-size:11px;color:var(--brand-gold-dark);font-weight:700;margin-top:4px;">${escapeHTML(upiId)}</div>
    `;
  }
}

function toggleTaxSetting(enabled) {
  const group = document.getElementById('tax-rate-group');
  if (group) group.style.display = enabled ? '' : 'none';
}

async function saveSettings() {
  const settings = {
    businessName: document.getElementById('s-name')?.value.trim() || 'THANJAI PARUTHI PAAL',
    tamilName: document.getElementById('s-tamil')?.value.trim() || '',
    tagline: document.getElementById('s-tagline')?.value.trim() || '',
    billPrefix: (document.getElementById('s-prefix')?.value.trim() || 'TPP').toUpperCase(),
    phone: document.getElementById('s-phone')?.value.trim() || '',
    whatsapp: document.getElementById('s-whatsapp')?.value.trim() || '',
    address: document.getElementById('s-address')?.value.trim() || '',
    gstin: document.getElementById('s-gstin')?.value.trim() || '',
    fssai: document.getElementById('s-fssai')?.value.trim() || '',
    upiId: document.getElementById('s-upi')?.value.trim() || '',
    receiptFooter: document.getElementById('s-footer')?.value.trim() || 'Thank you for visiting!',
    taxEnabled: document.getElementById('s-tax-enabled')?.checked || false,
    taxRate: parseFloat(document.getElementById('s-tax-rate')?.value || 0) || 0,
    currency: '₹'
  };

  for (const [key, value] of Object.entries(settings)) {
    await SettingsDB.set(key, value);
  }

  // Update header store name
  const headerName = document.getElementById('header-store-name');
  if (headerName) headerName.textContent = settings.businessName;

  showToast('Settings saved successfully!', 'success');
}

// ── BRANCH MODAL ──
function showBranchModal(branchId = null) {
  const isEdit = branchId !== null;

  const loadAndShow = async () => {
    let branch = null;
    if (isEdit) {
      branch = await BranchesDB.get(branchId);
      if (!branch) return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'branch-modal';
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Branch' : 'Add Store Branch'}</h3>
          <button class="modal-close" onclick="document.getElementById('branch-modal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Branch Name *</label>
            <input type="text" id="br-name" value="${escapeHTML(branch?.name || '')}" placeholder="e.g. Kumbakonam Branch">
          </div>
          <div class="form-group">
            <label>Address</label>
            <textarea id="br-address" rows="2" placeholder="Branch address">${escapeHTML(branch?.address || '')}</textarea>
          </div>
          <div class="form-group">
            <label>Branch Phone</label>
            <input type="tel" id="br-phone" value="${escapeHTML(branch?.phone || '')}" placeholder="Phone number">
          </div>
          <div class="form-check">
            <input type="checkbox" id="br-default" ${branch?.isDefault ? 'checked' : ''}>
            <label for="br-default">Set as default branch</label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="document.getElementById('branch-modal').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="saveBranch(${branchId})">${isEdit ? 'Save Changes' : 'Add Branch'}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById('br-name')?.focus();
  };

  loadAndShow();
}

async function saveBranch(branchId) {
  const name = document.getElementById('br-name')?.value.trim();
  const address = document.getElementById('br-address')?.value.trim();
  const phone = document.getElementById('br-phone')?.value.trim();
  const isDefault = document.getElementById('br-default')?.checked || false;

  if (!name) { showToast('Please enter a branch name.', 'warning'); return; }

  if (isDefault) {
    // Unset default on other branches
    const all = await BranchesDB.getAll();
    for (const b of all) {
      if (b.isDefault && b.id !== branchId) {
        await BranchesDB.update({ ...b, isDefault: false });
      }
    }
  }

  const payload = { name, address, phone, isDefault };

  if (branchId) {
    const existing = await BranchesDB.get(branchId);
    await BranchesDB.update({ ...existing, ...payload });
    showToast('Branch updated!', 'success');
  } else {
    await BranchesDB.add(payload);
    showToast('Branch added!', 'success');
  }

  document.getElementById('branch-modal')?.remove();
  renderSettings();
}

async function deleteBranchConfirm(branchId) {
  showConfirm(
    'Delete Branch',
    'Are you sure you want to delete this branch entry?',
    async () => {
      await BranchesDB.delete(branchId);
      showToast('Branch deleted.', 'success');
      renderSettings();
    },
    null,
    'Delete',
    'btn-danger'
  );
}

async function handleImportFile(input) {
  const file = input.files[0];
  if (!file) return;
  try {
    await BackupService.importBackup(file);
  } catch (err) {
    // Error already handled in service
  }
  input.value = '';
}
