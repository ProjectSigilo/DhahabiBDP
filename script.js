const URL_BASE_IMAGENES = "https://cdn.dhahabi.ae/images/productos/";
const API_URL = "https://script.google.com/macros/s/AKfycbxCsypbbZWKMzsU8CYSPlj9LVmzhkytgd1agMY-d2ovO4Y_QxZ5ZflHFNQPwJ5h3oXg/exec";
const LOGO_DARK_THEME = "https://cdn.dhahabi.ae/logo/dhahabi-market-logo-gradient-white.svg";
const LOGO_LIGHT_THEME = "https://cdn.dhahabi.ae/logo/dhahabi-market-logo-gradient.svg";   

let state = {
  config: { tasaUSD: 320, margenUtilidad: 30 },
  productos: [],
  historial: [],
  proveedores: [],
  categorias: []
};

// Variables globales de estado para filtrado y orden
let productosOriginales = [];
let ordenActual = { columna: null, direccion: 'asc' };

function showLoader(msg = "Sincronizando datos...") {
  const txt = document.getElementById('loader-text');
  const loader = document.getElementById('app-loader');
  if (txt) txt.innerText = msg;
  if (loader) loader.style.display = 'flex';
}

function hideLoader() {
  const loader = document.getElementById('app-loader');
  if (loader) loader.style.display = 'none';
}

function autenticar(e) {
  if (e) e.preventDefault();
  const u = document.getElementById('login-user').value;
  const p = document.getElementById('login-pass').value;

  if (u === "admin" && p === "dhahabi2026") {
    sessionStorage.setItem('dhahabi_auth', 'true');
    document.getElementById('login-screen').style.display = 'none';
    initData();
  } else {
    alert("Usuario o contraseña incorrectos");
  }
}

function cerrarSesion() {
  sessionStorage.removeItem('dhahabi_auth');
  location.reload();
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  
  const logoImg = document.getElementById('app-logo');
  const loginLogo = document.getElementById('login-logo');
  const targetLogo = newTheme === 'dark' ? LOGO_DARK_THEME : LOGO_LIGHT_THEME;
  
  if (logoImg) logoImg.src = targetLogo;
  if (loginLogo) loginLogo.src = targetLogo;
}

function switchView(viewName, el) {
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
  document.getElementById(`view-${viewName}`).classList.add('active');
  document.getElementById('view-title').innerText = viewName.charAt(0).toUpperCase() + viewName.slice(1);
  if (el) el.classList.add('active');
  if (window.lucide) lucide.createIcons();
}

function openModal(id) { 
  document.getElementById(id).classList.add('active'); 
}

function closeModal(id) { 
  document.getElementById(id).classList.remove('active'); 
}

function calcularVenta(costo, moneda) {
  let costoNum = parseFloat(costo) || 0;
  let tasa = parseFloat(state.config.tasaUSD) || 320;
  let utilidad = parseFloat(state.config.margenUtilidad) || 30;
  let costoCUP = moneda === 'USD' ? costoNum * tasa : costoNum;
  return (costoCUP * (1 + (utilidad / 100))).toFixed(2);
}

function calcularPreview() {
  const costo = parseFloat(document.getElementById('prod-costo').value) || 0;
  const moneda = document.getElementById('prod-moneda').value;
  document.getElementById('preview-precio').innerText = `$${calcularVenta(costo, moneda)} CUP`;
}

