# Tinkuy IA — De cuaderno a decisión, en 3 pasos 🚀

> **Plataforma de gestión visual de inventario e inclusión financiera para microemprendedoras.**  
> Basada estrictamente en el Pitch Deck oficial y en las resoluciones a los jurados (Gobernanza de Datos, Multitienda Gamarra, IA Operativa y Unit Economics).

---

## 🌟 Arquitectura del Proyecto (Clean Architecture & Modular Frontend)

Diseñado con **HTML5 semántico, Tailwind CSS y JavaScript ES Modules nativo**, listo para subirse y publicarse en **GitHub Pages** sin requerir comandos de compilación (`npm build`) ni configuraciones de servidor.

```text
tinkuyIA/
├── index.html                   # Vista principal interactiva y semántica (Desktop & Móvil)
├── assets/
│   ├── css/
│   │   └── styles.css           # Tokens de diseño, variables de color y animaciones
│   └── js/
│       ├── models/
│       │   ├── Product.js       # Entidad Producto con Gobierno de Datos y validaciones
│       │   ├── Store.js         # Entidad Tienda para soporte multitienda (Gamarra)
│       │   └── PurchaseOrder.js # Entidad Orden de Compra formal para proveedores
│       ├── data/
│       │   └── mockData.js      # Datos semilla iniciales (textil, abarrotes, bazar)
│       ├── services/
│       │   ├── StorageService.js# Abstracción de persistencia local (LocalStorage)
│       │   ├── OcrEngine.js     # Simulación de Visión Multimodal y Data Quality Score
│       │   ├── TrafficLightService.js # Lógica del Semáforo del Dinero y Modelo ABC
│       │   ├── PosterService.js # Renderizado en HTML5 Canvas y copies persuasivos
│       │   ├── FinancialScoreService.js # Algoritmo de Tinkuy Score B2B (0–1000)
│       │   └── EconomicsService.js # Unit Economics, COGS, OPEX y valor por hora
│       └── app.js               # Controlador maestro de eventos y vistas
├── Tinkuy_IA_Pitch_Deck (2) (1).pdf # Pitch Deck oficial
└── README.md                    # Documentación del sistema
```

---

## 📋 Mapeo Técnico: Respuestas al Feedback de los Jurados

### 1. Jurado 1: Gobernanza de Datos & Supresión de Sesgos
- **Taxonomía Mínima Estandarizada:** Cada registro captura obligatoriamente: *Categoría, Modelo, Variantes (Talla, Color, Material), Costo Unitario, Precio de Venta, Días de Permanencia y Stock Físico*.
- **Data Quality Score (96%):** La IA evalúa la confiabilidad del dato antes de calcular métricas de rotación.
- **Human-in-the-Loop:** Si un número manuscrito es dudoso, la app no inventa datos; consulta a la emprendedora para confirmar o activa el **Audio de Rescate por voz**.
- **Sin Sesgos de Instrucción:** Se reconoce el dinamismo de las mypes; la herramienta se centra en el volumen de ventas y no asume falta de capacidades tecnológicas.

### 2. Jurado 2: Multitienda, IA Operativa & Unit Economics
- **Soporte Multitienda (Gamarra):** Selector de sucursales (*Galería Guisado #104*, *Galería El Rey #215*, *Almacén Central*) + **Vista Consolidada del Negocio**.
- **Roles:**
  - **Dueña:** Vista estratégica consolidada, autorización de compras, finanzas y scoring bancario.
  - **Vendedora:** Modo "Cuaderno Rápido" para registrar ventas del puesto y cuadrar caja diaria.
- **IA Operativa (No solo consultiva):**
  - Generación automática de **Órdenes de Compra (OC)** con folio formal cuando los productos estrella están por agotarse.
  - Botón de enlace directo a **WhatsApp del proveedor** con cantidades, tallas y montos calculados.
- **Unit Economics y Valor del Propio Tiempo:**
  - Calculadora interactiva de **COGS, OPEX y Tarifa Horaria de la Dueña** (ej. S/ 25/hr), revelando el beneficio neto real y evitando que la emprendedora subvencione el negocio con su tiempo no pagado.

### 3. Jurado 3: Foso Competitivo en Datos Propios
- **El Foso es el Hábito y el Dato:** El valor de Tinkuy IA no depende de un LLM estándar, sino del historial único de 30 a 90 días de rotación real.
- **Trazabilidad B2B:** Genera un **Tinkuy Score (0 a 1000)** compatible con la Ley N° 29733 de Protección de Datos Personales, preaprobando créditos con tasas preferenciales en **Caja Arequipa, Caja Huancayo y Mibanco**.

---

## 🎨 UX/UI Centrada en la Mujer Emprendedora
- **Paleta de Color:**
  - 🌲 **Verde Selva Profundo** (`#144e45`): Confianza institucional, identidad de marca Tinkuy IA.
  - 🌸 **Terracota / Coral** (`#e76f51` y `#fbe9e7`): Calidez, empoderamiento femenino, botones de acción.
  - 💎 **Verde Esmeralda** (`#2a9d8f`): Dinero, liquidez recuperada y semáforo saludable.
  - 🌾 **Crema Suave / Sand** (`#fcfaf7`): Lectura descansada con sensación de libreta limpia.
- **Doble Experiencia (Computadora & Celular):**
  - Conmutador en la barra superior para alternar en tiempo real entre la **estación de escritorio** de la dueña y el **simulador táctil de smartphone PWA** para la vendedora en la galería.

---

## 🚀 Cómo Subir a GitHub Pages (en 3 pasos)

1. **Subir los archivos a tu repositorio de GitHub**:
   ```bash
   git init
   git add .
   git commit -m "feat: Sistema completo Tinkuy IA para Desktop y Movil con Clean Architecture"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
   git push -u origin main
   ```

2. **Activar GitHub Pages**:
   - En tu repositorio de GitHub, ve a **Settings** -> **Pages**.
   - En **Build and deployment** -> **Branch**, selecciona `main` y carpeta `/ (root)`.
   - Haz clic en **Save**.

3. **¡Listo!**: En 1 minuto tu aplicación estará disponible globalmente en:  
   `https://TU_USUARIO.github.io/TU_REPOSITORIO/`
