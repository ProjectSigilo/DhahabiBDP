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

    let productosOriginales = [];
    let ordenActual = { columna: null, direccion: 'asc' };

    function toggleSidebar() {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
      }
    }

    function handleMenuClick(viewName, element) {
      switchView(viewName, element);
      if (window.innerWidth <= 768) toggleSidebar();
    }

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

    function actualizarLogos(theme) {
      const logoImg = document.getElementById('app-logo');
      const loginLogo = document.getElementById('login-logo');
      const targetLogo = theme === 'dark' ? LOGO_DARK_THEME : LOGO_LIGHT_THEME;
      const logoUrlConCache = targetLogo + '?v=' + new Date().getTime();

      if (logoImg) logoImg.src = logoUrlConCache;
      if (loginLogo) loginLogo.src = logoUrlConCache;
    }

    function toggleTheme() {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

      document.documentElement.setAttribute('data-theme', newTheme);
      actualizarLogos(newTheme);
      localStorage.setItem('dhahabi_theme', newTheme);
    }

    document.addEventListener('DOMContentLoaded', () => {
      const savedTheme = localStorage.getItem('dhahabi_theme') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
      
      const themeCheckbox = document.getElementById('theme-toggle-checkbox');
      if (themeCheckbox) themeCheckbox.checked = (savedTheme === 'dark');

      actualizarLogos(savedTheme);

      if (sessionStorage.getItem('dhahabi_auth') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        initData();
      }
      if (window.lucide) lucide.createIcons();
    });

    function switchView(viewName, el) {
      document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
      document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
      document.getElementById(`view-${viewName}`).classList.add('active');
      document.getElementById('view-title').innerText = viewName.charAt(0).toUpperCase() + viewName.slice(1);
      if (el) el.classList.add('active');
      if (window.lucide) lucide.createIcons();
    }

    function openModal(id) { document.getElementById(id).classList.add('active'); }
    function closeModal(id) { document.getElementById(id).classList.remove('active'); }

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

    function renderizarTablaProductos(lista) {
      const tbodyProd = document.getElementById('tabla-productos');
      const mobileList = document.getElementById('mobile-products-list');
      window.productosActuales = lista;

      if (!lista || lista.length === 0) {
        if (tbodyProd) tbodyProd.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding: 20px;">No se encontraron productos coincidentes</td></tr>`;
        if (mobileList) mobileList.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding: 20px;">No se encontraron productos coincidentes</div>`;
        return;
      }

      if (tbodyProd) {
        tbodyProd.innerHTML = lista.map((p, index) => {
          const valEstado = (p.estado || p.Estado || p.ESTADO || '').toString().trim();
          const esDisponible = valEstado.toLowerCase() === 'disponible';
          const claseBadge = esDisponible ? 'badge-success' : 'badge-danger';
          const idOIndice = p.id !== undefined ? `'${p.id}'` : index;

          return `
            <tr>
              <td><img src="${URL_BASE_IMAGENES + (p.imagen || '')}" class="product-img" alt="${p.nombre || ''}" onclick="ampliarImagen('${URL_BASE_IMAGENES + (p.imagen || '')}', '${(p.nombre || '').replace(/'/g, "\\'")}')" onerror="this.onerror=null; this.src='https://placehold.co/100x100/1e293b/94a3b8?text=Sin+Imagen';"></td>        
              <td><strong>${p.nombre || ''}</strong><br><small style="color:var(--text-muted)">${p.categoria || ''}</small></td>
              <td><span class="badge-store">${p.tienda || 'General'}</span></td>
              <td>${p.costo || 0} ${p.moneda || 'USD'}</td>
              <td style="color:#38BDF8; font-weight:800;">$${calcularVenta(p.costo, p.moneda)} CUP</td>
              <td><span class="badge ${claseBadge}">${valEstado || 'Disponible'}</span></td>
              <td>
                <div style="display:flex; gap:6px;">
                  <button class="btn-secondary" style="padding:4px 8px;" onclick="verDetallesProducto(${idOIndice})">Ver</button>
                  <button class="btn-secondary" style="padding:4px 8px;" onclick="prepararEdicion(${idOIndice})">Editar</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }

      if (mobileList) {
        mobileList.innerHTML = lista.map((p, index) => {
          const valEstado = (p.estado || p.Estado || p.ESTADO || '').toString().trim();
          const esDisponible = valEstado.toLowerCase() === 'disponible';
          const claseBadge = esDisponible ? 'badge-success' : 'badge-danger';
          const idOIndice = p.id !== undefined ? `'${p.id}'` : index;

          return `
            <div class="mobile-product-card">
              <img src="${URL_BASE_IMAGENES + (p.imagen || '')}" class="mobile-card-img" alt="${p.nombre || ''}" onclick="ampliarImagen('${URL_BASE_IMAGENES + (p.imagen || '')}', '${(p.nombre || '').replace(/'/g, "\\'")}')" onerror="this.onerror=null; this.src='https://placehold.co/100x100/1e293b/94a3b8?text=Sin+Imagen';">
              <div class="mobile-card-info">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <strong class="mobile-card-title">${p.nombre || ''}</strong>
                  <span class="badge ${claseBadge}">${valEstado || 'Disponible'}</span>
                </div>
                <div style="font-size:11px; color:var(--text-muted);">${p.categoria || 'General'} • <span class="badge-store">${p.tienda || 'General'}</span></div>
                <div class="mobile-card-price">$${calcularVenta(p.costo, p.moneda)} CUP</div>
                <div class="mobile-card-actions">
                  <button class="btn-secondary" style="flex:1;" onclick="verDetallesProducto(${idOIndice})">Ver</button>
                  <button class="btn-secondary" style="flex:1;" onclick="prepararEdicion(${idOIndice})">Editar</button>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      if (window.lucide) lucide.createIcons();
    }

    function verDetallesProducto(idOIndice) {
      if (!window.productosActuales) return;
      const p = window.productosActuales.find(item => item.id == idOIndice) || window.productosActuales[idOIndice];
      if (!p) return;

      document.getElementById('detail-prod-img').src = URL_BASE_IMAGENES + (p.imagen || '');
      document.getElementById('detail-prod-nombre').innerText = p.nombre || '-';
      document.getElementById('detail-prod-cat').innerText = p.categoria || '-';
      document.getElementById('detail-prod-tienda').innerText = p.tienda || '-';
      document.getElementById('detail-prod-costo').innerText = `${p.costo || 0} ${p.moneda || 'USD'}`;
      document.getElementById('detail-prod-estado').innerText = p.estado || 'Disponible';
      document.getElementById('detail-prod-precio').innerText = `$${calcularVenta(p.costo, p.moneda)} CUP`;

      openModal('modal-detalle-producto');
    }

    function prepararEdicion(idOIndice) {
      if (!window.productosActuales) return;
      const p = window.productosActuales.find(item => item.id == idOIndice) || window.productosActuales[idOIndice];
      if (p) editarProducto(p);
    }

    function filtrarYOrdenarProductos() {
      const text = document.getElementById('filter-search')?.value.toLowerCase().trim() || '';
      const cat = document.getElementById('filter-categoria')?.value || '';
      const tienda = document.getElementById('filter-tienda')?.value || '';
      const estadoFilter = document.getElementById('filter-estado')?.value || '';

      let res = productosOriginales.filter(prod => {
        const matchName = prod.nombre ? prod.nombre.toLowerCase().includes(text) : false;
        const matchCat = cat === "" || prod.categoria === cat;
        const matchTienda = tienda === "" || prod.tienda === tienda;
        const matchEstado = estadoFilter === "" || prod.estado === estadoFilter;
        return matchName && matchCat && matchTienda && matchEstado;
      });

      if (ordenActual.columna === 'nombre') {
        res.sort((a, b) => ordenActual.direccion === 'asc' ? (a.nombre || '').localeCompare(b.nombre || '') : (b.nombre || '').localeCompare(a.nombre || ''));
      } else if (ordenActual.columna === 'precio') {
        res.sort((a, b) => {
          const pA = parseFloat(calcularVenta(a.costo, a.moneda)) || 0;
          const pB = parseFloat(calcularVenta(b.costo, b.moneda)) || 0;
          return ordenActual.direccion === 'asc' ? pA - pB : pB - pA;
        });
      }

      renderizarTablaProductos(res);
    }

    function cambiarOrden(columna) {
      ordenActual.direccion = (ordenActual.columna === columna && ordenActual.direccion === 'asc') ? 'desc' : 'asc';
      ordenActual.columna = columna;
      filtrarYOrdenarProductos();
    }

    function renderApp() {
      let configObj = Array.isArray(state.config) ? state.config[0] : (state.config || {});
      const keys = {};
      Object.keys(configObj).forEach(k => { keys[k.toLowerCase()] = configObj[k]; });

      state.config = {
        tasaUSD: parseFloat(keys['tasausd'] || keys['tasa'] || 320),
        margenUtilidad: parseFloat(keys['margenutilidad'] || keys['utilidad'] || 30)
      };

      state.productos = state.productos || [];
      state.proveedores = state.proveedores || [];
      state.categorias = state.categorias || [];
      state.historial = state.historial || [];

      productosOriginales = [...state.productos];

      const pub = state.productos.filter(p => (p.estado || '').toString().toLowerCase() === 'disponible').length;
      const ago = state.productos.filter(p => (p.estado || '').toString().toLowerCase() === 'agotado').length;

      if (document.getElementById('metric-publicados')) document.getElementById('metric-publicados').innerText = pub;
      if (document.getElementById('metric-agotados')) document.getElementById('metric-agotados').innerText = ago;
      if (document.getElementById('metric-tasa')) document.getElementById('metric-tasa').innerText = `1 USD = $${state.config.tasaUSD} CUP`;
      if (document.getElementById('metric-utilidad')) document.getElementById('metric-utilidad').innerText = `${state.config.margenUtilidad}%`;
      if (document.getElementById('metric-proveedores')) document.getElementById('metric-proveedores').innerText = state.proveedores.length;

      if (document.getElementById('cfg-tasa')) document.getElementById('cfg-tasa').value = state.config.tasaUSD;
      if (document.getElementById('cfg-utilidad')) document.getElementById('cfg-utilidad').value = state.config.margenUtilidad;

      const dropdownCat = document.getElementById('dropdown-categoria');
      if (dropdownCat) {
        dropdownCat.innerHTML = `<div class="custom-option selected" onclick="seleccionarOpcion('filter-categoria', '', 'Todas las Categorías', 'select-trigger-categoria')">Todas las Categorías</div>` +
          state.categorias.map(c => `<div class="custom-option" onclick="seleccionarOpcion('filter-categoria', '${c.nombre}', '${c.nombre}', 'select-trigger-categoria')">${c.nombre}</div>`).join('');
      }

      const dropdownTienda = document.getElementById('dropdown-tienda');
      if (dropdownTienda) {
        dropdownTienda.innerHTML = `<div class="custom-option selected" onclick="seleccionarOpcion('filter-tienda', '', 'Todos los Proveedores', 'select-trigger-tienda')">Todos los Proveedores</div>` +
          state.proveedores.map(p => `<div class="custom-option" onclick="seleccionarOpcion('filter-tienda', '${p.nombre}', '${p.nombre}', 'select-trigger-tienda')">${p.nombre}</div>`).join('');
      }

      filtrarYOrdenarProductos();

      const tbodyProv = document.getElementById('tabla-proveedores');
      if (tbodyProv) {
        tbodyProv.innerHTML = state.proveedores.map(p => `
          <tr>
            <td>${p.id || ''}</td>
            <td><strong>${p.nombre || ''}</strong></td>
            <td>${p.ubicacion || ''}</td>
            <td>${p.telefono || ''}</td>
          </tr>
        `).join('');
      }

      const tbodyCat = document.getElementById('tabla-categorias');
      if (tbodyCat) {
        tbodyCat.innerHTML = state.categorias.map(c => `
          <tr>
            <td>${c.id || ''}</td>
            <td><strong>${c.nombre || ''}</strong></td>
          </tr>
        `).join('');
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const cambiosHoy = state.historial.filter(h => h.fecha && h.fecha.startsWith(todayStr));
      const tbodyHist = document.getElementById('tabla-cambios-hoy');

      if (tbodyHist) {
        tbodyHist.innerHTML = cambiosHoy.length ? cambiosHoy.map(h => {
          const prev = parseFloat(h.precioanteriorcup || 0);
          const curr = parseFloat(h.precionuevocup || 0);
          const diff = (curr - prev).toFixed(2);
          const diffClass = diff > 0 ? 'badge-danger' : 'badge-success';

          return `
            <tr>
              <td>${new Date(h.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
              <td><strong>${h.nombre || ''}</strong></td>
              <td><span class="badge-store">${h.tienda || 'General'}</span></td>
              <td><span class="badge badge-success">${h.estado || 'Disponible'}</span></td>
              <td>$${prev} CUP</td>
              <td>$${curr} CUP</td>
              <td><span class="badge ${diffClass}">${diff > 0 ? '+' : ''}${diff} CUP</span></td>
            </tr>
          `;
        }).join('') : `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Sin cambios registrados el día de hoy</td></tr>`;
      }

      if (window.lucide) lucide.createIcons();
    }

    function ampliarImagen(url, nombre) {
      document.getElementById('lightbox-img-src').src = url;
      document.getElementById('lightbox-img-title').innerText = nombre || 'Vista de Imagen';
      openModal('modal-visor-imagen');
    }

    function cerrarVisorImagen(e) {
      if (e.target.id === 'modal-visor-imagen') closeModal('modal-visor-imagen');
    }

    function abrirModalNuevoProducto() {
      document.getElementById('modal-prod-titulo').innerText = "Nuevo Producto";
      document.getElementById('prod-id').value = '';
      document.getElementById('prod-nombre').value = '';
      document.getElementById('prod-costo').value = '';
      document.getElementById('prod-imagen').value = '';

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
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action, ...payload })
        });
        return await res.json();
      } catch (err) {
        console.error("API Error:", err);
        return { status: 'error', message: err.message };
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
        precioAnteriorCUP,
        precioNuevoCUP
      };

      if (idx > -1) {
        state.productos[idx] = item;
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
      await APIRequest('saveProveedor', newProv);
    }

    async function guardarCategoria() {
      const nombre = document.getElementById('cat-nombre').value;
      if (!nombre) return;

      const newCat = { id: Date.now(), nombre };
      state.categorias.push(newCat);
      renderApp();
      closeModal('modal-categoria');
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

    function toggleDropdown(id) {
      document.querySelectorAll('.custom-options').forEach(opt => {
        if (opt.id !== id) opt.classList.remove('open');
      });
      document.getElementById(id)?.classList.toggle('open');
    }

    function seleccionarOpcion(inputId, valor, textoVisible, triggerId) {
      const input = document.getElementById(inputId);
      if (input) input.value = valor;

      const trigger = document.getElementById(triggerId);
      if (trigger) {
        trigger.querySelector('span').innerText = textoVisible;
        if (valor !== "") trigger.classList.add('active-filter');
        else trigger.classList.remove('active-filter');
      }

      const dropdown = trigger ? trigger.nextElementSibling : null;
      if (dropdown) dropdown.classList.remove('open');

      if (['filter-categoria', 'filter-tienda', 'filter-estado'].includes(inputId)) {
        filtrarYOrdenarProductos();
      }
    }

    window.addEventListener('click', (e) => {
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
