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

    // Review Modal & Friendly Voice Assistant state
    this.pendingScanData = null;
    this.reviewSpeechRecognizer = null;
    this.isListeningReviewVoice = false;
  }

  init() {
    this.bindEvents();
    this.renderHeader();
    this.renderScannedReceipts();
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
    this.renderScannedReceipts();
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
    const doubtContainer = document.getElementById('humanInTheLoopAlert');

    if (card) card.classList.remove('hidden');
    if (previewImg) previewImg.src = imageDataUrl;
    if (doubtContainer) doubtContainer.classList.add('hidden'); // Ocultar duda anterior al iniciar
    
    const hasKey = StorageService.getGeminiApiKey().length > 10;
    const selectedModel = StorageService.getGeminiModel() || 'gemini-2.0-flash';
    if (badge) {
      badge.textContent = hasKey
        ? `Analizando con ${selectedModel}...`
        : 'Analizando con Visión Local y Gobierno de Datos...';
    }

    try {
      const result = await OcrEngine.processImage(imageDataUrl, label);

      if (badge) {
        badge.textContent = result.source && result.source.startsWith('gemini')
          ? `Procesado con ${result.source} en tiempo real ✓`
          : 'Extracción completada con Motor Local ✓';
      }

      // Renderizado dinámico de la Duda de la IA adaptada a la boleta o cuaderno
      if (result.doubtItem && doubtContainer) {
        const d = result.doubtItem;
        this.currentDoubt = d;
        const msg = d.message || d.question || 'Duda detectada en el documento';
        const optA = d.optionA || { label: `Confirmar ${d.options ? d.options[0] : 'Opción 1'}`, value: (d.options ? d.options[0] : 25) };
        const optB = d.optionB || { label: `${d.options ? d.options[1] : 'Opción 2'}`, value: (d.options ? d.options[1] : 35) };

        doubtContainer.innerHTML = `
          <div class="flex items-start gap-2.5">
            <div class="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <i data-lucide="help-circle" class="w-4 h-4 text-amber-700"></i>
            </div>
            <div class="w-full space-y-1.5">
              <div class="flex items-center justify-between">
                <p class="font-bold text-[11px] text-amber-900">Duda de la IA (Human-in-the-Loop):</p>
                <span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-bold uppercase">Validar</span>
              </div>
              <p class="text-[11px] text-amber-900 leading-snug">
                ${msg}
              </p>
              <div class="flex flex-wrap items-center gap-1.5 pt-1">
                <button onclick="window.tinkuyApp.resolveDoubt('${optA.value}')" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-[11px] shadow-2xs transition active:scale-95">
                  ${optA.label}
                </button>
                <button onclick="window.tinkuyApp.resolveDoubt('${optB.value}')" class="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100/60 text-amber-900 rounded-xl font-bold text-[11px] shadow-2xs transition active:scale-95">
                  ${optB.label}
                </button>
                <button onclick="window.tinkuyApp.triggerAudioRescue()" class="px-2.5 py-1.5 bg-tinkuy-blush hover:bg-tinkuy-coral hover:text-white text-tinkuy-coral rounded-xl font-bold text-[11px] flex items-center gap-1 transition active:scale-95">
                  <i data-lucide="mic" class="w-3.5 h-3.5"></i> Audio voz
                </button>
              </div>
            </div>
          </div>
        `;
        doubtContainer.classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
      } else if (doubtContainer) {
        doubtContainer.classList.add('hidden');
        this.currentDoubt = null;
      }

      // Metadata del comprobante escaneado
      const isBoleta = (result.documentType === 'boleta') || label.toLowerCase().includes('bolet') || label === 'boleta_proveedor';
      const docNum = result.documentNumber || (isBoleta ? `B001-${Math.floor(1000 + Math.random() * 9000)}` : `Cuaderno #${Math.floor(100 + Math.random() * 900)}`);
      const provider = result.providerOrIssuer || (isBoleta ? 'Textilera San Jacinto S.A.C.' : 'Galería Guisado #104');
      const docTitle = isBoleta ? `Boleta de Compra N° ${docNum}` : `Cuaderno de Cierre Diario ${docNum}`;
      
      this.pendingScanData = {
        imageDataUrl: (imageDataUrl && imageDataUrl.length < 500000) ? imageDataUrl : null,
        label,
        source: result.source && result.source.startsWith('gemini') ? result.source : 'Motor Local Offline',
        documentType: isBoleta ? 'boleta' : 'cuaderno',
        documentNumber: docNum,
        providerOrIssuer: provider,
        title: docTitle,
        date: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        items: (result.items || []).map((it, idx) => ({
          id: it.id || ('scan_item_' + Date.now() + '_' + idx),
          name: it.name || 'Producto',
          category: it.category || 'textil',
          stock: Number(it.stock) || 1,
          costUnit: Number(it.costUnit) || (Number(it.priceSale) ? Number((it.priceSale * 0.55).toFixed(2)) : 18.0),
          priceSale: Number(it.priceSale) || (Number(it.costUnit) ? Number((it.costUnit * 1.8).toFixed(2)) : 38.0)
        }))
      };

      // Abre la ventana/modal de revisión con voz amigable para verificar antes de guardar
      this.openBoletaReviewModal();

    } catch (e) {
      console.error('Error procesando imagen:', e);
      this.showToast('Error procesando foto, intente nuevamente');
    }
  }

  // =========================================================================
  // REVISIÓN Y CONFIRMACIÓN DE BOLETA / ASISTENTE DE VOZ AMIGABLE CON GEMINI
  // =========================================================================
  openBoletaReviewModal() {
    if (!this.pendingScanData) return;
    const modal = document.getElementById('boletaReviewModal');
    if (!modal) return;

    const img = document.getElementById('reviewModalImg');
    const badge = document.getElementById('reviewModalAiBadge');
    const typePill = document.getElementById('reviewModalTypePill');
    const docTitle = document.getElementById('reviewModalDocTitle');
    const provider = document.getElementById('reviewModalProvider');
    const dateEl = document.getElementById('reviewModalDate');
    const bubble = document.getElementById('reviewVoiceBubble');

    if (img) img.src = this.pendingScanData.imageDataUrl || '';
    if (badge) {
      badge.textContent = (this.pendingScanData.source && this.pendingScanData.source.startsWith('gemini'))
        ? `${this.pendingScanData.source} ✓`
        : 'Motor Local Offline';
    }
    if (typePill) {
      typePill.textContent = this.pendingScanData.documentType === 'boleta'
        ? '🧾 Boleta Electrónica'
        : '📓 Cuaderno Diario';
    }
    if (docTitle) docTitle.textContent = this.pendingScanData.title;
    if (provider) provider.textContent = this.pendingScanData.providerOrIssuer;
    if (dateEl) dateEl.textContent = this.pendingScanData.date;

    const greeting = `¡Hola caserita! Ya analicé tu documento y extraje ${this.pendingScanData.items.length} productos. ¿Coinciden las cantidades y precios con tu comprobante? Si deseas corregir algo, solo háblame con el micrófono o escríbeme abajo. ¿Está todo conforme para guardarlo?`;
    if (bubble) {
      bubble.textContent = `"${greeting}"`;
    }

    this.renderReviewModalItems();
    modal.classList.remove('hidden');

    // Saludo hablado amigable con Web Speech Synthesis
    this.speakAssistantFriendly(greeting);

    if (window.lucide) window.lucide.createIcons();
  }

  closeBoletaReviewModal() {
    const modal = document.getElementById('boletaReviewModal');
    if (modal) modal.classList.add('hidden');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.isListeningReviewVoice && this.reviewSpeechRecognizer) {
      try {
        this.reviewSpeechRecognizer.stop();
      } catch (e) {}
      this.isListeningReviewVoice = false;
    }
    this.pendingScanData = null;
  }

  renderReviewModalItems() {
    if (!this.pendingScanData || !this.pendingScanData.items) return;
    const tbody = document.getElementById('reviewModalItemsTbody');
    if (!tbody) return;

    const items = this.pendingScanData.items;
    let totalSum = 0;

    tbody.innerHTML = items.map((it, idx) => {
      const qty = Number(it.stock) || 1;
      const cost = Number(it.costUnit) || 0;
      const sale = Number(it.priceSale) || 0;
      const rowTotal = qty * cost;
      totalSum += rowTotal;

      return `
        <tr class="hover:bg-slate-50/80 transition">
          <td class="px-2.5 py-1.5">
            <input type="text" value="${it.name}" onchange="window.tinkuyApp.updatePendingItem(${idx}, 'name', this.value)" class="w-full font-semibold text-slate-800 bg-transparent hover:bg-slate-100/60 focus:bg-white border border-transparent focus:border-amber-300 rounded px-1.5 py-1 text-xs outline-none" />
          </td>
          <td class="px-2 py-1.5 text-center">
            <input type="number" min="1" step="1" value="${qty}" onchange="window.tinkuyApp.updatePendingItem(${idx}, 'stock', this.value)" class="w-16 text-center font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-1 py-1 text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none" />
          </td>
          <td class="px-2 py-1.5 text-right">
            <div class="flex items-center justify-end gap-1">
              <span class="text-[10px] text-slate-400">S/</span>
              <input type="number" min="0" step="0.5" value="${cost.toFixed(2)}" onchange="window.tinkuyApp.updatePendingItem(${idx}, 'costUnit', this.value)" class="w-20 text-right font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-1 py-1 text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none" />
            </div>
          </td>
          <td class="px-2 py-1.5 text-right">
            <div class="flex items-center justify-end gap-1">
              <span class="text-[10px] text-slate-400">S/</span>
              <input type="number" min="0" step="0.5" value="${sale.toFixed(2)}" onchange="window.tinkuyApp.updatePendingItem(${idx}, 'priceSale', this.value)" class="w-20 text-right font-bold text-tinkuy-forest bg-emerald-50/50 border border-emerald-200 rounded-lg px-1 py-1 text-xs focus:ring-1 focus:ring-amber-400 focus:outline-none" />
            </div>
          </td>
          <td class="px-2 py-1.5 text-right font-bold text-slate-800 text-xs whitespace-nowrap">
            S/ ${rowTotal.toFixed(2)}
          </td>
          <td class="px-1.5 py-1.5 text-center">
            <button onclick="window.tinkuyApp.removePendingItem(${idx})" class="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar fila">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    const totalHeader = document.getElementById('reviewModalTotalHeader');
    const totalBottom = document.getElementById('reviewModalTotalBottom');
    if (totalHeader) totalHeader.textContent = `S/ ${totalSum.toFixed(2)}`;
    if (totalBottom) totalBottom.textContent = `S/ ${totalSum.toFixed(2)}`;

    if (window.lucide) window.lucide.createIcons();
  }

  updatePendingItem(index, field, value) {
    if (!this.pendingScanData || !this.pendingScanData.items[index]) return;
    if (field === 'stock' || field === 'costUnit' || field === 'priceSale') {
      this.pendingScanData.items[index][field] = parseFloat(value) || 0;
    } else {
      this.pendingScanData.items[index][field] = value;
    }
    this.renderReviewModalItems();
  }

  removePendingItem(index) {
    if (!this.pendingScanData || !this.pendingScanData.items) return;
    this.pendingScanData.items.splice(index, 1);
    this.renderReviewModalItems();
  }

  addEmptyRowToReviewModal() {
    if (!this.pendingScanData) return;
    if (!this.pendingScanData.items) this.pendingScanData.items = [];
    this.pendingScanData.items.push({
      id: 'scan_item_' + Date.now(),
      name: 'Nuevo Producto',
      category: 'textil',
      stock: 12,
      costUnit: 15.0,
      priceSale: 35.0
    });
    this.renderReviewModalItems();
  }

  toggleReviewVoiceMic() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const statusEl = document.getElementById('reviewVoiceListeningStatus');
    const statusText = document.getElementById('reviewVoiceListeningText');
    const micBtn = document.getElementById('reviewVoiceMicBtn');
    const micBtnLabel = document.getElementById('reviewVoiceMicBtnLabel');

    if (!SpeechRec) {
      this.showToast('Tu navegador no soporta micrófono directo. Puedes escribir la corrección.');
      const textInput = document.getElementById('reviewVoiceTextInput');
      if (textInput) textInput.focus();
      return;
    }

    if (this.isListeningReviewVoice && this.reviewSpeechRecognizer) {
      try {
        this.reviewSpeechRecognizer.stop();
      } catch (e) {}
      this.isListeningReviewVoice = false;
      if (statusEl) statusEl.classList.add('hidden');
      if (micBtnLabel) micBtnLabel.textContent = 'Hablar al Micrófono';
      if (micBtn) micBtn.classList.remove('bg-red-600', 'animate-pulse');
      return;
    }

    try {
      const recognizer = new SpeechRec();
      recognizer.lang = 'es-PE';
      recognizer.interimResults = false;
      recognizer.continuous = false;

      recognizer.onstart = () => {
        this.isListeningReviewVoice = true;
        if (statusEl) statusEl.classList.remove('hidden');
        if (statusText) statusText.textContent = "🎙️ Escuchando... Habla claro (ej: 'el polo está a 20 soles' o 'todo bien')";
        if (micBtnLabel) micBtnLabel.textContent = 'Detener Micrófono';
        if (micBtn) micBtn.classList.add('bg-red-600', 'animate-pulse');
      };

      recognizer.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.isListeningReviewVoice = false;
        if (statusEl) statusEl.classList.add('hidden');
        if (micBtnLabel) micBtnLabel.textContent = 'Hablar al Micrófono';
        if (micBtn) micBtn.classList.remove('bg-red-600', 'animate-pulse');

        const bubble = document.getElementById('reviewVoiceBubble');
        if (bubble) bubble.textContent = `Dijiste: "${transcript}". Procesando...`;

        this.applyVoiceCorrection(transcript);
      };

      recognizer.onerror = (event) => {
        this.isListeningReviewVoice = false;
        if (statusEl) statusEl.classList.add('hidden');
        if (micBtnLabel) micBtnLabel.textContent = 'Hablar al Micrófono';
        if (micBtn) micBtn.classList.remove('bg-red-600', 'animate-pulse');
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          this.showToast('Permiso de micrófono denegado. Puedes escribir la corrección.');
        }
      };

      recognizer.onend = () => {
        this.isListeningReviewVoice = false;
        if (statusEl) statusEl.classList.add('hidden');
        if (micBtnLabel) micBtnLabel.textContent = 'Hablar al Micrófono';
        if (micBtn) micBtn.classList.remove('bg-red-600', 'animate-pulse');
      };

      this.reviewSpeechRecognizer = recognizer;
      recognizer.start();
    } catch (err) {
      console.error('Error starting SpeechRecognition:', err);
      this.showToast('No se pudo iniciar el micrófono');
    }
  }

  submitReviewVoiceText() {
    const input = document.getElementById('reviewVoiceTextInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    this.applyVoiceCorrection(text);
  }

  async applyVoiceCorrection(userSpeech) {
    if (!this.pendingScanData || !this.pendingScanData.items) return;
    const text = (userSpeech || '').trim();
    if (!text) return;

    const bubble = document.getElementById('reviewVoiceBubble');
    if (bubble) {
      bubble.innerHTML = `<em>"Procesando tu indicación: '${text}'..."</em>`;
    }

    // 1. Detección de confirmación por voz ("todo bien", "está bien", "guárdalo", "conforme", "confirmar", "sí", "listo")
    const lower = text.toLowerCase();
    const isConfirmation = lower.includes('todo bien') || 
                           lower.includes('está bien') || 
                           lower.includes('esta bien') ||
                           lower.includes('conforme') || 
                           lower.includes('confirmar') || 
                           lower.includes('guarda') || 
                           lower.includes('guardar') ||
                           lower.includes('listo') ||
                           lower.includes('correcto') ||
                           lower.includes('guárdalo');

    if (isConfirmation) {
      const farewell = "¡Excelente caserita! Todo ha quedado confirmado y registrado en tu inventario. ¡Muchos éxitos en las ventas de hoy!";
      if (bubble) bubble.textContent = `"${farewell}"`;
      this.speakAssistantFriendly(farewell);
      setTimeout(() => {
        this.confirmAndSavePendingBoleta();
      }, 900);
      return;
    }

    // 2. Intentar llamar a Gemini si hay API Key disponible
    const apiKey = StorageService.getGeminiApiKey();
    const model = StorageService.getGeminiModel() || 'gemini-2.0-flash';
    let geminiSuccess = false;

    if (apiKey && apiKey.length > 10) {
      try {
        const prompt = `Eres Tinkuy IA, un asistente contable y de inventario cálido, amigable y cercano para emprendedoras peruanas (hablas con respeto y cariño, estilo 'casera' o 'amiga emprendedora').
Tienes esta lista de productos actualmente extraídos de la boleta:
${JSON.stringify(this.pendingScanData.items)}

El usuario acaba de decir o pedir esta corrección:
"${text}"

Instrucciones:
1. Aplica la corrección a la lista de productos: actualiza el stock, precio de costo (costUnit), precio de venta (priceSale), nombre, o agrega/elimina según lo pedido.
2. Genera una respuesta amigable, cálida y breve (máximo 2 oraciones), explicando qué cambiaste y preguntando amablemente si ahora sí está todo conforme para guardarlo en el inventario.
3. Responde estrictamente un JSON válido con esta forma (sin markdown backticks):
{
  "replyMessage": "¡Listo casera! Ya le cambié el precio al polo a 20 soles y son 15 unidades. ¿Está todo conforme ahora o deseas ajustar algo más?",
  "updatedItems": [
    { "name": "...", "stock": 10, "costUnit": 18.0, "priceSale": 38.0, "category": "textil" }
  ]
}`;

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json"
            }
          })
        });

        if (response.ok) {
          const jsonResp = await response.json();
          const rawText = jsonResp?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);

          if (parsed.updatedItems && Array.isArray(parsed.updatedItems)) {
            this.pendingScanData.items = parsed.updatedItems.map((it, idx) => ({
              id: it.id || ('item_' + Date.now() + '_' + idx),
              name: it.name || 'Producto',
              category: it.category || 'textil',
              stock: Number(it.stock) || 1,
              costUnit: Number(it.costUnit) || 15.0,
              priceSale: Number(it.priceSale) || 30.0
            }));

            const reply = parsed.replyMessage || "¡Listo caserita! Ya ajusté los datos. ¿Está todo conforme para guardarlo?";
            if (bubble) bubble.textContent = `"${reply}"`;
            this.renderReviewModalItems();
            this.speakAssistantFriendly(reply);
            geminiSuccess = true;
          }
        }
      } catch (err) {
        console.warn('Gemini voice correction fallback to local:', err);
      }
    }

    // 3. Fallback inteligente local si Gemini no está configurado o falló
    if (!geminiSuccess) {
      this.applyLocalVoiceCorrection(text);
    }
  }

  applyLocalVoiceCorrection(text) {
    const bubble = document.getElementById('reviewVoiceBubble');
    const lower = text.toLowerCase();
    let reply = "¡Entendido caserita! Ya hice el ajuste en tu lista. ¿Está todo conforme para guardarlo?";
    let modified = false;

    // Buscar números en el texto
    const numbers = text.match(/\d+(?:\.\d+)?/g);
    const num = numbers ? parseFloat(numbers[0]) : null;

    // Detectar si pide eliminar/borrar
    if (lower.includes('elimina') || lower.includes('borra') || lower.includes('quitar')) {
      const idx = this.pendingScanData.items.findIndex(it => lower.includes(it.name.toLowerCase().slice(0, 5)));
      if (idx !== -1) {
        const removedName = this.pendingScanData.items[idx].name;
        this.pendingScanData.items.splice(idx, 1);
        reply = `¡Listo casera! Ya retiré ${removedName} de la lista. ¿Deseas hacer algún otro cambio o está todo conforme?`;
        modified = true;
      }
    }

    // Detectar si pide cambiar precio o costo o cantidad
    if (!modified && num !== null && this.pendingScanData.items.length > 0) {
      // Buscar qué producto coincide con el texto
      let targetIdx = this.pendingScanData.items.findIndex(it => {
        const words = it.name.toLowerCase().split(' ');
        return words.some(w => w.length > 3 && lower.includes(w));
      });
      if (targetIdx === -1) targetIdx = 0; // Default al primero

      const target = this.pendingScanData.items[targetIdx];
      if (target) {
        if (lower.includes('costo') || lower.includes('compre') || lower.includes('compré')) {
          target.costUnit = num;
          reply = `¡Anotado caserita! Ya cambié el costo unitario de ${target.name} a S/ ${num.toFixed(2)}. ¿Ahora sí está todo conforme?`;
        } else if (lower.includes('cantidad') || lower.includes('unidad') || lower.includes('unidades') || lower.includes('son ') || lower.includes('stock')) {
          target.stock = Math.round(num);
          reply = `¡Listo caserita! Ya ajusté la cantidad de ${target.name} a ${target.stock} unidades. ¿Coincide con tu comprobante?`;
        } else {
          // Por defecto precio de venta
          target.priceSale = num;
          reply = `¡Perfecto casera! Ya puse el precio de venta de ${target.name} en S/ ${num.toFixed(2)}. ¿Está todo conforme para confirmarlo?`;
        }
        modified = true;
      }
    }

    if (!modified) {
      reply = `¡Te escuché caserita! He registrado tu observación sobre "${text}". ¿Deseas confirmarlo y guardar en el inventario?`;
    }

    if (bubble) bubble.textContent = `"${reply}"`;
    this.renderReviewModalItems();
    this.speakAssistantFriendly(reply);
  }

  speakAssistantFriendly(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-PE';
      utterance.rate = 1.0;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find(v => v.lang.startsWith('es-PE') || v.lang.startsWith('es-419') || v.lang.startsWith('es-US') || v.lang.startsWith('es-ES'));
      if (esVoice) utterance.voice = esVoice;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }

  confirmAndSavePendingBoleta() {
    if (!this.pendingScanData || !this.pendingScanData.items) return;
    const data = this.pendingScanData;

    const totalSum = data.items.reduce((acc, it) => acc + ((Number(it.stock) || 1) * (Number(it.costUnit) || 15)), 0);

    const receiptRecord = {
      id: 'rec_' + Date.now(),
      documentNumber: data.documentNumber,
      title: data.title,
      provider: data.providerOrIssuer,
      date: data.date,
      type: data.documentType,
      storeId: this.currentStoreId === 'consolidated' ? 'guisado' : this.currentStoreId,
      totalAmount: totalSum,
      itemsCount: data.items.length,
      source: data.source,
      items: data.items.map(it => ({
        name: it.name,
        qty: Number(it.stock) || 1,
        costUnit: Number(it.costUnit) || 18.0,
        priceSale: Number(it.priceSale) || 38.0,
        total: (Number(it.stock) || 1) * (Number(it.costUnit) || 18.0)
      })),
      imageDataUrl: (data.imageDataUrl && data.imageDataUrl.length < 120000) ? data.imageDataUrl : null
    };

    if (!this.state.scannedReceipts) {
      this.state.scannedReceipts = [];
    }
    this.state.scannedReceipts.unshift(receiptRecord);

    let itemsAdded = 0;
    let itemsUpdated = 0;

    data.items.forEach(newItem => {
      newItem.storeId = this.currentStoreId === 'consolidated' ? 'guisado' : this.currentStoreId;
      const existing = this.state.products.find(p => p.name.toLowerCase().trim() === newItem.name.toLowerCase().trim() && (p.storeId === newItem.storeId || this.currentStoreId === 'consolidated'));
      
      if (existing) {
        existing.stock += (Number(newItem.stock) || 1);
        if (newItem.costUnit) existing.costUnit = Number(newItem.costUnit);
        if (newItem.priceSale) existing.priceSale = Number(newItem.priceSale);
        existing.lastSource = `Boleta ${data.documentNumber}`;
        existing.isRecentlyUpdated = true;
        itemsUpdated++;
      } else {
        newItem.lastSource = `Boleta ${data.documentNumber}`;
        newItem.isRecentlyUpdated = true;
        this.state.products.unshift(newItem);
        itemsAdded++;
      }
    });

    // Guardar en LocalStorage y re-renderizar vistas
    this.save();

    // Cerrar la ventana de revisión
    this.closeBoletaReviewModal();

    // Mostrar alerta de éxito
    const alertEl = document.getElementById('scanSuccessAlert');
    const alertMsg = document.getElementById('scanSuccessAlertMsg');
    if (alertEl && alertMsg) {
      alertMsg.textContent = `${receiptRecord.title} confirmada y guardada en LocalStorage. Total: S/ ${receiptRecord.totalAmount.toFixed(2)} (${itemsAdded} agregados, ${itemsUpdated} actualizados).`;
      alertEl.classList.remove('hidden');
    }

    this.showToast(`¡${receiptRecord.title} guardada en LocalStorage!`);

    // Scroll a la sección de Boletas Guardadas
    const receiptsSection = document.getElementById('scannedReceiptsSection');
    if (receiptsSection) {
      receiptsSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // --- HUMAN IN THE LOOP ---
  resolveDoubt(confirmedVal) {
    const doubtAlert = document.getElementById('humanInTheLoopAlert');
    const valNum = parseFloat(confirmedVal) || confirmedVal;

    // 1. Si había un producto asociado a la duda, actualizarlo en el inventario local
    if (this.currentDoubt && this.currentDoubt.targetItemName) {
      const prod = this.state.products.find(p => p.name.toLowerCase().includes(this.currentDoubt.targetItemName.toLowerCase()));
      if (prod) {
        const field = this.currentDoubt.field || 'priceSale';
        prod[field] = valNum;
        this.save();
      }
    }

    // 2. Feedback visual de éxito inmediato
    if (doubtAlert) {
      doubtAlert.innerHTML = `
        <div class="flex items-center gap-2 text-emerald-800 font-bold text-xs p-1">
          <div class="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">✓</div>
          <span>Dato validado a: <strong>${valNum}</strong>. Guardado en LocalStorage.</span>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();

      // 3. Desaparecer completamente con animación suave
      setTimeout(() => {
        doubtAlert.style.transition = 'all 0.35s ease-out';
        doubtAlert.style.opacity = '0';
        doubtAlert.style.transform = 'translateY(-6px)';
        setTimeout(() => {
          doubtAlert.classList.add('hidden');
          doubtAlert.style.opacity = '1';
          doubtAlert.style.transform = 'none';
          this.currentDoubt = null;
        }, 350);
      }, 700);
    }

    this.showToast(`Dato validado a: ${valNum}`);
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
    const select = document.getElementById('geminiModelSelect');
    if (input) input.value = StorageService.getGeminiApiKey();
    if (select) select.value = StorageService.getGeminiModel();
    if (modal) modal.classList.remove('hidden');
  }

  closeGeminiKeyModal() {
    const modal = document.getElementById('geminiKeyModal');
    if (modal) modal.classList.add('hidden');
  }

  saveGeminiApiKey() {
    const input = document.getElementById('geminiApiKeyInput');
    const select = document.getElementById('geminiModelSelect');
    const key = input ? input.value.trim() : '';
    const model = select ? select.value : 'gemini-2.5-flash';

    StorageService.saveGeminiApiKey(key);
    StorageService.saveGeminiModel(model);
    this.updateGeminiStatusBadge();
    this.closeGeminiKeyModal();

    if (key) {
      this.showToast(`Gemini configurado: ${model}`);
    } else {
      this.showToast('Usando Motor Local Offline de Contingencia');
    }
  }

  updateGeminiStatusBadge() {
    const key = StorageService.getGeminiApiKey();
    const model = StorageService.getGeminiModel() || 'gemini-2.5-flash';
    const modelShort = model.includes('2.5') ? '2.5' : '2.0';
    document.querySelectorAll('.gemini-status-badge').forEach(badge => {
      if (key && key.length > 10) {
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span> <span class="hidden sm:inline">Gemini ${modelShort} Activo</span><span class="sm:hidden">Gemini ${modelShort}</span>`;
        badge.className = 'gemini-status-badge px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-bold flex items-center gap-1 border border-emerald-200 cursor-pointer';
      } else {
        badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span> <span class="hidden sm:inline">Motor Local (Offline)</span><span class="sm:hidden">Local</span>`;
        badge.className = 'gemini-status-badge px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 text-[10px] sm:text-xs font-bold flex items-center gap-1 border border-amber-200 cursor-pointer';
      }
    });
  }

  // =========================================================================
  // HISTORIAL DE BOLETAS Y CUADERNOS EN LOCALSTORAGE
  // =========================================================================
  renderScannedReceipts() {
    const list = document.getElementById('scannedReceiptsList');
    const countBadge = document.getElementById('scannedReceiptsCountBadge');
    const totalBadge = document.getElementById('scannedReceiptsTotalBadge');
    if (!list) return;

    const receipts = this.state.scannedReceipts || [];
    const filteredReceipts = receipts.filter(r => {
      if (this.currentStoreId === 'consolidated') return true;
      return r.storeId === this.currentStoreId;
    });

    const totalMoney = filteredReceipts.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0);
    if (countBadge) countBadge.textContent = `${filteredReceipts.length} ${filteredReceipts.length === 1 ? 'comprobante' : 'comprobantes'}`;
    if (totalBadge) totalBadge.textContent = `S/ ${totalMoney.toFixed(2)} procesados`;

    if (filteredReceipts.length === 0) {
      list.innerHTML = `
        <div class="p-6 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 space-y-2">
          <i data-lucide="inbox" class="w-8 h-8 text-slate-300 mx-auto"></i>
          <p class="text-xs font-semibold text-slate-600">No hay boletas ni cuadernos guardados en este local.</p>
          <p class="text-[11px] text-slate-400">Escanea una boleta de proveedor o presiona los botones de prueba arriba para guardar una en LocalStorage.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    list.innerHTML = filteredReceipts.map(r => {
      const isBoleta = r.type === 'boleta';
      const borderTheme = isBoleta ? 'border-l-4 border-l-blue-500 bg-blue-50/20' : 'border-l-4 border-l-amber-500 bg-amber-50/20';
      const typeBadge = isBoleta
        ? `<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase tracking-wide">🧾 Boleta de Compra</span>`
        : `<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-wide">📓 Cuaderno Diario</span>`;

      const storeName = r.storeId === 'guisado' ? 'Galería Guisado' : r.storeId === 'el_rey' ? 'C.C. El Rey' : 'Almacén Central';

      const itemsRows = (r.items || []).map(it => `
        <div class="flex items-center justify-between py-1 border-b border-slate-100/80 text-[11px]">
          <span class="font-medium text-slate-700">
            <strong class="text-slate-900">${it.qty}x</strong> ${it.name}
          </span>
          <span class="font-semibold text-slate-800">S/ ${(it.total || (it.qty * (it.costUnit || 10))).toFixed(2)}</span>
        </div>
      `).join('');

      return `
        <div id="receipt-card-${r.id}" class="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition space-y-2.5 ${borderTheme}">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-2 mb-1">
                ${typeBadge}
                <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                  <i data-lucide="check" class="w-3 h-3"></i> En LocalStorage
                </span>
              </div>
              <h5 class="font-bold text-xs sm:text-sm text-slate-800">${r.title}</h5>
              <p class="text-[11px] text-slate-500">${r.provider} · <span class="font-medium text-tinkuy-forest">${storeName}</span></p>
            </div>

            <div class="text-right">
              <span class="text-[10px] text-slate-400 block">${r.date}</span>
              <span class="text-xs font-bold text-slate-500">Monto Comprobante:</span>
              <span class="text-sm sm:text-base font-bold text-tinkuy-forest block">S/ ${Number(r.totalAmount).toFixed(2)}</span>
            </div>
          </div>

          <!-- Items desglosados -->
          <div class="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100 space-y-0.5">
            <div class="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center justify-between">
              <span>Productos ingresados (${r.itemsCount || r.items.length} items)</span>
              <span>Subtotal</span>
            </div>
            ${itemsRows}
          </div>

          <!-- Footer con motor y acciones -->
          <div class="flex items-center justify-between pt-1 text-xs">
            <div class="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span>Motor:</span>
              <strong class="text-slate-700 font-semibold bg-white px-2 py-0.5 rounded-md border border-slate-200">${r.source}</strong>
            </div>

            <div class="flex items-center gap-1.5">
              <button onclick="window.tinkuyApp.highlightInventoryFromReceipt('${r.id}')" class="px-2.5 py-1 rounded-xl bg-tinkuy-sand hover:bg-tinkuy-sandDark text-slate-700 text-[11px] font-bold flex items-center gap-1 transition">
                <i data-lucide="eye" class="w-3 h-3"></i>
                Ver en Inventario
              </button>
              <button onclick="window.tinkuyApp.deleteScannedReceipt('${r.id}')" class="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" title="Eliminar comprobante de LocalStorage">
                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  deleteScannedReceipt(receiptId) {
    if (!confirm('¿Deseas eliminar esta boleta de tu historial en LocalStorage?')) return;
    this.state.scannedReceipts = (this.state.scannedReceipts || []).filter(r => r.id !== receiptId);
    this.save();
    this.showToast('Comprobante eliminado de LocalStorage');
  }

  highlightInventoryFromReceipt(receiptId) {
    const table = document.getElementById('extractedDataCard');
    if (table) {
      table.scrollIntoView({ behavior: 'smooth' });
      table.classList.add('ring-2', 'ring-tinkuy-coral');
      setTimeout(() => table.classList.remove('ring-2', 'ring-tinkuy-coral'), 2500);
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

      let sourceTag = '';
      if (p.lastSource) {
        sourceTag = `<span class="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[9px] font-bold border border-blue-200">🧾 ${p.lastSource}</span>`;
      }

      tr.innerHTML = `
        <td class="px-3 py-2.5 font-bold text-slate-800">
          ${p.name}
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="text-[10px] font-normal text-slate-400 capitalize">${p.category}</span>
            ${sourceTag}
          </div>
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

      let sourcePill = '';
      if (p.lastSource) {
        sourcePill = `<span class="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[9px] font-bold border border-blue-200">🧾 ${p.lastSource}</span>`;
      }

      card.innerHTML = `
        <div class="flex items-start justify-between gap-1.5">
          <div class="min-w-0 flex-1">
            <h5 class="font-bold text-xs text-slate-800 truncate">${p.name}</h5>
            <div class="flex items-center gap-1.5 mt-0.5">
              <p class="text-[10px] text-slate-500">${p.variants || 'Estándar'} · <span class="font-semibold text-tinkuy-forest">${storeName}</span></p>
              ${sourcePill}
            </div>
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
