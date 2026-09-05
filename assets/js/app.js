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

    // Tinky Floating AI Assistant State
    this.isTinkyOpen = false;
    this.tinkySpeechEnabled = true;
    this.tinkyAttachedFile = null;
    this.tinkyAttachedDataUrl = null;
    this.tinkySpeechRecognizer = null;
    this.isTinkyListening = false;
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
      if (userNameEl) userNameEl.textContent = 'Karina (Vendedora Tienda)';
      if (this.currentStoreId === 'almacen') this.setStore('guisado');
      this.switchTab('step1');
      this.showToast('🏷️ Modo Vendedora: Venta ágil de mostrador (sin talla/color)');
    } else if (role === 'almacenera') {
      if (userNameEl) userNameEl.textContent = 'Rosa (Almacenera Logística)';
      this.setStore('almacen');
      this.switchTab('step1');
      this.showToast('📦 Modo Almacén: Control detallado de Talla, Color y Despachos');
    } else {
      if (userNameEl) userNameEl.textContent = 'Sofía (Dueña Global)';
      this.showToast('👑 Modo Dueña: Control total, consolidado y finanzas');
    }

    this.renderInventoryTable();
    this.renderInventoryMobileCards();
    this.updateTrafficLightView();
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
    // Limpiar el input siempre: si no se hace, seleccionar la MISMA imagen
    // de nuevo no dispara 'change' y la vista se queda con los datos de la
    // foto anterior (parece que se "combinan" cuando en realidad no se
    // volvió a escanear nada).
    event.target.value = '';
    if (!file) return;

    // Resetear cualquier resultado pendiente antes de leer la nueva foto
    // para que cada imagen se procese de forma aislada.
    this.pendingScanData = null;
    this.currentDoubt = null;

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
    const loadBanner = document.getElementById('scanLoadingBanner');
    const loadTitle = document.getElementById('scanLoadingTitle');
    const loadPercent = document.getElementById('scanLoadingPercent');
    const loadBar = document.getElementById('scanProgressBar');
    const loadSubtitle = document.getElementById('scanLoadingSubtitle');

    if (card) {
      card.classList.remove('hidden');
      // Desplazar la pantalla suavemente hacia la sección de carga/escaneo
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (previewImg) previewImg.src = imageDataUrl;
    if (doubtContainer) doubtContainer.classList.add('hidden');
    if (loadBanner) loadBanner.classList.remove('hidden');
    if (loadBar) loadBar.style.width = '35%';
    if (loadPercent) loadPercent.textContent = '35% 📸';
    if (loadTitle) loadTitle.textContent = 'Procesando comprobante...';
    if (loadSubtitle) loadSubtitle.textContent = 'Subiendo imagen y normalizando resolución para lectura...';
    
    const hasKey = StorageService.getGeminiApiKey().length > 10;
    const selectedModel = StorageService.getGeminiModel() || 'gemini-3.8-flash';
    if (badge) {
      badge.textContent = hasKey
        ? `Analizando con ${selectedModel}...`
        : 'Analizando con Visión Local y Gobierno de Datos...';
    }

    // Animación de avance 75%
    setTimeout(() => {
      if (loadBar) loadBar.style.width = '75%';
      if (loadPercent) loadPercent.textContent = '75% 🔍';
      if (loadSubtitle) loadSubtitle.textContent = hasKey 
        ? `Gemini ${selectedModel} analizando productos, cantidades y precios...`
        : 'Motor Local OCR analizando tabla de productos y montos...';
    }, 400);

    try {
      const result = await OcrEngine.processImage(imageDataUrl, label);

      if (result.fallbackReason) {
        this.showToast(`⚠️ Gemini falló (${result.fallbackReason}). Mostrando aproximación del Motor Local, revisa los datos.`);
      }

      if (badge) {
        badge.textContent = result.source && result.source.startsWith('gemini')
          ? `Procesado con ${result.source} en tiempo real ✓`
          : 'Extracción completada con Motor Local ✓';
      }

      if (loadBar) loadBar.style.width = '100%';
      if (loadPercent) loadPercent.textContent = '100% ✓';
      if (loadTitle) loadTitle.textContent = '¡Extracción completada!';
      if (loadSubtitle) loadSubtitle.textContent = `Se detectaron ${result.items.length} productos con éxito. Abriendo ventana de revisión...`;

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
      const isSale = (result.documentType === 'venta_tienda') || !!result.isSale;
      const isTransfer = (result.documentType === 'traslado') || !!result.isTransfer;
      const isWarehouse = (result.documentType === 'almacen') || !!result.isWarehouse;
      const isBoleta = (result.documentType === 'boleta') || label.toLowerCase().includes('bolet') || label === 'boleta_proveedor' || (result.items && result.items.length >= 4 && !isSale && !isTransfer && !isWarehouse);

      let docType = 'cuaderno';
      if (isSale) docType = 'venta_tienda';
      else if (isTransfer) docType = 'traslado';
      else if (isWarehouse) docType = 'almacen';
      else if (isBoleta) docType = 'boleta';

      const docNum = result.documentNumber || (isSale ? `VTA-${Math.floor(1000 + Math.random() * 9000)}` : isTransfer ? `TRS-${Math.floor(1000 + Math.random() * 9000)}` : isWarehouse ? `ALM-${Math.floor(1000 + Math.random() * 9000)}` : isBoleta ? `001-${Math.floor(100000 + Math.random() * 900000)}` : `Cuaderno #${Math.floor(100 + Math.random() * 900)}`);
      const provider = result.providerOrIssuer || (isSale ? 'Venta de Mostrador (Tienda)' : isTransfer ? 'Despacho Almacén ➔ Tienda' : isWarehouse ? 'Almacén Central (Admin)' : isBoleta ? 'Textilera San Jacinto S.A.C.' : 'Galería Guisado #104');
      const docTitle = result.title || (isSale ? `Tienda = (Venta Rápida)` : isTransfer ? `Traslado a Tiendas para la Venta` : isWarehouse ? `Almacén Central (Inventario Admin)` : isBoleta ? `Boleta de Compra N° ${docNum}` : `Cuaderno de Cierre Diario ${docNum}`);
      
      this.pendingScanData = {
        imageDataUrl: (imageDataUrl && imageDataUrl.length < 500000) ? imageDataUrl : null,
        label,
        source: result.source && result.source.startsWith('gemini') ? result.source : (result.source || 'Motor Local Offline'),
        documentType: docType,
        documentNumber: docNum,
        providerOrIssuer: provider,
        title: docTitle,
        isSale,
        isTransfer,
        isWarehouse,
        date: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        items: (result.items || []).map((it, idx) => ({
          id: it.id || ('scan_item_' + Date.now() + '_' + idx),
          name: it.name || 'Producto',
          category: it.category || 'textil',
          stock: Number(it.stock) || 1,
          costUnit: Number(it.costUnit) || (Number(it.priceSale) ? Number((it.priceSale * 0.55).toFixed(2)) : 18.0),
          priceSale: Number(it.priceSale) || (Number(it.costUnit) ? Number((it.costUnit * 1.8).toFixed(2)) : 38.0),
          variants: it.variants || (isSale ? 'Modelo Tienda (Venta Ágil)' : 'Estándar')
        }))
      };

      // Breve pausa visual de 400ms para que el usuario aprecie el estado completado y se abra la revisión
      await new Promise(r => setTimeout(r, 450));

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
      const badgeText = document.getElementById('reviewModalAiBadgeText');
      const isGemini = this.pendingScanData.source && this.pendingScanData.source.startsWith('gemini');
      const textToSet = isGemini ? `${this.pendingScanData.source} ✓` : 'Motor Local Offline';
      if (badgeText) badgeText.textContent = textToSet;
      else badge.textContent = textToSet;
    }

    const isSale = this.pendingScanData.isSale || this.pendingScanData.documentType === 'venta_tienda';
    const isTransfer = this.pendingScanData.isTransfer || this.pendingScanData.documentType === 'traslado';
    const isWarehouse = this.pendingScanData.isWarehouse || this.pendingScanData.documentType === 'almacen';

    if (typePill) {
      if (isSale) {
        typePill.className = 'px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase';
        typePill.textContent = '🏷️ Tienda (Venta Rápida · Cero Fricción)';
      } else if (isTransfer) {
        typePill.className = 'px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold uppercase';
        typePill.textContent = '🚚 Traslado a Tienda para Venta';
      } else if (isWarehouse) {
        typePill.className = 'px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase';
        typePill.textContent = '📦 Entrada Almacén Central (Con Tallas & Colores)';
      } else if (this.pendingScanData.documentType === 'boleta') {
        typePill.className = 'px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase';
        typePill.textContent = '🧾 Boleta de Compra';
      } else {
        typePill.className = 'px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase';
        typePill.textContent = '📓 Cuaderno Diario';
      }
    }

    if (docTitle) docTitle.textContent = this.pendingScanData.title;
    if (provider) provider.textContent = this.pendingScanData.providerOrIssuer;
    if (dateEl) dateEl.textContent = this.pendingScanData.date;

    const totalMoney = this.pendingScanData.items.reduce((acc, it) => {
      const qty = Number(it.stock) || 1;
      const price = isSale ? (Number(it.priceSale) || Number(it.costUnit) || 0) : (Number(it.costUnit) || 0);
      return acc + (qty * price);
    }, 0);

    let greeting = '';
    if (isSale) {
      greeting = `¡Hola caserita! Detecté tu nota de venta en mostrador. Noté que no anotaste color ni talla para no demorarte con los clientes: ¡excelente decisión para agilizar ventas! Descontaré las ${this.pendingScanData.items.length} prendas del inventario de tu tienda y sumaré S/ ${totalMoney.toFixed(2)} a tu caja diaria. ¿Está todo conforme?`;
    } else if (isTransfer) {
      greeting = `¡Hola caserita! Revisé la nota de traslado. Moveremos estas ${this.pendingScanData.items.length} prendas desde el Almacén Central hacia tu Tienda listas para la venta ágil. ¿Confirmamos el despacho?`;
    } else if (isWarehouse) {
      greeting = `¡Hola caserita! Registraste entrada a Almacén Central con máximo detalle de variantes (talla y color). Así sabemos exactamente cuánto capital tienes invertido. ¿Guardamos en LocalStorage?`;
    } else {
      greeting = `¡Hola caserita! Ya analicé tu documento y extraje ${this.pendingScanData.items.length} productos por un total de S/ ${totalMoney.toFixed(2)}. ¿Coinciden las cantidades y precios con tu comprobante? Si deseas corregir algo, háblame o escríbeme. ¿Está todo conforme para guardarlo?`;
    }

    if (bubble) {
      bubble.textContent = `"${greeting}"`;
    }

    const confirmBtnText = document.getElementById('reviewModalConfirmBtnText');
    if (confirmBtnText) {
      if (isSale) {
        confirmBtnText.textContent = `⚡ Confirmar Venta y Registrar S/ ${totalMoney.toFixed(2)} en Caja`;
      } else if (isTransfer) {
        confirmBtnText.textContent = `🚚 Confirmar Traslado hacia Tienda`;
      } else if (isWarehouse) {
        confirmBtnText.textContent = `📦 Confirmar Ingreso a Almacén Central`;
      } else {
        confirmBtnText.textContent = `✓ Todo Conforme, Guardar en LocalStorage`;
      }
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

    // Ocultar también la tarjeta de escaneo para que no quede visible
    const scanCard = document.getElementById('ocrScanningCard');
    if (scanCard) scanCard.classList.add('hidden');

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

    const isSale = this.pendingScanData.isSale || this.pendingScanData.documentType === 'venta_tienda';
    const items = this.pendingScanData.items;
    let totalSum = 0;

    tbody.innerHTML = items.map((it, idx) => {
      const qty = Number(it.stock) || 1;
      const cost = Number(it.costUnit) || 0;
      const sale = Number(it.priceSale) || 0;
      const rowTotal = isSale ? (qty * (sale || cost)) : (qty * cost);
      totalSum += rowTotal;

      return `
        <tr class="hover:bg-slate-50/80 transition">
          <td class="px-2.5 py-1.5">
            <div class="space-y-0.5">
              <input type="text" value="${it.name}" onchange="window.tinkuyApp.updatePendingItem(${idx}, 'name', this.value)" class="w-full font-semibold text-slate-800 bg-transparent hover:bg-slate-100/60 focus:bg-white border border-transparent focus:border-amber-300 rounded px-1.5 py-1 text-xs outline-none" />
              ${it.variants ? `<span class="text-[9px] font-medium text-slate-500 px-1.5 block">${it.variants}</span>` : ''}
            </div>
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
          <td class="px-2 py-1.5 text-right font-bold ${isSale ? 'text-emerald-700' : 'text-slate-800'} text-xs whitespace-nowrap">
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
    if (totalHeader) totalHeader.textContent = isSale ? `Caja: S/ ${totalSum.toFixed(2)}` : `S/ ${totalSum.toFixed(2)}`;
    if (totalBottom) totalBottom.textContent = isSale ? `S/ ${totalSum.toFixed(2)} (Ingreso a Caja)` : `S/ ${totalSum.toFixed(2)}`;

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
    const model = StorageService.getGeminiModel() || 'gemini-3.8-flash';
    let geminiSuccess = false;

    const currentTotal = this.pendingScanData.items.reduce((acc, it) => acc + ((Number(it.stock) || 1) * (Number(it.costUnit) || 0)), 0);

    if (apiKey && apiKey.length > 10) {
      try {
        const prompt = `Eres Tinkuy IA, un asistente contable y de inventario cálido, cercano y empático para comerciantes y microemprendedoras peruanas (hablas con cariño, estilo 'casera' o 'amiga emprendedora').
Tienes este comprobante en revisión:
- Tipo: ${this.pendingScanData.documentType}
- Título: ${this.pendingScanData.title}
- Proveedor / Tienda: ${this.pendingScanData.providerOrIssuer}
- Total calculado actual: S/ ${currentTotal.toFixed(2)}
- Lista de productos extraídos:
${JSON.stringify(this.pendingScanData.items.map(i => ({ name: i.name, stock: i.stock, costUnit: i.costUnit, priceSale: i.priceSale })))}

El usuario acaba de decirte o preguntarte por voz o texto:
"${text}"

INSTRUCCIONES CLAVE:
1. Si el usuario hace una consulta o saludo (ej: cuánto es el total, qué productos hay, cuál cuesta más, hola, etc.):
   Respóndele con amabilidad, exactitud y calidez en 'replyMessage', con el trato cariñoso de casera peruana.
2. Si el usuario te pide un cambio o corrección (modificar cantidad, precio de costo, precio de venta, nombre, o borrar):
   Aplica la modificación a los productos en 'updatedItems' y explícaselo amablemente en 'replyMessage'.
3. Si solo fue una pregunta o saludo sin cambios, devuelve en 'updatedItems' la misma lista actual sin modificar.

Responde EXCLUSIVAMENTE con un JSON válido (sin backticks ni markdown):
{
  "replyMessage": "¡Hola caserita! El monto total que salió en tu boleta es de S/ ${currentTotal.toFixed(2)} por los ${this.pendingScanData.items.length} productos registrados. ¿Está todo conforme o deseas cambiar algo?",
  "updatedItems": [
    { "name": "...", "stock": 1, "costUnit": 10.0, "priceSale": 20.0, "category": "textil" }
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
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);

          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);

            if (parsed.replyMessage) {
              if (parsed.updatedItems && Array.isArray(parsed.updatedItems) && parsed.updatedItems.length > 0) {
                this.pendingScanData.items = parsed.updatedItems.map((it, idx) => ({
                  id: it.id || ('item_' + Date.now() + '_' + idx),
                  name: it.name || 'Producto',
                  category: it.category || 'textil',
                  stock: Number(it.stock) || 1,
                  costUnit: Number(it.costUnit) || 15.0,
                  priceSale: Number(it.priceSale) || 30.0
                }));
                this.renderReviewModalItems();
              }

              const reply = parsed.replyMessage;
              if (bubble) bubble.textContent = `"${reply}"`;
              this.speakAssistantFriendly(reply);
              geminiSuccess = true;
            }
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
    const lower = text.toLowerCase().trim();
    const total = this.pendingScanData.items.reduce((acc, it) => acc + ((Number(it.stock) || 1) * (Number(it.costUnit) || 0)), 0);
    const count = this.pendingScanData.items.length;
    let reply = "";
    let modified = false;

    // A. Preguntas sobre el monto total / cuánto salió / costo total
    if (
      lower.includes('total') || 
      lower.includes('monto') || 
      lower.includes('cuanto') || 
      lower.includes('cuánto') || 
      lower.includes('suma') || 
      lower.includes('salió') || 
      lower.includes('salio') || 
      lower.includes('pagar')
    ) {
      reply = `¡Hola caserita! El monto total que figura en tu comprobante es de S/ ${total.toFixed(2)} por los ${count} productos registrados. ¿Coincide con tu comprobante físico o deseas cambiar algo?`;
      modified = true;
    }

    // B. Preguntas sobre qué productos hay en la lista
    else if (
      lower.includes('que productos') || 
      lower.includes('qué productos') || 
      lower.includes('cuales') || 
      lower.includes('cuáles') || 
      lower.includes('lista') || 
      lower.includes('ítems') || 
      lower.includes('items')
    ) {
      const prodList = this.pendingScanData.items.map(it => `${it.stock} un. de ${it.name}`).join(', ');
      reply = `Tienes registrados ${count} productos: ${prodList}, por un total de S/ ${total.toFixed(2)}. ¿Deseas modificar las cantidades o precios?`;
      modified = true;
    }

    // C. Saludos cordiales
    else if (
      lower.startsWith('hola') || 
      lower.includes('buenas') || 
      lower.includes('que tal') || 
      lower.includes('qué tal') || 
      lower.includes('buenos dias') || 
      lower.includes('buenas tardes')
    ) {
      reply = `¡Hola caserita, qué tal! Aquí tengo tu comprobante listo con ${count} productos por un total de S/ ${total.toFixed(2)}. ¿En qué te puedo ayudar o deseas confirmar para guardarlo?`;
      modified = true;
    }

    // D. Preguntas sobre el emisor / proveedor
    else if (
      lower.includes('proveedor') || 
      lower.includes('tienda') || 
      lower.includes('emisor') || 
      lower.includes('donde') || 
      lower.includes('dónde')
    ) {
      reply = `El comprobante figura a nombre de ${this.pendingScanData.providerOrIssuer}, con número ${this.pendingScanData.documentNumber}. ¿Está todo conforme para guardarlo?`;
      modified = true;
    }

    // E. Detectar si pide eliminar/borrar
    else if (lower.includes('elimina') || lower.includes('borra') || lower.includes('quitar')) {
      const idx = this.pendingScanData.items.findIndex(it => lower.includes(it.name.toLowerCase().slice(0, 5)));
      if (idx !== -1) {
        const removedName = this.pendingScanData.items[idx].name;
        this.pendingScanData.items.splice(idx, 1);
        reply = `¡Listo casera! Ya retiré ${removedName} de la lista. ¿Deseas hacer algún otro cambio o está todo conforme?`;
        modified = true;
      }
    }

    // F. Detectar si pide cambiar precio o costo o cantidad
    if (!modified) {
      const numbers = text.match(/\d+(?:\.\d+)?/g);
      const num = numbers ? parseFloat(numbers[0]) : null;

      if (num !== null && this.pendingScanData.items.length > 0) {
        let targetIdx = this.pendingScanData.items.findIndex(it => {
          const words = it.name.toLowerCase().split(' ');
          return words.some(w => w.length > 3 && lower.includes(w));
        });
        if (targetIdx === -1) targetIdx = 0;

        const target = this.pendingScanData.items[targetIdx];
        if (target) {
          if (lower.includes('costo') || lower.includes('compre') || lower.includes('compré')) {
            target.costUnit = num;
            reply = `¡Anotado caserita! Ya cambié el costo unitario de ${target.name} a S/ ${num.toFixed(2)}. ¿Ahora sí está todo conforme?`;
          } else if (lower.includes('cantidad') || lower.includes('unidad') || lower.includes('unidades') || lower.includes('son ') || lower.includes('stock')) {
            target.stock = Math.round(num);
            reply = `¡Listo caserita! Ya ajusté la cantidad de ${target.name} a ${target.stock} unidades. ¿Coincide con tu comprobante?`;
          } else {
            target.priceSale = num;
            reply = `¡Perfecto casera! Ya puse el precio de venta de ${target.name} en S/ ${num.toFixed(2)}. ¿Está todo conforme para confirmarlo?`;
          }
          modified = true;
        }
      }
    }

    if (!modified) {
      reply = `¡Te escuché caserita! Tienes ${count} productos en la lista con un total de S/ ${total.toFixed(2)}. ¿Deseas hacer alguna corrección o está todo listo para guardar?`;
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
    const isSale = data.documentType === 'venta_tienda' || !!data.isSale;
    const isTransfer = data.documentType === 'traslado' || !!data.isTransfer;
    const isWarehouse = data.documentType === 'almacen' || !!data.isWarehouse;
    const targetStoreId = this.currentStoreId === 'consolidated' ? 'guisado' : this.currentStoreId;

    try {
      const totalSum = data.items.reduce((acc, it) => {
        const qty = Number(it.stock) || 1;
        const price = isSale ? (Number(it.priceSale) || Number(it.costUnit) || 0) : (Number(it.costUnit) || 15);
        return acc + (qty * price);
      }, 0);

      const receiptRecord = {
        id: 'rec_' + Date.now(),
        documentNumber: data.documentNumber,
        title: data.title,
        provider: data.providerOrIssuer,
        date: data.date,
        type: data.documentType,
        isSale,
        isTransfer,
        isWarehouse,
        storeId: isWarehouse ? 'almacen' : targetStoreId,
        totalAmount: totalSum,
        itemsCount: data.items.length,
        source: data.source,
        items: data.items.map(it => ({
          name: it.name,
          qty: Number(it.stock) || 1,
          costUnit: Number(it.costUnit) || 18.0,
          priceSale: Number(it.priceSale) || 38.0,
          variants: it.variants || (isSale ? 'Modelo Tienda (Venta Ágil)' : 'Estándar'),
          total: isSale 
            ? ((Number(it.stock) || 1) * (Number(it.priceSale) || 38.0))
            : ((Number(it.stock) || 1) * (Number(it.costUnit) || 18.0))
        })),
        imageDataUrl: (data.imageDataUrl && data.imageDataUrl.length < 60000) ? data.imageDataUrl : null
      };

      if (!this.state.scannedReceipts) {
        this.state.scannedReceipts = [];
      }
      this.state.scannedReceipts.unshift(receiptRecord);

      let itemsAffected = 0;
      let totalUnits = 0;

      if (isSale) {
        // =========================================================================
        // CASO 1: VENTA RÁPIDA EN TIENDA (CERO FRICCIÓN REAL)
        // La nota NO tiene talla ni color intencionalmente para velocidad en mostrador.
        // Descuenta las prendas del inventario general de la tienda y suma dinero a caja.
        // =========================================================================
        data.items.forEach(newItem => {
          const qty = Number(newItem.stock) || 1;
          totalUnits += qty;
          const cleanName = (newItem.name || '').toLowerCase().trim();

          let existing = this.state.products.find(p => {
            const pName = (p.name || '').toLowerCase().trim();
            return (pName === cleanName || pName.includes(cleanName) || cleanName.includes(pName)) &&
                   (p.storeId === targetStoreId || this.currentStoreId === 'consolidated');
          });

          if (existing) {
            existing.stock = Math.max(0, existing.stock - qty);
            existing.daysStagnant = 1; // Rotación inmediata hoy
            existing.status = 'star'; // Estrella
            existing.lastSource = `Venta ${data.documentNumber}`;
            existing.isRecentlyUpdated = true;
            if (typeof existing.evaluateTrafficLight !== 'function') {
              Object.setPrototypeOf(existing, Product.prototype);
            }
          } else {
            const newProd = new Product({
              id: 'prod_' + Date.now() + '_' + itemsAffected,
              name: newItem.name || 'Prenda Tienda',
              category: newItem.category || 'textil',
              variants: 'Modelo Tienda (Venta Ágil)',
              storeId: targetStoreId,
              stock: 0,
              costUnit: Number(newItem.costUnit) || 15.0,
              priceSale: Number(newItem.priceSale) || 30.0,
              daysStagnant: 1,
              status: 'star',
              dataQualityScore: 98
            });
            newProd.lastSource = `Venta ${data.documentNumber}`;
            this.state.products.unshift(newProd);
          }
          itemsAffected++;
        });

        // Animación de confeti de celebración por la venta
        if (typeof confetti === 'function') {
          confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
        }

      } else if (isTransfer) {
        // =========================================================================
        // CASO 2: TRASLADO DE ALMACÉN CENTRAL HACIA TIENDA
        // Las prendas salen de Almacén y entran a Tienda perdiendo talla/color para venta ágil.
        // =========================================================================
        data.items.forEach(newItem => {
          const qty = Number(newItem.stock) || 1;
          totalUnits += qty;
          const cleanName = (newItem.name || '').toLowerCase().trim();

          // Descontar de almacén si existe
          const warehouseProd = this.state.products.find(p => 
            p.storeId === 'almacen' && (p.name.toLowerCase().trim().includes(cleanName) || cleanName.includes(p.name.toLowerCase().trim()))
          );
          if (warehouseProd) {
            warehouseProd.stock = Math.max(0, warehouseProd.stock - qty);
          }

          // Agregar a tienda destino
          let storeProd = this.state.products.find(p => 
            p.storeId === targetStoreId && (p.name.toLowerCase().trim() === cleanName || cleanName.includes(p.name.toLowerCase().trim()))
          );
          if (storeProd) {
            storeProd.stock += qty;
            storeProd.lastSource = `Traslado ${data.documentNumber}`;
            storeProd.isRecentlyUpdated = true;
          } else {
            storeProd = new Product({
              id: 'prod_' + Date.now() + '_' + itemsAffected,
              name: newItem.name,
              category: newItem.category || 'textil',
              variants: 'Modelo Tienda (Venta Ágil)',
              storeId: targetStoreId,
              stock: qty,
              costUnit: Number(newItem.costUnit) || 16.0,
              priceSale: Number(newItem.priceSale) || 32.0,
              daysStagnant: 1,
              status: 'normal',
              dataQualityScore: 98
            });
            storeProd.lastSource = `Traslado ${data.documentNumber}`;
            this.state.products.unshift(storeProd);
          }
          itemsAffected++;
        });

      } else if (isWarehouse) {
        // =========================================================================
        // CASO 3: INGRESO A ALMACÉN CENTRAL (DETALLE MÁXIMO DE TALLAS Y COLORES)
        // Se preservan los atributos completos para costeo y control de capital.
        // =========================================================================
        data.items.forEach(newItem => {
          const qty = Number(newItem.stock) || 1;
          totalUnits += qty;
          const cleanName = (newItem.name || '').toLowerCase().trim();
          const cleanVar = (newItem.variants || '').toLowerCase().trim();

          let existing = this.state.products.find(p => 
            p.storeId === 'almacen' && 
            p.name.toLowerCase().trim() === cleanName &&
            (p.variants || '').toLowerCase().trim() === cleanVar
          );

          if (existing) {
            existing.stock += qty;
            if (newItem.costUnit) existing.costUnit = Number(newItem.costUnit);
            if (newItem.priceSale) existing.priceSale = Number(newItem.priceSale);
            existing.lastSource = `Ingreso Almacén ${data.documentNumber}`;
            existing.isRecentlyUpdated = true;
          } else {
            const newProd = new Product({
              id: newItem.id || ('prod_' + Date.now() + '_' + itemsAffected),
              name: newItem.name || 'Producto Almacén',
              category: newItem.category || 'textil',
              variants: newItem.variants || 'Talla/Color Detallado',
              storeId: 'almacen',
              stock: qty,
              costUnit: Number(newItem.costUnit) || 18.0,
              priceSale: Number(newItem.priceSale) || 35.0,
              daysStagnant: 1,
              status: 'normal',
              dataQualityScore: 98
            });
            newProd.lastSource = `Ingreso Almacén ${data.documentNumber}`;
            this.state.products.unshift(newProd);
          }
          itemsAffected++;
        });

      } else {
        // =========================================================================
        // CASO 4: BOLETA PROVEEDOR / COMPRA TRADICIONAL
        // =========================================================================
        data.items.forEach(newItem => {
          const qty = Number(newItem.stock) || 1;
          totalUnits += qty;
          const cleanName = (newItem.name || '').toLowerCase().trim();
          let existing = this.state.products.find(p => p.name.toLowerCase().trim() === cleanName && (p.storeId === targetStoreId || this.currentStoreId === 'consolidated'));
          
          if (existing) {
            existing.stock += qty;
            if (newItem.costUnit) existing.costUnit = Number(newItem.costUnit);
            if (newItem.priceSale) existing.priceSale = Number(newItem.priceSale);
            existing.lastSource = `Boleta ${data.documentNumber}`;
            existing.isRecentlyUpdated = true;
          } else {
            const newProd = new Product({
              id: newItem.id || ('prod_' + Date.now() + '_' + itemsAffected),
              name: newItem.name || 'Producto',
              category: newItem.category || 'textil',
              variants: newItem.variants || 'Estándar',
              storeId: targetStoreId,
              stock: qty,
              costUnit: Number(newItem.costUnit) || 18.0,
              priceSale: Number(newItem.priceSale) || 38.0,
              daysStagnant: 1,
              status: 'normal',
              dataQualityScore: 98
            });
            newProd.lastSource = `Boleta ${data.documentNumber}`;
            this.state.products.unshift(newProd);
          }
          itemsAffected++;
        });
      }

      // Guardar en LocalStorage y re-renderizar todas las vistas
      this.save();

      // Ocultar permanentemente la tarjeta de escaneo y alertas de duda
      const scanCard = document.getElementById('ocrScanningCard');
      if (scanCard) scanCard.classList.add('hidden');
      const doubtContainer = document.getElementById('humanInTheLoopAlert');
      if (doubtContainer) doubtContainer.classList.add('hidden');

      // Cerrar la ventana de revisión
      this.closeBoletaReviewModal();

      // Mostrar alerta de éxito adaptada al tipo de operación
      const alertEl = document.getElementById('scanSuccessAlert');
      const alertMsg = document.getElementById('scanSuccessAlertMsg');
      if (alertEl && alertMsg) {
        if (isSale) {
          alertMsg.textContent = `⚡ ¡Venta de mostrador guardada! Se descontaron ${totalUnits} prendas de tienda y se sumaron S/ ${totalSum.toFixed(2)} al flujo de caja diario en LocalStorage.`;
        } else if (isTransfer) {
          alertMsg.textContent = `🚚 ¡Traslado completado! ${totalUnits} prendas fueron despachadas a tu tienda listas para venta sin fricción.`;
        } else if (isWarehouse) {
          alertMsg.textContent = `📦 ¡Ingreso a Almacén Central guardado! Tallas y colores registrados con detalle para control de capital.`;
        } else {
          alertMsg.textContent = `🧾 ${receiptRecord.title} confirmada y guardada en LocalStorage. Total: S/ ${receiptRecord.totalAmount.toFixed(2)} (${itemsAffected} productos procesados).`;
        }
        alertEl.classList.remove('hidden');
      }

      if (isSale) {
        this.showToast(`⚡ ¡Venta registrada! -${totalUnits} prendas / +S/ ${totalSum.toFixed(2)} en caja`);
      } else if (isTransfer) {
        this.showToast(`🚚 Traslado guardado: ${totalUnits} prendas listas para venta`);
      } else if (isWarehouse) {
        this.showToast(`📦 Entrada a Almacén guardada en LocalStorage`);
      } else {
        this.showToast(`¡${receiptRecord.title} guardada en LocalStorage!`);
      }

      // Scroll a la sección de Boletas Guardadas
      const receiptsSection = document.getElementById('scannedReceiptsSection');
      if (receiptsSection) {
        receiptsSection.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error al guardar comprobante:', err);
      this.closeBoletaReviewModal();
      this.showToast('Comprobante procesado y guardado en LocalStorage');
      try { this.save(); } catch (e) {}
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
      const isSale = r.type === 'venta_tienda' || !!r.isSale;
      const isTransfer = r.type === 'traslado' || !!r.isTransfer;
      const isWarehouse = r.type === 'almacen' || !!r.isWarehouse;
      const isBoleta = r.type === 'boleta';

      let borderTheme = 'border-l-4 border-l-amber-500 bg-amber-50/20';
      let typeBadge = `<span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-wide">📓 Cuaderno Diario</span>`;
      let amountLabel = 'Monto Comprobante:';
      let itemsTitle = `Productos ingresados (${r.itemsCount || r.items.length} items)`;

      if (isSale) {
        borderTheme = 'border-l-4 border-l-emerald-500 bg-emerald-50/20';
        typeBadge = `<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-extrabold uppercase tracking-wide">🏷️ Venta Rápida (Mostrador)</span>`;
        amountLabel = 'Ingreso a Caja Diaria:';
        itemsTitle = `Prendas vendidas (${r.itemsCount || r.items.length} modelos descontados)`;
      } else if (isTransfer) {
        borderTheme = 'border-l-4 border-l-purple-500 bg-purple-50/20';
        typeBadge = `<span class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 text-[10px] font-extrabold uppercase tracking-wide">🚚 Traslado a Tienda</span>`;
        amountLabel = 'Valor Despachado:';
        itemsTitle = `Mercadería despachada (${r.itemsCount || r.items.length} items listos para venta)`;
      } else if (isWarehouse) {
        borderTheme = 'border-l-4 border-l-indigo-500 bg-indigo-50/20';
        typeBadge = `<span class="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-[10px] font-extrabold uppercase tracking-wide">📦 Almacén Central</span>`;
        amountLabel = 'Capital en Almacén:';
        itemsTitle = `Variantes detalladas (${r.itemsCount || r.items.length} con tallas y colores)`;
      } else if (isBoleta) {
        borderTheme = 'border-l-4 border-l-blue-500 bg-blue-50/20';
        typeBadge = `<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase tracking-wide">🧾 Boleta de Compra</span>`;
        amountLabel = 'Monto Compra:';
        itemsTitle = `Productos ingresados (${r.itemsCount || r.items.length} items)`;
      }

      const storeName = r.storeId === 'almacen' ? 'Almacén Central' : r.storeId === 'guisado' ? 'Galería Guisado' : r.storeId === 'el_rey' ? 'C.C. El Rey' : 'Tienda';

      const itemsRows = (r.items || []).map(it => `
        <div class="flex items-center justify-between py-1 border-b border-slate-100/80 text-[11px]">
          <span class="font-medium text-slate-700">
            <strong class="text-slate-900">${it.qty}x</strong> ${it.name} ${it.variants ? `<span class="text-[10px] text-slate-400">(${it.variants})</span>` : ''}
          </span>
          <span class="font-semibold ${isSale ? 'text-emerald-700' : 'text-slate-800'}">S/ ${(it.total || (it.qty * (it.priceSale || it.costUnit || 10))).toFixed(2)}</span>
        </div>
      `).join('');

      return `
        <div id="receipt-card-${r.id}" class="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition space-y-2.5 max-w-full overflow-hidden ${borderTheme}">
          <div class="flex flex-wrap items-start justify-between gap-2 min-w-0">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5 mb-1">
                ${typeBadge}
                <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1 shrink-0">
                  <i data-lucide="check" class="w-3 h-3"></i> En LocalStorage
                </span>
              </div>
              <h5 class="font-bold text-xs sm:text-sm text-slate-800 break-words">${r.title}</h5>
              <p class="text-[11px] text-slate-500 truncate">${r.provider} · <span class="font-medium text-tinkuy-forest">${storeName}</span></p>
            </div>

            <div class="text-right shrink-0">
              <span class="text-[10px] text-slate-400 block">${r.date}</span>
              <span class="text-[11px] font-bold text-slate-500">${amountLabel}</span>
              <span class="text-sm sm:text-base font-bold ${isSale ? 'text-emerald-700' : 'text-tinkuy-forest'} block">S/ ${Number(r.totalAmount).toFixed(2)}</span>
            </div>
          </div>

          <!-- Items desglosados -->
          <div class="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100 space-y-0.5">
            <div class="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center justify-between">
              <span>${itemsTitle}</span>
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

      const storeName = p.storeId === 'guisado' ? 'Guisado #104' : p.storeId === 'el_rey' ? 'El Rey #215' : 'Almacén Central';
      const isStore = p.storeId !== 'almacen' || this.currentRole === 'vendedora';
      const variantDisplay = isStore 
        ? `<span class="text-[11px] font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">${p.variants || 'Modelo Tienda (Agilizado)'}</span>` 
        : (p.variants || 'Talla / Color Estándar');

      let sourceTag = '';
      if (p.lastSource) {
        sourceTag = `<span class="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[9px] font-bold border border-blue-200">🧾 ${p.lastSource}</span>`;
      }

      const quickSellAction = isStore ? `
        <button onclick="window.tinkuyApp.quickSellProduct('${p.id}')" class="px-2.5 py-1 rounded-xl bg-tinkuy-coral hover:bg-tinkuy-coralHover text-white text-[11px] font-bold shadow-2xs transition active:scale-95 flex items-center gap-1">
          ⚡ Vender 1 un.
        </button>
      ` : '';

      tr.innerHTML = `
        <td class="px-3 py-2.5 font-bold text-slate-800">
          ${p.name}
          <div class="flex items-center gap-1.5 mt-0.5">
            <span class="text-[10px] font-normal text-slate-400 capitalize">${p.category}</span>
            ${sourceTag}
          </div>
        </td>
        <td class="px-3 py-2.5 text-slate-600">${variantDisplay}</td>
        <td class="px-3 py-2.5"><span class="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold text-[11px]">${storeName}</span></td>
        <td class="px-3 py-2.5 text-right font-bold ${p.stock <= 5 ? 'text-red-600' : 'text-slate-800'}">${p.stock}</td>
        <td class="px-3 py-2.5 text-right text-slate-600">S/ ${p.costUnit.toFixed(2)}</td>
        <td class="px-3 py-2.5 text-right font-semibold text-tinkuy-forest">S/ ${p.priceSale.toFixed(2)}</td>
        <td class="px-3 py-2.5 text-center">${statusBadge}</td>
        <td class="px-3 py-2.5 text-center">
          <div class="flex items-center justify-center gap-1">
            ${quickSellAction}
            <button onclick="window.tinkuyApp.deleteProduct('${p.id}')" class="text-slate-400 hover:text-red-500 transition p-1" title="Eliminar">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    this.renderInventoryMobileCards();
    if (window.lucide) window.lucide.createIcons();
  }

  renderInventoryMobileCards() {
    const container = document.getElementById('inventoryMobileCards');
    if (!container) return;
    container.innerHTML = '';

    const prods = this.getFilteredProducts();

    prods.forEach(p => {
      const card = document.createElement('div');
      card.className = 'p-3 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2';

      let statusPill = '';
      if (p.status === 'frozen') {
        statusPill = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200">🔴 Estancado</span>`;
      } else if (p.status === 'star') {
        statusPill = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">🟢 Estrella</span>`;
      } else {
        statusPill = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">🟡 Normal</span>`;
      }

      const storeName = p.storeId === 'guisado' ? 'Guisado' : p.storeId === 'el_rey' ? 'El Rey' : 'Almacén';
      const isStore = p.storeId !== 'almacen' || this.currentRole === 'vendedora';
      const variantDisplay = isStore ? 'Modelo Tienda (Agilizado)' : (p.variants || 'Talla/Color Estándar');

      let sourcePill = '';
      if (p.lastSource) {
        sourcePill = `<span class="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[9px] font-bold border border-blue-200">🧾 ${p.lastSource}</span>`;
      }

      card.innerHTML = `
        <div class="flex items-start justify-between gap-1.5">
          <div class="min-w-0 flex-1">
            <h5 class="font-bold text-xs text-slate-800 truncate">${p.name}</h5>
            <div class="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span class="text-[10px] font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">${variantDisplay}</span>
              <span class="text-[10px] text-slate-500">· ${storeName}</span>
              ${sourcePill}
            </div>
          </div>
          ${statusPill}
        </div>
        <div class="flex items-center justify-between pt-1.5 border-t border-slate-100 text-xs">
          <div class="flex items-center gap-2">
            <span class="text-slate-500 text-[11px]">Stock: <strong class="${p.stock <= 5 ? 'text-red-600' : 'text-slate-800'}">${p.stock} un.</strong></span>
            <span class="font-bold text-xs text-tinkuy-forest">S/ ${p.priceSale.toFixed(2)}</span>
          </div>
          <div class="flex items-center gap-1.5">
            ${isStore ? `
              <button onclick="window.tinkuyApp.quickSellProduct('${p.id}')" class="px-2.5 py-1 rounded-xl bg-tinkuy-coral text-white font-bold text-[10px] shadow-2xs active:scale-95 transition">
                ⚡ Vender 1 un.
              </button>
            ` : ''}
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

  // --- GEMINI TEXT API HELPER ---
  async callGeminiText(prompt) {
    const apiKey = StorageService.getGeminiApiKey();
    if (!apiKey || apiKey.length < 10) return null;

    const models = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-2.5-flash'];
    for (const model of models) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3 }
          })
        });

        if (response.ok) {
          const jsonResp = await response.json();
          const rawText = jsonResp?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText && rawText.trim()) return rawText.trim();
        }
      } catch (e) {
        console.warn(`Error en Gemini Text (${model}):`, e);
      }
    }
    return null;
  }

  // --- SEMÁFORO AI DIAGNOSIS (STEP 2) ---
  async analyzeTrafficLightWithAi() {
    const btn = document.getElementById('btnAnalyzeStep2Ai');
    const container = document.getElementById('step2AiAnalysisContent');
    if (!container) return;

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 text-slate-950 animate-spin"></i> Analizando con IA...`;
      if (window.lucide) window.lucide.createIcons();
    }

    const frozenProds = this.state.products.filter(p => p.status === 'red' || p.daysStagnant > 30);
    const starProds = this.state.products.filter(p => p.status === 'star' || p.daysStagnant < 7);
    const normalProds = this.state.products.filter(p => p.status === 'normal');

    let totalFrozen = 0;
    frozenProds.forEach(p => totalFrozen += (p.costUnit * p.stock));

    const prompt = `Eres el consultor de inventario de Tinkuy IA. Analiza este estado real de inventario del comercio peruano:
- Tienda actual: ${this.currentStoreId}
- Dinero Congelado (Rojo, >30d): S/ ${totalFrozen.toFixed(2)} (${frozenProds.length} prendas)
  Prendas congeladas: ${frozenProds.map(p => `${p.name} (${p.stock} un., ${p.daysStagnant} días estancados)`).join(', ') || 'Ninguna'}
- Productos Estrella (Verde): ${starProds.map(p => `${p.name} (${p.stock} un. restantes)`).join(', ') || 'Ninguno'}
- Productos Rotación Normal (Amarillo): ${normalProds.length} productos

Genera una recomendación ejecutiva de 3 puntos clave para el comerciante (usando emojis, lenguaje sencillo y cercano de casera/casero):
1. Plan de rescate para el dinero congelado (S/ ${totalFrozen.toFixed(2)}).
2. Alerta de reabastecimiento o quiebre de stock para prendas estrella.
3. Consejo de precios o liquidez inmediata.

Mantén la respuesta concisa (máximo 120 palabras), clara y estructurada en HTML simple (<p>, <strong>, <ul>, <li>).`;

    let resultText = await this.callGeminiText(prompt);

    if (!resultText) {
      resultText = `
        <div class="space-y-1.5 text-xs text-amber-50">
          <p class="font-bold text-tinkuy-gold flex items-center gap-1">
            <span>🚨 Diagnóstico de Liquidez:</span> S/ ${totalFrozen.toFixed(2)} inmovilizados
          </p>
          <ul class="list-disc list-inside space-y-1 text-[11px] opacity-95">
            <li><strong>Rescate Rápido:</strong> Tienes ${frozenProds.length} productos estancados (${frozenProds.slice(0, 2).map(p => p.name).join(', ') || 'prendas antiguas'}). Créales un Combo de Rescate o descuento del 20% para liberar caja hoy.</li>
            <li><strong>Alerta Quiebre Stock:</strong> Tienes ${starProds.length} prendas estrellas (${starProds.slice(0, 2).map(p => p.name).join(', ') || 'polos top'}) a punto de agotarse. ¡Emite Orden de Compra antes del fin de semana!</li>
            <li><strong>Salud Financiera:</strong> Reinvierte la liquidez recuperada en tus prendas de rotación rápida para duplicar el margen de utilidad.</li>
          </ul>
        </div>
      `;
    } else {
      resultText = resultText.replace(/```html/gi, '').replace(/```/g, '');
      resultText = `<div class="space-y-1 text-xs text-amber-50 leading-relaxed">${resultText}</div>`;
    }

    container.innerHTML = resultText;

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="refresh-cw" class="w-4 h-4 text-slate-950"></i> Re-evaluar con IA`;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // --- TINKY FLOATING ASSISTANT CONTROLLER ---
  toggleTinkyChat() {
    const modal = document.getElementById('tinkyChatModal');
    if (!modal) return;

    this.isTinkyOpen = !this.isTinkyOpen;
    if (this.isTinkyOpen) {
      modal.classList.remove('hidden');
      setTimeout(() => {
        modal.classList.remove('scale-95', 'opacity-0');
        modal.classList.add('scale-100', 'opacity-100');
        document.getElementById('tinkyTextInput')?.focus();
      }, 10);
    } else {
      modal.classList.remove('scale-100', 'opacity-100');
      modal.classList.add('scale-95', 'opacity-0');
      setTimeout(() => {
        modal.classList.add('hidden');
      }, 300);
    }
  }

  clearTinkyChat() {
    const msgs = document.getElementById('tinkyChatMessages');
    if (msgs) {
      msgs.innerHTML = `
        <div class="flex items-start gap-2 max-w-[90%]">
          <div class="w-7 h-7 rounded-xl bg-tinkuy-forest text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-2xs">🤖</div>
          <div class="p-3 rounded-2xl bg-white border border-slate-200 text-slate-800 shadow-2xs space-y-1.5">
            <p class="font-semibold text-tinkuy-forest text-[11px]">¡Hola caserita! Soy Tinky 🛍️</p>
            <p class="text-[11px] leading-normal text-slate-700">
              Tengo acceso a tus datos guardados en la app (inventario, dinero congelado y boletas). ¿En qué te ayudo hoy?
            </p>
          </div>
        </div>
      `;
    }
    this.showToast('Chat con Tinky reiniciado');
  }

  toggleTinkySpeech() {
    this.tinkySpeechEnabled = !this.tinkySpeechEnabled;
    const btn = document.getElementById('tinkyTtsToggleBtn');
    if (btn) {
      btn.className = this.tinkySpeechEnabled 
        ? 'p-2 rounded-xl bg-amber-400/30 text-amber-200 hover:text-white transition' 
        : 'p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition';
    }
    this.showToast(this.tinkySpeechEnabled ? '🔊 Voz de Tinky activada' : '🔇 Voz de Tinky desactivada');
  }

  handleTinkyFileSelect(event) {
    const file = event.target.files?.[0];
    // Igual que en handleFileUpload: sin esto, re-seleccionar la misma foto
    // no dispara 'change' y se queda el adjunto anterior.
    event.target.value = '';
    if (!file) return;

    this.tinkyAttachedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.tinkyAttachedDataUrl = e.target.result;
      const preview = document.getElementById('tinkyImagePreview');
      const filename = document.getElementById('tinkyImageFileName');
      const container = document.getElementById('tinkyImagePreviewContainer');
      if (preview) preview.src = this.tinkyAttachedDataUrl;
      if (filename) filename.textContent = file.name;
      if (container) container.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }

  removeTinkyAttachedImage() {
    this.tinkyAttachedFile = null;
    this.tinkyAttachedDataUrl = null;
    const container = document.getElementById('tinkyImagePreviewContainer');
    if (container) container.classList.add('hidden');
    const input = document.getElementById('tinkyFileInput');
    if (input) input.value = '';
  }

  sendTinkyQuickAction(actionType) {
    let promptText = '';
    if (actionType === 'business_summary') {
      promptText = 'Hazme un resumen completo de mi negocio: inventario, prendas estrellas y salud financiera.';
    } else if (actionType === 'frozen_capital') {
      promptText = '¿Cuánto dinero tengo congelado y cuáles prendas me están quitando liquidez?';
    } else if (actionType === 'trigger_scan') {
      document.getElementById('tinkyFileInput')?.click();
      return;
    } else if (actionType === 'sales_tips') {
      promptText = 'Dame 3 consejos prácticos de venta para aumentar la rotación de mis prendas esta semana.';
    }
    if (promptText) {
      this.sendTinkyMessage(promptText);
    }
  }

  async sendTinkyMessage(overrideText = null) {
    const inputEl = document.getElementById('tinkyTextInput');
    const text = (overrideText || inputEl?.value || '').trim();
    const hasImage = !!this.tinkyAttachedDataUrl;

    if (!text && !hasImage) return;

    if (inputEl) inputEl.value = '';

    const chatContainer = document.getElementById('tinkyChatMessages');
    const imageToProcess = this.tinkyAttachedDataUrl;
    this.removeTinkyAttachedImage();

    // Render User Message Bubble
    if (chatContainer) {
      const userBubble = document.createElement('div');
      userBubble.className = 'flex items-start justify-end gap-2 ml-auto max-w-[90%]';
      userBubble.innerHTML = `
        <div class="p-3 rounded-2xl bg-tinkuy-forest text-white shadow-2xs space-y-1">
          ${hasImage ? `<img src="${imageToProcess}" class="w-36 h-28 object-cover rounded-xl mb-1.5 border border-white/20">` : ''}
          ${text ? `<p class="text-[11px] leading-relaxed">${text}</p>` : ''}
        </div>
        <div class="w-7 h-7 rounded-xl bg-amber-400 text-slate-900 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">TÚ</div>
      `;
      chatContainer.appendChild(userBubble);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Show typing indicator
    const indicator = document.getElementById('tinkyTypingIndicator');
    const statusText = document.getElementById('tinkyStatusText');
    if (indicator) indicator.classList.remove('hidden');

    if (hasImage) {
      if (statusText) statusText.textContent = 'Analizando comprobante con Visión IA...';
      try {
        const scanResult = await OcrEngine.processImage(imageToProcess);
        if (scanResult.fallbackReason) {
          this.showToast(`⚠️ Gemini falló (${scanResult.fallbackReason}). Mostrando aproximación del Motor Local, revisa los datos.`);
        }
        if (scanResult && scanResult.items && scanResult.items.length > 0) {
          const isSale = scanResult.documentType === 'venta_tienda' || !!scanResult.isSale;
          const isTransfer = scanResult.documentType === 'traslado' || !!scanResult.isTransfer;
          const isWarehouse = scanResult.documentType === 'almacen' || !!scanResult.isWarehouse;
          const targetStoreId = this.currentStoreId === 'consolidated' ? 'guisado' : this.currentStoreId;

          const totalMoney = scanResult.totalAmount || scanResult.items.reduce((s, i) => {
            const qty = Number(i.stock) || 1;
            const price = isSale ? (Number(i.priceSale) || Number(i.costUnit) || 0) : (Number(i.costUnit) || 15);
            return s + (qty * price);
          }, 0);

          let replyMsg = '';

          if (isSale) {
            // Venta rápida: descontar del modelo general en tienda sin exigir color/talla
            let totalUnits = 0;
            scanResult.items.forEach(it => {
              const qty = Number(it.stock) || 1;
              totalUnits += qty;
              const cleanName = (it.name || '').toLowerCase().trim();
              const existing = this.state.products.find(p => 
                (p.name.toLowerCase().trim() === cleanName || p.name.toLowerCase().trim().includes(cleanName) || cleanName.includes(p.name.toLowerCase().trim())) &&
                (p.storeId === targetStoreId || this.currentStoreId === 'consolidated')
              );
              if (existing) {
                existing.stock = Math.max(0, existing.stock - qty);
                existing.daysStagnant = 1;
                existing.status = 'star';
                existing.isRecentlyUpdated = true;
              }
            });

            this.state.scannedReceipts.unshift({
              id: 'rec_' + Date.now(),
              date: new Date().toLocaleDateString('es-PE'),
              title: scanResult.title || 'Tienda = (Venta Rápida)',
              type: 'venta_tienda',
              isSale: true,
              storeId: targetStoreId,
              itemsCount: scanResult.items.length,
              totalAmount: totalMoney,
              qualityScore: scanResult.dataQualityScore || 98
            });

            replyMsg = `⚡ ¡Venta registrada con éxito caserita! 🛍️
Reconocí tu nota de venta en mostrador (sin talla ni color para que atiendas rápido sin demoras).
Desconté las prendas del inventario de tu tienda y sumé **S/ ${totalMoney.toFixed(2)}** a tu caja diaria:
${scanResult.items.map(i => `• **${i.name}**: ${i.stock} un. x S/ ${(i.priceSale || 0).toFixed(2)}`).join('\n')}

¡Cero fricción: tus datos ya quedaron guardados en LocalStorage! 🎉`;

            if (typeof confetti === 'function') {
              confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
            }

          } else if (isTransfer) {
            // Traslado de almacén a tienda
            scanResult.items.forEach(it => {
              const qty = Number(it.stock) || 1;
              const cleanName = (it.name || '').toLowerCase().trim();
              const warehouseProd = this.state.products.find(p => p.storeId === 'almacen' && p.name.toLowerCase().trim().includes(cleanName));
              if (warehouseProd) warehouseProd.stock = Math.max(0, warehouseProd.stock - qty);

              let storeProd = this.state.products.find(p => p.storeId === targetStoreId && p.name.toLowerCase().trim().includes(cleanName));
              if (storeProd) {
                storeProd.stock += qty;
              } else {
                this.state.products.unshift(new Product({
                  id: 'prod_' + Date.now(),
                  name: it.name,
                  category: 'textil',
                  variants: 'Modelo Tienda (Venta Ágil)',
                  storeId: targetStoreId,
                  stock: qty,
                  costUnit: it.costUnit || 16.0,
                  priceSale: it.priceSale || 32.0,
                  daysStagnant: 1,
                  status: 'normal'
                }));
              }
            });

            this.state.scannedReceipts.unshift({
              id: 'rec_' + Date.now(),
              date: new Date().toLocaleDateString('es-PE'),
              title: scanResult.title || 'Traslado a Tiendas',
              type: 'traslado',
              isTransfer: true,
              storeId: targetStoreId,
              itemsCount: scanResult.items.length,
              totalAmount: totalMoney,
              qualityScore: scanResult.dataQualityScore || 98
            });

            replyMsg = `🚚 ¡Traslado procesado caserita!
Moví **${scanResult.items.length} productos** desde el Almacén Central hacia tu Tienda:
${scanResult.items.map(i => `• **${i.name}**: ${i.stock} un. (${i.variants || 'Talla/Color'})`).join('\n')}

¡Al llegar a tienda están listos para venta rápida! 📦`;

          } else if (isWarehouse) {
            // Entrada a almacén central con variantes
            scanResult.items.forEach(it => {
              this.state.products.unshift(new Product({
                id: 'prod_' + Date.now(),
                name: it.name,
                category: 'textil',
                variants: it.variants || 'Talla/Color Detallado',
                storeId: 'almacen',
                stock: Number(it.stock) || 1,
                costUnit: Number(it.costUnit) || 18.0,
                priceSale: Number(it.priceSale) || 35.0,
                daysStagnant: 1,
                status: 'normal'
              }));
            });

            this.state.scannedReceipts.unshift({
              id: 'rec_' + Date.now(),
              date: new Date().toLocaleDateString('es-PE'),
              title: scanResult.title || 'Entrada Almacén Central',
              type: 'almacen',
              isWarehouse: true,
              storeId: 'almacen',
              itemsCount: scanResult.items.length,
              totalAmount: totalMoney,
              qualityScore: scanResult.dataQualityScore || 98
            });

            replyMsg = `📦 ¡Ingreso a Almacén guardado con éxito!
Registré **${scanResult.items.length} variantes** con detalle de tallas y colores para control estricto de capital:
${scanResult.items.map(i => `• **${i.name}**: ${i.stock} un. (${i.variants || 'Detallado'}) · Costo S/ ${(i.costUnit || 0).toFixed(2)}`).join('\n')}

¡Todo guardado en LocalStorage! 📊`;

          } else {
            // Boleta de compra genérica
            const newProducts = scanResult.items.map(it => new Product(it));
            this.state.products = [...newProducts, ...this.state.products];
            this.state.scannedReceipts.unshift({
              id: 'rec_' + Date.now(),
              date: new Date().toLocaleDateString('es-PE'),
              title: scanResult.providerOrIssuer || 'Boleta de compra',
              type: 'boleta',
              itemsCount: scanResult.items.length,
              totalAmount: totalMoney,
              qualityScore: scanResult.dataQualityScore || 98
            });

            replyMsg = `¡Excelente noticia caserita! 🧾 Boleta procesada:
Identifiqué **${scanResult.items.length} productos** por un total de **S/ ${totalMoney.toFixed(2)}**:
${scanResult.items.map(i => `• **${i.name}**: ${i.stock} un. a S/ ${(i.costUnit || 0).toFixed(2)} c/u`).join('\n')}

¡Productos agregados a tu inventario en LocalStorage! 🚀`;
          }

          this.save();
          this.appendTinkyReply(replyMsg);
        } else {
          this.appendTinkyReply('No pude reconocer datos legibles en la imagen caserita. Asegúrate de que la foto esté bien iluminada y sin reflejos.');
        }
      } catch (err) {
        console.error('Error procesando imagen en Tinky:', err);
        this.appendTinkyReply('Ocurrió un pequeño inconveniente al procesar la foto. ¡Intentemos de nuevo o descríbela por texto!');
      } finally {
        if (indicator) indicator.classList.add('hidden');
      }
      return;
    }

    // Process Text Prompt
    if (statusText) statusText.textContent = 'Tinky está consultando tus datos...';

    const frozen = this.state.products.filter(p => p.status === 'red' || p.daysStagnant > 30);
    const star = this.state.products.filter(p => p.status === 'star' || p.daysStagnant < 7);
    const totalInventoryValue = this.state.products.reduce((acc, p) => acc + (p.costUnit * p.stock), 0);
    const totalFrozenValue = frozen.reduce((acc, p) => acc + (p.costUnit * p.stock), 0);
    const scoreInfo = FinancialScoreService.calculateScore(this.state);

    const systemPrompt = `Eres Tinky, el asistente inteligente de negocio de Tinkuy IA.
Eres la consejera y compañera virtual amigable, perspicaz y cercana para emprendedoras y comerciantes en Gamarra y el Perú.
Hablas con un tono cálido y motivador ("caserita", "casero", "mira facilito"), pero tus respuestas están rigurosamente fundamentadas en los datos reales del negocio guardados en la app:

DATOS EN TIEMPO REAL DEL NEGOCIO (localStorage):
- Tienda actual: ${this.currentStoreId}
- Total productos en inventario: ${this.state.products.length} productos
- Valor total del stock en costo: S/ ${totalInventoryValue.toFixed(2)}
- Dinero congelado (Rojo >30 días): S/ ${totalFrozenValue.toFixed(2)} (${frozen.length} ítems: ${frozen.map(f => f.name).join(', ') || 'Ninguno'})
- Prendas Estrella (Verde rotación rápida): ${star.length} ítems (${star.map(s => s.name).join(', ') || 'Ninguno'})
- Comprobantes escaneados guardados: ${this.state.scannedReceipts.length} comprobantes
- Tinkuy Score Financiero: ${scoreInfo.totalScore} pts (${scoreInfo.badgeLabel})

REGLA CLAVE DE GAMARRA (CERO FRICCIÓN REAL):
- En el Almacén Central se registra el producto con máximo detalle: prenda + modelo + talla + color + costo (hay tiempo para anotar).
- En el Traslado hacia tiendas, la mercadería viaja lista para la venta.
- En la Tienda (Punto de Venta / Mostrador), la emprendedora anota súper rápido solo modelo, cantidad y precio (ej: "Polo básico 5 - S/ 40"). PIERDE LA PROPIEDAD DE COLOR Y TALLA intencionalmente para no hacer esperar a los clientes.
- La IA descuenta del inventario general de la tienda y suma el dinero cobrado al flujo de caja diario. ¡Jamás arroja error ni bloquea por falta de talla/color!

CONSULTA DEL USUARIO:
"${text}"

INSTRUCCIONES:
1. Responde de forma clara, directa y estructurada (usa viñetas o negritas).
2. Refiere explícitamente los datos reales arriba (ej: S/ ${totalFrozenValue.toFixed(2)} congelados, ${star.length} estrellas).
3. Si preguntan por las notas o cómo funciona la tienda vs almacén, explica la regla de Cero Fricción amigablemente.
4. No uses lenguaje bancario aburrido. Sé amigable, empática y motivadora.`;

    let reply = await this.callGeminiText(systemPrompt);

    if (!reply) {
      reply = this.generateLocalTinkyResponse(text, totalInventoryValue, totalFrozenValue, frozen, star, scoreInfo);
    }

    if (indicator) indicator.classList.add('hidden');
    this.appendTinkyReply(reply);
  }

  generateLocalTinkyResponse(text, totalVal, frozenVal, frozen, star, scoreInfo) {
    const q = text.toLowerCase();

    // Detección de preguntas sobre el flujo de Gamarra, almacén, traslados o tallas/colores
    if (q.includes('almacen') || q.includes('almacén') || q.includes('traslado') || q.includes('talla') || q.includes('color') || q.includes('gamarra') || q.includes('friccion') || q.includes('fricción')) {
      return `🛍️ **¿Cómo funciona el flujo en Gamarra con Tinkuy IA?**

1. **📦 En el Almacén Central:** Anotas con **máximo detalle** (modelo + talla + color + costo). Aquí sí hay tiempo para saber exactamente cuánto capital tienes invertido.
2. **🚚 En el Traslado:** Mueves las prendas del almacén hacia la tienda.
3. **🏷️ En la Tienda (Mostrador):** Anotas **súper rápido** solo modelo, cantidad y precio cobrado (ej: *Polo básico 5 - S/ 40*). **No anotas color ni talla** para no hacer esperar a tus clientes.

⚡ **Cero Fricción Real:** ¡Mi IA no te arroja error ni te bloquea! Descuenta las prendas del modelo general y registra el dinero cobrado en tu caja diaria sin complicarte la vida. ¡Así atiendes rápido y vendes más! 🚀`;
    }

    if (q.includes('resumen') || q.includes('negocio') || q.includes('cómo voy') || q.includes('hola')) {
      return `¡Hola caserita! Te hago un resumen rapidito de tu negocio 📊:

• **Inventario:** Tienes **${this.state.products.length} productos** valorizados en **S/ ${totalVal.toFixed(2)}**.
• **Dinero Congelado:** Tienes **S/ ${frozenVal.toFixed(2)}** en prendas estancadas (+30 días).
• **Prendas Estrella:** Tienes **${star.length} productos** de alta rotación a punto de agotarse.
• **Tinkuy Score:** Estás en **${scoreInfo.totalScore} pts** (${scoreInfo.badgeLabel}).

¿Deseas que armemos un combo para liberar ese dinero congelado hoy mismo? 💡`;
    }

    if (q.includes('congelado') || q.includes('estancado') || q.includes('rescatar') || q.includes('rojo')) {
      return `🚨 **Diagnóstico de Dinero Congelado:**

Tienes exactamente **S/ ${frozenVal.toFixed(2)}** inmovilizados en **${frozen.length} prendas**:
${frozen.map(f => `• **${f.name}**: ${f.stock} un. (${f.daysStagnant} días sin rotar)`).join('\n') || '• No hay prendas congeladas actualmente.'}

💡 **Consejo de Tinky:** Ve a la pestaña **3. Botón de Rescate** para armar un Combo 2x1 o publicar una oferta relámpago en tu WhatsApp.`;
    }

    if (q.includes('consejo') || q.includes('vender') || q.includes('tips')) {
      return `💡 **3 Consejos de Oro de Tinky para esta semana:**

1. **Combina lo lento con lo rápido:** Une una prenda estancada con un polo estrella en un "Pack Fin de Semana".
2. **Estados de WhatsApp:** Publica fotos reales usando nuestro generador de afiches con precio tachado.
3. **Reabastece a tiempo:** Tus prendas estrellas vuelan. No te quedes sin stock los viernes.`;
    }

    return `¡Te escucho caserita! En tu inventario actual tienes registrado **S/ ${totalVal.toFixed(2)}** de mercadería y **S/ ${frozenVal.toFixed(2)}** de capital estancado.

Puedes pedirme un resumen del negocio, ver las prendas congeladas o subir la foto de tus notas (tienda, traslado o almacén) para procesarlas al instante 📸.`;
  }

  appendTinkyReply(text) {
    const chatContainer = document.getElementById('tinkyChatMessages');
    if (!chatContainer) return;

    const formattedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    const botBubble = document.createElement('div');
    botBubble.className = 'flex items-start gap-2 max-w-[92%] animate-fade-in';
    botBubble.innerHTML = `
      <div class="w-7 h-7 rounded-xl bg-tinkuy-forest text-white flex items-center justify-center text-xs shrink-0 mt-0.5 shadow-2xs">🤖</div>
      <div class="p-3 rounded-2xl bg-white border border-slate-200 text-slate-800 shadow-2xs space-y-1.5">
        <p class="text-[11px] leading-relaxed">${formattedText}</p>
      </div>
    `;

    chatContainer.appendChild(botBubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    if (this.tinkySpeechEnabled) {
      const cleanSpeech = text.replace(/[*#]/g, '');
      this.speakTinky(cleanSpeech);
    }
  }

  speakTinky(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/<[^>]*>?/gm, '').slice(0, 220);
      const utter = new SpeechSynthesisUtterance(clean);
      utter.lang = 'es-PE';
      utter.rate = 1.05;
      utter.pitch = 1.1;

      const voices = window.speechSynthesis.getVoices();
      const peVoice = voices.find(v => v.lang.includes('es-PE') || v.lang.includes('es-MX') || v.lang.includes('es-ES'));
      if (peVoice) utter.voice = peVoice;

      window.speechSynthesis.speak(utter);
    } catch (e) {
      console.warn('Error SpeechSynthesis Tinky:', e);
    }
  }

  toggleTinkyMic() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.showToast('El micrófono por voz no está soportado en este navegador');
      return;
    }

    const micBtn = document.getElementById('tinkyMicBtn');
    const pulse = document.getElementById('tinkyMicPulse');
    const inputEl = document.getElementById('tinkyTextInput');

    if (this.isTinkyListening) {
      if (this.tinkySpeechRecognizer) this.tinkySpeechRecognizer.stop();
      this.isTinkyListening = false;
      if (pulse) pulse.classList.add('hidden');
      if (micBtn) micBtn.className = 'p-2 rounded-xl bg-slate-100 text-slate-600';
      return;
    }

    try {
      this.tinkySpeechRecognizer = new SpeechRecognition();
      this.tinkySpeechRecognizer.lang = 'es-PE';
      this.tinkySpeechRecognizer.continuous = false;
      this.tinkySpeechRecognizer.interimResults = false;

      this.tinkySpeechRecognizer.onstart = () => {
        this.isTinkyListening = true;
        if (pulse) pulse.classList.remove('hidden');
        if (micBtn) micBtn.className = 'p-2 rounded-xl bg-red-100 text-red-600 border border-red-300';
        this.showToast('🎙️ Escuchando... habla tu consulta');
      };

      this.tinkySpeechRecognizer.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          if (inputEl) inputEl.value = transcript;
          this.sendTinkyMessage(transcript);
        }
      };

      this.tinkySpeechRecognizer.onerror = (err) => {
        console.warn('Error micrófono Tinky:', err);
        this.isTinkyListening = false;
        if (pulse) pulse.classList.add('hidden');
        if (micBtn) micBtn.className = 'p-2 rounded-xl bg-slate-100 text-slate-600';
      };

      this.tinkySpeechRecognizer.onend = () => {
        this.isTinkyListening = false;
        if (pulse) pulse.classList.add('hidden');
        if (micBtn) micBtn.className = 'p-2 rounded-xl bg-slate-100 text-slate-600';
      };

      this.tinkySpeechRecognizer.start();
    } catch (e) {
      console.warn('Excepción micrófono Tinky:', e);
      this.isTinkyListening = false;
      if (pulse) pulse.classList.add('hidden');
      if (micBtn) micBtn.className = 'p-2 rounded-xl bg-slate-100 text-slate-600';
    }
  }

  // --- DESPACHAR ALMACÉN -> TIENDA ---
  openDispatchModal() {
    const modal = document.getElementById('dispatchStoreModal');
    const select = document.getElementById('dispatchProductSelect');
    if (!modal || !select) return;

    const almacenProds = this.state.products.filter(p => p.storeId === 'almacen' && p.stock > 0);
    const sourceList = almacenProds.length > 0 ? almacenProds : this.state.products.filter(p => p.stock > 0);

    if (sourceList.length === 0) {
      this.showToast('No hay prendas en Almacén para despachar');
      return;
    }

    select.innerHTML = sourceList.map(p => `
      <option value="${p.id}">
        ${p.name} — [${p.variants || 'Sin variantes'}] (${p.stock} un. en Almacén)
      </option>
    `).join('');

    modal.classList.remove('hidden');
  }

  closeDispatchModal() {
    const modal = document.getElementById('dispatchStoreModal');
    if (modal) modal.classList.add('hidden');
  }

  confirmDispatchToStore() {
    const prodSelect = document.getElementById('dispatchProductSelect');
    const storeSelect = document.getElementById('dispatchTargetStoreSelect');
    const qtyInput = document.getElementById('dispatchQtyInput');
    const priceInput = document.getElementById('dispatchPriceInput');

    const productId = prodSelect?.value;
    const targetStoreId = storeSelect?.value || 'guisado';
    const qty = parseInt(qtyInput?.value || '10', 10);
    const newPrice = parseFloat(priceInput?.value || '35');

    if (!productId || qty <= 0) {
      this.showToast('Selecciona un producto y cantidad válida');
      return;
    }

    const sourceProd = this.state.products.find(p => p.id === productId);
    if (!sourceProd) {
      this.showToast('Producto no encontrado');
      return;
    }

    if (sourceProd.stock < qty) {
      this.showToast(`Stock insuficiente en Almacén (Disponibles: ${sourceProd.stock} un.)`);
      return;
    }

    // 1. Descontar del almacén
    sourceProd.stock -= qty;

    // 2. Crear o actualizar en tienda de destino (pierde talla/color para agilidad de venta)
    const targetStoreName = targetStoreId === 'guisado' ? 'Galería Guisado' : 'Galería El Rey';
    const cleanName = sourceProd.name.trim();

    let targetProd = this.state.products.find(p => 
      p.storeId === targetStoreId && 
      p.name.toLowerCase().trim() === cleanName.toLowerCase()
    );

    if (targetProd) {
      targetProd.stock += qty;
      if (newPrice > 0) targetProd.priceSale = newPrice;
      targetProd.variants = 'Modelo Tienda (Agilizado)';
    } else {
      targetProd = new Product({
        id: 'dispatch_prod_' + Date.now(),
        name: cleanName,
        category: sourceProd.category || 'textil',
        variants: 'Modelo Tienda (Agilizado)', // REGLA: Pierde talla y color para agilidad de venta
        storeId: targetStoreId,
        stock: qty,
        costUnit: sourceProd.costUnit,
        priceSale: newPrice > 0 ? newPrice : sourceProd.priceSale,
        daysStagnant: 1,
        status: 'normal',
        dataQualityScore: 99
      });
      this.state.products.unshift(targetProd);
    }

    this.save();
    this.closeDispatchModal();

    if (window.confetti) {
      window.confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    }

    this.showToast(`📦 ¡${qty} un. de ${sourceProd.name} despachadas a ${targetStoreName}! (Talla/Color omitidos para Venta Ágil)`);
  }

  // --- VENTA RÁPIDA 1-CLIC (MODO VENDEDORA TIENDA) ---
  quickSellProduct(productId) {
    const prod = this.state.products.find(p => p.id === productId);
    if (!prod) return;

    if (prod.stock <= 0) {
      this.showToast(`¡Agotado! No queda stock de ${prod.name} en tienda`);
      return;
    }

    prod.stock -= 1;
    this.save();

    if (window.confetti) {
      window.confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
    }

    this.showToast(`⚡ ¡Venta cobrada! 1x ${prod.name} (S/ ${prod.priceSale.toFixed(2)})`);
  }
}

const tinkuyApp = new TinkuyAppController();
window.tinkuyApp = tinkuyApp;
window.TinkuyApp = tinkuyApp;

window.addEventListener('DOMContentLoaded', () => {
  tinkuyApp.init();
});