// Renderizar la tabla de productos filtrada
// Renderizar la tabla de productos filtrada
function renderizarTablaProductos(lista) {
  const tbodyProd = document.getElementById('tabla-productos');
  if (!tbodyProd) return;

  if (!lista || lista.length === 0) {
    tbodyProd.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding: 20px;">No se encontraron productos coincidentes</td></tr>`;
    return;
  }

  // Guardamos la lista actual globalmente para poder consultar por ID en la edición
  window.productosActuales = lista;

  tbodyProd.innerHTML = lista.map((p, index) => {
    // Normalizar estado
    const valEstado = (p.estado || p.Estado || p.ESTADO || '').toString().trim();
    const esDisponible = valEstado.toLowerCase() === 'disponible';
    const claseBadge = esDisponible ? 'badge-success' : 'badge-danger';
    const textoMostrar = valEstado || 'Disponible';

    // Se usa el p.id o en su defecto el índice del array
    const idOIndice = p.id !== undefined ? `'${p.id}'` : index;

    return `
      <tr>
        <td><img src="${URL_BASE_IMAGENES + (p.imagen || '')}" class="product-img" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394A3B8\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><rect width=\'18\' height=\'18\' x=\'3\' y=\'3\' rx=\'2\' ry=\'2\'/><circle cx=\'9\' cy=\'9\' r=\'2\'/><path d=\'m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\'/></svg>';"></td>
        <td><strong>${p.nombre || ''}</strong><br><small style="color:var(--text-muted)">${p.categoria || ''}</small></td>
        <td>${p.tienda || ''}</td>
        <td>${p.costo || 0} ${p.moneda || ''}</td>
        <td style="color:#38BDF8; font-weight:700;">$${typeof calcularVenta === 'function' ? calcularVenta(p.costo, p.moneda) : 0} CUP</td>
        <td><span class="badge ${claseBadge}">${textoMostrar}</span></td>
        <td><button class="btn-secondary" style="padding:4px 8px;" onclick="prepararEdicion(${idOIndice})">Editar</button></td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

// Función auxiliar para recuperar el producto de forma segura
function prepararEdicion(idOIndice) {
  if (!window.productosActuales) return;

  // Busca comparando los IDs con coercionar de tipo (==) o por su posición si es un índice
  const producto = window.productosActuales.find(item => item.id == idOIndice) || window.productosActuales[idOIndice];
  
  if (producto && typeof editarProducto === 'function') {
    editarProducto(producto);
  } else {
    console.warn("No se encontró el producto a editar para el ID/Índice:", idOIndice);
  }
}

// Función principal de Filtrado y Ordenamiento
function filtrarYOrdenarProductos() {
  const searchInput = document.getElementById('filter-search');
  const catInput = document.getElementById('filter-categoria');
  const estadoInput = document.getElementById('filter-estado');

  const textoBusqueda = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const catSeleccionada = catInput ? catInput.value : '';
  const estadoSeleccionado = estadoInput ? estadoInput.value : '';

  // 1. Filtrar
  let resultado = productosOriginales.filter(prod => {
    const coincideNombre = prod.nombre ? prod.nombre.toLowerCase().includes(textoBusqueda) : false;
    const coincideTienda = prod.tienda ? prod.tienda.toLowerCase().includes(textoBusqueda) : false;
    const coincideTexto = coincideNombre || coincideTienda;

    const coincideCat = catSeleccionada === "" || prod.categoria === catSeleccionada;
    const coincideEstado = estadoSeleccionado === "" || prod.estado === estadoSeleccionado;

    return coincideTexto && coincideCat && coincideEstado;
  });

  // 2. Ordenar
  if (ordenActual.columna === 'nombre') {
    resultado.sort((a, b) => {
      const valA = a.nombre ? a.nombre.toLowerCase() : '';
      const valB = b.nombre ? b.nombre.toLowerCase() : '';
      return ordenActual.direccion === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  } else if (ordenActual.columna === 'precio') {
    resultado.sort((a, b) => {
      const precioA = parseFloat(calcularVenta(a.costo, a.moneda)) || 0;
      const precioB = parseFloat(calcularVenta(b.costo, b.moneda)) || 0;
      return ordenActual.direccion === 'asc' ? precioA - precioB : precioB - precioA;
    });
  }

  // 3. Renderizar la tabla filtrada
  renderizarTablaProductos(resultado);
}

// Alternar ordenamiento por columnas (Nombre / Precio)
function cambiarOrden(columna) {
  if (ordenActual.columna === columna) {
    ordenActual.direccion = ordenActual.direccion === 'asc' ? 'desc' : 'asc';
  } else {
    ordenActual.columna = columna;
    ordenActual.direccion = 'asc';
  }

  const iconNombre = document.getElementById('sort-icon-nombre');
  const iconPrecio = document.getElementById('sort-icon-precio');

  if (iconNombre) iconNombre.innerText = '⇅';
  if (iconPrecio) iconPrecio.innerText = '⇅';

  const icono = ordenActual.direccion === 'asc' ? '▲' : '▼';
  if (columna === 'nombre' && iconNombre) iconNombre.innerText = icono;
  if (columna === 'precio' && iconPrecio) iconPrecio.innerText = icono;

  filtrarYOrdenarProductos();
}

function renderApp() {
  // Manejo seguro de config en caso de que venga como Array u Objeto vacio
  let configObj = {};
  if (Array.isArray(state.config) && state.config.length > 0) {
    configObj = state.config[0];
  } else if (state.config && typeof state.config === 'object') {
    configObj = state.config;
  }

  // Normalizar claves a minúsculas para evitar fallos por nombres de columnas en Excel
  const keys = {};
  Object.keys(configObj).forEach(k => { keys[k.toLowerCase()] = configObj[k]; });

  const tasa = parseFloat(keys['tasausd'] || keys['tasa'] || 320);
  const utilidad = parseFloat(keys['margenutilidad'] || keys['utilidad'] || 30);

  state.config = { tasaUSD: tasa, margenUtilidad: utilidad };

  // Asignar arreglos de forma segura por si vienen como undefined
  state.productos = state.productos || [];
  state.proveedores = state.proveedores || [];
  state.categorias = state.categorias || [];
  state.historial = state.historial || [];

  // Asegurar lista sincronizada
  productosOriginales = [...state.productos];

  // Contadores
  const pub = state.productos.filter(p => ((p.estado || p.Estado || p.ESTADO) || '').toString().trim().toLowerCase() === 'disponible').length;
  const ago = state.productos.filter(p => ((p.estado || p.Estado || p.ESTADO) || '').toString().trim().toLowerCase() === 'agotado').length;

  if (document.getElementById('metric-publicados')) document.getElementById('metric-publicados').innerText = pub;
  if (document.getElementById('metric-agotados')) document.getElementById('metric-agotados').innerText = ago;
  if (document.getElementById('metric-tasa')) document.getElementById('metric-tasa').innerText = `1 USD = $${state.config.tasaUSD} CUP`;
  if (document.getElementById('metric-utilidad')) document.getElementById('metric-utilidad').innerText = `${state.config.margenUtilidad}%`;
  if (document.getElementById('metric-proveedores')) document.getElementById('metric-proveedores').innerText = state.proveedores.length;

  if (document.getElementById('cfg-tasa')) document.getElementById('cfg-tasa').value = state.config.tasaUSD;
  if (document.getElementById('cfg-utilidad')) document.getElementById('cfg-utilidad').value = state.config.margenUtilidad;

  // Llenar Desplegable de Categorías en Filtros
  const dropdownCat = document.getElementById('dropdown-categoria');
  if (dropdownCat) {
    const inputOculto = document.getElementById('filter-categoria');
    const valorActual = inputOculto ? inputOculto.value : '';

    let opcionesHTML = `
      <div class="custom-option ${valorActual === '' ? 'selected' : ''}" 
           onclick="seleccionarOpcion('filter-categoria', '', 'Todas las Categorías', 'select-trigger-categoria')">
        Todas las Categorías
      </div>`;

    opcionesHTML += state.categorias.map(c => {
      const nombreCat = c.nombre || c.Nombre || '';
      return `
        <div class="custom-option ${valorActual === nombreCat ? 'selected' : ''}" 
             onclick="seleccionarOpcion('filter-categoria', '${nombreCat}', '${nombreCat}', 'select-trigger-categoria')">
          ${nombreCat}
        </div>`;
    }).join('');

    dropdownCat.innerHTML = opcionesHTML;
  }

  // Llenar Desplegable de Categorías en Modal Producto
  const dropdownProdCat = document.getElementById('dropdown-prod-categoria');
  if (dropdownProdCat) {
    dropdownProdCat.innerHTML = state.categorias.map(c => {
      const nombreCat = c.nombre || c.Nombre || '';
      return `
        <div class="custom-option" 
             onclick="seleccionarOpcion('prod-categoria', '${nombreCat}', '${nombreCat}', 'select-trigger-prod-categoria')">
          ${nombreCat}
        </div>`;
    }).join('');
  }

  // Llenar Desplegable de Proveedores en Modal Producto
  const dropdownProdTienda = document.getElementById('dropdown-prod-tienda');
  if (dropdownProdTienda) {
    dropdownProdTienda.innerHTML = state.proveedores.map(p => {
      const nombreProv = p.nombre || p.Nombre || '';
      return `
        <div class="custom-option" 
             onclick="seleccionarOpcion('prod-tienda', '${nombreProv}', '${nombreProv}', 'select-trigger-prod-tienda')">
          ${nombreProv}
        </div>`;
    }).join('');
  }

  // Renderizar tabla principal
  filtrarYOrdenarProductos();

  // Tablas secundarias con normalización de mayúsculas/minúsculas
  const tbodyProv = document.getElementById('tabla-proveedores');
  if (tbodyProv) {
    tbodyProv.innerHTML = state.proveedores.map(p => `
      <tr>
        <td>${p.id || p.ID || ''}</td>
        <td><strong>${p.nombre || p.Nombre || ''}</strong></td>
        <td>${p.ubicacion || p.Ubicacion || ''}</td>
        <td>${p.telefono || p.Telefono || ''}</td>
      </tr>
    `).join('');
  }

  const tbodyCat = document.getElementById('tabla-categorias');
  if (tbodyCat) {
    tbodyCat.innerHTML = state.categorias.map(c => `
      <tr>
        <td>${c.id || c.ID || ''}</td>
        <td><strong>${c.nombre || c.Nombre || ''}</strong></td>
      </tr>
    `).join('');
  }

  // Historial
  const todayStr = new Date().toISOString().split('T')[0];
  const cambiosHoy = state.historial.filter(h => h.fecha && h.fecha.startsWith(todayStr));
  const tbodyHist = document.getElementById('tabla-cambios-hoy');

  if (tbodyHist) {
    tbodyHist.innerHTML = cambiosHoy.length ? cambiosHoy.map(h => {
      const prev = parseFloat(h.precioanteriorcup || h.precioAnteriorCUP || 0);
      const curr = parseFloat(h.precionuevocup || h.precioNuevoCUP || 0);
      const diff = (curr - prev).toFixed(2);
      const diffClass = diff > 0 ? 'badge-danger' : 'badge-success';
      const estadoTexto = h.estado || h.Estado || 'Disponible';
      const estadoBadgeClass = estadoTexto.toLowerCase() === 'disponible' ? 'badge-success' : 'badge-danger';

      return `
        <tr>
          <td>${new Date(h.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
          <td><strong>${h.nombre || h.Nombre || ''}</strong></td>
          <td>${h.tienda || h.Tienda || ''}</td>
          <td><span class="badge ${estadoBadgeClass}">${estadoTexto}</span></td>
          <td>$${prev} CUP</td>
          <td>$${curr} CUP</td>
          <td><span class="badge ${diffClass}">${diff > 0 ? '+' : ''}${diff} CUP</span></td>
        </tr>
      `;
    }).join('') : `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Sin cambios registrados el día de hoy</td></tr>`;
  }

  if (window.lucide) lucide.createIcons();
}

function abrirModalNuevoProducto() {
  document.getElementById('modal-prod-titulo').innerText = "Nuevo Producto";
  document.getElementById('prod-id').value = '';
  document.getElementById('prod-nombre').value = '';
  document.getElementById('prod-costo').value = '';
  document.getElementById('prod-imagen').value = '';

  // Establecer valores por defecto en los selectores personalizados
  const catDefecto = state.categorias.length > 0 ? state.categorias[0].nombre : '';
  const provDefecto = state.proveedores.length > 0 ? state.proveedores[0].nombre : '';

  seleccionarOpcion('prod-categoria', catDefecto, catDefecto || 'Seleccione Categoría', 'select-trigger-prod-categoria');
  seleccionarOpcion('prod-tienda', provDefecto, provDefecto || 'Seleccione Proveedor', 'select-trigger-prod-tienda');
  seleccionarOpcion('prod-moneda', 'USD', 'USD', 'select-trigger-prod-moneda');
  seleccionarOpcion('prod-estado', 'Disponible', 'Disponible', 'select-trigger-prod-estado');

  calcularPreview();
  openModal('modal-producto');
}

function editarProducto(p) {
  document.getElementById('modal-prod-titulo').innerText = "Editar Producto";
  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-nombre').value = p.nombre || '';
  document.getElementById('prod-costo').value = p.costo || '';
  document.getElementById('prod-imagen').value = p.imagen || '';

  // Sincronizar selectores personalizados con los datos del producto a editar
  seleccionarOpcion('prod-categoria', p.categoria || '', p.categoria || 'Seleccione Categoría', 'select-trigger-prod-categoria');
  seleccionarOpcion('prod-tienda', p.tienda || '', p.tienda || 'Seleccione Proveedor', 'select-trigger-prod-tienda');
  seleccionarOpcion('prod-moneda', p.moneda || 'USD', p.moneda || 'USD', 'select-trigger-prod-moneda');
  seleccionarOpcion('prod-estado', p.estado || 'Disponible', p.estado || 'Disponible', 'select-trigger-prod-estado');

  calcularPreview();
  openModal('modal-producto');
}

async function APIRequest(action, payload = {}) {
  showLoader("Guardando cambios...");
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload })
    });
    return await res.json();
  } catch (err) {
    console.warn("Respuesta procesada:", err);
    return { status: 'success' };
  } finally {
    hideLoader();
  }
}

async function guardarProducto() {
  const id = document.getElementById('prod-id').value;
  const costo = parseFloat(document.getElementById('prod-costo').value) || 0;
  const moneda = document.getElementById('prod-moneda').value;
  const prodId = id || Date.now();
  const precioNuevoCUP = parseFloat(calcularVenta(costo, moneda));

  let precioAnteriorCUP = 0;
  const idx = state.productos.findIndex(p => p.id == prodId);

  if (idx > -1) {
    precioAnteriorCUP = parseFloat(calcularVenta(state.productos[idx].costo, state.productos[idx].moneda));
  }

  const item = {
    id: prodId,
    nombre: document.getElementById('prod-nombre').value,
    categoria: document.getElementById('prod-categoria').value,
    tienda: document.getElementById('prod-tienda').value,
    costo: costo,
    moneda: moneda,
    imagen: document.getElementById('prod-imagen').value,
    estado: document.getElementById('prod-estado').value,
    precioAnteriorCUP: precioAnteriorCUP,
    precioNuevoCUP: precioNuevoCUP
  };

  if (idx > -1) {
    state.productos[idx] = item;
    if (!state.historial) state.historial = [];
    state.historial.unshift({
      fecha: new Date().toISOString(),
      nombre: item.nombre,
      tienda: item.tienda,
      estado: item.estado, // ◄--- REGISTRA EL ESTADO EN EL HISTORIAL
      precioanteriorcup: precioAnteriorCUP,
      precionuevocup: precioNuevoCUP
    });
  } else {
    state.productos.unshift(item);
  }

  closeModal('modal-producto');
  renderApp();

  await APIRequest('saveProduct', item);
}

async function guardarProveedor() {
  const nombre = document.getElementById('prov-nombre').value;
  const ubicacion = document.getElementById('prov-ubicacion').value;
  const telefono = document.getElementById('prov-telefono').value;
  if (!nombre) return;

  const newProv = { id: Date.now(), nombre, ubicacion, telefono };
  state.proveedores.push(newProv);
  renderApp();
  closeModal('modal-proveedor');

  document.getElementById('prov-nombre').value = '';
  document.getElementById('prov-ubicacion').value = '';
  document.getElementById('prov-telefono').value = '';

  await APIRequest('saveProveedor', newProv);
}

async function guardarCategoria() {
  const nombre = document.getElementById('cat-nombre').value;
  if (!nombre) return;

  const newCat = { id: Date.now(), nombre };
  state.categorias.push(newCat);
  renderApp();
  closeModal('modal-categoria');

  document.getElementById('cat-nombre').value = '';

  await APIRequest('saveCategoria', newCat);
}

async function guardarConfiguracion() {
  const tasaUSD = parseFloat(document.getElementById('cfg-tasa').value);
  const margenUtilidad = parseFloat(document.getElementById('cfg-utilidad').value);
  
  state.config.tasaUSD = tasaUSD;
  state.config.margenUtilidad = margenUtilidad;
  renderApp();

  await APIRequest('updateConfig', { tasaUSD, margenUtilidad });
}

// Abrir y cerrar el desplegable personalizado
function toggleDropdown(id) {
  // Cerrar otros dropdowns abiertos
  document.querySelectorAll('.custom-options').forEach(opt => {
    if (opt.id !== id) opt.classList.remove('open');
  });
  
  const options = document.getElementById(id);
  if (options) options.classList.toggle('open');
}

// Seleccionar una opción del menú personalizado
function seleccionarOpcion(inputId, valor, textoVisible, triggerId) {
  const inputHidden = document.getElementById(inputId);
  if (inputHidden) inputHidden.value = valor;

  const trigger = document.getElementById(triggerId);
  if (trigger) trigger.querySelector('span').innerText = textoVisible;

  const dropdown = trigger ? trigger.nextElementSibling : null;
  if (dropdown) {
    dropdown.classList.remove('open');
    dropdown.querySelectorAll('.custom-option').forEach(opt => {
      opt.classList.remove('selected');
    });
    const opcionSeleccionada = Array.from(dropdown.querySelectorAll('.custom-option')).find(opt => opt.innerText.trim() === textoVisible);
    if (opcionSeleccionada) opcionSeleccionada.classList.add('selected');
  }

  // Ejecutar el filtrado SOLO si el cambio proviene de la barra de filtros principal
  if (inputId === 'filter-categoria' || inputId === 'filter-estado') {
    filtrarYOrdenarProductos();
  }
}

// Cerrar los desplegables si se hace clic fuera de ellos
window.addEventListener('click', function(e) {
  if (!e.target.closest('.custom-select-wrapper')) {
    document.querySelectorAll('.custom-options').forEach(opt => opt.classList.remove('open'));
  }
});

async function initData() {
  showLoader("Cargando base de datos...");
  try {
    const res = await fetch(`${API_URL}?action=getData`, { redirect: 'follow' });
    const data = await res.json();
    if (data) {
      state = data;
      renderApp();
    }
  } catch (e) {
    console.error("Error al cargar datos:", e);
  } finally {
    hideLoader();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('dhahabi_auth') === 'true') {
    document.getElementById('login-screen').style.display = 'none';
    initData();
  }
  if (window.lucide) lucide.createIcons();
});
