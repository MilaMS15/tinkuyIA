import { Product } from './models/Product.js';
import { Store, INITIAL_STORES } from './models/Store.js';
import { PurchaseOrder } from './models/PurchaseOrder.js';
import { StorageService } from './services/StorageService.js';
import { OcrEngine } from './services/OcrEngine.js';
import { TrafficLightService } from './services/TrafficLightService.js';
import { PosterService } from './services/PosterService.js';
import { FinancialScoreService } from './services/FinancialScoreService.js';
import { EconomicsService } from './services/EconomicsService.js';

class TinkuyAppController {
  constructor() {
    this.state = StorageService.loadData();
    this.stores = INITIAL_STORES;
    this.currentStoreId = 'consolidated';
    this.currentRole = 'duena';
    this.currentCategory = 'all';
    this.currentDevice = 'desktop';
    this.activeTab = 'step1';
    this.abcChartInstance = null;
    this.activeCombo = null;

    // Real Camera Stream reference
    this.cameraStream = null;

    // Real Speech Recognition reference
    this.speechRecognizer = null;
  }

  init() {
    this.bindEvents();
    this.renderHeader();
    this.renderInventoryTable();
    this.renderInventoryMobileCards();
    this.updateTrafficLightView();
    this.renderRescueCombo();
    this.renderPurchaseOrders();
    this.renderFinancialScore();
    this.calculateAndRenderEconomics();
    this.updateGeminiStatusBadge();

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  bindEvents() {
    const storeSel = document.getElementById('storeSelector');
    if (storeSel) {
      storeSel.value = this.currentStoreId;
      storeSel.addEventListener('change', (e) => this.setStore(e.target.value));
    }

    const roleSel = document.getElementById('roleSelector');
    if (roleSel) {
      roleSel.value = this.currentRole;
      roleSel.addEventListener('change', (e) => this.setRole(e.target.value));
    }

    const catSel = document.getElementById('categoryFilter');
    if (catSel) {
      catSel.addEventListener('change', (e) => this.setCategory(e.target.value));
    }

    const headlineSel = document.getElementById('posterHeadlineSelect');
    if (headlineSel) {
      headlineSel.addEventListener('change', () => this.updatePoster());
    }

    // Economics Sliders with persistence
    ['sliderSales', 'sliderCogs', 'sliderOpex', 'sliderHourlyRate', 'sliderHoursSpent'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => this.calculateAndRenderEconomics(true));
      }
    });

    // Load saved economics values
    if (this.state.economics) {
      const e = this.state.economics;
      if (document.getElementById('sliderSales')) document.getElementById('sliderSales').value = e.sales || 12000;
      if (document.getElementById('sliderCogs')) document.getElementById('sliderCogs').value = e.cogs || 50;
      if (document.getElementById('sliderOpex')) document.getElementById('sliderOpex').value = e.opex || 2800;
      if (document.getElementById('sliderHourlyRate')) document.getElementById('sliderHourlyRate').value = e.hourlyRate || 25;
      if (document.getElementById('sliderHoursSpent')) document.getElementById('sliderHoursSpent').value = e.hoursSpent || 35;
    }
  }

  // --- PERSISTENCIA LOCALSTORAGE ---
  save() {
    StorageService.saveData(this.state);
    this.renderHeader();
    this.renderInventoryTable();
    this.renderInventoryMobileCards();
    this.updateTrafficLightView();
  }

  getFilteredProducts() {
    return this.state.products.filter(p => {
      const matchStore = this.currentStoreId === 'consolidated' || p.storeId === this.currentStoreId;
      const matchCat = this.currentCategory === 'all' || p.category === this.currentCategory;
      return matchStore && matchCat;
    });
  }

  // --- STORE & ROLE ---
  setStore(storeId) {
    this.currentStoreId = storeId;
    const store = this.stores.find(s => s.id === storeId);
    const label = store ? store.name : 'Consolidado General';
    
    const bannerEl = document.getElementById('bannerStoreName');
    if (bannerEl) bannerEl.textContent = label;

    this.renderInventoryTable();
    this.renderInventoryMobileCards();
    this.updateTrafficLightView();
    this.showToast(`Local: ${label}`);
  }

  setRole(role) {
    this.currentRole = role;
    const userNameEl = document.getElementById('userNameLabel');

    if (role === 'vendedora') {
      if (userNameEl) userNameEl.textContent = 'Karina (Vendedora)';
      this.switchTab('step1');
      this.showToast('Modo Vendedora: Registro rápido de cuaderno');
    } else {
      if (userNameEl) userNameEl.textContent = 'Sofía (Dueña)';
      this.showToast('Modo Dueña: Control total y compras');
    }
  }

  setCategory(cat) {
    this.currentCategory = cat;
    this.renderInventoryTable();
    this.renderInventoryMobileCards();
    this.updateTrafficLightView();
  }

  // --- TOGGLE VISTA MÓVIL / ESCRITORIO ---
  setDeviceMode(mode) {
    this.currentDevice = mode;
    const container = document.getElementById('deviceContainer');
    const btnDesktop = document.getElementById('btnViewDesktop');
    const btnMobile = document.getElementById('btnViewMobile');

    if (mode === 'mobile') {
      container.classList.add('is-mobile-simulation');
      document.body.classList.add('is-mobile-view');

      if (btnMobile) btnMobile.className = 'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all bg-white text-tinkuy-forest shadow-sm';
      if (btnDesktop) btnDesktop.className = 'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all text-slate-600 hover:text-tinkuy-forest';
      this.showToast('Simulador Celular PWA activado');
    } else {
      container.classList.remove('is-mobile-simulation');
      document.body.classList.remove('is-mobile-view');

      if (btnDesktop) btnDesktop.className = 'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all bg-white text-tinkuy-forest shadow-sm';
      if (btnMobile) btnMobile.className = 'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all text-slate-600 hover:text-tinkuy-forest';
      this.showToast('Vista Computadora activada');
    }

    setTimeout(() => {
      this.initChart();
      this.updatePoster();
      if (window.lucide) window.lucide.createIcons();
    }, 120);
  }

  renderHeader() {
    const analysis = TrafficLightService.analyzeInventory(this.getFilteredProducts());
    const frozenEl = document.getElementById('headerFrozenMoney');
    if (frozenEl) frozenEl.textContent = `S/ ${analysis.totalFrozenCapital.toFixed(2)}`;

    const streakEl = document.getElementById('streakDays');
    if (streakEl) streakEl.textContent = `${this.state.streakDays}d`;

    const scoreObj = FinancialScoreService.calculateScore({
      streakDays: this.state.streakDays,
      inventoryHealth: 88,
      averageMargin: 46
    });

    const scoreVal = document.getElementById('headerScoreValue');
    if (scoreVal) scoreVal.textContent = scoreObj.totalScore;
  }

  // --- TAB NAVIGATION ---
  switchTab(tabId) {
    this.activeTab = tabId;

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('bg-tinkuy-coral', 'text-white', 'shadow-soft');
      btn.classList.add('bg-white', 'text-slate-600');
    });
    const activeTopBtn = document.getElementById(`tab-${tabId}`);
    if (activeTopBtn) {
      activeTopBtn.classList.remove('bg-white', 'text-slate-600');
      activeTopBtn.classList.add('bg-tinkuy-coral', 'text-white', 'shadow-soft');
    }

    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      btn.classList.remove('text-tinkuy-coral', 'font-bold');
      btn.classList.add('text-slate-400');
      const dot = btn.querySelector('.nav-indicator');
      if (dot) dot.classList.add('hidden');
    });

    const activeMobBtn = document.getElementById(`mob-nav-${tabId}`);
    if (activeMobBtn) {
      activeMobBtn.classList.remove('text-slate-400');
      activeMobBtn.classList.add('text-tinkuy-coral', 'font-bold');
      const dot = activeMobBtn.querySelector('.nav-indicator');
      if (dot) dot.classList.remove('hidden');
    }

    document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
    const pane = document.getElementById(`pane-${tabId}`);
    if (pane) pane.classList.remove('hidden');

    const wrapper = document.getElementById('viewWrapper');
    if (wrapper) wrapper.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabId === 'step2') {
      setTimeout(() => this.initChart(), 100);
    } else if (tabId === 'step3') {
      setTimeout(() => this.updatePoster(), 100);
    }

    if (window.lucide) window.lucide.createIcons();
  }

  // =========================================================================
  // CÁMARA REAL EN VIVO (WEBCAM / CÁMARA DEL CELULAR)
  // =========================================================================
  async openLiveCamera() {
    const modal = document.getElementById('liveCameraModal');
    const video = document.getElementById('cameraVideoFeed');
    if (!modal || !video) return;

    modal.classList.remove('hidden');

    try {
      // Solicitar cámara trasera en celular o webcam en PC
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      this.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = this.cameraStream;
      await video.play();
      this.showToast('Cámara iniciada');
    } catch (err) {
      console.warn('No se pudo acceder a la cámara:', err);
      this.closeLiveCamera();
      // Fallback a file picker directo
      document.getElementById('fileUpload')?.click();
      this.showToast('Abriendo selector de fotos...');
    }
  }

  captureCameraSnapshot() {
    const video = document.getElementById('cameraVideoFeed');
    if (!video || !this.cameraStream) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const snapshotDataUrl = canvas.toDataURL('image/jpeg', 0.88);

    // Detener cámara y cerrar modal
    this.closeLiveCamera();

    // Procesar la foto tomada
    this.processCapturedPhoto(snapshotDataUrl, 'Cámara en Vivo');
  }

  closeLiveCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    const modal = document.getElementById('liveCameraModal');
    if (modal) modal.classList.add('hidden');
  }

  // --- SUBIDA DE ARCHIVO / FOTO ---
  handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.processCapturedPhoto(e.target.result, file.name);
    };
    reader.readAsDataURL(file);
  }

  // --- PRESETS RÁPIDOS ---
  async loadPreset(presetType) {
    const sampleUrl = OcrEngine.generateSampleImage(presetType);
    await this.processCapturedPhoto(sampleUrl, presetType);
  }

  // Procesamiento unificado de foto (con Gemini o Motor Local)
  async processCapturedPhoto(imageDataUrl, label = 'Foto') {
    const card = document.getElementById('ocrScanningCard');
    const previewImg = document.getElementById('ocrPreviewImg');
    const badge = document.getElementById('scanProgressBadge');

    if (card) card.classList.remove('hidden');
    if (previewImg) previewImg.src = imageDataUrl;
    
    const hasKey = StorageService.getGeminiApiKey().length > 10;
    if (badge) {
      badge.textContent = hasKey
        ? 'Analizando con Gemini 1.5 Flash Vision...'
        : 'Analizando con Visión Local y Gobierno de Datos...';
    }

    try {
      const result = await OcrEngine.processImage(imageDataUrl, label);

      if (badge) {
        badge.textContent = result.source === 'gemini-1.5-flash'
          ? 'Procesado con Gemini AI en tiempo real ✓'
          : 'Extracción completada con Motor Local ✓';
      }

      const doubtContainer = document.getElementById('humanInTheLoopAlert');
      if (result.doubtItem && doubtContainer) {
        doubtContainer.classList.remove('hidden');
      }

      // Guardar productos nuevos en localStorage
      result.items.forEach(newItem => {
        const exists = this.state.products.some(p => p.name.toLowerCase() === newItem.name.toLowerCase() && p.storeId === newItem.storeId);
        if (!exists) {
          this.state.products.unshift(newItem);
        }
      });
      this.save();
      this.showToast('¡Foto procesada y guardada en LocalStorage!');

      const dataCard = document.getElementById('extractedDataCard');
      if (dataCard) dataCard.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      console.error('Error procesando imagen:', e);
      this.showToast('Error procesando foto, intente nuevamente');
    }
  }

  // --- HUMAN IN THE LOOP ---
  resolveDoubt(confirmedPrice) {
    const doubtAlert = document.getElementById('humanInTheLoopAlert');
    if (doubtAlert) {
      doubtAlert.innerHTML = `
        <div class="flex items-center gap-2 text-emerald-800 font-semibold text-xs">
          <i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i>
          <span>Precio validado a <strong>S/ ${confirmedPrice.toFixed(2)}</strong>. Guardado en memoria.</span>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
    this.showToast(`Precio validado: S/ ${confirmedPrice.toFixed(2)}`);
  }

  // =========================================================================
  // AUDIO DE RESCATE (MICRÓFONO REAL CON SPEECH RECOGNITION DE BROWSER)
  // =========================================================================
  triggerAudioRescue() {
    const modal = document.getElementById('audioRescueModal');
    if (modal) modal.classList.remove('hidden');
    const trans = document.getElementById('audioTranscript');
    const input = document.getElementById('audioTextInput');

    if (trans) trans.textContent = "🎙️ Escuchando... Habla claro (ej: 'Eran 6 blusas a 35 soles')";

    // Iniciar reconocimiento de voz real del navegador si está disponible
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.speechRecognizer = new SpeechRecognition();
        this.speechRecognizer.lang = 'es-PE';
        this.speechRecognizer.continuous = false;
        this.speechRecognizer.interimResults = true;

        this.speechRecognizer.onresult = (event) => {
          const text = Array.from(event.results).map(r => r[0].transcript).join('');
          if (trans) trans.textContent = `Transcrito: "${text}"`;
          if (input) input.value = text;
        };

        this.speechRecognizer.onerror = (e) => {
          console.warn('Speech error:', e);
          if (trans) trans.textContent = "Usa el teclado para escribir la corrección:";
        };

        this.speechRecognizer.start();
      } catch (err) {
        console.warn('No se pudo activar speech recognition:', err);
      }
    } else {
      if (trans) trans.textContent = "Tu navegador no soporta micrófono directo. Escribe la corrección:";
    }
  }

  confirmAudioRescue() {
    const input = document.getElementById('audioTextInput');
    const val = input ? input.value : '';

    // Extraer precio del texto (ej: "35 soles" -> 35)
    const match = val.match(/(\d+(\.\d+)?)/);
    const price = match ? parseFloat(match[1]) : 35;

    this.closeAudioModal();
    this.resolveDoubt(price);
  }

  closeAudioModal() {
    if (this.speechRecognizer) {
      try { this.speechRecognizer.stop(); } catch (e) {}
      this.speechRecognizer = null;
    }
    const modal = document.getElementById('audioRescueModal');
    if (modal) modal.classList.add('hidden');
  }

  // =========================================================================
  // CONFIGURACIÓN DE GEMINI API KEY GRATIS (LOCALSTORAGE)
  // =========================================================================
  openGeminiKeyModal() {
    const modal = document.getElementById('geminiKeyModal');
    const input = document.getElementById('geminiApiKeyInput');
    if (input) input.value = StorageService.getGeminiApiKey();
    if (modal) modal.classList.remove('hidden');
  }

  closeGeminiKeyModal() {
    const modal = document.getElementById('geminiKeyModal');
    if (modal) modal.classList.add('hidden');
  }

  saveGeminiApiKey() {
    const input = document.getElementById('geminiApiKeyInput');
    const key = input ? input.value.trim() : '';

    StorageService.saveGeminiApiKey(key);
    this.updateGeminiStatusBadge();
    this.closeGeminiKeyModal();

    if (key) {
      this.showToast('API Key de Gemini guardada en tu LocalStorage');
    } else {
      this.showToast('Usando Motor Local Offline de Contingencia');
    }
  }

  updateGeminiStatusBadge() {
    const key = StorageService.getGeminiApiKey();
    const badge = document.getElementById('geminiStatusBadge');
    if (!badge) return;

    if (key && key.length > 10) {
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400"></span> <span>Gemini 1.5 Activo</span>`;
      badge.className = 'px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold flex items-center gap-1 border border-emerald-200 cursor-pointer';
    } else {
      badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span> <span>Motor Local (Offline)</span>`;
      badge.className = 'px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold flex items-center gap-1 border border-amber-200 cursor-pointer';
    }
  }

  // --- RENDER TABLE & MOBILE CARDS ---
  renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const prods = this.getFilteredProducts();
    const countEl = document.getElementById('totalItemsCount');
    if (countEl) countEl.textContent = `${prods.length} items`;

    prods.forEach(p => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';

      let statusBadge = '';
      if (p.status === 'frozen') {
        statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">🔴 Estancado (${p.daysStagnant}d)</span>`;
      } else if (p.status === 'star') {
        statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">🟢 Estrella (&lt;7d)</span>`;
      } else {
        statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">🟡 Normal (${p.daysStagnant}d)</span>`;
      }

      const storeName = p.storeId === 'guisado' ? 'Guisado #104' : p.storeId === 'el_rey' ? 'El Rey #215' : 'Almacén';

      tr.innerHTML = `
        <td class="px-3 py-2.5 font-bold text-slate-800">
          ${p.name}
          <span class="block text-[10px] font-normal text-slate-400 capitalize">${p.category}</span>
        </td>
        <td class="px-3 py-2.5 text-slate-600">${p.variants || 'Estándar'}</td>
        <td class="px-3 py-2.5"><span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">${storeName}</span></td>
        <td class="px-3 py-2.5 text-right font-bold ${p.stock <= 5 ? 'text-red-600' : 'text-slate-800'}">${p.stock}</td>
        <td class="px-3 py-2.5 text-right text-slate-600">S/ ${p.costUnit.toFixed(2)}</td>
        <td class="px-3 py-2.5 text-right font-semibold text-tinkuy-forest">S/ ${p.priceSale.toFixed(2)}</td>
        <td class="px-3 py-2.5 text-center">${statusBadge}</td>
        <td class="px-3 py-2.5 text-center">
          <button onclick="window.tinkuyApp.deleteProduct('${p.id}')" class="text-slate-400 hover:text-red-500 transition p-1" title="Eliminar">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  renderInventoryMobileCards() {
    const container = document.getElementById('inventoryMobileCards');
    if (!container) return;
    container.innerHTML = '';

    const prods = this.getFilteredProducts();

    prods.forEach(p => {
      const card = document.createElement('div');
      card.className = 'p-3 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1.5';

      let statusPill = '';
      if (p.status === 'frozen') {
        statusPill = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">🔴 Estancado (${p.daysStagnant}d)</span>`;
      } else if (p.status === 'star') {
        statusPill = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">🟢 Estrella</span>`;
      } else {
        statusPill = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">🟡 Normal</span>`;
      }

      const storeName = p.storeId === 'guisado' ? 'Guisado' : p.storeId === 'el_rey' ? 'El Rey' : 'Almacén';

      card.innerHTML = `
        <div class="flex items-start justify-between gap-1.5">
          <div class="min-w-0 flex-1">
            <h5 class="font-bold text-xs text-slate-800 truncate">${p.name}</h5>
            <p class="text-[10px] text-slate-500 mt-0.5">${p.variants || 'Estándar'} · <span class="font-semibold text-tinkuy-forest">${storeName}</span></p>
          </div>
          ${statusPill}
        </div>
        <div class="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
          <div class="flex items-center gap-2">
            <span class="text-slate-500 text-[11px]">Stock: <strong class="${p.stock <= 5 ? 'text-red-600' : 'text-slate-800'}">${p.stock}</strong></span>
            <span class="text-slate-500 text-[11px]">Costo: <strong>S/ ${p.costUnit.toFixed(2)}</strong></span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-xs text-tinkuy-forest">S/ ${p.priceSale.toFixed(2)}</span>
            <button onclick="window.tinkuyApp.deleteProduct('${p.id}')" class="p-1 text-slate-400 hover:text-red-500">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  deleteProduct(id) {
    if (!confirm('¿Deseas retirar este registro de tu inventario?')) return;
    this.state.products = this.state.products.filter(p => p.id !== id);
    this.save();
    this.showToast('Producto retirado de LocalStorage');
  }

  openManualAddModal() {
    const modal = document.getElementById('manualAddModal');
    if (modal) modal.classList.remove('hidden');
  }
  closeManualAddModal() {
    const modal = document.getElementById('manualAddModal');
    if (modal) modal.classList.add('hidden');
  }
  handleManualAdd(event) {
    event.preventDefault();
    const newP = new Product({
      name: document.getElementById('mName').value,
      category: document.getElementById('mCategory').value,
      variants: document.getElementById('mVariants').value || 'Estándar',
      storeId: document.getElementById('mStore').value,
      stock: document.getElementById('mStock').value,
      costUnit: document.getElementById('mCost').value,
      priceSale: document.getElementById('mPrice').value,
      daysStagnant: 1,
      status: 'normal',
      dataQualityScore: 99
    });

    this.state.products.unshift(newP);
    this.save();
    this.closeManualAddModal();
    this.showToast('Producto guardado en LocalStorage');
  }

  // --- STEP 2: SEMÁFORO DEL DINERO ---
  updateTrafficLightView() {
    const prods = this.getFilteredProducts();
    const analysis = TrafficLightService.analyzeInventory(prods);

    const frozenTotal = document.getElementById('statFrozenTotal');
    if (frozenTotal) frozenTotal.textContent = `S/ ${analysis.totalFrozenCapital.toFixed(2)}`;

    const normalTotal = document.getElementById('statNormalTotal');
    if (normalTotal) normalTotal.textContent = `S/ ${analysis.totalNormalValue.toFixed(2)}`;

    const starTotal = document.getElementById('statStarTotal');
    if (starTotal) starTotal.textContent = `${analysis.starItems.length} prods`;

    if (this.abcChartInstance) {
      this.abcChartInstance.data.datasets[0].data = analysis.abcDistribution;
      this.abcChartInstance.update();
    }
  }

  initChart() {
    const canvas = document.getElementById('abcChartCanvas');
    if (!canvas || !window.Chart) return;

    if (this.abcChartInstance) {
      this.abcChartInstance.destroy();
    }

    const prods = this.getFilteredProducts();
    const analysis = TrafficLightService.analyzeInventory(prods);

    this.abcChartInstance = new window.Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['En Alerta (Capital Congelado)', 'Rotación Normal', 'Reabastecer / Estrella'],
        datasets: [{
          data: analysis.abcDistribution,
          backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Plus Jakarta Sans', size: 10 } }
          }
        },
        cutout: '65%'
      }
    });
  }

  // --- STEP 3: RESCATE ---
  renderRescueCombo() {
    const prods = this.getFilteredProducts();
    const analysis = TrafficLightService.analyzeInventory(prods);
    this.activeCombo = PosterService.suggestCombo(analysis.frozenItems, analysis.starItems);

    const stagName = document.getElementById('comboStagnantName');
    if (stagName) stagName.textContent = this.activeCombo.stagnant.name;

    const starName = document.getElementById('comboStarName');
    if (starName) starName.textContent = this.activeCombo.star.name;

    const offerPrice = document.getElementById('comboOfferPrice');
    if (offerPrice) offerPrice.textContent = `S/ ${this.activeCombo.suggestedComboPrice.toFixed(2)}`;

    const copyText = PosterService.generateWhatsAppCopy(this.activeCombo);
    const copyEl = document.getElementById('whatsappMessageText');
    if (copyEl) copyEl.textContent = copyText;

    const shareBtn = document.getElementById('whatsappShareLink');
    if (shareBtn) shareBtn.href = `https://wa.me/?text=${encodeURIComponent(copyText)}`;

    this.updatePoster();
  }

  updatePoster() {
    const canvas = document.getElementById('posterCanvas');
    const headlineSel = document.getElementById('posterHeadlineSelect');
    const headline = headlineSel ? headlineSel.value : '¡OFERTA RELÁMPAGO DE HOY! 🔥';

    if (canvas && this.activeCombo) {
      PosterService.renderToCanvas(canvas, this.activeCombo, headline);
    }
  }

  downloadPoster() {
    const canvas = document.getElementById('posterCanvas');
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = 'Tinkuy_Afiche_Rescate.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
    this.showToast('Afiche descargado como imagen PNG');
  }

  generateNewComboAI() {
    const prods = this.getFilteredProducts();
    const frozen = prods.filter(p => p.status === 'frozen');
    const star = prods.filter(p => p.status === 'star');

    this.activeCombo = {
      stagnant: frozen[1] || frozen[0] || { name: 'Pantalón Flare Drill Verde', costUnit: 30, priceSale: 60, variants: 'Talla 28' },
      star: star[1] || star[0] || { name: 'Top Rib Básico Colores', costUnit: 12, priceSale: 25, variants: 'Estándar' },
      totalOriginalPrice: 85.0,
      totalCost: 42.0,
      suggestedComboPrice: 49.90,
      profit: 7.90
    };

    const stagName = document.getElementById('comboStagnantName');
    if (stagName) stagName.textContent = this.activeCombo.stagnant.name;

    const starName = document.getElementById('comboStarName');
    if (starName) starName.textContent = this.activeCombo.star.name;

    const offerPrice = document.getElementById('comboOfferPrice');
    if (offerPrice) offerPrice.textContent = `S/ ${this.activeCombo.suggestedComboPrice.toFixed(2)}`;

    const copyText = PosterService.generateWhatsAppCopy(this.activeCombo);
    const copyEl = document.getElementById('whatsappMessageText');
    if (copyEl) copyEl.textContent = copyText;

    const shareBtn = document.getElementById('whatsappShareLink');
    if (shareBtn) shareBtn.href = `https://wa.me/?text=${encodeURIComponent(copyText)}`;

    this.updatePoster();
    this.triggerConfetti();
    this.showToast('Nuevo combo formulado');
  }

  copyWhatsAppText() {
    const textEl = document.getElementById('whatsappMessageText');
    if (!textEl) return;
    navigator.clipboard.writeText(textEl.textContent.trim());
    this.showToast('¡Copiado para WhatsApp!');
  }

  triggerConfetti() {
    if (typeof window.confetti === 'function') {
      window.confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.65 }
      });
    }
  }

  // --- OPERATIONAL AI ---
  renderPurchaseOrders() {
    //
  }

  sendOrderToSupplierWhatsApp() {
    const order = this.state.purchaseOrders[0];
    if (!order) return;
    const msg = order.toWhatsAppMessage('Confecciones Sofía');
    window.open(`https://wa.me/${order.supplierPhone}?text=${msg}`, '_blank');
    this.showToast('Orden enviada al WhatsApp del proveedor');
  }

  printOrderReceipt() {
    window.print();
  }

  createNewPurchaseOrderModal() {
    this.showToast('Reposición automática ejecutada');
  }

  // --- FINANCIAL SCORE ---
  renderFinancialScore() {
    const scoreObj = FinancialScoreService.calculateScore({
      streakDays: this.state.streakDays,
      inventoryHealth: 88,
      averageMargin: 46
    });

    const bigNumber = document.getElementById('scoreBigNumber');
    if (bigNumber) bigNumber.textContent = scoreObj.totalScore;
  }

  toggleBankSharing(enabled) {
    this.state.bankConsent = enabled;
    this.save();
    if (enabled) {
      this.showToast('Consentimiento activo (Ley 29733)');
    } else {
      this.showToast('Consentimiento revocado');
    }
  }

  requestCreditOffer(bankName, amount) {
    alert(`¡Solicitud enviada a ${bankName} por S/ ${amount}! Te contactarán por WhatsApp con tu Tinkuy Score de 785.`);
  }

  // --- UNIT ECONOMICS CON PERSISTENCIA ---
  calculateAndRenderEconomics(shouldSave = false) {
    const sales = parseFloat(document.getElementById('sliderSales')?.value || 12000);
    const cogsPct = parseFloat(document.getElementById('sliderCogs')?.value || 50);
    const opex = parseFloat(document.getElementById('sliderOpex')?.value || 2800);
    const hourlyWage = parseFloat(document.getElementById('sliderHourlyRate')?.value || 25);
    const hoursSpent = parseFloat(document.getElementById('sliderHoursSpent')?.value || 35);

    if (shouldSave) {
      this.state.economics = {
        sales,
        cogs: cogsPct,
        opex,
        hourlyRate: hourlyWage,
        hoursSpent
      };
      StorageService.saveData(this.state);
    }

    const res = EconomicsService.calculate({
      monthlySales: sales,
      cogsPercentage: cogsPct,
      opex,
      hourlyWage,
      hoursSpentManaging: hoursSpent
    });

    const lblSales = document.getElementById('lblSalesVal');
    if (lblSales) lblSales.textContent = `S/ ${res.monthlySales.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

    const lblCogs = document.getElementById('lblCogsVal');
    if (lblCogs) lblCogs.textContent = `${res.cogsPercentage}% (S/ ${res.cogsAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })})`;

    const lblOpex = document.getElementById('lblOpexVal');
    if (lblOpex) lblOpex.textContent = `S/ ${res.opex.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

    const lblHourly = document.getElementById('lblHourlyRate');
    if (lblHourly) lblHourly.textContent = `S/ ${res.hourlyWage.toFixed(2)} / hora`;

    const lblHours = document.getElementById('lblHoursSpent');
    if (lblHours) lblHours.textContent = `${res.hoursSpentManaging} hrs`;

    const resSales = document.getElementById('resSales');
    if (resSales) resSales.textContent = `S/ ${res.monthlySales.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

    const resCogs = document.getElementById('resCogs');
    if (resCogs) resCogs.textContent = `- S/ ${res.cogsAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

    const resGross = document.getElementById('resGrossProfit');
    if (resGross) resGross.textContent = `S/ ${res.grossProfit.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

    const resOpex = document.getElementById('resOpex');
    if (resOpex) resOpex.textContent = `- S/ ${res.opex.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

    const resOwnTime = document.getElementById('resOwnTimeCost');
    if (resOwnTime) resOwnTime.textContent = `- S/ ${res.ownTimeCost.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

    const resNet = document.getElementById('resNetReal');
    if (resNet) {
      resNet.textContent = `S/ ${res.realNetProfit.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
      resNet.className = res.isProfitable ? 'text-base sm:text-lg text-emerald-700 font-extrabold' : 'text-base sm:text-lg text-red-600 font-extrabold';
    }

    const lblSaved = document.getElementById('lblMoneySaved');
    if (lblSaved) lblSaved.textContent = `S/ ${res.moneySavedTime.toFixed(2)}`;
  }

  // --- MODALS ---
  openDeckModal() {
    const m = document.getElementById('deckInfoModal');
    if (m) m.classList.remove('hidden');
  }
  closeDeckModal() {
    const m = document.getElementById('deckInfoModal');
    if (m) m.classList.add('hidden');
  }

  showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-auto sm:right-6 z-50 bg-slate-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl flex items-center gap-2 border border-slate-700 whitespace-nowrap animate-fade-in';
    toast.innerHTML = `<span class="w-2 h-2 rounded-full bg-tinkuy-coral shrink-0"></span> <span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }
}

const tinkuyApp = new TinkuyAppController();
window.tinkuyApp = tinkuyApp;
window.TinkuyApp = tinkuyApp;

window.addEventListener('DOMContentLoaded', () => {
  tinkuyApp.init();
});
