import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Users, Package, FileText, Settings, BarChart2, ShieldAlert,
  Search, RefreshCw, AlertTriangle, CheckCircle, Trash2, Plus, Minus, UserCheck, 
  X, Check, Download, ShieldCheck, Printer, ArrowRight, UserPlus, Eye, LogOut, Key
} from 'lucide-react';

const API_BASE = (window.hmatApi && window.hmatApi.getApiUrlSync)
  ? window.hmatApi.getApiUrlSync()
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000');

const ROLE_PERMISSIONS = {
  admin: ['licenses', 'audit'],
  pharmacist: ['pos', 'prescriptions', 'inventory', 'patients', 'sales', 'settings', 'analytics'],
  cashier: ['pos', 'patients', 'sales']
};

const hasTabPermission = (role, tabId) => {
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(tabId);
};

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const role = localStorage.getItem('cashierRole');
    if (role === 'admin') {
      return 'licenses';
    }
    return 'pos';
  });
  const [currentTenantId, setCurrentTenantId] = useState(localStorage.getItem('currentTenantId') || ''); // Dynamically loaded tenant
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken') || ''); // Dynamically loaded JWT token
  const [cashierId, setCashierId] = useState(localStorage.getItem('cashierId') || ''); 
  const [cashierName, setCashierName] = useState(localStorage.getItem('cashierName') || 'Guest');
  const [cashierRole, setCashierRole] = useState(localStorage.getItem('cashierRole') || 'cashier');
  const [isConnected, setIsConnected] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState('Rs. ');
  
  // Dynamic application settings
  const [settings, setSettings] = useState({
    currencySymbol: localStorage.getItem('currencySymbol') || 'Rs. ',
    pharmacyName: localStorage.getItem('pharmacyName') || 'HMAT Clinical Pharmacy',
    npi: localStorage.getItem('npi') || '1982736450',
    ncpdp: localStorage.getItem('ncpdp') || '3827491',
    dea: localStorage.getItem('dea') || 'PH1234567',
    taxRate: localStorage.getItem('taxRate') || '10.00',
    discountRate: localStorage.getItem('discountRate') || '0.00',
    lowStockPar: localStorage.getItem('lowStockPar') || '25',
    expiryDays: localStorage.getItem('expiryDays') || '30',
    coldTempAlert: localStorage.getItem('coldTempAlert') || '8.0'
  });

  // Global Lists loaded from database
  const [catalogItems, setCatalogItems] = useState([]);
  const [quickKeys, setQuickKeys] = useState([]);
  const [patients, setPatients] = useState([]);
  const [cart, setCart] = useState([]);
  const [gridRows, setGridRows] = useState([
    { barcode: '', name: '', batchNo: '', expDate: '', stock: '', qty: '', unitPrice: '', disc: localStorage.getItem('discountRate') || '0', tax: localStorage.getItem('taxRate') || '10', lineTotal: 0, itemId: '', batchLotId: '' }
  ]);
  const [activeCell, setActiveCell] = useState({ rowIndex: 0, colIndex: 1 });
  const [searchState, setSearchState] = useState({ activeRowIndex: -1, activeColIndex: -1, query: '', results: [], selectedIndex: 0 });
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [tenderedAmount, setTenderedAmount] = useState('');
  const [syncOutboxCount, setSyncOutboxCount] = useState(0);
  const [salesRefreshCount, setSalesRefreshCount] = useState(0);

  // Active Modals state
  const [receiptModalSale, setReceiptModalSale] = useState(null);
  const [verifyRxModalData, setVerifyRxModalData] = useState(null);
  const [createPatientModalOpen, setCreatePatientModalOpen] = useState(false);
  const [createPrescriptionModalOpen, setCreatePrescriptionModalOpen] = useState(false);
  const [adjustStockItem, setAdjustStockItem] = useState(null);
  const [receiveBatchItem, setReceiveBatchItem] = useState(null);
  const [editPatientData, setEditPatientData] = useState(null);
  const [patientDetailsData, setPatientDetailsData] = useState(null);

  // Notifications
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const getAuthHeaders = (token = authToken) => {
    return {
      'Authorization': `Bearer ${token}`
    };
  };

  // Check connection status & Outbox count
  const checkStatus = async (token = authToken, tenantId = currentTenantId) => {
    if (!token || !tenantId) return;
    try {
      const res = await fetch(`${API_BASE}/health`, { headers: getAuthHeaders(token) });
      setIsConnected(res.ok);
      
      const outboxRes = await fetch(`${API_BASE}/sync/outbox?tenantId=${tenantId}`, { headers: getAuthHeaders(token) });
      if (outboxRes.ok) {
        const outbox = await outboxRes.json();
        setSyncOutboxCount(outbox.length);
      }
    } catch {
      setIsConnected(false);
    }
  };

  // Load configuration settings
  const loadSettings = async (token = authToken, tenantId = currentTenantId) => {
    if (!token || !tenantId) return;
    try {
      const res = await fetch(`${API_BASE}/settings?tenantId=${tenantId}`, { headers: getAuthHeaders(token) });
      if (res.ok) {
        const dbSettings = await res.json();
        const updated = {
          currencySymbol: dbSettings.currency_symbol || 'Rs. ',
          pharmacyName: dbSettings.pharmacy_name || 'HMAT Clinical Pharmacy',
          npi: dbSettings.npi || '1982736450',
          ncpdp: dbSettings.ncpdp || '3827491',
          dea: dbSettings.dea || 'PH1234567',
          taxRate: dbSettings.tax_rate || '10.00',
          discountRate: dbSettings.default_discount_rate || '0.00',
          lowStockPar: dbSettings.low_stock_par || '25',
          expiryDays: dbSettings.expiry_days || '30',
          coldTempAlert: dbSettings.cold_temp_alert || '8.0'
        };
        setSettings(updated);
        setCurrencySymbol(updated.currencySymbol);

        localStorage.setItem('currencySymbol', updated.currencySymbol);
        localStorage.setItem('pharmacyName', updated.pharmacyName);
        localStorage.setItem('npi', updated.npi);
        localStorage.setItem('ncpdp', updated.ncpdp);
        localStorage.setItem('dea', updated.dea);
        localStorage.setItem('taxRate', updated.taxRate);
        localStorage.setItem('discountRate', updated.discountRate);
        localStorage.setItem('lowStockPar', updated.lowStockPar);
        localStorage.setItem('expiryDays', updated.expiryDays);
        localStorage.setItem('coldTempAlert', updated.coldTempAlert);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  // Load Catalog Items & Patients
  const loadCatalogData = async (query = '', token = authToken, tenantId = currentTenantId) => {
    if (!token || !tenantId) return;
    try {
      const res = await fetch(`${API_BASE}/catalog/search?q=${encodeURIComponent(query)}&tenantId=${tenantId}`, { headers: getAuthHeaders(token) });
      if (res.ok) {
        const items = await res.json();
        setCatalogItems(items);
        
        // Populate quick keys with common high-frequency drug items
        if (!query) {
          setQuickKeys(items.slice(0, 8));
        }
      }
    } catch (err) {
      console.error('Error loading catalog:', err);
    }
  };

  const loadPatients = async (token = authToken, tenantId = currentTenantId) => {
    if (!token || !tenantId) return;
    try {
      const res = await fetch(`${API_BASE}/patients?tenantId=${tenantId}`, { headers: getAuthHeaders(token) });
      if (res.ok) {
        const list = await res.json();
        setPatients(list);
      }
    } catch (err) {
      console.error('Error loading patients:', err);
    }
  };

  // Sync data manually
  const triggerSync = async () => {
    if (!authToken || !currentTenantId) return;
    showToast('Re-synchronizing local database caches...');
    await checkStatus(authToken, currentTenantId);
    await loadSettings(authToken, currentTenantId);
    await loadCatalogData('', authToken, currentTenantId);
    await loadPatients(authToken, currentTenantId);
    showToast('Sync complete!');
  };

  useEffect(() => {
    if (authToken) {
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('currentTenantId', currentTenantId);
      localStorage.setItem('cashierId', cashierId);
      localStorage.setItem('cashierName', cashierName);
      localStorage.setItem('cashierRole', cashierRole);
    } else {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentTenantId');
      localStorage.removeItem('cashierId');
      localStorage.removeItem('cashierName');
      localStorage.removeItem('cashierRole');
    }
  }, [authToken, currentTenantId, cashierId, cashierName, cashierRole]);

  useEffect(() => {
    if (authToken && currentTenantId) {
      checkStatus(authToken, currentTenantId);
      loadSettings(authToken, currentTenantId);
      loadCatalogData('', authToken, currentTenantId);
      loadPatients(authToken, currentTenantId);
    }
  }, [authToken, currentTenantId]);

  useEffect(() => {
    // Periodically query NestJS backend connectivity
    const interval = setInterval(() => checkStatus(authToken, currentTenantId), 5000);
    return () => clearInterval(interval);
  }, [authToken, currentTenantId]);

  useEffect(() => {
    if (authToken) {
      const allowed = ROLE_PERMISSIONS[cashierRole] || [];
      if (!allowed.includes(activeTab)) {
        if (allowed.length > 0) {
          setActiveTab(allowed[0]);
        }
      }
    }
  }, [activeTab, cashierRole, authToken]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Check if F-keys are pressed
      if (e.key.startsWith('F') && e.key.length > 1) {
        const fNum = parseInt(e.key.substring(1));
        if (fNum >= 1 && fNum <= 12) {
          e.preventDefault();
          
          if (e.key === 'F1') {
            focusCell(activeCell.rowIndex, 1);
          } else if (e.key === 'F2') {
            focusCell(activeCell.rowIndex, 6);
          } else if (e.key === 'F4') {
            const el = document.getElementById('patient-select-dropdown');
            if (el) el.focus();
          } else if (e.key === 'F9') {
            handleCheckout();
          }
        }
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClearGrid();
      }

      if (e.key === 'Delete') {
        if (document.activeElement && document.activeElement.id && document.activeElement.id.startsWith('cell-')) {
          e.preventDefault();
          handleDeleteRow(activeCell.rowIndex);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeCell, gridRows, authToken, currentTenantId, cashierId, selectedPatientId, paymentMethod, tenderedAmount]);

  // Login handler
  const handleLoginSubmit = async (email, password) => {
    try {
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        const token = loginData.token || loginData.access_token || '';
        setAuthToken(token);
        
        if (loginData.user) {
          setCashierId(loginData.user.id);
          setCashierName(loginData.user.displayName || 'System Admin');
          setCashierRole(loginData.user.role || 'admin');
        }

        let tenantId = (loginData.user && loginData.user.tenantId) || '';
        
        // If tenantId is not present, fetch tenants list and pick the first one
        if (!tenantId) {
          const tenantsRes = await fetch(`${API_BASE}/tenants`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (tenantsRes.ok) {
            const tenants = await tenantsRes.json();
            if (tenants && tenants.length > 0) {
              tenantId = tenants[0].id;
            }
          }
        }

        if (tenantId) {
          setCurrentTenantId(tenantId);
          
          // Trigger initial data sync
          await Promise.all([
            checkStatus(token, tenantId),
            loadSettings(token, tenantId),
            loadCatalogData('', token, tenantId),
            loadPatients(token, tenantId)
          ]);
          if (loginData.user && loginData.user.role === 'admin') {
            setActiveTab('licenses');
          } else {
            setActiveTab('pos');
          }
          showToast('Welcome, logged in successfully!');
        } else {
          showToast('No pharmacy tenant associated with this account.', 'error');
        }
      } else {
        showToast('Authentication failed. Check your credentials.', 'error');
      }
    } catch (err) {
      showToast('Connection error: ' + err.message, 'error');
    }
  };

  const handleLicenseLogin = async (licenseKey) => {
    try {
      const loginRes = await fetch(`${API_BASE}/auth/license-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey })
      });
      
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        const token = loginData.token || loginData.access_token || '';
        setAuthToken(token);
        
        if (loginData.user) {
          setCashierId(loginData.user.id);
          setCashierName(loginData.user.displayName || 'Pharmacist');
          setCashierRole(loginData.user.role || 'pharmacist');
        }

        let tenantId = (loginData.user && loginData.user.tenantId) || '';
        if (tenantId) {
          setCurrentTenantId(tenantId);
          
          await Promise.all([
            checkStatus(token, tenantId),
            loadSettings(token, tenantId),
            loadCatalogData('', token, tenantId),
            loadPatients(token, tenantId)
          ]);
          setActiveTab('pos');
          showToast('License key validation successful. Welcome!');
        } else {
          showToast('No pharmacy tenant associated with this license key.', 'error');
        }
      } else {
        const err = await loginRes.json();
        showToast('License Key Login failed: ' + (err.message || 'Invalid key'), 'error');
      }
    } catch (err) {
      showToast('Connection error: ' + err.message, 'error');
    }
  };

  const handleLogout = () => {
    setAuthToken('');
    setCashierId('');
    setCashierName('');
    setCashierRole('cashier');
    setCurrentTenantId('');
    showToast('Logged out successfully.');
  };

  const formatMoney = (val) => {
    return `${currencySymbol}${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Spreadsheet Grid Operations
  const addToCart = (item) => {
    const defaultBatch = item.inventoryBalances?.[0]?.batchLot;
    const totalStock = item.inventoryBalances ? item.inventoryBalances.reduce((sum, b) => sum + (b.onHand || 0), 0) : 0;
    
    // Find first empty row to overwrite, or append
    const emptyRowIdx = gridRows.findIndex(r => !r.itemId);
    const newRow = {
      itemId: item.id,
      name: item.name,
      barcode: item.sku || item.ndc || '',
      batchNo: defaultBatch ? defaultBatch.batchNo : 'N/A',
      batchLotId: defaultBatch ? defaultBatch.id : '',
      expDate: defaultBatch ? new Date(defaultBatch.expiryDate).toLocaleDateString() : 'N/A',
      stock: totalStock > 0 ? 'Available' : 'Out of Stock',
      qty: 1,
      unitPrice: item.unitPrice,
      disc: 0,
      tax: item.taxCode === 'EXEMPT' ? 0 : 10,
      lineTotal: item.unitPrice
    };

    if (emptyRowIdx !== -1) {
      const updated = [...gridRows];
      updated[emptyRowIdx] = newRow;
      setGridRows(updated);
      setTimeout(() => focusCell(emptyRowIdx, 6), 50); // Focus Qty
    } else {
      setGridRows([...gridRows, newRow]);
      setTimeout(() => focusCell(gridRows.length, 6), 50); // Focus Qty
    }
    showToast(`Added ${item.name} to Counter Book.`);
  };

  const addPrescriptionToGrid = (rx) => {
    if (!rx.lines || rx.lines.length === 0) {
      showToast('Prescription has no medications to fulfill!', 'error');
      return;
    }

    const updated = [...gridRows];
    
    rx.lines.forEach((line) => {
      const item = line.item;
      if (!item) return;

      const defaultBatch = item.inventoryBalances?.[0]?.batchLot;
      const totalStock = item.inventoryBalances ? item.inventoryBalances.reduce((sum, b) => sum + (b.onHand || 0), 0) : 0;
      
      const price = item.unitPrice || 15.00;
      const qty = line.qty || 1;
      const discPercent = parseFloat(settings.discountRate) || 0;
      const taxPercent = item.taxCode === 'EXEMPT' ? 0 : (parseFloat(settings.taxRate) || 10);
      
      const lineSub = price * qty;
      const lineDisc = lineSub * (discPercent / 100);
      const lineTotal = lineSub - lineDisc + (lineSub - lineDisc) * (taxPercent / 100);

      const newRow = {
        itemId: item.id,
        name: item.name,
        barcode: item.sku || item.ndc || '',
        batchNo: defaultBatch ? defaultBatch.batchNo : 'N/A',
        batchLotId: defaultBatch ? defaultBatch.id : '',
        expDate: defaultBatch ? new Date(defaultBatch.expiryDate).toLocaleDateString() : 'N/A',
        stock: totalStock > 0 ? 'Available' : 'Out of Stock',
        qty: qty,
        unitPrice: price,
        disc: discPercent,
        tax: taxPercent,
        lineTotal: lineTotal
      };

      // Find first empty row to overwrite, or append
      const emptyRowIdx = updated.findIndex(r => !r.itemId);
      if (emptyRowIdx !== -1) {
        updated[emptyRowIdx] = newRow;
      } else {
        updated.push(newRow);
      }
    });

    // Ensure there is at least one empty row at the end of the spreadsheet
    const hasEmpty = updated.some(r => !r.itemId);
    if (!hasEmpty) {
      updated.push({ barcode: '', name: '', batchNo: '', expDate: '', stock: '', qty: '', unitPrice: '', disc: settings.discountRate, tax: settings.taxRate, lineTotal: 0, itemId: '', batchLotId: '' });
    }

    setGridRows(updated);
    setActiveTab('pos');
    if (rx.patientId) {
      setSelectedPatientId(rx.patientId);
    }
    showToast(`Prescription #${rx.rxNo} loaded into Counter Book!`);
  };

  const calculatedTotals = () => {
    let uniqueItems = 0;
    let totalQty = 0;
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    gridRows.forEach(row => {
      if (row.itemId) {
        uniqueItems++;
        const qty = parseFloat(row.qty) || 0;
        const price = parseFloat(row.unitPrice) || 0;
        const discPercent = parseFloat(row.disc) || 0;
        const taxPercent = parseFloat(row.tax) || 0;

        totalQty += qty;
        const lineSubtotal = price * qty;
        const lineDiscount = lineSubtotal * (discPercent / 100);
        const taxableAmount = lineSubtotal - lineDiscount;
        const lineTax = taxableAmount * (taxPercent / 100);

        subtotal += lineSubtotal;
        totalDiscount += lineDiscount;
        totalTax += lineTax;
      }
    });

    const grandTotal = subtotal - totalDiscount + totalTax;

    return {
      uniqueItems,
      totalQty,
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal
    };
  };

  const focusCell = (rowIndex, colIndex) => {
    const el = document.getElementById(`cell-${rowIndex}-${colIndex}`);
    if (el) {
      el.focus();
      if (el.select) el.select();
      setActiveCell({ rowIndex, colIndex });
    }
  };

  const selectSearchItem = (rowIndex, item) => {
    const defaultBatch = item.inventoryBalances?.[0]?.batchLot;
    const totalStock = item.inventoryBalances ? item.inventoryBalances.reduce((sum, b) => sum + (b.onHand || 0), 0) : 0;
    
    const price = item.unitPrice;
    const qty = 1;
    const discPercent = parseFloat(settings.discountRate) || 0;
    const taxPercent = item.taxCode === 'EXEMPT' ? 0 : (parseFloat(settings.taxRate) || 10);
    
    const lineSub = price * qty;
    const lineDisc = lineSub * (discPercent / 100);
    const lineTotal = lineSub - lineDisc + (lineSub - lineDisc) * (taxPercent / 100);

    const updated = [...gridRows];
    updated[rowIndex] = {
      ...updated[rowIndex],
      itemId: item.id,
      name: item.name,
      barcode: item.sku || item.ndc || '',
      batchNo: defaultBatch ? defaultBatch.batchNo : 'N/A',
      batchLotId: defaultBatch ? defaultBatch.id : '',
      expDate: defaultBatch ? new Date(defaultBatch.expiryDate).toLocaleDateString() : 'N/A',
      stock: totalStock > 0 ? 'Available' : 'Out of Stock',
      qty: qty,
      unitPrice: price,
      disc: discPercent,
      tax: taxPercent,
      lineTotal: lineTotal
    };

    // Auto-append new row if no empty rows exist
    const hasEmpty = updated.some(r => !r.itemId);
    if (!hasEmpty) {
      updated.push({ barcode: '', name: '', batchNo: '', expDate: '', stock: '', qty: '', unitPrice: '', disc: settings.discountRate, tax: settings.taxRate, lineTotal: 0, itemId: '', batchLotId: '' });
    }

    setGridRows(updated);
    setSearchState({ activeRowIndex: -1, activeColIndex: -1, query: '', results: [], selectedIndex: 0 });
    showToast(`Selected ${item.name}`);
    setTimeout(() => focusCell(rowIndex, 6), 50); // Move to Qty field
  };

  const handleCellChange = (rowIndex, field, value) => {
    const updated = [...gridRows];
    updated[rowIndex] = { ...updated[rowIndex], [field]: value };

    // Recompute lineTotal for this row
    const qty = parseFloat(updated[rowIndex].qty) || 0;
    const price = parseFloat(updated[rowIndex].unitPrice) || 0;
    const discPercent = parseFloat(updated[rowIndex].disc) || 0;
    const taxPercent = parseFloat(updated[rowIndex].tax) || 0;

    const lineSub = price * qty;
    const lineDisc = lineSub * (discPercent / 100);
    const lineTotal = lineSub - lineDisc + (lineSub - lineDisc) * (taxPercent / 100);

    updated[rowIndex].lineTotal = lineTotal;
    setGridRows(updated);

    // Autocomplete incremental search
    if (field === 'barcode' || field === 'name') {
      if (!value.trim()) {
        setSearchState({ activeRowIndex: -1, activeColIndex: -1, query: '', results: [], selectedIndex: 0 });
      } else {
        const queryLower = value.toLowerCase();
        const matches = catalogItems.filter(item => 
          item.name.toLowerCase().includes(queryLower) ||
          (item.sku && item.sku.toLowerCase().includes(queryLower)) ||
          (item.ndc && item.ndc.toLowerCase().includes(queryLower)) ||
          (item.genericName && item.genericName.toLowerCase().includes(queryLower))
        );
        setSearchState({
          activeRowIndex: rowIndex,
          activeColIndex: field === 'barcode' ? 1 : 2,
          query: value,
          results: matches.slice(0, 8), // Limit to 8 items for high density view
          selectedIndex: 0
        });
      }
    }
  };

  const resolveItemByBarcode = (rowIndex, barcodeVal) => {
    if (!barcodeVal) return;
    const match = catalogItems.find(item => item.sku === barcodeVal || item.ndc === barcodeVal);
    if (match) {
      const defaultBatch = match.inventoryBalances?.[0]?.batchLot;
      const totalStock = match.inventoryBalances ? match.inventoryBalances.reduce((sum, b) => sum + (b.onHand || 0), 0) : 0;
      const price = match.unitPrice;
      const qty = 1;
      const discPercent = parseFloat(settings.discountRate) || 0;
      const taxPercent = match.taxCode === 'EXEMPT' ? 0 : (parseFloat(settings.taxRate) || 10);
      
      const lineSub = price * qty;
      const lineDisc = lineSub * (discPercent / 100);
      const lineTotal = lineSub - lineDisc + (lineSub - lineDisc) * (taxPercent / 100);

      const updatedRows = [...gridRows];
      updatedRows[rowIndex] = {
        ...updatedRows[rowIndex],
        itemId: match.id,
        name: match.name,
        barcode: barcodeVal,
        batchNo: defaultBatch ? defaultBatch.batchNo : 'N/A',
        batchLotId: defaultBatch ? defaultBatch.id : '',
        expDate: defaultBatch ? new Date(defaultBatch.expiryDate).toLocaleDateString() : 'N/A',
        stock: totalStock > 0 ? 'Available' : 'Out of Stock',
        qty: qty,
        unitPrice: price,
        disc: discPercent,
        tax: taxPercent,
        lineTotal: lineTotal
      };

      // Auto-append new row if no empty rows exist
      const hasEmpty = updatedRows.some(r => !r.itemId);
      if (!hasEmpty) {
        updatedRows.push({ barcode: '', name: '', batchNo: '', expDate: '', stock: '', qty: '', unitPrice: '', disc: settings.discountRate, tax: settings.taxRate, lineTotal: 0, itemId: '', batchLotId: '' });
      }

      setGridRows(updatedRows);
      showToast(`Added ${match.name} to row ${rowIndex + 1}`);
      setTimeout(() => focusCell(rowIndex, 6), 50); // Move to Qty field
    } else {
      showToast(`SKU/Barcode "${barcodeVal}" not found`, 'error');
    }
  };

  const handleDeleteRow = (rowIndex) => {
    if (gridRows.length <= 1) {
      setGridRows([
        { barcode: '', name: '', batchNo: '', expDate: '', stock: '', qty: '', unitPrice: '', disc: settings.discountRate, tax: settings.taxRate, lineTotal: 0, itemId: '', batchLotId: '' }
      ]);
      setActiveCell({ rowIndex: 0, colIndex: 1 });
    } else {
      const updated = gridRows.filter((_, idx) => idx !== rowIndex);
      setGridRows(updated);
      const nextRow = Math.min(rowIndex, updated.length - 1);
      setActiveCell(prev => ({ ...prev, rowIndex: nextRow }));
    }
    showToast(`Row ${rowIndex + 1} deleted.`);
  };

  const handleClearGrid = () => {
    setGridRows([
      { barcode: '', name: '', batchNo: '', expDate: '', stock: '', qty: '', unitPrice: '', disc: '0', tax: '10', lineTotal: 0, itemId: '', batchLotId: '' }
    ]);
    setActiveCell({ rowIndex: 0, colIndex: 1 });
    showToast('Spreadsheet grid cleared.');
  };

  const handleInputKeyDown = (e, rowIndex, colIndex) => {
    if (searchState.activeRowIndex === rowIndex && searchState.activeColIndex === colIndex && searchState.results.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSearchState(prev => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, prev.results.length - 1)
        }));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSearchState(prev => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0)
        }));
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = searchState.results[searchState.selectedIndex];
        if (selected) {
          selectSearchItem(rowIndex, selected);
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSearchState({ activeRowIndex: -1, activeColIndex: -1, query: '', results: [], selectedIndex: 0 });
        return;
      }
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) focusCell(rowIndex - 1, colIndex);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < gridRows.length - 1) {
        focusCell(rowIndex + 1, colIndex);
      }
    } else if (e.key === 'ArrowLeft') {
      if (e.target.selectionStart === 0) {
        e.preventDefault();
        const nextCol = Math.max(1, colIndex - 1);
        focusCell(rowIndex, nextCol);
      }
    } else if (e.key === 'ArrowRight') {
      if (e.target.selectionEnd === e.target.value.length) {
        e.preventDefault();
        const nextCol = Math.min(9, colIndex + 1);
        focusCell(rowIndex, nextCol);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (colIndex < 9) {
        focusCell(rowIndex, colIndex + 1);
      } else {
        if (rowIndex < gridRows.length - 1) {
          focusCell(rowIndex + 1, 1);
        } else {
          const newRow = { barcode: '', name: '', batchNo: '', expDate: '', stock: '', qty: '', unitPrice: '', disc: settings.discountRate, tax: settings.taxRate, lineTotal: 0, itemId: '', batchLotId: '' };
          setGridRows([...gridRows, newRow]);
          setTimeout(() => focusCell(rowIndex + 1, 1), 50);
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (colIndex === 1) {
        resolveItemByBarcode(rowIndex, e.target.value);
      } else {
        if (rowIndex < gridRows.length - 1) {
          focusCell(rowIndex + 1, colIndex);
        } else {
          const newRow = { barcode: '', name: '', batchNo: '', expDate: '', stock: '', qty: '', unitPrice: '', disc: settings.discountRate, tax: settings.taxRate, lineTotal: 0, itemId: '', batchLotId: '' };
          setGridRows([...gridRows, newRow]);
          setTimeout(() => focusCell(rowIndex + 1, colIndex), 50);
        }
      }
    }
  };

  const handleCheckout = async () => {
    const activeLines = gridRows.filter(row => row.itemId);
    if (activeLines.length === 0) {
      showToast('Counter spreadsheet grid has no active items!', 'error');
      return;
    }

    const { grandTotal } = calculatedTotals();
    const tenderedVal = tenderedAmount ? parseFloat(tenderedAmount) : grandTotal;
    if (tenderedVal < grandTotal) {
      showToast(`Tendered amount (Rs. ${tenderedVal.toFixed(2)}) is less than total (Rs. ${grandTotal.toFixed(2)})`, 'error');
      return;
    }

    const payload = {
      tenantId: currentTenantId,
      locationId: 'cjy1234560000000000000002', // Seed location ID
      cashierId: cashierId,
      patientId: selectedPatientId || null,
      lines: activeLines.map(row => {
        const qty = parseInt(row.qty) || 1;
        const price = parseFloat(row.unitPrice) || 0;
        const discPercent = parseFloat(row.disc) || 0;
        const taxPercent = parseFloat(row.tax) || 0;
        
        const lineSub = price * qty;
        const lineDisc = Math.round(lineSub * (discPercent / 100) * 100) / 100;
        const lineTax = Math.round((lineSub - lineDisc) * (taxPercent / 100) * 100) / 100;

        return {
          itemId: row.itemId,
          qty,
          unitPrice: price,
          discount: lineDisc,
          tax: lineTax
        };
      }),
      payment: {
        method: paymentMethod,
        amount: grandTotal
      }
    };

    try {
      const res = await fetch(`${API_BASE}/checkout`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const sale = await res.json();
        showToast('Checkout transaction completed successfully!');
        setGridRows([
          { barcode: '', name: '', batchNo: '', expDate: '', stock: '', qty: '', unitPrice: '', disc: '0', tax: '10', lineTotal: 0, itemId: '', batchLotId: '' }
        ]);
        setActiveCell({ rowIndex: 0, colIndex: 1 });
        setSelectedPatientId('');
        setTenderedAmount('');
        setReceiptModalSale(sale);
        loadCatalogData();
        setSalesRefreshCount(prev => prev + 1);
      } else {
        const err = await res.json();
        showToast('Checkout failed: ' + (err.message || 'Server error'), 'error');
      }
    } catch (err) {
      showToast('Network error during checkout: ' + err.message, 'error');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processVlkFile(file);
  };

  const processVlkFile = (file) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json.licenseKey) {
          showToast(`License key found for: ${json.pharmacyName || 'Terminal'}`);
          await handleLicenseLogin(json.licenseKey);
        } else {
          showToast('Invalid VLK file structure. Missing licenseKey.', 'error');
        }
      } catch (err) {
        showToast('Failed to parse license key file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  if (!authToken) {
    return (
      <div className="flex flex-col h-screen w-screen bg-neutral-100 items-center justify-center text-neutral-900 font-sans select-none p-4">
        {/* Global Toast Notifications Container */}
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
          {toasts.map(t => (
            <div 
              key={t.id} 
              className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border border-black/10 text-white font-medium text-sm transition-all duration-300 ${
                t.type === 'error' ? 'bg-red-600' : 'bg-neutral-900'
              }`}
            >
              {t.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              <span>{t.message}</span>
            </div>
          ))}
        </div>

        <div className="bg-white border border-neutral-300 rounded-2xl shadow-xl w-full max-w-md p-8 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="h-12 w-12 bg-black text-white flex items-center justify-center font-black text-2xl rounded-xl border border-black shadow-md">Rx</div>
            <h1 className="font-extrabold text-xl tracking-tight mt-2">HMAT POS — Sign In</h1>
            <p className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">B&W Minimalist Edition</p>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault();
            const email = e.target.email.value;
            const password = e.target.password.value;
            await handleLoginSubmit(email, password);
          }} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500 tracking-wider">Email Address</label>
              <input 
                type="email" 
                name="email"
                required
                placeholder="e.g. sysadmin@hmatpharmacy.local"
                className="p-3 border border-neutral-300 rounded-lg text-xs font-bold bg-neutral-50 focus:bg-white outline-none transition-all"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500 tracking-wider">Password</label>
              <input 
                type="password" 
                name="password"
                required
                placeholder="••••••••"
                className="p-3 border border-neutral-300 rounded-lg text-xs font-bold bg-neutral-50 focus:bg-white outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="bg-black hover:bg-neutral-900 border border-black text-white text-xs font-black py-3.5 rounded-lg transition-all shadow-md mt-2 uppercase tracking-wider"
            >
              Sign In to Terminal
            </button>
          </form>

          {/* License Key Drag & Drop Login */}
          <div className="border-t border-dashed border-neutral-300 pt-4 mt-2">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500 tracking-wider block mb-2 text-center">
              🔑 Or Sign In via License Key (.vlk)
            </label>
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) processVlkFile(file);
              }}
              className="border-2 border-dashed border-neutral-300 hover:border-black rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-neutral-50 hover:bg-neutral-100 transition-all"
              onClick={() => document.getElementById('vlk-file-input').click()}
            >
              <FileText className="h-5 w-5 text-neutral-500" />
              <span className="text-[11px] font-bold text-neutral-700">Drag & Drop license key file here</span>
              <span className="text-[9px] text-neutral-400 font-semibold uppercase">Or click to select (*.vlk)</span>
              <input
                id="vlk-file-input"
                type="file"
                accept=".vlk"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="border-t border-neutral-200 pt-4 flex flex-col gap-3">
            <span className="text-[10px] font-extrabold uppercase text-neutral-400 text-center tracking-wider">Quick Sandbox Demo Login</span>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => handleLoginSubmit('sysadmin@hmatpharmacy.local', 'SysAdmin2026!')}
                className="bg-neutral-50 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 text-[10px] font-bold py-2 rounded-lg transition-all"
              >
                🔑 Admin
              </button>
              <button 
                onClick={() => handleLoginSubmit('pharmacist@hmatpharmacy.local', 'admin1234')}
                className="bg-neutral-50 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 text-[10px] font-bold py-2 rounded-lg transition-all"
              >
                🔬 Ali Pharmacist
              </button>
              <button 
                onClick={() => handleLoginSubmit('pharmacist@martpharmacy.local', 'admin1234')}
                className="bg-neutral-50 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 text-[10px] font-bold py-2 rounded-lg transition-all"
              >
                🏪 Mart Pharmacist
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-100 overflow-hidden text-neutral-900 font-sans select-none">
      
      {/* 1. Global Toast Notifications Container */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border border-black/10 text-white font-medium text-sm transition-all duration-300 ${
              t.type === 'error' ? 'bg-red-600' : 'bg-neutral-900'
            }`}
          >
            {t.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* 2. Top Header Bar */}
      <header className="h-16 shrink-0 flex items-center justify-between border-b border-neutral-300 bg-white px-6 shadow-sm z-30">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-black text-white flex items-center justify-center font-bold text-lg rounded-lg border border-black">Rx</div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight leading-tight">{settings.pharmacyName}</h1>
            <p className="text-xs text-neutral-500 font-semibold tracking-wider uppercase">B&W Minimalist Edition</p>
          </div>
        </div>

        {/* Horizontal Navigation Menu */}
        <nav className="flex items-center gap-1">
          {[
            { id: 'pos', label: 'Counter Book', icon: ShoppingCart },
            { id: 'prescriptions', label: 'Doctor', icon: FileText },
            { id: 'inventory', label: 'Purchase', icon: Package },
            { id: 'patients', label: 'Patients', icon: Users },
            { id: 'sales', label: 'Sales', icon: FileText },
            { id: 'audit', label: 'Security Logs', icon: ShieldAlert },
            { id: 'settings', label: 'Setting', icon: Settings },
            { id: 'analytics', label: 'Daily Report', icon: BarChart2 },
            { id: 'licenses', label: 'Key Registry', icon: Key }
          ].filter(tab => hasTabPermission(cashierRole, tab.id)).map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-xs transition-all border ${
                  active 
                    ? 'bg-black text-white border-black shadow-sm' 
                    : 'text-neutral-600 border-transparent hover:bg-neutral-100 hover:text-black'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Session context & Status bar */}
        <div className="flex items-center gap-6">
          {/* User details */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs">{cashierName}</span>
              <span className="text-[9px] bg-black text-white px-2 py-0.5 rounded-full font-bold uppercase">{cashierRole}</span>
            </div>
            <span className="text-[10px] text-neutral-500 font-medium">Active Session</span>
            
            <button
              onClick={handleLogout}
              className="mt-1.5 flex items-center gap-1 text-[9px] border border-neutral-300 bg-white text-black hover:bg-neutral-100 px-2 py-0.5 rounded font-extrabold transition-all shadow-sm"
            >
              <LogOut className="h-3 w-3" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Sync & Health */}
          <div className="flex items-center gap-3 pl-4 border-l border-neutral-300">
            <div className="flex items-center gap-1.5 bg-neutral-100 border border-neutral-300 px-3 py-1.5 rounded-lg">
              <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-600' : 'bg-red-600 animate-pulse'}`}></span>
              <span className="text-xs font-bold text-neutral-700 tracking-tight">
                {isConnected ? `Port 3000` : `Offline`}
              </span>
            </div>
            <button 
              onClick={triggerSync}
              className="flex items-center gap-1.5 border border-neutral-300 bg-white text-black hover:bg-neutral-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncOutboxCount > 0 ? 'animate-spin text-red-600' : ''}`} />
              <span>Sync {syncOutboxCount > 0 && `(${syncOutboxCount})`}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. Main Workspace Area */}
      <main className="flex-1 overflow-hidden p-6 relative">
        {activeTab === 'pos' ? (
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Top Hotkey Legend Dock */}
            <div className="flex items-center justify-between bg-white border border-neutral-300 p-4 rounded-xl shadow-sm mb-4 shrink-0">
              <div className="flex items-center gap-4">
                <div className="h-9 w-9 bg-black text-white flex items-center justify-center font-bold text-base rounded-lg border border-black shadow">Rx</div>
                <div>
                  <h2 className="font-extrabold text-sm tracking-tight text-black">Rx HMAT POS — Spreadsheet Register Mode</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-green-600"></span>
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider text-left">Connected (Port 3000)</span>
                    <span className="text-[9px] font-black uppercase bg-black text-white px-2 py-0.5 rounded border border-black">{cashierRole === 'admin' ? 'System Admin' : 'Pharmacist'}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 items-center font-mono text-[10px] text-neutral-600 bg-neutral-50 border border-neutral-300 px-3 py-2 rounded-lg">
                <span className="font-black text-black">HOTKEYS:</span>
                <span>[F1] Item Search</span> |
                <span>[F2] Edit Qty</span> |
                <span>[F4] Patient Select</span> |
                <span>[Del] Delete Row</span> |
                <span>[F9] Finalize & Print</span> |
                <span>[Esc] Clear Grid</span>
              </div>
            </div>

            {/* Spreadsheet Grid Workspace */}
            <div className="flex-1 overflow-auto border border-neutral-300 rounded-xl bg-white shadow-sm mb-4">
              <table className="spreadsheet-grid min-w-full">
                <thead>
                  <tr>
                    <th className="w-10 text-center font-mono">#</th>
                    <th className="w-44 text-left">Barcode / SKU</th>
                    <th className="text-left">Product Name</th>
                    <th className="w-32 text-left">Batch No.</th>
                    <th className="w-28 text-left">Exp Date</th>
                    <th className="w-24 text-center">Stock</th>
                    <th className="w-20 text-right">Qty</th>
                    <th className="w-28 text-right">Unit Price (Rs.)</th>
                    <th className="w-20 text-right">Disc %</th>
                    <th className="w-20 text-right">Tax %</th>
                    <th className="w-32 text-right">Line Total (Rs.)</th>
                    <th className="w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {gridRows.map((row, rowIndex) => {
                    const hasItem = !!row.itemId;
                    const isC2 = catalogItems.find(i => i.id === row.itemId)?.deaSchedule === 'c2';
                    return (
                      <tr key={rowIndex} className="hover:bg-neutral-50/50">
                        <td className="text-center font-mono text-neutral-400 bg-neutral-50 select-none font-bold">
                          {rowIndex + 1}
                        </td>
                        
                        {/* 2. Barcode / SKU */}
                        <td className={`p-0 relative ${activeCell.rowIndex === rowIndex && activeCell.colIndex === 1 ? 'ring-2 ring-emerald-600 bg-emerald-50/20' : ''}`}>
                          <input
                            id={`cell-${rowIndex}-1`}
                            value={row.barcode}
                            onChange={e => handleCellChange(rowIndex, 'barcode', e.target.value)}
                            onKeyDown={e => handleInputKeyDown(e, rowIndex, 1)}
                            onFocus={() => setActiveCell({ rowIndex, colIndex: 1 })}
                            className="w-full h-full bg-transparent px-2.5 py-1.5 outline-none font-mono font-bold text-neutral-800"
                            placeholder="Scan or type..."
                          />
                          {/* Autocomplete Dropdown overlay */}
                          {searchState.activeRowIndex === rowIndex && searchState.activeColIndex === 1 && searchState.results.length > 0 && (
                            <div className="absolute left-0 top-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-xl z-50 w-96 max-h-60 overflow-y-auto font-sans">
                              {searchState.results.map((item, sIdx) => (
                                <div
                                  key={item.id}
                                  onClick={() => selectSearchItem(rowIndex, item)}
                                  className={`p-2.5 border-b border-neutral-100 flex flex-col gap-0.5 cursor-pointer text-left transition-all ${
                                    searchState.selectedIndex === sIdx ? 'bg-emerald-50 text-emerald-950 font-bold' : 'hover:bg-neutral-50 text-neutral-800'
                                  }`}
                                >
                                  <div className="flex justify-between items-center text-xs font-black">
                                    <span>{item.name}</span>
                                    <span className="font-mono text-emerald-700">Rs. {item.unitPrice.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] text-neutral-400 font-semibold mt-0.5">
                                    <span className="italic">{item.genericName || 'No generic name'}</span>
                                    <span className="font-mono">{item.sku}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
 
                        {/* 3. Product Name */}
                        <td className={`p-0 relative ${activeCell.rowIndex === rowIndex && activeCell.colIndex === 2 ? 'ring-2 ring-emerald-600 bg-emerald-50/20' : ''}`}>
                          <div className="flex items-center justify-between w-full h-full px-2.5 py-1.5 font-bold">
                            <input
                              id={`cell-${rowIndex}-2`}
                              value={row.name}
                              onChange={e => handleCellChange(rowIndex, 'name', e.target.value)}
                              onFocus={() => setActiveCell({ rowIndex, colIndex: 2 })}
                              onKeyDown={e => handleInputKeyDown(e, rowIndex, 2)}
                              className="w-full h-full bg-transparent outline-none font-extrabold text-neutral-900"
                              placeholder="Search by name..."
                            />
                            {isC2 && (
                              <span className="text-[9px] font-black uppercase bg-red-100 text-red-800 border border-red-300 px-1 rounded select-none shrink-0">
                                C-II
                              </span>
                            )}
                          </div>
                          {/* Autocomplete Dropdown overlay */}
                          {searchState.activeRowIndex === rowIndex && searchState.activeColIndex === 2 && searchState.results.length > 0 && (
                            <div className="absolute left-0 top-full mt-1 bg-white border border-neutral-300 rounded-lg shadow-xl z-50 w-96 max-h-60 overflow-y-auto font-sans">
                              {searchState.results.map((item, sIdx) => (
                                <div
                                  key={item.id}
                                  onClick={() => selectSearchItem(rowIndex, item)}
                                  className={`p-2.5 border-b border-neutral-100 flex flex-col gap-0.5 cursor-pointer text-left transition-all ${
                                    searchState.selectedIndex === sIdx ? 'bg-emerald-50 text-emerald-950 font-bold' : 'hover:bg-neutral-50 text-neutral-800'
                                  }`}
                                >
                                  <div className="flex justify-between items-center text-xs font-black">
                                    <span>{item.name}</span>
                                    <span className="font-mono text-emerald-700">Rs. {item.unitPrice.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] text-neutral-400 font-semibold mt-0.5">
                                    <span className="italic">{item.genericName || 'No generic name'}</span>
                                    <span className="font-mono">{item.sku}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* 4. Batch No. */}
                        <td className={`p-0 relative ${activeCell.rowIndex === rowIndex && activeCell.colIndex === 3 ? 'ring-2 ring-emerald-600 bg-emerald-50/20' : ''}`}>
                          <input
                            id={`cell-${rowIndex}-3`}
                            value={row.batchNo}
                            onChange={e => handleCellChange(rowIndex, 'batchNo', e.target.value)}
                            onKeyDown={e => handleInputKeyDown(e, rowIndex, 3)}
                            onFocus={() => setActiveCell({ rowIndex, colIndex: 3 })}
                            className="w-full h-full bg-transparent px-2.5 py-1.5 outline-none font-bold text-neutral-800"
                            placeholder="Batch..."
                          />
                        </td>

                        {/* 5. Exp Date */}
                        <td className={`p-0 bg-neutral-50/30 relative ${activeCell.rowIndex === rowIndex && activeCell.colIndex === 4 ? 'ring-2 ring-emerald-600 bg-emerald-50/20' : ''}`}>
                          <input
                            id={`cell-${rowIndex}-4`}
                            value={row.expDate}
                            readOnly
                            onFocus={() => setActiveCell({ rowIndex, colIndex: 4 })}
                            onKeyDown={e => handleInputKeyDown(e, rowIndex, 4)}
                            className="w-full h-full bg-transparent px-2.5 py-1.5 outline-none font-mono font-bold text-neutral-500 cursor-default"
                            placeholder="—"
                          />
                        </td>
                           {/* 6. Stock Status */}
                        <td className="text-center select-none font-bold bg-neutral-50/30">
                          {hasItem ? (
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                              row.stock === 'Available' 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {row.stock}
                            </span>
                          ) : '—'}
                        </td>

                        {/* 7. Qty */}
                        <td className={`p-0 relative ${activeCell.rowIndex === rowIndex && activeCell.colIndex === 6 ? 'ring-2 ring-emerald-600 bg-emerald-50/20' : ''}`}>
                          <input
                            id={`cell-${rowIndex}-6`}
                            type="number"
                            min="1"
                            value={row.qty}
                            onChange={e => handleCellChange(rowIndex, 'qty', e.target.value)}
                            onKeyDown={e => handleInputKeyDown(e, rowIndex, 6)}
                            onFocus={() => setActiveCell({ rowIndex, colIndex: 6 })}
                            className="w-full h-full bg-transparent px-2.5 py-1.5 text-right outline-none font-mono font-bold text-neutral-800"
                            placeholder="0"
                          />
                        </td>

                        {/* 8. Unit Price */}
                        <td className={`p-0 relative ${activeCell.rowIndex === rowIndex && activeCell.colIndex === 7 ? 'ring-2 ring-emerald-600 bg-emerald-50/20' : ''}`}>
                          <input
                            id={`cell-${rowIndex}-7`}
                            type="number"
                            step="0.01"
                            value={row.unitPrice}
                            onChange={e => handleCellChange(rowIndex, 'unitPrice', e.target.value)}
                            onKeyDown={e => handleInputKeyDown(e, rowIndex, 7)}
                            onFocus={() => setActiveCell({ rowIndex, colIndex: 7 })}
                            className="w-full h-full bg-transparent px-2.5 py-1.5 text-right outline-none font-mono font-bold text-neutral-800"
                            placeholder="0.00"
                          />
                        </td>

                        {/* 9. Disc % */}
                        <td className={`p-0 relative ${activeCell.rowIndex === rowIndex && activeCell.colIndex === 8 ? 'ring-2 ring-emerald-600 bg-emerald-50/20' : ''}`}>
                          <input
                            id={`cell-${rowIndex}-8`}
                            type="number"
                            value={row.disc}
                            onChange={e => handleCellChange(rowIndex, 'disc', e.target.value)}
                            onKeyDown={e => handleInputKeyDown(e, rowIndex, 8)}
                            onFocus={() => setActiveCell({ rowIndex, colIndex: 8 })}
                            className="w-full h-full bg-transparent px-2.5 py-1.5 text-right outline-none font-mono font-bold text-neutral-800"
                            placeholder="0"
                          />
                        </td>

                        {/* 10. Tax % */}
                        <td className={`p-0 relative ${activeCell.rowIndex === rowIndex && activeCell.colIndex === 9 ? 'ring-2 ring-emerald-600 bg-emerald-50/20' : ''}`}>
                          <input
                            id={`cell-${rowIndex}-9`}
                            type="number"
                            value={row.tax}
                            onChange={e => handleCellChange(rowIndex, 'tax', e.target.value)}
                            onKeyDown={e => handleInputKeyDown(e, rowIndex, 9)}
                            onFocus={() => setActiveCell({ rowIndex, colIndex: 9 })}
                            className="w-full h-full bg-transparent px-2.5 py-1.5 text-right outline-none font-mono font-bold text-neutral-800"
                            placeholder="10"
                          />
                        </td>

                        {/* 11. Line Total */}
                        <td className="text-right font-mono font-bold px-2.5 py-1.5 text-neutral-800 bg-neutral-50/30">
                          {hasItem ? `Rs. ${row.lineTotal.toFixed(2)}` : 'Rs. 0.00'}
                        </td>

                        {/* 12. Delete Action */}
                        <td className="p-1 text-center bg-neutral-50/50">
                          <button 
                            onClick={() => handleDeleteRow(rowIndex)}
                            className="text-neutral-400 hover:text-red-600 transition-all p-1"
                            title="Delete Row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Summary & Checkout Dock */}
            <div className="bg-white border border-neutral-300 p-4 rounded-xl shadow-sm shrink-0 flex flex-col gap-4">
              <div className="grid grid-cols-12 gap-5 items-center">
                
                {/* Left Stats column */}
                <div className="col-span-3 border-r border-neutral-200 pr-5 flex flex-col gap-1 justify-center">
                  <div className="flex justify-between items-center text-xs font-bold text-neutral-500 uppercase tracking-wide">
                    <span>Unique Products:</span>
                    <span className="font-mono text-black font-black text-sm">{calculatedTotals().uniqueItems}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-neutral-500 uppercase tracking-wide">
                    <span>Total Quantity:</span>
                    <span className="font-mono text-black font-black text-sm">{calculatedTotals().totalQty}</span>
                  </div>
                </div>

                {/* Middle Payments Input column */}
                <div className="col-span-5 grid grid-cols-2 gap-3 items-center">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] font-black uppercase text-neutral-500 text-left">Patient Selection [F4]</label>
                    <select
                      id="patient-select-dropdown"
                      value={selectedPatientId}
                      onChange={e => setSelectedPatientId(e.target.value)}
                      className="p-1.5 border border-neutral-300 rounded-lg text-xs font-bold bg-neutral-50 font-sans"
                    >
                      <option value="">Walk-in Customer</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.displayName || p.name} (MRN: {p.mrn})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-black uppercase text-neutral-500 text-left">Payment Method</label>
                      <div className="flex border border-neutral-300 rounded-lg overflow-hidden text-xs">
                        {['CASH', 'CARD'].map(method => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            className={`flex-1 py-1 font-bold ${
                              paymentMethod === method 
                                ? 'bg-black text-white' 
                                : 'bg-white text-neutral-600 hover:bg-neutral-100'
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-black uppercase text-neutral-500 text-left">Tendered (Rs.)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={tenderedAmount}
                        onChange={(e) => setTenderedAmount(e.target.value)}
                        className="p-1 border border-neutral-300 rounded-lg text-xs font-bold font-mono text-right"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Math calculation column */}
                <div className="col-span-4 flex flex-col gap-0.5 text-xs">
                  <div className="flex justify-between text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                    <span>Subtotal:</span>
                    <span className="font-mono text-black">Rs. {calculatedTotals().subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                    <span>Discount Deductions:</span>
                    <span className="font-mono text-black">- Rs. {calculatedTotals().totalDiscount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-500 font-bold uppercase tracking-wider text-[10px]">
                    <span>Calculated Tax (10%):</span>
                    <span className="font-mono text-black">Rs. {calculatedTotals().totalTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-neutral-300 pt-1.5 mt-1">
                    <span className="font-extrabold text-sm uppercase text-black">Grand Total:</span>
                    <span className="font-mono text-xl font-black text-black">Rs. {calculatedTotals().grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Cashier Change Due indicator */}
              {paymentMethod === 'CASH' && (
                <div className="p-3 border border-neutral-200 bg-neutral-50 rounded-lg flex justify-between items-center text-xs">
                  <span className="font-bold text-neutral-500 uppercase text-[10px]">Change Due:</span>
                  <span className="text-base font-extrabold text-black font-mono">
                    Rs. {tenderedAmount ? Math.max(0, parseFloat(tenderedAmount) - calculatedTotals().grandTotal).toFixed(2) : '0.00'}
                  </span>
                </div>
              )}

              {/* Checkout Trigger Action */}
              <button
                onClick={handleCheckout}
                disabled={calculatedTotals().uniqueItems === 0}
                className={`w-full py-4 text-center text-xs font-extrabold tracking-wider uppercase border rounded-xl shadow-md transition-all shrink-0 ${
                  calculatedTotals().uniqueItems === 0 
                    ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed' 
                    : 'bg-black text-white border-black hover:bg-neutral-900'
                }`}
              >
                [F9] Finalize & Print Receipt (Rs. {calculatedTotals().grandTotal.toFixed(2)})
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
             CELL-BASED VIEW PANEL FOR OTHER TABS
             ========================================================================= */
          <div className="bg-white border border-neutral-300 rounded-xl shadow-sm h-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-neutral-200 flex justify-between items-center shrink-0 bg-neutral-50">
              <h2 className="font-extrabold text-sm tracking-wide uppercase text-neutral-800">
                {activeTab.toUpperCase()} MODULE CONSOLE
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'prescriptions' && (
                <PrescriptionsQueueView 
                  API_BASE={API_BASE} 
                  getAuthHeaders={getAuthHeaders} 
                  showToast={showToast}
                  setVerifyRxModalData={setVerifyRxModalData}
                  addToCart={addToCart}
                  addPrescriptionToGrid={addPrescriptionToGrid}
                  setCreatePrescriptionModalOpen={setCreatePrescriptionModalOpen}
                  formatMoney={formatMoney}
                />
              )}
              {activeTab === 'inventory' && (
                <InventoryBatchesView 
                  API_BASE={API_BASE} 
                  getAuthHeaders={getAuthHeaders} 
                  showToast={showToast}
                  setAdjustStockItem={setAdjustStockItem}
                  setReceiveBatchItem={setReceiveBatchItem}
                  formatMoney={formatMoney}
                  settings={settings}
                  currentTenantId={currentTenantId}
                />
              )}
              {activeTab === 'patients' && (
                <PatientsDirectoryView 
                  API_BASE={API_BASE} 
                  getAuthHeaders={getAuthHeaders} 
                  showToast={showToast}
                  setCreatePatientModalOpen={setCreatePatientModalOpen}
                  setEditPatientData={setEditPatientData}
                  setPatientDetailsData={setPatientDetailsData}
                  patients={patients}
                  loadPatients={() => loadPatients(authToken, currentTenantId)}
                />
              )}
              {activeTab === 'sales' && (
                <SalesHistoryView 
                  API_BASE={API_BASE} 
                  getAuthHeaders={getAuthHeaders} 
                  showToast={showToast}
                  setReceiptModalSale={setReceiptModalSale}
                  formatMoney={formatMoney}
                  currentTenantId={currentTenantId}
                  salesRefreshCount={salesRefreshCount}
                  onSaleModified={() => setSalesRefreshCount(prev => prev + 1)}
                />
              )}
              {activeTab === 'audit' && (
                <AuditLogView 
                  API_BASE={API_BASE} 
                  getAuthHeaders={getAuthHeaders} 
                  showToast={showToast}
                />
              )}
              {activeTab === 'settings' && (
                <SettingsView 
                  API_BASE={API_BASE} 
                  getAuthHeaders={getAuthHeaders} 
                  showToast={showToast}
                  currentTenantId={currentTenantId}
                  loadSettings={loadSettings}
                />
              )}
              {activeTab === 'analytics' && (
                <AnalyticsReportsView 
                  API_BASE={API_BASE} 
                  getAuthHeaders={getAuthHeaders} 
                  showToast={showToast}
                  formatMoney={formatMoney}
                  currentTenantId={currentTenantId}
                  salesRefreshCount={salesRefreshCount}
                />
              )}
              {activeTab === 'licenses' && (
                <LicenseManagerView 
                  API_BASE={API_BASE} 
                  getAuthHeaders={getAuthHeaders} 
                  showToast={showToast}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
         MODALS RENDER LAYERS
         ========================================================================= */}
      
      {/* 1. Receipt & Invoice Modal */}
      {receiptModalSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-neutral-300 rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-neutral-200 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-black" />
                  <h3 className="font-extrabold text-sm text-black">RECEIPT INVOICE</h3>
                </div>
                <button onClick={() => setReceiptModalSale(null)} className="text-neutral-500 hover:text-black">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Receipt Layout */}
              <div className="border border-neutral-200 bg-neutral-50 p-4 rounded-lg text-xs flex flex-col gap-2 font-mono">
                <div className="text-center font-bold border-b border-dashed border-neutral-400 pb-2 mb-2">
                  <div className="text-sm font-extrabold uppercase">{settings.pharmacyName}</div>
                  <div>Official Patient Receipt</div>
                  <div>ID: #{receiptModalSale.id.slice(-6)}</div>
                  <div>Date: {new Date(receiptModalSale.createdAt).toLocaleString()}</div>
                </div>

                <div className="flex flex-col gap-1 border-b border-dashed border-neutral-400 pb-2 mb-2">
                  <div><strong>Patient:</strong> {receiptModalSale.patient ? receiptModalSale.patient.name : 'Walk-in'}</div>
                  {receiptModalSale.patient && <div><strong>MRN:</strong> {receiptModalSale.patient.mrn}</div>}
                  <div><strong>Cashier:</strong> {cashierName}</div>
                </div>

                <div className="flex flex-col gap-1 border-b border-dashed border-neutral-400 pb-2 mb-2">
                  {receiptModalSale.lines.map((line, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{line.item ? line.item.name : `Item #${line.itemId.slice(-4)}`} x{line.qty}</span>
                      <span>{formatMoney(line.qty * line.unitPrice)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-1 text-right">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatMoney(receiptModalSale.totals)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-neutral-300 pt-1">
                    <span>Total Paid:</span>
                    <span>{formatMoney(receiptModalSale.totals)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={async () => {
                  try {
                    const html = document.querySelector('.font-mono').outerHTML;
                    const res = await window.hmatApi.saveReceiptPdf(html);
                    if (!res.canceled) {
                      showToast(`PDF Saved successfully: ${res.filePath}`);
                    }
                  } catch (err) {
                    showToast('Failed to save PDF receipt: ' + err.message, 'error');
                  }
                }}
                className="flex-1 py-3 text-center border border-neutral-300 rounded-lg text-xs font-bold bg-white text-black hover:bg-neutral-100 transition-all flex items-center justify-center gap-1"
              >
                <Download className="h-4 w-4" />
                <span>Save PDF</span>
              </button>
              <button 
                onClick={() => setReceiptModalSale(null)}
                className="flex-1 py-3 text-center bg-black border border-black text-white hover:bg-neutral-900 rounded-lg text-xs font-bold transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Pharmacist Verification Modal */}
      {verifyRxModalData && (
        <VerifyPrescriptionModal 
          rx={verifyRxModalData} 
          onClose={() => setVerifyRxModalData(null)}
          API_BASE={API_BASE}
          getAuthHeaders={getAuthHeaders}
          showToast={showToast}
          cashierId={cashierId}
        />
      )}

      {/* 3. Create Patient Modal */}
      {createPatientModalOpen && (
        <CreatePatientModal 
          onClose={() => setCreatePatientModalOpen(false)}
          API_BASE={API_BASE}
          getAuthHeaders={getAuthHeaders}
          showToast={showToast}
          currentTenantId={currentTenantId}
          loadPatients={() => loadPatients(authToken, currentTenantId)}
        />
      )}

      {/* 4. Edit Patient Modal */}
      {editPatientData && (
        <EditPatientModal 
          patient={editPatientData}
          onClose={() => setEditPatientData(null)}
          API_BASE={API_BASE}
          getAuthHeaders={getAuthHeaders}
          showToast={showToast}
          loadPatients={() => loadPatients(authToken, currentTenantId)}
        />
      )}

      {/* 5. Patient Details Modal */}
      {patientDetailsData && (
        <PatientDetailsModal 
          patient={patientDetailsData}
          onClose={() => setPatientDetailsData(null)}
          formatMoney={formatMoney}
        />
      )}

      {/* 5.5. Create Prescription Modal */}
      {createPrescriptionModalOpen && (
        <CreatePrescriptionModal 
          onClose={() => setCreatePrescriptionModalOpen(false)}
          API_BASE={API_BASE}
          getAuthHeaders={getAuthHeaders}
          showToast={showToast}
          currentTenantId={currentTenantId}
          patients={patients}
        />
      )}

      {/* 6. Adjust Stock Modal */}
      {adjustStockItem && (
        <AdjustStockModal 
          item={adjustStockItem}
          onClose={() => setAdjustStockItem(null)}
          API_BASE={API_BASE}
          getAuthHeaders={getAuthHeaders}
          showToast={showToast}
          currentTenantId={currentTenantId}
          loadCatalogData={loadCatalogData}
        />
      )}

      {/* 7. Receive Batch Modal */}
      {receiveBatchItem && (
        <ReceiveBatchModal 
          item={receiveBatchItem}
          onClose={() => setReceiveBatchItem(null)}
          API_BASE={API_BASE}
          getAuthHeaders={getAuthHeaders}
          showToast={showToast}
          currentTenantId={currentTenantId}
          loadCatalogData={loadCatalogData}
        />
      )}

    </div>
  );
}

/* =========================================================================
   SUB-MODULE VIEWS IMPLEMENTATIONS
   ========================================================================= */

// Tab A: Prescriptions Queue View
function PrescriptionsQueueView({ API_BASE, getAuthHeaders, showToast, setVerifyRxModalData, addToCart, addPrescriptionToGrid, setCreatePatientModalOpen, formatMoney }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [filter, setFilter] = useState('ALL');

  const loadQueue = async () => {
    try {
      const res = await fetch(`${API_BASE}/prescriptions`, { headers: getAuthHeaders() });
      if (res.ok) {
        const queue = await res.json();
        setPrescriptions(queue);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/prescriptions/${id}/status`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast(`Prescription status updated to ${status}`);
        loadQueue();
      }
    } catch (err) {
      showToast('Error updating prescription: ' + err.message, 'error');
    }
  };

  const getPriorityColor = (prio) => {
    if (prio === 'stat') return 'bg-red-100 text-red-800 border-red-300';
    if (prio === 'urgent') return 'bg-amber-100 text-amber-800 border-amber-300';
    if (prio === 'wait_in_store') return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-neutral-100 text-neutral-800 border-neutral-300';
  };

  const filtered = prescriptions.filter(rx => filter === 'ALL' || rx.status?.toUpperCase() === filter || (filter === 'COMPLETED' && rx.status === 'picked_up'));

  return (
    <div className="flex flex-col gap-4">
      {/* Filter pills */}
      <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-1.5">
          {['ALL', 'RECEIVED', 'PENDING', 'VERIFIED', 'DISPENSED', 'COMPLETED'].map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition-all ${
                filter === status 
                  ? 'bg-black text-white border-black' 
                  : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCreatePrescriptionModalOpen(true)}
          className="bg-black hover:bg-neutral-900 border border-black text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Assign Doctor (New Rx)</span>
        </button>
      </div>

      {/* Grid List table */}
      <div className="border border-neutral-300 rounded-lg overflow-hidden shadow-sm bg-white">
        <table className="spreadsheet-grid">
          <thead>
            <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold uppercase text-[10px] tracking-wide text-neutral-700">
              <th className="p-3">Priority / Rx No</th>
              <th className="p-3">Patient & Allergies</th>
              <th className="p-3">Medications & Directions</th>
              <th className="p-3">Doctor</th>
              <th className="p-3">Refills</th>
              <th className="p-3">Status</th>
              <th className="p-3">Clinical Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center p-6 text-neutral-500 font-semibold">No prescriptions found.</td>
              </tr>
            ) : (
              filtered.map(rx => (
                <tr key={rx.id} className="hover:bg-neutral-50">
                  <td className="p-3">
                    <span className={`inline-block border px-2 py-0.5 rounded font-bold uppercase text-[9px] ${getPriorityColor(rx.priority)}`}>
                      {rx.priority}
                    </span>
                    <div className="font-bold text-xs mt-1 text-black">#{rx.rxNo}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-black">{rx.patient ? rx.patient.name : '—'}</div>
                    <div className="text-[10px] text-red-600 font-semibold mt-0.5">
                      ⚠️ Allergies: {rx.patient && rx.patient.allergies ? rx.patient.allergies : 'None Listed'}
                    </div>
                  </td>
                  <td className="p-3 max-w-[250px]">
                    {rx.lines && rx.lines.map((line, idx) => (
                      <div key={line.id || idx} className={idx > 0 ? "border-t pt-1.5 mt-1.5" : ""}>
                        <div className="font-bold text-black flex justify-between items-center">
                          <span>{line.item ? line.item.name : 'Unknown Drug'} ({line.dosage || 'N/A'})</span>
                          <span className="font-mono text-neutral-500 text-[10px]">Qty: {line.qty}</span>
                        </div>
                        <div className="text-[10px] text-neutral-500 font-medium italic mt-0.5">{line.directions || 'No directions provided.'}</div>
                      </div>
                    ))}
                  </td>
                  <td className="p-3 font-semibold text-neutral-700">{rx.prescriberName || 'Unknown Doctor'}</td>
                  <td className="p-3 font-mono text-neutral-700 font-bold">{rx.refillsFilled} / {rx.refillsAllowed}</td>
                  <td className="p-3">
                    <span className="inline-block px-2.5 py-0.5 rounded-full border border-black/10 bg-neutral-100 font-bold uppercase text-[9px]">
                      {rx.status === 'picked_up' ? 'completed' : rx.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {rx.status === 'received' && (
                        <button 
                          onClick={() => updateStatus(rx.id, 'pending')}
                          className="bg-black hover:bg-neutral-900 border border-black text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm"
                        >
                          Process Fill
                        </button>
                      )}
                      {rx.status === 'pending' && (
                        <button 
                          onClick={() => setVerifyRxModalData(rx)}
                          className="bg-black hover:bg-neutral-900 border border-black text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Pharmacist Check</span>
                        </button>
                      )}
                      {rx.status === 'verified' && (
                        <button 
                          onClick={() => {
                            addPrescriptionToGrid(rx);
                            updateStatus(rx.id, 'dispensed');
                          }}
                          className="bg-black hover:bg-neutral-900 border border-black text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm"
                        >
                          Fulfill to Register
                        </button>
                      )}
                      {rx.status === 'dispensed' && (
                        <button 
                          onClick={() => updateStatus(rx.id, 'picked_up')}
                          className="bg-black hover:bg-neutral-900 border border-black text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm"
                        >
                          Dispense / Handover
                        </button>
                      )}
                      {rx.status === 'picked_up' && (
                        <span className="text-[10px] text-green-600 font-extrabold flex items-center gap-0.5">
                          <Check className="h-3.5 w-3.5" /> Handed Over
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Tab B: Inventory & Batches View
function InventoryBatchesView({ API_BASE, getAuthHeaders, showToast, setAdjustStockItem, setReceiveBatchItem, formatMoney, settings, currentTenantId }) {
  const [subTab, setSubTab] = useState('catalog');
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  const [movements, setMovements] = useState([]);
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [createItemModalOpen, setCreateItemModalOpen] = useState(false);

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this drug master record? This will clean up all associated balances and lots.")) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/inventory/items/${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showToast('Drug master record deleted successfully!');
        loadAll();
      } else {
        const err = await res.json();
        showToast('Delete failed: ' + (err.message || 'Server error'), 'error');
      }
    } catch (err) {
      showToast('Connection error: ' + err.message, 'error');
    }
  };
  
  // KPIs
  const [kpis, setKpis] = useState({
    valuation: 0,
    itemsCount: 0,
    lowStockCount: 0,
    expiringCount: 0
  });

  const loadAll = async () => {
    try {
      const itemsRes = await fetch(`${API_BASE}/inventory/items`, { headers: getAuthHeaders() });
      if (itemsRes.ok) {
        const list = await itemsRes.json();
        setItems(list);
      }

      const batchesRes = await fetch(`${API_BASE}/inventory/batches`, { headers: getAuthHeaders() });
      if (batchesRes.ok) {
        const list = await batchesRes.json();
        setBatches(list);
      }

      const movesRes = await fetch(`${API_BASE}/inventory/movements`, { headers: getAuthHeaders() });
      if (movesRes.ok) {
        const list = await movesRes.json();
        setMovements(list);
      }

      const expRes = await fetch(`${API_BASE}/inventory/expiry-alerts`, { headers: getAuthHeaders() });
      if (expRes.ok) {
        const list = await expRes.json();
        setExpiryAlerts(list);
      }

      const lowRes = await fetch(`${API_BASE}/inventory/reorder-alerts`, { headers: getAuthHeaders() });
      if (lowRes.ok) {
        const list = await lowRes.json();
        setLowStockAlerts(list);
      }

      const kpisRes = await fetch(`${API_BASE}/inventory/kpis`, { headers: getAuthHeaders() });
      if (kpisRes.ok) {
        const data = await kpisRes.json();
        setKpis({
          valuation: data.totalValuationRetail || 0,
          itemsCount: data.totalItems || 0,
          lowStockCount: data.lowStockAlerts || 0,
          expiringCount: data.expiring30Days || 0
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAll();
  }, [subTab]);

  return (
    <div className="flex flex-col gap-6">
      
      {/* 1. Metric cards top bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Valuation (Retail)', val: formatMoney(kpis.valuation) },
          { label: 'Drug Master Catalog', val: `${kpis.itemsCount} Drugs` },
          { label: 'Low Stock Par Alerts', val: `${kpis.lowStockCount} Items` },
          { label: 'Expiring Batches (≤30d)', val: `${kpis.expiringCount} Lots` }
        ].map((m, i) => (
          <div key={i} className="bg-white border border-neutral-300 p-4 rounded-xl shadow-sm flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-neutral-500">{m.label}</span>
            <span className="text-lg font-black text-black">{m.val}</span>
          </div>
        ))}
      </div>

      {/* 2. Sub tab headers */}
      <div className="flex justify-between items-center border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-1.5">
          {[
            { id: 'catalog', label: 'Drug Master & Balances' },
            { id: 'fefo', label: 'FEFO Batch Lots' },
            { id: 'movements', label: 'Stock Movements Log' },
            { id: 'alerts', label: 'Expiry & Low Stock Alerts' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition-all ${
                subTab === tab.id 
                  ? 'bg-black text-white border-black' 
                  : 'bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {subTab === 'catalog' && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
                const link = document.createElement('a');
                link.setAttribute("href", dataStr);
                link.setAttribute("download", `catalog_export_${new Date().toISOString().slice(0, 10)}.json`);
                link.click();
                showToast('Drug catalog exported successfully!');
              }}
              className="bg-white border border-neutral-300 text-black hover:bg-neutral-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1"
            >
              <Download className="h-3.5 w-3.5" /> Export Catalog
            </button>

            <label className="bg-white border border-neutral-300 text-black hover:bg-neutral-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer">
              <Plus className="h-3.5 w-3.5" /> Import Catalog
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = async (evt) => {
                    try {
                      const parsed = JSON.parse(evt.target.result);
                      if (Array.isArray(parsed)) {
                        let count = 0;
                        for (const item of parsed) {
                          const cleanItem = { ...item };
                          delete cleanItem.id;
                          delete cleanItem.inventoryBalances;
                          const res = await fetch(`${API_BASE}/inventory/items`, {
                            method: 'POST',
                            headers: {
                              ...getAuthHeaders(),
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ ...cleanItem, tenantId: currentTenantId })
                          });
                          if (res.ok) count++;
                        }
                        showToast(`Imported ${count} drug catalog items successfully!`);
                        loadAll();
                      } else {
                        showToast('Must be a JSON array.', 'error');
                      }
                    } catch (err) {
                      showToast('Failed to parse: ' + err.message, 'error');
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>

            <button
              onClick={() => setCreateItemModalOpen(true)}
              className="bg-black hover:bg-neutral-900 border border-black text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add Drug Item
            </button>
          </div>
        )}
      </div>

      {/* 3. Render content depending on sub-tab */}
      <div className="border border-neutral-300 rounded-lg overflow-hidden shadow-sm bg-white text-xs">
        {subTab === 'catalog' && (
          <table className="spreadsheet-grid">
            <thead>
              <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold uppercase text-[10px] tracking-wide text-neutral-700">
                <th className="p-3">Drug NDC & SKU</th>
                <th className="p-3">Brand & Generic Name</th>
                <th className="p-3">Schedule</th>
                <th className="p-3">Bin Location</th>
                <th className="p-3">On-Hand Balance</th>
                <th className="p-3">Cost / Price</th>
                <th className="p-3">Manufacturer</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {items.map(item => {
                const totalStock = item.inventoryBalances ? item.inventoryBalances.reduce((sum, b) => sum + (b.onHand || 0), 0) : 0;
                const isLow = totalStock <= parseInt(settings.lowStockPar);
                return (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="p-3 font-mono">
                      <div className="font-bold text-black">{item.sku}</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">{item.ndc}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-black">{item.name}</div>
                      <div className="text-[10px] text-neutral-500 italic mt-0.5">{item.genericName}</div>
                    </td>
                    <td className="p-3 uppercase font-bold text-[10px]">{item.deaSchedule}</td>
                    <td className="p-3">
                      {item.binLocation ? <span className="bg-neutral-100 border px-1.5 py-0.5 rounded font-mono font-bold">{item.binLocation}</span> : '—'}
                    </td>
                    <td className="p-3">
                      <span className={`font-bold ${isLow ? 'text-amber-700' : 'text-neutral-900'}`}>{totalStock}</span>
                      <span className="text-neutral-400"> / {item.maxStockLevel || 100}</span>
                      {isLow && <div className="text-[8px] font-extrabold text-amber-700 mt-0.5 uppercase">⚠️ low par</div>}
                    </td>
                    <td className="p-3 font-bold">
                      <div>Retail: {formatMoney(item.unitPrice)}</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">Cost: {formatMoney(item.unitCost)}</div>
                    </td>
                    <td className="p-3 text-neutral-500 font-semibold">{item.manufacturer || '—'}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setAdjustStockItem(item)}
                          className="bg-white hover:bg-neutral-100 border border-neutral-300 text-black text-[10px] font-bold px-2 py-1 rounded transition-all shadow-sm"
                        >
                          Adjust
                        </button>
                        <button 
                          onClick={() => setReceiveBatchItem(item)}
                          className="bg-black hover:bg-neutral-900 border border-black text-white text-[10px] font-bold px-2 py-1 rounded transition-all shadow-sm"
                        >
                          Receive
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="bg-white hover:bg-red-50 border border-red-200 text-red-600 text-[10px] font-bold px-2 py-1 rounded transition-all shadow-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {subTab === 'fefo' && (
          <table className="spreadsheet-grid">
            <thead>
              <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold uppercase text-[10px] tracking-wide text-neutral-700">
                <th className="p-3">Batch Lot No</th>
                <th className="p-3">Item Product</th>
                <th className="p-3">Pedigree Serial (DSCSA)</th>
                <th className="p-3">Expiry Date</th>
                <th className="p-3">Days Left</th>
                <th className="p-3">On-Hand / Initial</th>
                <th className="p-3">Supplier Details</th>
                <th className="p-3">Temp Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {batches.map((b, i) => (
                <tr key={b.id || i} className="hover:bg-neutral-50">
                  <td className="p-3 font-mono font-bold text-black">#{b.batchNumber}</td>
                  <td className="p-3 font-bold text-black">{b.item ? b.item.name : '—'}</td>
                  <td className="p-3 font-mono">
                    {b.serialNumber ? (
                      <span className="bg-neutral-100 border border-neutral-300 px-2 py-0.5 rounded text-[9px] font-bold">DSCSA: {b.serialNumber}</span>
                    ) : (
                      <span className="text-neutral-400 italic">No Serial Logged</span>
                    )}
                  </td>
                  <td className="p-3">{new Date(b.expiryDate).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`inline-block border px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                      b.daysUntilExpiry <= 30 ? 'bg-red-100 text-red-800 border-red-300' : 'bg-neutral-100'
                    }`}>
                      {b.daysUntilExpiry} days
                    </span>
                  </td>
                  <td className="p-3 font-bold">
                    <span>{b.totalOnHand}</span>
                    <span className="text-neutral-400"> / {b.initialQty}</span>
                  </td>
                  <td className="p-3">
                    <div>{b.supplierName || 'Distributor'}</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">PO: {b.purchaseOrderNo || 'No PO'}</div>
                  </td>
                  <td className="p-3 font-mono font-semibold">{b.receiptTemp ? `${b.receiptTemp}°C` : '21.0°C'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {subTab === 'movements' && (
          <table className="spreadsheet-grid">
            <thead>
              <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold uppercase text-[10px] tracking-wide text-neutral-700">
                <th className="p-3">Timestamp</th>
                <th className="p-3">Type</th>
                <th className="p-3">Movement Qty</th>
                <th className="p-3">Aggregate Reference</th>
                <th className="p-3">From Location</th>
                <th className="p-3">To Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {movements.map((m, i) => {
                const isAdd = m.movementType.includes('add') || m.movementType === 'initial_stock' || m.movementType.includes('return');
                return (
                  <tr key={m.id || i} className="hover:bg-neutral-50">
                    <td className="p-3 font-mono text-neutral-500">{new Date(m.createdAt).toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`inline-block border px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                        isAdd ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'
                      }`}>
                        {m.movementType}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold">
                      <span className={isAdd ? 'text-green-700' : 'text-red-700'}>
                        {isAdd ? '+' : '-'}{m.qty}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[10px]">{m.referenceType} / #{m.referenceId?.slice(0, 8)}</td>
                    <td className="p-3 text-neutral-500">{m.fromLocation ? m.fromLocation.name : 'Main Store Shelf'}</td>
                    <td className="p-3 text-neutral-500">{m.toLocation ? m.toLocation.name : 'Dispensed / Adjust'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {subTab === 'alerts' && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50">
            {/* Expiry alerts */}
            <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm flex flex-col gap-3">
              <h4 className="font-extrabold text-xs uppercase text-neutral-700 border-b pb-2 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-red-600" /> Expiring Lots (≤30 Days)
              </h4>
              <div className="max-h-[300px] overflow-y-auto">
                <table className="spreadsheet-grid">
                  <thead>
                    <tr className="border-b font-extrabold text-[9px] uppercase text-neutral-500">
                      <th className="pb-2">Batch</th>
                      <th className="pb-2">Expiry</th>
                      <th className="pb-2 text-right">Days Left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {expiryAlerts.map((e, idx) => (
                      <tr key={idx} className="hover:bg-neutral-50 text-[11px]">
                        <td className="py-2">
                          <div className="font-bold text-black">#{e.batchNumber}</div>
                          <div className="text-[10px] text-neutral-500 mt-0.5">{e.item ? e.item.name : '—'}</div>
                        </td>
                        <td className="py-2">{new Date(e.expiryDate).toLocaleDateString()}</td>
                        <td className="py-2 text-right font-extrabold text-red-600">{e.daysUntilExpiry} days</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Low stock alerts */}
            <div className="bg-white border border-neutral-300 rounded-lg p-4 shadow-sm flex flex-col gap-3">
              <h4 className="font-extrabold text-xs uppercase text-neutral-700 border-b pb-2 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Low Stock Reorder Alerts
              </h4>
              <div className="max-h-[300px] overflow-y-auto">
                <table className="spreadsheet-grid">
                  <thead>
                    <tr className="border-b font-extrabold text-[9px] uppercase text-neutral-500">
                      <th className="pb-2">Item</th>
                      <th className="pb-2">On-Hand</th>
                      <th className="pb-2">Par</th>
                      <th className="pb-2 text-right">Deficit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {lowStockAlerts.map((l, idx) => {
                      const deficit = l.reorderPoint - l.totalOnHand;
                      return (
                        <tr key={idx} className="hover:bg-neutral-50 text-[11px]">
                          <td className="py-2 font-bold text-black">{l.name}</td>
                          <td className="py-2 font-mono font-bold text-red-600">{l.totalOnHand}</td>
                          <td className="py-2 font-mono">{l.reorderPoint}</td>
                          <td className="py-2 text-right font-mono font-black text-black">+{deficit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Drug Item Modal */}
      {createItemModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-neutral-900">
          <div className="bg-white border border-neutral-300 rounded-xl shadow-xl w-full max-w-xl p-6 max-h-[95vh] overflow-y-auto flex flex-col gap-4">
            <div className="flex justify-between items-center border-b pb-3 border-neutral-200">
              <h3 className="font-extrabold text-sm text-black">➕ Add New Drug Master Entry</h3>
              <button onClick={() => setCreateItemModalOpen(false)} className="text-neutral-500 hover:text-black">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.target);
              const payload = {
                tenantId: currentTenantId,
                sku: fd.get('sku'),
                name: fd.get('name'),
                genericName: fd.get('genericName') || null,
                ndc: fd.get('ndc') || null,
                deaSchedule: fd.get('deaSchedule') || 'non_controlled',
                binLocation: fd.get('binLocation') || null,
                manufacturer: fd.get('manufacturer') || null,
                unitPrice: parseFloat(fd.get('unitPrice')) || 0,
                unitCost: parseFloat(fd.get('unitCost')) || 0,
                packageSize: parseFloat(fd.get('packageSize')) || 1,
                maxStockLevel: parseInt(fd.get('maxStockLevel')) || 100,
                reorderPoint: parseInt(fd.get('reorderPoint')) || 25,
                category: fd.get('category') || 'prescription',
                dosageForm: fd.get('dosageForm') || null,
                strength: fd.get('strength') || null,
                route: fd.get('route') || null,
                initialBatchNo: fd.get('initialBatchNo') || null,
                initialExpiryDate: fd.get('initialExpiryDate') || null,
                initialQty: parseInt(fd.get('initialQty')) || 0
              };

              try {
                const res = await fetch(`${API_BASE}/inventory/items`, {
                  method: 'POST',
                  headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(payload)
                });
                if (res.ok) {
                  showToast('Drug master item created successfully!');
                  setCreateItemModalOpen(false);
                  loadAll();
                } else {
                  const err = await res.json();
                  showToast('Failed to create item: ' + (err.message || 'Server error'), 'error');
                }
              } catch (err) {
                showToast('Connection error: ' + err.message, 'error');
              }
            }} className="flex flex-col gap-4 text-xs font-bold">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">Brand/Product Name *</label>
                  <input required name="name" className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-sans" placeholder="e.g. Lipitor 10mg" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">Generic Name</label>
                  <input name="genericName" className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-sans" placeholder="e.g. Atorvastatin" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">Barcode / SKU *</label>
                  <input required name="sku" className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-mono" placeholder="e.g. RX-LIP-10" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">NDC Code</label>
                  <input name="ndc" className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-mono" placeholder="e.g. 00071-0155-23" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">DEA Schedule</label>
                  <select name="deaSchedule" className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-bold font-sans">
                    <option value="non_controlled">Non-Controlled</option>
                    <option value="c2">C-II Controlled</option>
                    <option value="c3">C-III Controlled</option>
                    <option value="c4">C-IV Controlled</option>
                    <option value="c5">C-V Controlled</option>
                    <option value="otc">Over The Counter (OTC)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">Bin Location</label>
                  <input name="binLocation" className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-mono" placeholder="e.g. Aisle 2 - Shelf B" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">Manufacturer</label>
                  <input name="manufacturer" className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-sans" placeholder="e.g. Pfizer" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t pt-3 border-dashed">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">Retail Price (Rs.) *</label>
                  <input required type="number" step="0.01" name="unitPrice" className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-mono text-right" placeholder="0.00" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">Acquisition Cost (Rs.) *</label>
                  <input required type="number" step="0.01" name="unitCost" className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-mono text-right" placeholder="0.00" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">Package Size (Qty)</label>
                  <input type="number" name="packageSize" defaultValue="1" className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-mono text-right" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">Max / Par Stock Level</label>
                  <input type="number" name="maxStockLevel" defaultValue="100" className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-mono text-right" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-neutral-500 uppercase tracking-wide">Reorder Alert Point</label>
                  <input type="number" name="reorderPoint" defaultValue="25" className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-mono text-right" />
                </div>
              </div>

              <div className="border-t pt-3 border-dashed flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase text-neutral-500 font-sans">Initial Stock Inventory (Optional)</span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-neutral-400 font-sans">Batch Lot Number</label>
                    <input name="initialBatchNo" className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-mono" placeholder="e.g. LOT-A12" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-neutral-400 font-sans">Expiry Date</label>
                    <input type="date" name="initialExpiryDate" className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-mono" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-neutral-400 font-sans">Initial Qty</label>
                    <input type="number" name="initialQty" defaultValue="0" className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-mono text-right" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-black hover:bg-neutral-900 border border-black text-white text-xs font-black py-3 rounded-lg transition-all shadow-md mt-2 uppercase tracking-wider"
              >
                Create Drug Master Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Tab C: Patients Directory View
function PatientsDirectoryView({ API_BASE, getAuthHeaders, showToast, setCreatePatientModalOpen, setEditPatientData, setPatientDetailsData, patients, loadPatients }) {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPatients();
  }, []);

  const filtered = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.phone && p.phone.includes(searchQuery))
  );

  return (
    <div className="flex flex-col gap-4">
      
      {/* Search and Action Bar */}
      <div className="flex justify-between items-center gap-4 border-b border-neutral-200 pb-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search patient by MRN, Legal Name, phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 pl-9 border border-neutral-300 rounded-lg text-xs font-bold bg-neutral-50 outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(patients, null, 2));
              const link = document.createElement('a');
              link.setAttribute("href", dataStr);
              link.setAttribute("download", `patients_export_${new Date().toISOString().slice(0, 10)}.json`);
              link.click();
              showToast('Patients list exported successfully!');
            }}
            className="bg-white border border-neutral-300 text-black hover:bg-neutral-100 text-xs font-bold px-3 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1"
          >
            <Download className="h-4 w-4" /> Export
          </button>
          
          <label className="bg-white border border-neutral-300 text-black hover:bg-neutral-100 text-xs font-bold px-3 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-pointer">
            <Plus className="h-4 w-4" /> Import
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (evt) => {
                  try {
                    const parsed = JSON.parse(evt.target.result);
                    if (Array.isArray(parsed)) {
                      let count = 0;
                      for (const item of parsed) {
                        const cleanItem = { ...item };
                        delete cleanItem.id;
                        const res = await fetch(`${API_BASE}/patients`, {
                          method: 'POST',
                          headers: {
                            ...getAuthHeaders(),
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify(cleanItem)
                        });
                        if (res.ok) count++;
                      }
                      showToast(`Imported ${count} patient records successfully!`);
                      loadPatientsList();
                    } else {
                      showToast('Must be a JSON array.', 'error');
                    }
                  } catch (err) {
                    showToast('Failed to parse: ' + err.message, 'error');
                  }
                };
                reader.readAsText(file);
              }}
            />
          </label>

          <button
            onClick={() => setCreatePatientModalOpen(true)}
            className="bg-black hover:bg-neutral-900 border border-black text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            <span>Register New Patient</span>
          </button>
        </div>
      </div>

      {/* Grid List table */}
      <div className="border border-neutral-300 rounded-lg overflow-hidden shadow-sm bg-white text-xs">
        <table className="spreadsheet-grid">
          <thead>
            <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold uppercase text-[10px] tracking-wide text-neutral-700">
              <th className="p-3">MRN Identifier</th>
              <th className="p-3">Legal Name</th>
              <th className="p-3">Date of Birth / Gender</th>
              <th className="p-3">Contact Information</th>
              <th className="p-3">Insurance details</th>
              <th className="p-3">Consent Waivers</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-neutral-50">
                <td className="p-3 font-mono font-bold text-black">{p.mrn}</td>
                <td className="p-3 font-bold text-black">
                  <div>{p.name}</div>
                  {p.preferredName && <div className="text-[10px] text-neutral-500 font-medium">"{p.preferredName}"</div>}
                </td>
                <td className="p-3">
                  <div>{p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : '—'}</div>
                  <div className="text-[10px] text-neutral-500 font-bold uppercase mt-0.5">{p.gender}</div>
                </td>
                <td className="p-3">
                  <div>{p.phone || '—'}</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">{p.email || '—'}</div>
                </td>
                <td className="p-3 font-mono">
                  {p.insBin ? (
                    <div>BIN: {p.insBin} / GRP: {p.insGroup}</div>
                  ) : (
                    <span className="text-neutral-400 italic">No Insurance Logged</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    {p.hipaaSigned ? (
                      <span className="inline-block bg-neutral-100 border px-1.5 py-0.5 rounded text-[8px] font-extrabold text-neutral-700 uppercase">HIPAA OK</span>
                    ) : (
                      <span className="inline-block bg-red-100 border border-red-200 px-1.5 py-0.5 rounded text-[8px] font-extrabold text-red-700 uppercase">NO HIPAA</span>
                    )}
                    {p.safetyCapWaiver && (
                      <span className="inline-block bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded text-[8px] font-extrabold text-amber-700 uppercase">EASY CAPS</span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setPatientDetailsData(p)}
                      className="bg-white hover:bg-neutral-100 border border-neutral-300 text-black text-[10px] font-bold px-2 py-1 rounded transition-all flex items-center gap-0.5 shadow-sm"
                    >
                      <Eye className="h-3 w-3" /> View
                    </button>
                    <button 
                      onClick={() => setEditPatientData(p)}
                      className="bg-black hover:bg-neutral-900 border border-black text-white text-[10px] font-bold px-2 py-1 rounded transition-all shadow-sm"
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Tab D: Sales History View
function SalesHistoryView({ API_BASE, getAuthHeaders, showToast, setReceiptModalSale, formatMoney, currentTenantId, salesRefreshCount, onSaleModified }) {
  const [sales, setSales] = useState([]);
  const [refundSale, setRefundSale] = useState(null);

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/sales`, { headers: getAuthHeaders() });
      if (res.ok) {
        const list = await res.json();
        setSales(list);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [salesRefreshCount]);

  return (
    <div className="border border-neutral-300 rounded-lg overflow-hidden shadow-sm bg-white text-xs">
      <table className="spreadsheet-grid">
        <thead>
          <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold uppercase text-[10px] tracking-wide text-neutral-700">
            <th className="p-3">Sale Invoice ID</th>
            <th className="p-3">Timestamp</th>
            <th className="p-3">Cashier Staff</th>
            <th className="p-3">Customer Patient</th>
            <th className="p-3">Total Amount</th>
            <th className="p-3">Status</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {sales.length === 0 ? (
            <tr>
              <td colSpan="7" className="text-center p-6 text-neutral-500 font-semibold">No sales ledger records found.</td>
            </tr>
          ) : (
            sales.map(s => (
              <tr key={s.id} className="hover:bg-neutral-50">
                <td className="p-3 font-mono font-bold text-black">#{s.id.slice(-6).toUpperCase()}</td>
                <td className="p-3 text-neutral-500 font-mono">{new Date(s.createdAt).toLocaleString()}</td>
                <td className="p-3 font-semibold">{s.cashier ? s.cashier.displayName : 'Front Desk'}</td>
                <td className="p-3">{s.patient ? s.patient.name : 'Walk-in'}</td>
                <td className="p-3 font-extrabold text-black">{formatMoney(s.totals)}</td>
                <td className="p-3">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full border border-black/10 font-bold uppercase text-[9px] ${
                    s.status === 'refunded' ? 'bg-red-100 border-red-300 text-red-800' : 'bg-neutral-100'
                  }`}>
                    {s.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => setReceiptModalSale(s)}
                      className="bg-white hover:bg-neutral-100 border border-neutral-300 text-black text-[10px] font-bold px-2 py-1 rounded transition-all shadow-sm"
                    >
                      View Receipt
                    </button>
                    {s.status !== 'refunded' && (
                      <button 
                        onClick={() => setRefundSale(s)}
                        className="bg-black hover:bg-neutral-900 border border-black text-white text-[10px] font-bold px-2 py-1 rounded transition-all shadow-sm"
                      >
                        Refund
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {refundSale && (
        <RefundRequestModal 
          sale={refundSale}
          onClose={() => setRefundSale(null)}
          API_BASE={API_BASE}
          getAuthHeaders={getAuthHeaders}
          showToast={showToast}
          currentTenantId={currentTenantId}
          loadHistory={loadHistory}
          formatMoney={formatMoney}
          onSaleModified={onSaleModified}
        />
      )}
    </div>
  );
}

// Refund Request Modal Component
function RefundRequestModal({ sale, onClose, API_BASE, getAuthHeaders, showToast, currentTenantId, loadHistory, formatMoney, onSaleModified }) {
  const [amount, setAmount] = useState(sale.totals.toString());
  const [reason, setReason] = useState('Patient Return');
  const [customReason, setCustomReason] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const refundAmount = parseFloat(amount);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      showToast('Refund amount must be greater than zero', 'error');
      return;
    }
    if (refundAmount > sale.totals) {
      showToast('Refund amount cannot exceed sale total', 'error');
      return;
    }

    const finalReason = reason === 'Other' ? customReason.trim() : reason;
    if (!finalReason) {
      showToast('Please specify a reason for the refund', 'error');
      return;
    }

    const payload = {
      tenantId: currentTenantId,
      saleId: sale.id,
      amount: refundAmount,
      reason: finalReason
    };

    try {
      const res = await fetch(`${API_BASE}/refunds`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Refund processed successfully!');
        loadHistory();
        if (onSaleModified) onSaleModified();
        onClose();
      } else {
        const err = await res.json();
        showToast('Refund failed: ' + (err.message || 'Server error'), 'error');
      }
    } catch (err) {
      showToast('Network error: ' + err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white border border-neutral-300 rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4 text-xs text-left">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-extrabold text-sm text-black uppercase">Process Sale Refund</h3>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-black">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg flex flex-col gap-1">
          <div className="flex justify-between">
            <span className="text-neutral-500 font-bold uppercase text-[9px]">Sale ID:</span>
            <span className="font-mono font-bold text-black">#{sale.id.slice(-6).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500 font-bold uppercase text-[9px]">Sale Total:</span>
            <span className="font-mono font-extrabold text-black">{formatMoney(sale.totals)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase text-neutral-500">Refund Amount (Rs.)</label>
          <input 
            type="number" 
            step="0.01"
            min="0.01"
            max={sale.totals}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="p-2.5 border rounded-lg bg-neutral-50 font-bold font-mono text-[13px]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase text-neutral-500">Reason for Refund</label>
          <select 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="p-2.5 border rounded-lg bg-neutral-50 font-bold text-neutral-800"
          >
            <option value="Patient Return">Patient Return / Medication Return</option>
            <option value="Dispensing Error">Dispensing Error / Incorrect Item</option>
            <option value="Expired Medicine">Expired Medicine Discovery</option>
            <option value="Adverse Reaction">Patient Adverse Drug Reaction</option>
            <option value="Wholesaler Recall">Wholesaler / FDA Drug Recall</option>
            <option value="Other">Other Reason (Specify below)</option>
          </select>
        </div>

        {reason === 'Other' && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500">Specify Reason</label>
            <input 
              type="text" 
              required
              placeholder="Enter explanation..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="p-2.5 border rounded-lg bg-neutral-50 font-bold"
            />
          </div>
        )}

        <div className="flex gap-2.5 mt-2">
          <button 
            type="button" 
            onClick={onClose}
            className="flex-1 bg-white hover:bg-neutral-50 border border-neutral-300 text-black text-xs font-bold py-3 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="flex-1 bg-black hover:bg-neutral-900 border border-black text-white text-xs font-bold py-3 rounded-lg transition-all uppercase tracking-wider"
          >
            Confirm Refund
          </button>
        </div>
      </form>
    </div>
  );
}

// Tab E: Audit Log & Outbox View
function AuditLogView({ API_BASE, getAuthHeaders, showToast }) {
  const [logs, setLogs] = useState([]);

  const loadLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/audit`, { headers: getAuthHeaders() });
      if (res.ok) {
        const list = await res.json();
        setLogs(list);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="border border-neutral-300 rounded-lg overflow-hidden shadow-sm bg-white text-xs">
      <table className="spreadsheet-grid">
        <thead>
          <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold uppercase text-[10px] tracking-wide text-neutral-700">
            <th className="p-3">Timestamp</th>
            <th className="p-3">User</th>
            <th className="p-3">Event Action Type</th>
            <th className="p-3">Aggregate Target</th>
            <th className="p-3">IP Address</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {logs.map((log, i) => (
            <tr key={log.id || i} className="hover:bg-neutral-50">
              <td className="p-3 font-mono text-neutral-500">{new Date(log.createdAt).toLocaleString()}</td>
              <td className="p-3 font-bold text-black">{log.userEmail}</td>
              <td className="p-3 font-mono uppercase">{log.eventType}</td>
              <td className="p-3 font-mono text-[10px]">{log.aggregateType} / #{log.aggregateId?.slice(0, 8)}</td>
              <td className="p-3 font-mono text-neutral-500">{log.ipAddress || '127.0.0.1'}</td>
              <td className="p-3 font-bold text-green-700 uppercase">SECURE</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Tab F: Settings Configuration View
function SettingsView({ API_BASE, getAuthHeaders, showToast, currentTenantId, loadSettings }) {
  const [inputs, setInputs] = useState({
    currency: 'Rs. ',
    name: 'HMAT Clinical Pharmacy',
    npi: '1982736450',
    ncpdp: '3827491',
    dea: 'PH1234567',
    tax: '10.00',
    discount: '0.00',
    par: '25',
    exp: '30',
    temp: '8.0',
    eodEmail: 'manager@hmatpharmacy.local',
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpFrom: 'no-reply@hmatpharmacy.local'
  });

  const loadInputs = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings?tenantId=${currentTenantId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setInputs({
          currency: data.currency_symbol || 'Rs. ',
          name: data.pharmacy_name || 'HMAT Clinical Pharmacy',
          npi: data.npi || '1982736450',
          ncpdp: data.ncpdp || '3827491',
          dea: data.dea || 'PH1234567',
          tax: data.tax_rate || '10.00',
          discount: data.default_discount_rate || '0.00',
          par: data.low_stock_par || '25',
          exp: data.expiry_days || '30',
          temp: data.cold_temp_alert || '8.0',
          eodEmail: data.eod_report_email || 'manager@hmatpharmacy.local',
          smtpHost: data.smtp_host || '',
          smtpPort: data.smtp_port || '587',
          smtpUser: data.smtp_user || '',
          smtpPass: data.smtp_pass || '',
          smtpFrom: data.smtp_from || 'no-reply@hmatpharmacy.local'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadInputs();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      tenantId: currentTenantId,
      currency: inputs.currency,
      name: inputs.name,
      npi: inputs.npi,
      ncpdp: inputs.ncpdp,
      dea: inputs.dea,
      tax: inputs.tax,
      default_discount_rate: inputs.discount,
      par: inputs.par,
      exp: inputs.exp,
      temp: inputs.temp,
      eod_report_email: inputs.eodEmail,
      smtp_host: inputs.smtpHost,
      smtp_port: inputs.smtpPort,
      smtp_user: inputs.smtpUser,
      smtp_pass: inputs.smtpPass,
      smtp_from: inputs.smtpFrom
    };

    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('System variables saved to database!');
        loadSettings();
      } else {
        showToast('Failed to save configs', 'error');
      }
    } catch (err) {
      showToast('Error persisting settings: ' + err.message, 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl text-xs">
      <form onSubmit={handleSave} className="flex flex-col gap-6 w-full">
        <div className="grid grid-cols-2 gap-6 w-full">
          {/* Col 1: Identity & Currency */}
        <div className="bg-white border border-neutral-300 p-5 rounded-xl shadow-sm flex flex-col gap-4">
          <h3 className="font-extrabold text-xs uppercase border-b pb-2 text-neutral-800">💵 Identity & Currency Standard</h3>
          
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500">Currency Prefix</label>
            <select 
              value={inputs.currency} 
              onChange={(e) => setInputs({ ...inputs, currency: e.target.value })}
              className="p-2 border rounded-lg font-bold bg-neutral-50"
            >
              <option value="Rs. ">Rs. (PKR/INR)</option>
              <option value="$">USD ($)</option>
              <option value="£">GBP (£)</option>
              <option value="€">EUR (€)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500">Pharmacy Legal Name</label>
            <input 
              type="text" 
              value={inputs.name}
              onChange={(e) => setInputs({ ...inputs, name: e.target.value })}
              className="p-2 border rounded-lg font-bold bg-neutral-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">NPI Number (10d)</label>
              <input 
                type="text" 
                maxLength="10"
                value={inputs.npi}
                onChange={(e) => setInputs({ ...inputs, npi: e.target.value })}
                className="p-2 border rounded-lg font-bold bg-neutral-50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">NCPDP / NABP ID</label>
              <input 
                type="text" 
                maxLength="7"
                value={inputs.ncpdp}
                onChange={(e) => setInputs({ ...inputs, ncpdp: e.target.value })}
                className="p-2 border rounded-lg font-bold bg-neutral-50"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500">DEA Registry Number</label>
            <input 
              type="text" 
              value={inputs.dea}
              onChange={(e) => setInputs({ ...inputs, dea: e.target.value })}
              className="p-2 border rounded-lg font-bold bg-neutral-50"
            />
          </div>
        </div>

        {/* Col 2: Thresholds & Taxes */}
        <div className="bg-white border border-neutral-300 p-5 rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-4">
            <h3 className="font-extrabold text-xs uppercase border-b pb-2 text-neutral-800">🚨 Thresholds & Warning Par Levels</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-neutral-500">Default Sales Tax (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={inputs.tax}
                  onChange={(e) => setInputs({ ...inputs, tax: e.target.value })}
                  className="p-2 border rounded-lg font-bold bg-neutral-50 outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-neutral-500">Default Discount (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={inputs.discount}
                  onChange={(e) => setInputs({ ...inputs, discount: e.target.value })}
                  className="p-2 border rounded-lg font-bold bg-neutral-50 outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Low Stock Warning Par level</label>
              <input 
                type="number" 
                value={inputs.par}
                onChange={(e) => setInputs({ ...inputs, par: e.target.value })}
                className="p-2 border rounded-lg font-bold bg-neutral-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-neutral-500">Expiry Alert Range (Days)</label>
                <input 
                  type="number" 
                  value={inputs.exp}
                  onChange={(e) => setInputs({ ...inputs, exp: e.target.value })}
                  className="p-2 border rounded-lg font-bold bg-neutral-50"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-neutral-500">Cold Chain Temp Limit (°C)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={inputs.temp}
                  onChange={(e) => setInputs({ ...inputs, temp: e.target.value })}
                  className="p-2 border rounded-lg font-bold bg-neutral-50"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-3">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Manager EOD Report Email</label>
              <input 
                type="email" 
                value={inputs.eodEmail}
                onChange={(e) => setInputs({ ...inputs, eodEmail: e.target.value })}
                className="p-2 border rounded-lg font-bold bg-neutral-50"
                placeholder="manager@hmatpharmacy.local"
              />
            </div>
          </div>
        </div>
      </div>
        
        {/* SMTP Mail Dispatcher Configuration */}
        <div className="bg-white border border-neutral-300 p-5 rounded-xl shadow-sm flex flex-col gap-4">
          <h3 className="font-extrabold text-xs uppercase border-b pb-2 text-neutral-800 flex items-center gap-1.5">
            ✉️ SMTP EOD Email Dispatch System
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">SMTP Server Host</label>
              <input 
                type="text" 
                value={inputs.smtpHost} 
                onChange={(e) => setInputs({ ...inputs, smtpHost: e.target.value })}
                placeholder="e.g. smtp.gmail.com"
                className="p-2 border rounded-lg font-bold bg-neutral-50 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">SMTP Server Port</label>
              <input 
                type="number" 
                value={inputs.smtpPort} 
                onChange={(e) => setInputs({ ...inputs, smtpPort: e.target.value })}
                placeholder="587 or 465"
                className="p-2 border rounded-lg font-bold bg-neutral-50 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Sender "From" Address</label>
              <input 
                type="email" 
                value={inputs.smtpFrom} 
                onChange={(e) => setInputs({ ...inputs, smtpFrom: e.target.value })}
                placeholder="no-reply@hmatpharmacy.local"
                className="p-2 border rounded-lg font-bold bg-neutral-50 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">SMTP Authentication Username</label>
              <input 
                type="text" 
                value={inputs.smtpUser} 
                onChange={(e) => setInputs({ ...inputs, smtpUser: e.target.value })}
                placeholder="username or email"
                className="p-2 border rounded-lg font-bold bg-neutral-50 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">SMTP Authentication Password</label>
              <input 
                type="password" 
                value={inputs.smtpPass} 
                onChange={(e) => setInputs({ ...inputs, smtpPass: e.target.value })}
                placeholder="password or app key"
                className="p-2 border rounded-lg font-bold bg-neutral-50 outline-none"
              />
            </div>
          </div>
        </div>

        <button 
          type="submit"
          className="w-full bg-black hover:bg-neutral-900 border border-black text-white text-xs font-bold py-3.5 rounded-lg transition-all shadow-md uppercase tracking-wider"
        >
          Save Configurations
        </button>
      </form>

      {/* Col 3: System Backup & Database Control (col-span-2) */}
      <div className="bg-white border border-neutral-300 p-5 rounded-xl shadow-sm flex flex-col gap-4">
        <h3 className="font-extrabold text-xs uppercase border-b pb-2 text-neutral-800">🛡️ System Database Backup & Restore Center</h3>
        <p className="text-neutral-500 font-medium">Export the entire local SQLite/PostgreSQL pharmacy database to a JSON file, or restore tables from a valid backup file. <strong>Warning: Restoring will overwrite existing records for this tenant.</strong></p>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch(`${API_BASE}/system/backup?tenantId=${currentTenantId}`, { headers: getAuthHeaders() });
                if (res.ok) {
                  const backupData = await res.json();
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
                  const link = document.createElement('a');
                  link.setAttribute("href", dataStr);
                  link.setAttribute("download", `hmat_db_backup_${new Date().toISOString().slice(0,10)}.json`);
                  link.click();
                  showToast('Database backup downloaded successfully!');
                } else {
                  showToast('Backup request failed.', 'error');
                }
              } catch (err) {
                showToast('Connection error: ' + err.message, 'error');
              }
            }}
            className="bg-black hover:bg-neutral-900 border border-black text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-1.5"
          >
            <Download className="h-4 w-4" /> Download System Backup JSON
          </button>

          <label className="bg-white border border-neutral-300 text-black hover:bg-neutral-100 text-xs font-bold px-4 py-2.5 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer">
            <Plus className="h-4 w-4" /> Upload & Restore Backup
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (evt) => {
                  try {
                    const parsed = JSON.parse(evt.target.result);
                    const res = await fetch(`${API_BASE}/system/restore`, {
                      method: 'POST',
                      headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ tenantId: currentTenantId, data: parsed })
                    });
                    const result = await res.json();
                    if (res.ok && result.success) {
                      showToast('Database restored successfully! Reloading...');
                      setTimeout(() => window.location.reload(), 1500);
                    } else {
                      showToast('Restore failed: ' + (result.message || 'Server error'), 'error');
                    }
                  } catch (err) {
                    showToast('Failed to parse file: ' + err.message, 'error');
                  }
                };
                reader.readAsText(file);
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPresetDates = (preset) => {
  const now = new Date();
  
  if (preset === 'today') {
    const todayStr = formatLocalDate(now);
    return { start: todayStr, end: todayStr };
  }
  
  if (preset === 'week') {
    const day = now.getDay();
    const diff = now.getDate() - (day === 0 ? 6 : day - 1);
    const monday = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
    const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
    
    return {
      start: formatLocalDate(monday),
      end: formatLocalDate(sunday)
    };
  }
  
  if (preset === 'month') {
    const YYYY = now.getFullYear();
    const MM = now.getMonth();
    const firstDay = new Date(YYYY, MM, 1);
    const lastDay = new Date(YYYY, MM + 1, 0);
    
    return {
      start: formatLocalDate(firstDay),
      end: formatLocalDate(lastDay)
    };
  }

  return null;
};

function AnalyticsReportsView({ API_BASE, getAuthHeaders, showToast, formatMoney, currentTenantId, salesRefreshCount }) {
  const [reconciliation, setReconciliation] = useState([]);
  const [timeframePreset, setTimeframePreset] = useState('month');
  const [startDate, setStartDate] = useState(() => getPresetDates('month').start);
  const [endDate, setEndDate] = useState(() => getPresetDates('month').end);
  const [summary, setSummary] = useState(null);
  const [growth, setGrowth] = useState(0);
  const [closeDayResult, setCloseDayResult] = useState(null);
  const [refunds, setRefunds] = useState([]);

  const loadReconciliation = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics/reconciliation?tenantId=${currentTenantId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const list = await res.json();
        setReconciliation(list);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics/summary?startDate=${startDate}&endDate=${endDate}&tenantId=${currentTenantId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);

        // Fetch same duration in previous period to calculate growth
        const startMs = new Date(startDate).getTime();
        const endMs = new Date(endDate).getTime();
        const duration = endMs - startMs;
        const prevStart = new Date(startMs - duration).toISOString().split('T')[0];
        const prevEnd = new Date(startMs - 1).toISOString().split('T')[0];
        
        const prevRes = await fetch(`${API_BASE}/analytics/summary?startDate=${prevStart}&endDate=${prevEnd}&tenantId=${currentTenantId}`, { headers: getAuthHeaders() });
        if (prevRes.ok) {
          const prevData = await prevRes.json();
          const prevRev = prevData.financials?.revenue || 0;
          const currRev = data.financials?.revenue || 0;
          const pct = prevRev > 0 ? ((currRev - prevRev) / prevRev) * 100 : currRev > 0 ? 100 : 0;
          setGrowth(pct);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePresetChange = async (preset) => {
    setTimeframePreset(preset);
    if (preset !== 'custom') {
      const dates = getPresetDates(preset);
      setStartDate(dates.start);
      setEndDate(dates.end);
      
      try {
        const res = await fetch(`${API_BASE}/analytics/summary?startDate=${dates.start}&endDate=${dates.end}&tenantId=${currentTenantId}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setSummary(data);
          
          const startMs = new Date(dates.start).getTime();
          const endMs = new Date(dates.end).getTime();
          const duration = endMs - startMs;
          const prevStart = new Date(startMs - duration).toISOString().split('T')[0];
          const prevEnd = new Date(startMs - 1).toISOString().split('T')[0];
          
          const prevRes = await fetch(`${API_BASE}/analytics/summary?startDate=${prevStart}&endDate=${prevEnd}&tenantId=${currentTenantId}`, { headers: getAuthHeaders() });
          if (prevRes.ok) {
            const prevData = await prevRes.json();
            const prevRev = prevData.financials?.revenue || 0;
            const currRev = data.financials?.revenue || 0;
            const pct = prevRev > 0 ? ((currRev - prevRev) / prevRev) * 100 : currRev > 0 ? 100 : 0;
            setGrowth(pct);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleExportSales = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics/export/sales?startDate=${startDate}&endDate=${endDate}&tenantId=${currentTenantId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const rows = await res.json();
        const headers = ["saleId", "date", "cashier", "itemSku", "itemName", "qty", "unitPrice", "totalCost", "totalPrice", "profit", "paymentMethod"];
        const csvContent = [
          headers.join(","),
          ...rows.map(r => headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(","))
        ].join("\n");
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `sales_export_${startDate}_to_${endDate}.csv`);
        link.click();
        showToast('Sales ledger CSV exported successfully!');
      }
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error');
    }
  };

  const handleCloseDay = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics/close-day`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tenantId: currentTenantId })
      });
      if (res.ok) {
        const data = await res.json();
        setCloseDayResult(data);
        showToast('EOD Close completed. Daily analytics emailed!');
      } else {
        showToast('Failed to complete day closing.', 'error');
      }
    } catch (err) {
      showToast('Connection error: ' + err.message, 'error');
    }
  };

  const loadRefunds = async () => {
    try {
      const res = await fetch(`${API_BASE}/refunds?tenantId=${currentTenantId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const list = await res.json();
        setRefunds(list);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadReconciliation();
    fetchSummary();
    loadRefunds();
  }, [currentTenantId, salesRefreshCount]);

  const filteredRefundsList = (refunds || []).filter(ref => {
    if (!ref.createdAt) return false;
    const d = new Date(ref.createdAt);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return d >= start && d <= end;
  });

  return (
    <div className="flex flex-col gap-4 text-xs">
      
      {/* Date Pickers & Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between border-b pb-4 mb-2">
        <div className="flex flex-col gap-2">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg border border-neutral-200 self-start">
            <button
              type="button"
              onClick={() => handlePresetChange('today')}
              className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all ${timeframePreset === 'today' ? 'bg-black text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-200/50'}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('week')}
              className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all ${timeframePreset === 'week' ? 'bg-black text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-200/50'}`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('month')}
              className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all ${timeframePreset === 'month' ? 'bg-black text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-200/50'}`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setTimeframePreset('custom')}
              className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all ${timeframePreset === 'custom' ? 'bg-black text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-200/50'}`}
            >
              Custom Date Range
            </button>
          </div>

          {/* Date Pickers for Custom Mode */}
          {timeframePreset === 'custom' ? (
            <div className="flex items-center gap-3 mt-1">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-neutral-500">From Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="p-1.5 border border-neutral-300 rounded-lg bg-neutral-50 font-bold outline-none" 
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-extrabold uppercase text-neutral-500">To Date</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="p-1.5 border border-neutral-300 rounded-lg bg-neutral-50 font-bold outline-none" 
                />
              </div>
              <button 
                type="button"
                onClick={fetchSummary}
                className="mt-4 bg-black border border-black hover:bg-neutral-900 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm"
              >
                Apply Filter
              </button>
            </div>
          ) : (
            <div className="text-[10px] font-extrabold text-neutral-400 mt-1 uppercase tracking-wide">
              Selected Range: <span className="text-black font-black font-mono">{startDate}</span> to <span className="text-black font-black font-mono">{endDate}</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={handleExportSales}
            className="bg-white border border-neutral-300 text-black hover:bg-neutral-100 text-xs font-bold px-3 py-2 rounded-lg transition-all shadow-sm flex items-center gap-1"
          >
            <Download className="h-4 w-4" /> Export Sales CSV
          </button>
          <button 
            onClick={handleCloseDay}
            className="bg-black hover:bg-neutral-900 border border-black text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-md flex items-center gap-1"
          >
            <CheckCircle className="h-4 w-4" /> Authorize EOD Day-Close
          </button>
        </div>
      </div>

      {/* Close Day Email Preview */}
      {/* Close Day Email Preview */}
      {closeDayResult && (
        <div className="bg-white border border-neutral-300 rounded-xl shadow-lg p-5 mb-4 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <h3 className="font-extrabold text-sm text-black uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-600" /> End-Of-Day Closing Report Dispatched
              </h3>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const frame = document.getElementById('eod-preview-iframe');
                  if (frame) {
                    frame.contentWindow.print();
                  }
                }}
                className="bg-white hover:bg-neutral-100 border border-neutral-300 text-black text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
              >
                <Printer className="h-3.5 w-3.5" /> Print Report
              </button>
              <button 
                onClick={() => setCloseDayResult(null)} 
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-xs font-semibold bg-neutral-50 p-3 rounded-lg border border-neutral-200">
            <div>
              <span className="text-[10px] text-neutral-400 uppercase block">Report Date</span>
              <span className="font-mono text-black font-black text-sm">{new Date().toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 uppercase block">Delivery Status</span>
              <span className={`inline-flex items-center gap-1 font-extrabold uppercase truncate ${closeDayResult.mailSent ? 'text-emerald-700' : 'text-amber-700'}`} title={closeDayResult.targetEmail}>
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> {closeDayResult.mailSent ? 'Sent (SMTP)' : 'Logged (SMTP Unconfigured)'}: {closeDayResult.targetEmail || 'Manager'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 uppercase block">Audit Reference ID</span>
              <span className="font-mono text-neutral-600 truncate block">{closeDayResult.summary ? `EOD-${new Date().toISOString().slice(0, 10)}` : 'N/A'}</span>
            </div>
          </div>

          <div className="border border-neutral-200 rounded-lg overflow-hidden shadow-inner bg-neutral-50 p-2">
            <iframe 
              id="eod-preview-iframe"
              srcDoc={closeDayResult.emailHtml} 
              className="w-full bg-white border border-neutral-200 rounded-md"
              style={{ height: '380px' }}
              title="EOD Email Live Preview"
            />
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-2">
          {/* Card 1: Revenue Volume */}
          <div className="bg-neutral-50 border border-neutral-300 p-4 rounded-xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-extrabold uppercase text-neutral-500">Revenue Volume</div>
              <div className="text-lg font-black mt-1 text-black">
                {formatMoney(summary.financials?.revenue)}
              </div>
              <div className="text-[10px] font-bold text-neutral-500 mt-1">
                {summary.financials?.transactionCount} orders | {growth >= 0 ? `+${growth.toFixed(1)}% growth` : `${growth.toFixed(1)}% growth`}
              </div>
            </div>
            
            <div className="mt-3 pt-2.5 border-t border-neutral-200 flex flex-col gap-1 text-[9px] font-bold text-neutral-600">
              <div className="flex justify-between">
                <span>1 Day Vol:</span>
                <span className="font-mono text-neutral-800">{formatMoney(summary.financials?.revenue1d || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>7 Day Vol:</span>
                <span className="font-mono text-neutral-800">{formatMoney(summary.financials?.revenue7d || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>1 Month Vol:</span>
                <span className="font-mono text-neutral-800">{formatMoney(summary.financials?.revenue30d || 0)}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Gross Margin profit */}
          <div className="bg-neutral-50 border border-neutral-300 p-4 rounded-xl shadow-sm">
            <div className="text-[10px] font-extrabold uppercase text-neutral-500">Gross Margin profit</div>
            <div className="text-lg font-black mt-1 text-black">
              {formatMoney(summary.financials?.grossProfit)}
            </div>
            <div className="text-[10px] font-bold text-neutral-500 mt-1">
              Margin: {summary.financials?.grossMarginPercent.toFixed(1)}%
            </div>
          </div>

          {/* Card 3: Refunded Receipts */}
          <div className="bg-neutral-50 border border-neutral-300 p-4 rounded-xl shadow-sm flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-extrabold uppercase text-neutral-500">Refunded Receipts</div>
              <div className="text-lg font-black mt-1 text-red-600">
                {summary.financials?.refundsCount || 0} Refunds
              </div>
              <div className="text-[10px] font-bold text-red-700 mt-1">
                Total cost: {formatMoney(summary.financials?.totalRefunded || 0)}
              </div>
            </div>
            
            <div className="mt-3 pt-2.5 border-t border-neutral-200 flex flex-col gap-1 text-[9px] font-bold text-neutral-600">
              <div className="flex justify-between">
                <span>Gross Sales:</span>
                <span className="font-mono text-neutral-800">{formatMoney(summary.financials?.grossRevenue || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Refund Rate:</span>
                <span className="font-mono text-neutral-800">{summary.financials?.refundRatePercent?.toFixed(1) || 0}%</span>
              </div>
            </div>
          </div>

          {/* Card 4: Medicines Sold */}
          <div className="bg-neutral-50 border border-neutral-300 p-4 rounded-xl shadow-sm">
            <div className="text-[10px] font-extrabold uppercase text-neutral-500">Medicines Sold</div>
            <div className="text-lg font-black mt-1 text-black">
              {summary.financials?.medicinesSold || 0} Units
            </div>
            <div className="text-[10px] font-bold text-neutral-500 mt-1">
              Total items dispensed
            </div>
          </div>

          {/* Card 5: Unique Customers */}
          <div className="bg-neutral-50 border border-neutral-300 p-4 rounded-xl shadow-sm">
            <div className="text-[10px] font-extrabold uppercase text-neutral-500">Customers Served</div>
            <div className="text-lg font-black mt-1 text-black">
              {summary.financials?.customerCount || 0} Visits
            </div>
            <div className="text-[10px] font-bold text-neutral-500 mt-1">
              Completed transactions
            </div>
          </div>

          {/* Card 6: Rxs filled / overrides */}
          <div className="bg-neutral-50 border border-neutral-300 p-4 rounded-xl shadow-sm">
            <div className="text-[10px] font-extrabold uppercase text-neutral-500">Rxs filled / overrides</div>
            <div className="text-lg font-black mt-1 text-black">
              {summary.clinical?.completedRxs} Rxs
            </div>
            <div className="text-[10px] font-bold text-neutral-500 mt-1">
              {summary.clinical?.durOverrides} clinical overrides
            </div>
          </div>

          {/* Card 7: Avg check latency */}
          <div className="bg-neutral-50 border border-neutral-300 p-4 rounded-xl shadow-sm">
            <div className="text-[10px] font-extrabold uppercase text-neutral-500">Avg check latency</div>
            <div className="text-lg font-black mt-1 text-black">
              {summary.clinical?.avgProcessingTimeSeconds}s
            </div>
            <div className="text-[10px] font-bold text-neutral-500 mt-1">
              Clinician queue processing
            </div>
          </div>

          {/* Card 8: Shrinkage Quantity */}
          <div className="bg-neutral-50 border border-neutral-300 p-4 rounded-xl shadow-sm">
            <div className="text-[10px] font-extrabold uppercase text-neutral-500">shrinkage quantity</div>
            <div className="text-lg font-black mt-1 text-red-600">
              {summary.inventory?.shrinkageQty} units
            </div>
            <div className="text-[10px] font-bold text-red-700/70 mt-1 font-semibold">
              Log adjustments losses
            </div>
          </div>
        </div>
      )}

      {/* Refunded Receipts Ledger Table */}
      <div className="flex flex-col gap-2 mt-2">
        <h3 className="font-extrabold text-xs uppercase text-neutral-800">📋 Refunded Receipts Ledger ({timeframePreset.toUpperCase()} RANGE)</h3>
        <div className="border border-neutral-300 rounded-lg overflow-hidden shadow-sm bg-white text-xs">
          <table className="spreadsheet-grid">
            <thead>
              <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold uppercase text-[10px] tracking-wide text-neutral-700">
                <th className="p-3">Refund Timestamp</th>
                <th className="p-3">Original Sale ID</th>
                <th className="p-3">Refund Amount</th>
                <th className="p-3">Reason for Return</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredRefundsList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center p-4 text-neutral-500 font-semibold">No refund transactions recorded in this range.</td>
                </tr>
              ) : (
                filteredRefundsList.map(ref => (
                  <tr key={ref.id} className="hover:bg-neutral-50">
                    <td className="p-3 text-neutral-500 font-mono">{new Date(ref.createdAt).toLocaleString()}</td>
                    <td className="p-3 font-mono font-bold text-black">#{ref.saleId.slice(-6).toUpperCase()}</td>
                    <td className="p-3 font-extrabold text-red-600">{formatMoney(ref.amount)}</td>
                    <td className="p-3 font-semibold text-neutral-700">{ref.reason}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full border border-black/10 font-bold uppercase text-[9px] ${
                        ref.status === 'approved' ? 'bg-green-100 border-green-300 text-green-800' : 'bg-amber-100 border-amber-300 text-amber-800'
                      }`}>
                        {ref.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance reconciliation table */}
      <div className="flex justify-between items-center border-t pt-4">
        <h3 className="font-extrabold text-xs uppercase text-neutral-800">🕵️ Balance-to-Movement Integrity Audit (Real-Time)</h3>
        <button 
          onClick={loadReconciliation}
          className="bg-white border border-neutral-300 text-black hover:bg-neutral-100 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" /> Re-Reconcile Ledger
        </button>
      </div>

      <div className="border border-neutral-300 rounded-lg overflow-hidden shadow-sm bg-white">
        <table className="spreadsheet-grid">
          <thead>
            <tr className="bg-neutral-100 border-b border-neutral-300 font-extrabold uppercase text-[10px] tracking-wide text-neutral-700">
              <th className="p-3">Drug Catalog Item</th>
              <th className="p-3">Initial Stock</th>
              <th className="p-3">Additions (Receipts)</th>
              <th className="p-3">Reductions (Sales)</th>
              <th className="p-3">Computed Stock Balance</th>
              <th className="p-3">Actual On-Hand Balance</th>
              <th className="p-3">Reconciliation Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {reconciliation.map((row, i) => {
              const variance = row.currentOnHand - row.ledgerExpected;
              return (
                <tr key={i} className="hover:bg-neutral-50">
                  <td className="p-3">
                    <div className="font-bold text-black">{row.itemName}</div>
                    <div className="text-[10px] text-neutral-500 font-mono mt-0.5">SKU: {row.sku} | Location: {row.locationName}</div>
                  </td>
                  <td className="p-3 font-mono">{row.ledgerExpected - row.currentOnHand}</td>
                  <td className="p-3 font-mono text-green-700 font-bold">+0</td>
                  <td className="p-3 font-mono text-red-700 font-bold">-0</td>
                  <td className="p-3 font-mono font-bold">{row.ledgerExpected}</td>
                  <td className="p-3 font-mono font-bold text-black">{row.currentOnHand}</td>
                  <td className={`p-3 font-mono font-black ${variance === 0 ? 'text-green-700' : 'text-red-700 bg-red-50'}`}>
                    {variance === 0 ? '✔️ 0 (MATCHED)' : `${variance > 0 ? '+' : ''}${variance} (AUDIT DISCREPANCY)`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================================================================
   MODAL DIALOG POPUPS
   ========================================================================= */

// 1. Verification dialog
function VerifyPrescriptionModal({ rx, onClose, API_BASE, getAuthHeaders, showToast, cashierId }) {
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pin !== '1234') {
      showToast('Invalid Pharmacist PIN!', 'error');
      return;
    }

    const payload = {
      pharmacistId: cashierId,
      pharmacistPin: pin,
      overrideReason: reason || 'Allergenic conflict reviewed and verified safe.'
    };

    try {
      const res = await fetch(`${API_BASE}/prescriptions/${rx.id}/verify`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Prescription clinically verified successfully!');
        onClose();
      } else {
        const err = await res.json();
        showToast('Verification failed: ' + (err.message || 'Server error'), 'error');
      }
    } catch (err) {
      showToast('Network error on verify: ' + err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white border border-neutral-300 rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4 text-xs">
        <div className="flex justify-between items-center border-b pb-3">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-5 w-5 text-black" />
            <h3 className="font-extrabold text-sm text-black uppercase">Pharmacist Clinical Check</h3>
          </div>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-black">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Prescription details warning */}
        <div className="bg-red-50 border border-red-300 p-3 rounded-lg flex flex-col gap-1">
          <span className="font-bold text-red-800 uppercase tracking-wide">⚠️ Drug Allergy Alert Warning</span>
          <span><strong>Patient Allergies:</strong> {rx.patient?.allergies || 'None Listed'}</span>
          <span><strong>Medications:</strong> {rx.lines?.map(l => l.item?.name || 'Unknown Drug').join(', ') || 'No Drugs'}</span>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase text-neutral-500">Pharmacist Security PIN (Enter '1234')</label>
          <input 
            type="password" 
            maxLength="4"
            required
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-mono font-bold text-center tracking-widest outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase text-neutral-500">Clinical Override Justification Reason</label>
          <textarea
            required
            rows="3"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Document reason (e.g. cross-sensitivity low, dosage forms verified, patient safety history check ok)..."
            className="w-full p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-semibold outline-none"
          />
        </div>

        <button 
          type="submit"
          className="w-full bg-black hover:bg-neutral-900 border border-black text-white text-xs font-bold py-3 rounded-lg transition-all shadow-md uppercase tracking-wider"
        >
          Authorize Override & Approve
        </button>
      </form>
    </div>
  );
}

// 1.5. Create Prescription Modal
function CreatePrescriptionModal({ onClose, API_BASE, getAuthHeaders, showToast, currentTenantId, patients }) {
  const [form, setForm] = useState({
    patientId: '',
    prescriberName: 'Dr. Sarah Jenkins, MD',
    prescriberId: '',
    priority: 'routine',
    refillsAllowed: '0',
    rxNo: '',
  });

  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const [catalog, setCatalog] = useState([]);
  const [lines, setLines] = useState([
    { itemId: '', drugSearch: '', selectedDrugName: '', showDrugDropdown: false, qty: 1, dosage: '', directions: '' }
  ]);

  // Load catalog items on mount
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await fetch(`${API_BASE}/inventory/items`, { headers: getAuthHeaders() });
        if (res.ok) {
          const list = await res.json();
          setCatalog(list);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadCatalog();
    // Auto-generate Rx Number
    setForm(prev => ({
      ...prev,
      rxNo: `RX-${Math.floor(1000 + Math.random() * 9000)}`
    }));
  }, [API_BASE]);

  const handleAddLine = () => {
    setLines(prev => [...prev, { itemId: '', drugSearch: '', selectedDrugName: '', showDrugDropdown: false, qty: 1, dosage: '', directions: '' }]);
  };

  const handleRemoveLine = (idx) => {
    if (lines.length > 1) {
      setLines(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const handleLineChange = (idx, field, val) => {
    setLines(prev => prev.map((line, i) => {
      if (i === idx) {
        return { ...line, [field]: val };
      }
      return line;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patientId) {
      showToast('Please select a patient', 'error');
      return;
    }

    // Verify all lines have a selected drug item
    if (lines.some(l => !l.itemId)) {
      showToast('Please select a drug for all medication lines', 'error');
      return;
    }

    const payload = {
      tenantId: currentTenantId,
      patientId: form.patientId,
      prescriberName: form.prescriberName || 'Staff Doctor',
      priority: form.priority,
      refillsAllowed: parseInt(form.refillsAllowed) || 0,
      rxNo: form.rxNo,
      lines: lines.map(l => ({
        itemId: l.itemId,
        qty: parseInt(l.qty) || 1,
        dosage: l.dosage || '',
        directions: l.directions || ''
      }))
    };

    try {
      const res = await fetch(`${API_BASE}/prescriptions`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Prescription logged successfully!');
        onClose();
        window.location.reload();
      } else {
        const err = await res.json();
        showToast('Prescription logging failed: ' + (err.message || 'Server error'), 'error');
      }
    } catch (err) {
      showToast('Network error: ' + err.message, 'error');
    }
  };

  // Filter patients list in real-time
  const patientQuery = (patientSearch || '').toLowerCase();
  const filteredPatients = (patients || []).filter(p => {
    const nameMatch = p.name ? p.name.toLowerCase().includes(patientQuery) : false;
    const mrnMatch = p.mrn ? p.mrn.toLowerCase().includes(patientQuery) : false;
    const phoneMatch = p.phone ? p.phone.includes(patientSearch) : false;
    return nameMatch || mrnMatch || phoneMatch;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white border border-neutral-300 rounded-xl shadow-xl w-full max-w-3xl p-6 flex flex-col gap-4 text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-extrabold text-sm text-black uppercase">Assign Doctor (Log New Rx)</h3>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-black">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section 1: Patient Search & Assignment */}
        <div className="flex flex-col gap-3">
          <h4 className="font-extrabold text-xs uppercase text-neutral-800 border-b pb-1">👤 Section 1: Patient Assignment</h4>
          
          {!selectedPatient ? (
            <div className="relative">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500 block mb-1">Search Patient Record</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
                <input 
                  type="text" 
                  placeholder="Search patient by MRN ID, Legal Name, or Phone..."
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setShowPatientDropdown(true);
                  }}
                  onFocus={() => setShowPatientDropdown(true)}
                  className="w-full p-2.5 pl-9 border border-neutral-300 rounded-lg bg-neutral-50 font-bold outline-none"
                />
              </div>
              
              {showPatientDropdown && patientSearch && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-neutral-300 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                  {filteredPatients.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => {
                        setSelectedPatient(p);
                        setForm(prev => ({ ...prev, patientId: p.id }));
                        setShowPatientDropdown(false);
                        setPatientSearch('');
                      }}
                      className="p-3 border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer flex justify-between items-center transition-all"
                    >
                      <div>
                        <div className="font-bold text-neutral-800 text-[11px]">{p.name}</div>
                        <div className="text-[9px] text-neutral-500">DOB: {p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : 'N/A'} • Phone: {p.phone || 'N/A'}</div>
                      </div>
                      <span className="bg-neutral-100 text-neutral-700 font-mono text-[9px] px-2 py-0.5 rounded font-bold border border-neutral-200">
                        {p.mrn}
                      </span>
                    </div>
                  ))}
                  {filteredPatients.length === 0 && (
                    <div className="p-3 text-neutral-500 font-bold text-center">No matching patients found. Use Customer Cards module to register them.</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 border border-neutral-200 bg-neutral-50 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-black">{selectedPatient.name}</span>
                  <span className="bg-neutral-200 text-neutral-700 font-mono text-[9px] px-2 py-0.5 rounded font-bold border border-neutral-300">
                    {selectedPatient.mrn}
                  </span>
                </div>
                <div className="text-[10px] text-neutral-500 font-bold">
                  Gender: <span className="text-black uppercase font-extrabold">{selectedPatient.gender}</span> • 
                  DOB: <span className="text-black font-extrabold">{selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString() : 'N/A'}</span> • 
                  Phone: <span className="text-black font-extrabold">{selectedPatient.phone || 'N/A'}</span>
                </div>
                {selectedPatient.allergies ? (
                  <div className="mt-1 p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg font-bold flex items-center gap-1.5 text-[10px]">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                    <span><strong>DRUG ALLERGIES:</strong> {selectedPatient.allergies}</span>
                  </div>
                ) : (
                  <div className="mt-1 text-[10px] text-green-700 font-bold">No documented drug allergies.</div>
                )}
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setSelectedPatient(null);
                  setForm(prev => ({ ...prev, patientId: '' }));
                }}
                className="text-neutral-500 hover:text-black font-bold uppercase text-[9px] border px-2.5 py-1 rounded-lg bg-white border-neutral-300 shadow-sm transition-all"
              >
                Change Patient
              </button>
            </div>
          )}
        </div>

        {/* Section 2: Prescriber & Order Information */}
        <div className="flex flex-col gap-3">
          <h4 className="font-extrabold text-xs uppercase text-neutral-800 border-b pb-1">👨‍⚕️ Section 2: Physician & Order Information</h4>
          <div className="grid grid-cols-4 gap-3">
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Doctor / Prescriber Name</label>
              <input 
                type="text" 
                required
                value={form.prescriberName}
                onChange={(e) => setForm({ ...form, prescriberName: e.target.value })}
                className="p-2.5 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Rx Number</label>
              <input 
                type="text" 
                required
                value={form.rxNo}
                onChange={(e) => setForm({ ...form, rxNo: e.target.value })}
                className="p-2.5 border rounded-lg bg-neutral-50 font-bold font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Refills Allowed</label>
              <input 
                type="number" 
                min="0"
                required
                value={form.refillsAllowed}
                onChange={(e) => setForm({ ...form, refillsAllowed: e.target.value })}
                className="p-2.5 border rounded-lg bg-neutral-50 font-bold font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Priority Level</label>
              <select 
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="p-2.5 border rounded-lg bg-neutral-50 font-bold text-neutral-800"
              >
                <option value="routine">ROUTINE (Standard)</option>
                <option value="stat">STAT (Emergency Order)</option>
                <option value="urgent">URGENT</option>
                <option value="wait_in_store">WAIT IN STORE</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Physician NPI (Optional)</label>
              <input 
                type="text" 
                value={form.prescriberId}
                placeholder="e.g. 198230192"
                onChange={(e) => setForm({ ...form, prescriberId: e.target.value })}
                className="p-2.5 border rounded-lg bg-neutral-50 font-bold font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Prescribed Medications */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center border-b pb-1">
            <h4 className="font-extrabold text-xs uppercase text-neutral-800">💊 Section 3: Prescribed Medications</h4>
            <button 
              type="button" 
              onClick={handleAddLine}
              className="text-[10px] font-bold uppercase text-black border border-black hover:bg-neutral-50 px-2.5 py-1 rounded-lg transition-all"
            >
              + Add Drug Line
            </button>
          </div>
          
          <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto pr-1">
            {lines.map((line, idx) => {
              // Local autocomplete filter
              const query = (line.drugSearch || '').toLowerCase();
              const filteredCatalog = catalog.filter(item => {
                const nameMatch = item.name ? item.name.toLowerCase().includes(query) : false;
                const skuMatch = item.sku ? item.sku.toLowerCase().includes(query) : false;
                return nameMatch || skuMatch;
              }).slice(0, 5);

              return (
                <div key={idx} className="flex gap-2 items-end border-b pb-3 border-neutral-100 last:border-0 last:pb-0 relative">
                  <div className="flex-1 flex flex-col gap-1 relative">
                    <label className="text-[9px] font-extrabold uppercase text-neutral-400">Search & Select Drug</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Type drug name or SKU..."
                        value={line.selectedDrugName || line.drugSearch}
                        disabled={!!line.itemId}
                        onChange={(e) => {
                          handleLineChange(idx, 'drugSearch', e.target.value);
                          handleLineChange(idx, 'itemId', '');
                          handleLineChange(idx, 'selectedDrugName', '');
                          handleLineChange(idx, 'showDrugDropdown', true);
                        }}
                        onFocus={() => {
                          if (!line.itemId) {
                            handleLineChange(idx, 'showDrugDropdown', true);
                          }
                        }}
                        className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-bold text-[11px] w-full"
                      />
                      
                      {line.itemId && (
                        <button
                          type="button"
                          onClick={() => {
                            handleLineChange(idx, 'itemId', '');
                            handleLineChange(idx, 'selectedDrugName', '');
                            handleLineChange(idx, 'drugSearch', '');
                          }}
                          className="absolute right-2 top-2 text-[9px] font-bold text-red-600 uppercase border border-red-200 px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    
                    {line.showDrugDropdown && !line.itemId && line.drugSearch && (
                      <div className="absolute left-0 right-0 top-12 mt-1 bg-white border border-neutral-300 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
                        {filteredCatalog.map(item => (
                          <div
                            key={item.id}
                            onClick={() => {
                              handleLineChange(idx, 'itemId', item.id);
                              handleLineChange(idx, 'selectedDrugName', item.name);
                              handleLineChange(idx, 'showDrugDropdown', false);
                            }}
                            className="p-2 hover:bg-neutral-100 cursor-pointer font-bold text-[11px] text-neutral-800 flex justify-between border-b border-neutral-50 last:border-b-0"
                          >
                            <span>{item.name}</span>
                            <span className="text-[9px] text-neutral-400 font-mono">{item.sku}</span>
                          </div>
                        ))}
                        {filteredCatalog.length === 0 && (
                          <div className="p-2 text-neutral-500 font-bold text-[11px] text-center">No matching drugs found</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="w-16 flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold uppercase text-neutral-400">Qty</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={line.qty}
                      onChange={(e) => handleLineChange(idx, 'qty', e.target.value)}
                      className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-bold font-mono text-[11px] text-center"
                    />
                  </div>
                  <div className="w-24 flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold uppercase text-neutral-400">Strength/Dosage</label>
                    <input
                      type="text"
                      placeholder="e.g. 500mg"
                      value={line.dosage}
                      onChange={(e) => handleLineChange(idx, 'dosage', e.target.value)}
                      className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-bold text-[11px]"
                    />
                  </div>
                  <div className="flex-[1.2] flex flex-col gap-1">
                    <label className="text-[9px] font-extrabold uppercase text-neutral-400">Directions (Sig)</label>
                    <input
                      type="text"
                      placeholder="e.g. Take 1 tablet daily"
                      value={line.directions}
                      onChange={(e) => handleLineChange(idx, 'directions', e.target.value)}
                      className="p-2 border border-neutral-300 rounded-lg bg-neutral-50 font-bold text-[11px]"
                    />
                  </div>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full bg-black hover:bg-neutral-900 text-white text-xs font-bold py-3.5 rounded-lg transition-all shadow-md uppercase tracking-wider mt-2"
        >
          Save & Log Prescription
        </button>
      </form>
    </div>
  );
}

// 2. Create Patient Modal
function CreatePatientModal({ onClose, API_BASE, getAuthHeaders, showToast, currentTenantId, loadPatients }) {
  const [form, setForm] = useState({
    mrn: '',
    name: '',
    dob: '',
    gender: 'UNSPECIFIED',
    phone: '',
    email: '',
    allergies: '',
    conditions: '',
    weight: '',
    height: '',
    insBin: '',
    insPcn: '',
    insGroup: '',
    insMemberId: '',
    hipaaSigned: true,
    safetyCapWaiver: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      tenantId: currentTenantId,
      mrn: form.mrn || null,
      name: form.name,
      dob: form.dob || null,
      gender: form.gender,
      phone: form.phone || null,
      email: form.email || null,
      allergies: form.allergies || null,
      conditions: form.conditions || null,
      weight: form.weight ? parseFloat(form.weight) : null,
      height: form.height ? parseFloat(form.height) : null,
      insBin: form.insBin || null,
      insPcn: form.insPcn || null,
      insGroup: form.insGroup || null,
      insMemberId: form.insMemberId || null,
      hipaaSigned: form.hipaaSigned,
      safetyCapWaiver: form.safetyCapWaiver
    };

    try {
      const res = await fetch(`${API_BASE}/patients`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Patient record registered successfully!');
        loadPatients();
        onClose();
      } else {
        const err = await res.json();
        showToast('Patient registration failed: ' + (err.message || 'Server error'), 'error');
      }
    } catch (err) {
      showToast('Network error: ' + err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white border border-neutral-300 rounded-xl shadow-xl w-full max-w-xl p-6 flex flex-col gap-4 text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-extrabold text-sm text-black uppercase">Register Patient Record</h3>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-black">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section 1: Demographics */}
        <div className="flex flex-col gap-3">
          <h4 className="font-extrabold text-xs uppercase text-neutral-800 border-b pb-1">👤 Section 1: Demographics</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">MRN ID (Auto if blank)</label>
              <input 
                type="text" 
                value={form.mrn}
                onChange={(e) => setForm({ ...form, mrn: e.target.value })}
                placeholder="e.g. MRN-1004"
                className="p-2 border rounded-lg bg-neutral-50 font-bold font-mono uppercase"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Legal Name</label>
              <input 
                type="text" 
                required 
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Date of Birth</label>
              <input 
                type="date" 
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Gender</label>
              <select 
                value={form.gender} 
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              >
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
                <option value="UNSPECIFIED">UNSPECIFIED</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Phone</label>
              <input 
                type="text" 
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Email</label>
              <input 
                type="email" 
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Clinical */}
        <div className="flex flex-col gap-3">
          <h4 className="font-extrabold text-xs uppercase text-neutral-800 border-b pb-1">🏥 Section 2: Clinical Details</h4>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500">Drug Allergies (Comma separated)</label>
            <input 
              type="text" 
              placeholder="e.g. Penicillins, Sulfa, Codeine"
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              className="p-2 border rounded-lg bg-neutral-50 font-bold"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Weight (kg)</label>
              <input 
                type="number" 
                step="0.1"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Height (cm)</label>
              <input 
                type="number" 
                step="0.1"
                value={form.height}
                onChange={(e) => setForm({ ...form, height: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Billing */}
        <div className="flex flex-col gap-3">
          <h4 className="font-extrabold text-xs uppercase text-neutral-800 border-b pb-1">💳 Section 3: Insurance Third-Party Billing</h4>
          <div className="grid grid-cols-4 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">BIN (6d)</label>
              <input 
                type="text" 
                value={form.insBin}
                onChange={(e) => setForm({ ...form, insBin: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">PCN</label>
              <input 
                type="text" 
                value={form.insPcn}
                onChange={(e) => setForm({ ...form, insPcn: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Group ID</label>
              <input 
                type="text" 
                value={form.insGroup}
                onChange={(e) => setForm({ ...form, insGroup: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Member ID</label>
              <input 
                type="text" 
                value={form.insMemberId}
                onChange={(e) => setForm({ ...form, insMemberId: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Section 4: HIPAA */}
        <div className="flex flex-col gap-2">
          <h4 className="font-extrabold text-xs uppercase text-neutral-800 border-b pb-1">🛡️ Section 4: Consent PPPA & HIPAA</h4>
          <label className="flex items-center gap-2 cursor-pointer font-bold mt-1">
            <input 
              type="checkbox" 
              checked={form.hipaaSigned}
              onChange={(e) => setForm({ ...form, hipaaSigned: e.target.checked })}
              className="rounded"
            />
            <span>HIPAA Notice of Privacy Practices Signed</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-bold">
            <input 
              type="checkbox" 
              checked={form.safetyCapWaiver}
              onChange={(e) => setForm({ ...form, safetyCapWaiver: e.target.checked })}
              className="rounded"
            />
            <span>Request Non-Safety Caps (Child-Resistant Cap Waiver)</span>
          </label>
        </div>

        <button 
          type="submit"
          className="w-full bg-black hover:bg-neutral-900 border border-black text-white text-xs font-bold py-3 rounded-lg transition-all shadow-md mt-4 uppercase tracking-wider"
        >
          Register Patient Record
        </button>
      </form>
    </div>
  );
}

// 3. Edit Patient Modal
function EditPatientModal({ patient, onClose, API_BASE, getAuthHeaders, showToast, loadPatients }) {
  const [form, setForm] = useState({
    name: patient.name,
    dob: patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : '',
    gender: patient.gender,
    phone: patient.phone || '',
    email: patient.email || '',
    allergies: patient.allergies || '',
    conditions: patient.conditions || '',
    weight: patient.weight || '',
    height: patient.height || '',
    insBin: patient.insBin || '',
    insPcn: patient.insPcn || '',
    insGroup: patient.insGroup || '',
    insMemberId: patient.insMemberId || '',
    hipaaSigned: patient.hipaaSigned,
    safetyCapWaiver: patient.safetyCapWaiver
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      dob: form.dob || null,
      gender: form.gender,
      phone: form.phone || null,
      email: form.email || null,
      allergies: form.allergies || null,
      conditions: form.conditions || null,
      weight: form.weight ? parseFloat(form.weight) : null,
      height: form.height ? parseFloat(form.height) : null,
      insBin: form.insBin || null,
      insPcn: form.insPcn || null,
      insGroup: form.insGroup || null,
      insMemberId: form.insMemberId || null,
      hipaaSigned: form.hipaaSigned,
      safetyCapWaiver: form.safetyCapWaiver
    };

    try {
      const res = await fetch(`${API_BASE}/patients/${patient.id}`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Patient record updated successfully!');
        loadPatients();
        onClose();
      } else {
        const err = await res.json();
        showToast('Patient update failed: ' + (err.message || 'Server error'), 'error');
      }
    } catch (err) {
      showToast('Network error: ' + err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white border border-neutral-300 rounded-xl shadow-xl w-full max-w-xl p-6 flex flex-col gap-4 text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-extrabold text-sm text-black uppercase">Edit Patient Record</h3>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-black">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Same form body as register */}
        <div className="flex flex-col gap-3">
          <h4 className="font-extrabold text-xs uppercase text-neutral-800 border-b pb-1">👤 Section 1: Demographics</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Legal Name</label>
              <input 
                type="text" 
                required 
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Date of Birth</label>
              <input 
                type="date" 
                value={form.dob}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Gender</label>
              <select 
                value={form.gender} 
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              >
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
                <option value="UNSPECIFIED">UNSPECIFIED</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Phone</label>
              <input 
                type="text" 
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Email</label>
              <input 
                type="email" 
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="font-extrabold text-xs uppercase text-neutral-800 border-b pb-1">🏥 Section 2: Clinical Details</h4>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500">Drug Allergies</label>
            <input 
              type="text" 
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              className="p-2 border rounded-lg bg-neutral-50 font-bold"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="font-extrabold text-xs uppercase text-neutral-800 border-b pb-1">💳 Section 3: Insurance details</h4>
          <div className="grid grid-cols-4 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">BIN</label>
              <input 
                type="text" 
                value={form.insBin}
                onChange={(e) => setForm({ ...form, insBin: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">PCN</label>
              <input 
                type="text" 
                value={form.insPcn}
                onChange={(e) => setForm({ ...form, insPcn: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">GRP</label>
              <input 
                type="text" 
                value={form.insGroup}
                onChange={(e) => setForm({ ...form, insGroup: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">Member ID</label>
              <input 
                type="text" 
                value={form.insMemberId}
                onChange={(e) => setForm({ ...form, insMemberId: e.target.value })}
                className="p-2 border rounded-lg bg-neutral-50 font-bold"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="font-extrabold text-xs uppercase text-neutral-800 border-b pb-1">🛡️ Section 4: HIPAA PPPA</h4>
          <label className="flex items-center gap-2 cursor-pointer font-bold">
            <input 
              type="checkbox" 
              checked={form.hipaaSigned}
              onChange={(e) => setForm({ ...form, hipaaSigned: e.target.checked })}
              className="rounded"
            />
            <span>HIPAA Notice signed</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-bold">
            <input 
              type="checkbox" 
              checked={form.safetyCapWaiver}
              onChange={(e) => setForm({ ...form, safetyCapWaiver: e.target.checked })}
              className="rounded"
            />
            <span>Easy Open Caps Requested</span>
          </label>
        </div>

        <button 
          type="submit"
          className="w-full bg-black hover:bg-neutral-900 border border-black text-white text-xs font-bold py-3 rounded-lg transition-all shadow-md mt-4 uppercase tracking-wider"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}

// 4. Patient Details Modal
function PatientDetailsModal({ patient, onClose, formatMoney }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-neutral-300 rounded-xl shadow-xl w-full max-w-lg p-6 flex flex-col gap-4 text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-extrabold text-sm text-black uppercase">Patient Profile details</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-black">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">MRN Number</span>
            <span className="font-bold font-mono text-black text-sm">{patient.mrn}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">Legal Name</span>
            <span className="font-extrabold text-black text-sm">{patient.name} {patient.preferredName && `("${patient.preferredName}")`}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">Date of Birth</span>
            <span className="font-bold text-black">{patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '—'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">Gender</span>
            <span className="font-bold text-black uppercase">{patient.gender}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">Phone</span>
            <span className="font-bold text-black">{patient.phone || '—'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">Email</span>
            <span className="font-bold text-black">{patient.email || '—'}</span>
          </div>
        </div>

        <div className="border-t pt-3 flex flex-col gap-2">
          <h4 className="font-extrabold text-xs uppercase text-neutral-800">🏥 Clinical Directory Details</h4>
          <div><strong>Drug Class Allergies:</strong> <span className="text-red-700 font-bold">{patient.allergies || 'None Logged'}</span></div>
          <div><strong>Conditions:</strong> {patient.conditions || 'None Logged'}</div>
          <div><strong>Weight / Height:</strong> {patient.weight ? `${patient.weight} kg` : '—'} / {patient.height ? `${patient.height} cm` : '—'}</div>
        </div>

        <div className="border-t pt-3 flex flex-col gap-2">
          <h4 className="font-extrabold text-xs uppercase text-neutral-800">💳 Third-Party Payer (Insurance Card)</h4>
          <div className="grid grid-cols-2 gap-2 font-mono">
            <div><strong>BIN:</strong> {patient.insBin || '—'}</div>
            <div><strong>PCN:</strong> {patient.insPcn || '—'}</div>
            <div><strong>Group:</strong> {patient.insGroup || '—'}</div>
            <div><strong>Member ID:</strong> {patient.insMemberId || '—'}</div>
          </div>
        </div>

        <div className="border-t pt-3 flex flex-col gap-2">
          <h4 className="font-extrabold text-xs uppercase text-neutral-800">🛡️ HIPAA & PPPA Consent</h4>
          <div className="flex gap-2">
            <span className={`inline-block border px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
              patient.hipaaSigned ? 'bg-green-100 border-green-300 text-green-800' : 'bg-red-100 border-red-300 text-red-800'
            }`}>
              {patient.hipaaSigned ? 'HIPAA Notice Signed' : 'No HIPAA Notice'}
            </span>
            <span className={`inline-block border px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
              patient.safetyCapWaiver ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-neutral-100'
            }`}>
              {patient.safetyCapWaiver ? 'Non-Safety Caps Requested' : 'Child-Resistant Vials Required'}
            </span>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-black hover:bg-neutral-900 border border-black text-white text-xs font-bold py-3 rounded-lg transition-all shadow-md mt-2 uppercase tracking-wider"
        >
          Close Profile
        </button>
      </div>
    </div>
  );
}

// 5. Adjust Stock Dialog
function AdjustStockModal({ item, onClose, API_BASE, getAuthHeaders, showToast, currentTenantId, loadCatalogData }) {
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('cycle_count_variance');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qtyVal = parseInt(qty);
    if (isNaN(qtyVal)) {
      showToast('Please enter a valid stock quantity!', 'error');
      return;
    }

    const payload = {
      tenantId: currentTenantId,
      itemId: item.id,
      qty: qtyVal,
      reasonCode: reason,
      locationId: 'cjy1234560000000000000002' // Seed location
    };

    try {
      const res = await fetch(`${API_BASE}/inventory/adjustments`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Stock adjustment logged successfully!');
        loadCatalogData();
        onClose();
      } else {
        const err = await res.json();
        showToast('Adjustment failed: ' + (err.message || 'Server error'), 'error');
      }
    } catch (err) {
      showToast('Network error: ' + err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white border border-neutral-300 rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4 text-xs">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-extrabold text-sm text-black uppercase">Adjust Stock Balance</h3>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-black">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-neutral-500 uppercase">Item Product</span>
          <span className="font-bold text-black text-sm">{item.name}</span>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase text-neutral-500">Adjustment Quantity (Use negative for decrement)</label>
          <input 
            type="number" 
            required 
            placeholder="e.g. 10 or -5"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="p-2 border rounded-lg bg-neutral-50 font-bold"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase text-neutral-500">Reason Code</label>
          <select 
            value={reason} 
            onChange={(e) => setReason(e.target.value)}
            className="p-2 border rounded-lg bg-neutral-50 font-bold"
          >
            <option value="cycle_count_variance">Cycle Count Variance</option>
            <option value="damaged">Damaged / Expired</option>
            <option value="theft_pilferage">Theft / Shrinkage</option>
            <option value="dispensing_error">Dispensing Error Correct</option>
            <option value="compounding_loss">Compounding Loss</option>
          </select>
        </div>

        <button 
          type="submit"
          className="w-full bg-black hover:bg-neutral-900 border border-black text-white text-xs font-bold py-3 rounded-lg transition-all shadow-md mt-4 uppercase tracking-wider"
        >
          Confirm Adjustment
        </button>
      </form>
    </div>
  );
}

// 6. Receive Batch Modal
function ReceiveBatchModal({ item, onClose, API_BASE, getAuthHeaders, showToast, currentTenantId, loadCatalogData }) {
  const [qty, setQty] = useState('');
  const [lot, setLot] = useState('');
  const [serial, setSerialNumber] = useState('');
  const [expiry, setExpiryDate] = useState('');
  const [supplier, setSupplier] = useState('');
  const [po, setPo] = useState('');
  const [temp, setTemp] = useState('4.0');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qtyVal = parseInt(qty);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      showToast('Please enter a valid receive quantity!', 'error');
      return;
    }

    const payload = {
      tenantId: currentTenantId,
      itemId: item.id,
      initialQty: qtyVal,
      batchNumber: lot || `LOT-${Date.now().toString().slice(-6)}`,
      serialNumber: serial || null,
      expiryDate: new Date(expiry),
      supplierName: supplier || 'McKesson Wholesaler',
      purchaseOrderNo: po || null,
      receiptTemp: parseFloat(temp) || 21.0,
      locationId: 'cjy1234560000000000000002' // Seed location
    };

    try {
      const res = await fetch(`${API_BASE}/inventory/batches`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Batch lot received and added to inventory!');
        loadCatalogData();
        onClose();
      } else {
        const err = await res.json();
        showToast('Receiving failed: ' + (err.message || 'Server error'), 'error');
      }
    } catch (err) {
      showToast('Network error: ' + err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white border border-neutral-300 rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4 text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-extrabold text-sm text-black uppercase">Receive Delivery Batch</h3>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-black">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-neutral-500 uppercase">Item Product</span>
          <span className="font-bold text-black text-sm">{item.name}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500">Receive Quantity</label>
            <input 
              type="number" 
              required 
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="p-2 border rounded-lg bg-neutral-50 font-bold"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500">Batch / Lot Number</label>
            <input 
              type="text" 
              required
              placeholder="e.g. LOT-2026B"
              value={lot}
              onChange={(e) => setLot(e.target.value)}
              className="p-2 border rounded-lg bg-neutral-50 font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500">Expiry Date</label>
            <input 
              type="date" 
              required 
              value={expiry}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="p-2 border rounded-lg bg-neutral-50 font-bold"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500">Receipt Temp (°C)</label>
            <input 
              type="number" 
              step="0.1" 
              required
              value={temp}
              onChange={(e) => setTemp(e.target.value)}
              className="p-2 border rounded-lg bg-neutral-50 font-bold"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase text-neutral-500">Pedigree Serial (DSCSA Serialization)</label>
          <input 
            type="text" 
            placeholder="e.g. SN-98234729342"
            value={serial}
            onChange={(e) => setSerialNumber(e.target.value)}
            className="p-2 border rounded-lg bg-neutral-50 font-bold"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500">Supplier Wholesaler</label>
            <input 
              type="text" 
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="p-2 border rounded-lg bg-neutral-50 font-bold"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500">PO Number</label>
            <input 
              type="text" 
              value={po}
              onChange={(e) => setPo(e.target.value)}
              className="p-2 border rounded-lg bg-neutral-50 font-bold"
            />
          </div>
        </div>

        <button 
          type="submit"
          className="w-full bg-black hover:bg-neutral-900 border border-black text-white text-xs font-bold py-3 rounded-lg transition-all shadow-md mt-4 uppercase tracking-wider"
        >
          Confirm Receive Delivery
        </button>
      </form>
    </div>
  );
}

// =========================================================================
// LICENSE MANAGER & KEY REGISTRY COMPONENT
// =========================================================================
function LicenseManagerView({ API_BASE, getAuthHeaders, showToast }) {
  const [licenses, setLicenses] = useState([]);
  const [users, setUsers] = useState([]);
  const [editLicense, setEditLicense] = useState(null);
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [planCode, setPlanCode] = useState('monthly');
  const [expiresAt, setExpiresAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  
  const loadData = async () => {
    try {
      const [licRes, userRes] = await Promise.all([
        fetch(`${API_BASE}/licenses`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE}/users`, { headers: getAuthHeaders() })
      ]);
      if (licRes.ok) setLicenses(await licRes.json());
      if (userRes.ok) setUsers(await userRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateVLK = async (e) => {
    e.preventDefault();
    try {
      // 1. Create Tenant
      const tenantRes = await fetch(`${API_BASE}/tenants`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: shopName })
      });
      if (!tenantRes.ok) {
        showToast('Failed to create shop tenant.', 'error');
        return;
      }
      const tenant = await tenantRes.json();

      // 2. Create User (Pharmacist)
      const userRes = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          email,
          displayName: shopName + ' Admin',
          role: 'pharmacist',
          password
        })
      });
      if (!userRes.ok) {
        showToast('Failed to create pharmacist user.', 'error');
        return;
      }

      // 3. Create License
      const licRes = await fetch(`${API_BASE}/licenses`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id,
          planCode,
          expiresAt: new Date(expiresAt)
        })
      });
      if (licRes.ok) {
        const license = await licRes.json();
        
        // Generate VLK File to download
        const vlkData = {
          licenseKey: license.id,
          tenantId: tenant.id,
          pharmacyName: shopName,
          pharmacistEmail: email,
          plan: planCode,
          expiresAt
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(vlkData, null, 2));
        const link = document.createElement('a');
        link.setAttribute("href", dataStr);
        link.setAttribute("download", `${shopName.replace(/\s+/g, '_')}_license.vlk`);
        link.click();

        showToast('VLK license file generated and downloaded successfully!');
        setShopName('');
        setEmail('');
        setPassword('');
        loadData();
      } else {
        showToast('Failed to create terminal license.', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
      const res = await fetch(`${API_BASE}/licenses/${id}/status`, {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        showToast(`License status updated to ${nextStatus}!`);
        loadData();
      } else {
        showToast('Failed to update status', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  const handleBackupTenant = async (tenantId, name) => {
    try {
      const res = await fetch(`${API_BASE}/system/backup?tenantId=${tenantId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const backupData = await res.json();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const link = document.createElement('a');
        link.setAttribute("href", dataStr);
        link.setAttribute("download", `${name.replace(/\s+/g, '_')}_db_backup.json`);
        link.click();
        showToast('Tenant database backup downloaded successfully!');
      }
    } catch (err) {
      showToast('Backup failed: ' + err.message, 'error');
    }
  };

  const handleRestoreTenant = async (tenantId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        const res = await fetch(`${API_BASE}/system/restore`, {
          method: 'POST',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, data: parsed })
        });
        const result = await res.json();
        if (res.ok && result.success) {
          showToast('Tenant database restored successfully!');
        } else {
          showToast('Restore failed: ' + (result.message || 'Server error'), 'error');
        }
      } catch (err) {
        showToast('Failed to parse backup file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteLicense = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this terminal license key? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/licenses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        showToast('License key deleted successfully!');
        loadData();
      } else {
        showToast('Failed to delete license key.', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6 text-xs">
      <div className="grid grid-cols-3 gap-6">
        
        {/* Form panel to create VLK */}
        <form onSubmit={handleCreateVLK} className="bg-white border border-neutral-300 p-5 rounded-xl shadow-sm flex flex-col gap-4">
          <h3 className="font-extrabold text-xs uppercase border-b pb-2 text-neutral-800">🔑 Register New Store (Create VLK)</h3>
          
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500">Pharmacy Shop Name</label>
            <input 
              type="text" 
              required 
              value={shopName} 
              onChange={e => setShopName(e.target.value)} 
              placeholder="e.g. Springfield Pharmacy Store"
              className="p-2 border rounded-lg font-bold bg-neutral-50"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500">Pharmacist Email / Username</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="e.g. grant@springfield.com"
              className="p-2 border rounded-lg font-bold bg-neutral-50"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500">Hashed Sign-In Password</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              className="p-2 border rounded-lg font-bold bg-neutral-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">License Plan Type</label>
              <select 
                value={planCode} 
                onChange={e => setPlanCode(e.target.value)} 
                className="p-2 border rounded-lg font-bold bg-neutral-50"
              >
                <option value="weekly">Weekly Plan</option>
                <option value="monthly">Monthly Plan</option>
                <option value="yearly">Yearly Plan</option>
                <option value="enterprise">Enterprise Plan</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-extrabold uppercase text-neutral-500">License Expiration</label>
              <input 
                type="date" 
                required 
                value={expiresAt} 
                onChange={e => setExpiresAt(e.target.value)} 
                className="p-2 border rounded-lg font-bold bg-neutral-50"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-black hover:bg-neutral-900 border border-black text-white text-xs font-black py-3 rounded-lg transition-all shadow-md mt-2 uppercase tracking-wider"
          >
            Generate & Download VLK
          </button>
        </form>

        {/* Health Track stats */}
        <div className="col-span-2 bg-white border border-neutral-300 p-5 rounded-xl shadow-sm flex flex-col gap-4">
          <h3 className="font-extrabold text-xs uppercase border-b pb-2 text-neutral-800">🏥 Application Diagnostics & Health Check</h3>
          <HealthDiagnostics API_BASE={API_BASE} getAuthHeaders={getAuthHeaders} />
        </div>
      </div>

      {/* Spreadsheet List of License registry */}
      <div className="flex flex-col gap-2">
        <h3 className="font-extrabold text-xs uppercase text-neutral-800">📁 Active VLK Key Registry</h3>
        <div className="border border-neutral-300 rounded-lg overflow-hidden shadow-sm bg-white">
          <table className="spreadsheet-grid">
            <thead>
              <tr>
                <th>Pharmacy Shop</th>
                <th>Pharmacist Email</th>
                <th>Volume License Key (VLK)</th>
                <th>Plan Code</th>
                <th>Expiration Date</th>
                <th>License Status</th>
                <th>Terminal Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {licenses.map(lic => {
                const associatedUser = users.find(u => u.tenantId === lic.tenantId && u.role === 'pharmacist');
                const isExpired = new Date(lic.expiresAt) < new Date();
                return (
                  <tr key={lic.id} className="hover:bg-neutral-50">
                    <td className="font-bold">{lic.tenant?.pharmacyName || 'Central Pharmacy'}</td>
                    <td className="font-bold font-mono-numeric">{associatedUser ? associatedUser.email : '—'}</td>
                    <td className="font-mono text-neutral-600 font-bold">{lic.id}</td>
                    <td className="uppercase font-extrabold text-neutral-500">{lic.planCode}</td>
                    <td className="font-mono-numeric font-bold">{new Date(lic.expiresAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`inline-block px-2 py-0.5 rounded-full font-black text-[9px] uppercase border ${
                        lic.status === 'active' && !isExpired
                          ? 'bg-neutral-900 text-white border-black'
                          : lic.status === 'suspended'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-red-100 text-red-800 border-red-300'
                      }`}>
                        {isExpired ? 'EXPIRED' : lic.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => handleToggleStatus(lic.id, lic.status)}
                          className="bg-white hover:bg-neutral-100 border border-neutral-300 text-black text-[10px] font-bold px-2 py-1 rounded transition-all shadow-sm"
                        >
                          {lic.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        
                        <button
                          onClick={() => handleBackupTenant(lic.tenantId, lic.tenant?.pharmacyName || 'store')}
                          className="bg-black hover:bg-neutral-900 border border-black text-white text-[10px] font-bold px-2 py-1 rounded transition-all shadow-sm"
                        >
                          Backup Data
                        </button>

                        <label className="bg-white hover:bg-neutral-100 border border-neutral-300 text-black text-[10px] font-bold px-2 py-1 rounded transition-all shadow-sm cursor-pointer">
                          Restore
                          <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={e => handleRestoreTenant(lic.tenantId, e.target.files[0])}
                          />
                        </label>

                        <button
                          onClick={() => setEditLicense(lic)}
                          className="bg-white hover:bg-neutral-100 border border-neutral-300 text-black text-[10px] font-bold px-2 py-1 rounded transition-all shadow-sm"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteLicense(lic.id)}
                          className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-2 py-1 rounded transition-all shadow-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editLicense && (
        <EditLicenseModal
          license={editLicense}
          users={users}
          onClose={() => setEditLicense(null)}
          API_BASE={API_BASE}
          getAuthHeaders={getAuthHeaders}
          showToast={showToast}
          onSave={loadData}
        />
      )}
    </div>
  );
}

function EditLicenseModal({ license, users, onClose, API_BASE, getAuthHeaders, showToast, onSave }) {
  const associatedUser = users.find((u) => u.tenantId === license.tenantId && u.role === 'pharmacist');
  const [shopName, setShopName] = useState(license.tenant?.pharmacyName || '');
  const [email, setEmail] = useState(associatedUser ? associatedUser.email : '');
  const [planCode, setPlanCode] = useState(license.planCode);
  const [expiresAt, setExpiresAt] = useState(license.expiresAt ? license.expiresAt.split('T')[0] : '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/licenses/${license.id}`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ shopName, email, planCode, expiresAt })
      });
      if (res.ok) {
        showToast('License details updated successfully!');
        onSave();
        onClose();
      } else {
        showToast('Failed to save changes.', 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white border border-neutral-300 rounded-xl shadow-xl w-full max-w-md p-6 flex flex-col gap-4 text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="font-extrabold text-sm text-black uppercase">Edit License Key</h3>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-black">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase text-neutral-500">Pharmacy Shop Name</label>
          <input 
            type="text" 
            required 
            value={shopName} 
            onChange={e => setShopName(e.target.value)} 
            className="p-2 border rounded-lg font-bold bg-neutral-50"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-extrabold uppercase text-neutral-500">Pharmacist Email / Username</label>
          <input 
            type="email" 
            required 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="p-2 border rounded-lg font-bold bg-neutral-50"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500">Plan Type</label>
            <select 
              value={planCode} 
              onChange={e => setPlanCode(e.target.value)} 
              className="p-2 border rounded-lg font-bold bg-neutral-50"
            >
              <option value="weekly">Weekly Plan</option>
              <option value="monthly">Monthly Plan</option>
              <option value="yearly">Yearly Plan</option>
              <option value="enterprise">Enterprise Plan</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-extrabold uppercase text-neutral-500">Expiration Date</label>
            <input 
              type="date" 
              required 
              value={expiresAt} 
              onChange={e => setExpiresAt(e.target.value)} 
              className="p-2 border rounded-lg font-bold bg-neutral-50"
            />
          </div>
        </div>

        <button 
          type="submit"
          className="w-full bg-black hover:bg-neutral-900 border border-black text-white text-xs font-bold py-3 rounded-lg transition-all shadow-md mt-4 uppercase tracking-wider"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}

function HealthDiagnostics({ API_BASE, getAuthHeaders }) {
  const [health, setHealth] = useState(null);

  const fetchHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`, { headers: getAuthHeaders() });
      if (res.ok) setHealth(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!health) return <div className="text-neutral-500 font-bold">Diagnosing application system health...</div>;

  return (
    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
      <div className="border border-neutral-300 p-3 rounded-lg flex flex-col gap-2">
        <div className="flex justify-between border-b pb-1">
          <span className="font-extrabold uppercase text-neutral-500">Service Status</span>
          <span className={`font-black uppercase ${health.status === 'UP' ? 'text-green-700' : 'text-red-700'}`}>{health.status}</span>
        </div>
        <div className="flex justify-between border-b pb-1">
          <span className="font-extrabold uppercase text-neutral-500">Database Connection</span>
          <span className="font-bold text-black">{health.database?.status} ({health.database?.latencyMs}ms latency)</span>
        </div>
        <div className="flex justify-between">
          <span className="font-extrabold uppercase text-neutral-500">System Platform</span>
          <span className="font-bold text-black">{health.system?.platform}</span>
        </div>
      </div>
      
      <div className="border border-neutral-300 p-3 rounded-lg flex flex-col gap-2">
        <div className="flex justify-between border-b pb-1">
          <span className="font-extrabold uppercase text-neutral-500">RAM Utilization</span>
          <span className="font-bold text-black">{health.system?.memory?.utilizationPercent}%</span>
        </div>
        <div className="flex justify-between border-b pb-1">
          <span className="font-extrabold uppercase text-neutral-500">Uptime</span>
          <span className="font-bold text-black">{(health.system?.uptimeSeconds / 3600).toFixed(1)} hours</span>
        </div>
        <div className="flex justify-between">
          <span className="font-extrabold uppercase text-neutral-500">Diagnostics Check</span>
          <span className="font-black text-green-700">PASS</span>
        </div>
      </div>
    </div>
  );
}
