let ws;

function conectarWebSocket() {
  const user = API.getUser();
  if (!user || ws?.readyState === WebSocket.OPEN) return;
  const protocolo = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocolo}//${location.host}/ws?userId=${user.id_usuario}&rol=${user.rol}`);
  ws.onmessage = (e) => {
    try { const m = JSON.parse(e.data); UI.toast(m.data.mensaje, m.event === 'nueva-reserva' ? 'success' : 'info'); }
    catch { /* ignore */ }
  };
  ws.onclose = () => setTimeout(conectarWebSocket, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const views = ['login', 'dashboard', 'tutorias', 'reservas', 'usuarios', 'perfil'];
  const viewEls = {};
  views.forEach(v => { viewEls[v] = $(`#view-${v}`); });

  function showView(name) {
    views.forEach(v => viewEls[v]?.classList.toggle('hidden', v !== name));
    $$('#sidebar button[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    const pageNames = { dashboard: 'Dashboard', tutorias: 'Tutorías', reservas: 'Mis Reservas', usuarios: 'Usuarios', perfil: 'Mi Perfil' };
    const h1 = $('#header h1');
    if (h1) h1.textContent = pageNames[name] || 'Dashboard';
    if (window.innerWidth <= 768) {
      $('#sidebar')?.classList.remove('mobile-open');
      $('#sidebarBackdrop')?.classList.remove('show');
    }
  }

  function updateHeader() {
    const user = API.getUser();
    if (user) {
      document.body.classList.add('logged-in');
      $('#header').classList.remove('hidden');
      $('#headerUser').textContent = user.nombre_completo;
      const badge = $('#headerBadge');
      badge.textContent = user.rol;
      badge.className = `header-badge header-badge-${user.rol.toLowerCase()}`;
      $('#btnUsuarios').classList.toggle('hidden', user.rol !== 'Admin');
      $$('#btnUsuarios').forEach(el => el.classList.toggle('hidden', user.rol !== 'Admin'));
      $('#btnCrearTutoria')?.classList.toggle('hidden', user.rol === 'Estudiante');
    } else {
      document.body.classList.remove('logged-in');
      $('#header').classList.add('hidden');
    }
  }

  /* ==================== SIDEBAR ==================== */
  const savedCollapsed = localStorage.getItem('sidebarCollapsed');
  if (savedCollapsed === 'true') $('#sidebar').classList.add('collapsed');

  $('#sidebarToggle').addEventListener('click', () => {
    $('#sidebar').classList.toggle('collapsed');
    localStorage.setItem('sidebarCollapsed', $('#sidebar').classList.contains('collapsed'));
  });

  $('#hamburger').addEventListener('click', () => {
    $('#sidebar').classList.toggle('mobile-open');
    $('#sidebarBackdrop').classList.toggle('show');
  });

  $('#sidebarBackdrop').addEventListener('click', () => {
    $('#sidebar').classList.remove('mobile-open');
    $('#sidebarBackdrop').classList.remove('show');
  });

  /* ==================== LOGIN ==================== */
  $('#formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginError').textContent = '';
    $('#btnLogin').disabled = true;
    $('#btnLogin').innerHTML = '<span class="spinner"></span> Ingresando...';
    try {
      const data = await API.login($('#loginCorreo').value, $('#loginContrasena').value);
      API.setToken(data.token);
      API.setUser(data.usuario);
      UI.toast(`Bienvenido, ${data.usuario.nombre_completo}`);
      conectarWebSocket();
      updateHeader();
      showView('dashboard');
      cargarDashboard();
    } catch (err) {
      $('#loginError').textContent = err.message;
    } finally {
      $('#btnLogin').disabled = false;
      $('#btnLogin').textContent = 'Ingresar';
    }
  });

  /* ==================== FORGOT PASSWORD ==================== */
  $('#btnForgotPassword').addEventListener('click', () => {
    $('#formLogin').classList.add('hidden');
    $('#btnForgotPassword').parentElement.classList.add('hidden');
    $('#forgotPasswordSection').classList.remove('hidden');
  });

  $('#btnBackToLogin').addEventListener('click', () => {
    $('#forgotPasswordSection').classList.add('hidden');
    $('#formLogin').classList.remove('hidden');
    $('#btnForgotPassword').parentElement.classList.remove('hidden');
    $('#forgotError').textContent = '';
    $('#forgotSuccess').classList.add('hidden');
  });

  $('#formForgotPassword').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#forgotError').textContent = '';
    $('#forgotSuccess').classList.add('hidden');
    try {
      const data = await API.request('POST', '/auth/olvide-contrasena', { correo: $('#forgotCorreo').value });
      $('#forgotSuccess').textContent = data.mensaje + ' (token: ' + data.reset_token.substring(0, 20) + '...)';
      $('#forgotSuccess').classList.remove('hidden');
    } catch (err) {
      $('#forgotError').textContent = err.message;
    }
  });

  /* ==================== LOGOUT ==================== */
  function logout() {
    API.clearToken(); API.clearUser();
    if (ws) ws.close();
    updateHeader();
    showView('login');
    $('#formLogin').reset();
    UI.toast('Sesión cerrada');
  }

  $('#btnLogout').addEventListener('click', logout);
  $('#btnLogoutSidebar').addEventListener('click', logout);

  /* ==================== NAV ==================== */
  $$('#sidebar button[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.view;
      showView(v);
      if (v === 'dashboard') cargarDashboard();
      if (v === 'tutorias') cargarTutorias();
      if (v === 'reservas') cargarReservas();
      if (v === 'usuarios') cargarUsuarios();
      if (v === 'perfil') cargarPerfil();
    });
  });

  /* ==================== DARK MODE ==================== */
  const savedTheme = localStorage.getItem('theme');
  const html = document.documentElement;
  if (savedTheme === 'dark') html.setAttribute('data-theme', 'dark');

  function updateThemeIcon() {
    const isDark = html.getAttribute('data-theme') === 'dark';
    $('#btnTheme').innerHTML = isDark ? UI.icons.sun : UI.icons.moon;
  }
  updateThemeIcon();

  $('#btnTheme').addEventListener('click', () => {
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? '' : 'dark');
    localStorage.setItem('theme', isDark ? '' : 'dark');
    updateThemeIcon();
  });

  /* ==================== QUICK ACTIONS ==================== */
  $('#qaNuevaTutoria').addEventListener('click', () => {
    const user = API.getUser();
    if (user?.rol === 'Estudiante') { UI.toast('No tienes permiso para crear tutorías', 'error'); return; }
    showView('tutorias');
    abrirModal(null);
  });

  $('#qaVerTutorias').addEventListener('click', () => {
    showView('tutorias');
    cargarTutorias();
  });

  $('#qaMisReservas').addEventListener('click', () => {
    showView('reservas');
    cargarReservas();
  });

  $('#qaPerfil').addEventListener('click', () => {
    showView('perfil');
    cargarPerfil();
  });

  /* ==================== DASHBOARD ==================== */
  async function cargarDashboard() {
    const grid = $('#statsGrid');
    const topDiv = $('#topTutorias');
    grid.innerHTML = '<p style="color:var(--text-secondary);grid-column:1/-1;text-align:center;padding:2rem">Cargando...</p>';
    try {
      const data = await API.request('GET', '/reportes/resumen');
      const { totales, asistencia } = data;
      const pendientes = parseInt(asistencia.pendientes, 10);
      grid.innerHTML = `
        <div class="stat-card purple"><div class="stat-icon">${UI.icons.books}</div><div class="stat-value">${totales.total_tutorias}</div><div class="stat-label">Tutorías</div></div>
        <div class="stat-card blue"><div class="stat-icon">${UI.icons.clipboard}</div><div class="stat-value">${totales.total_reservas}</div><div class="stat-label">Reservas</div></div>
        <div class="stat-card green"><div class="stat-icon">${UI.icons.check}</div><div class="stat-value">${asistencia.porcentaje_asistencia}%</div><div class="stat-label">Asistencia</div></div>
        <div class="stat-card yellow"><div class="stat-icon">${UI.icons.clock}</div><div class="stat-value">${pendientes}</div><div class="stat-label">Pendientes</div></div>
        <div class="stat-card red"><div class="stat-icon">${UI.icons.users}</div><div class="stat-value">${totales.total_estudiantes}</div><div class="stat-label">Estudiantes</div></div>
      `;
    } catch { grid.innerHTML = '<p class="error-msg" style="grid-column:1/-1;text-align:center">Error al cargar dashboard</p>'; }

    try {
      const tutorias = await API.request('GET', '/reportes/tutorias');
      const filtradas = tutorias.filter(t => parseInt(t.total_reservas, 10) > 0);
      if (filtradas.length === 0) {
        topDiv.innerHTML = '<p style="color:var(--text-secondary);font-size:0.85rem">Sin datos aún</p>';
      } else {
        topDiv.innerHTML = filtradas.map(t => `
          <div style="display:flex;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid var(--border)">
            <span>${escHtml(t.tema)} <span style="color:var(--text-secondary);font-size:0.8rem">— ${escHtml(t.docente_nombre)}</span></span>
            <span style="font-weight:600">${t.total_reservas} reserva${t.total_reservas !== '1' ? 's' : ''}</span>
          </div>
        `).join('');
      }
    } catch { topDiv.innerHTML = '<p class="error-msg">Error al cargar</p>'; }
  }

  /* ==================== MODAL TUTORIA ==================== */
  function abrirModal(tutoria) {
    if (tutoria) {
      $('#modalTitle').textContent = 'Editar Tutoría';
      $('#tutId').value = tutoria.id_tutoria;
      $('#tutTema').value = tutoria.tema;
      $('#tutFecha').value = new Date(tutoria.fecha_hora_inicio).toISOString().slice(0, 16);
    } else {
      $('#modalTitle').textContent = 'Nueva Tutoría';
      $('#tutId').value = '';
      $('#tutTema').value = '';
      $('#tutFecha').value = '';
    }
    $('#modal-overlay').classList.remove('hidden');
  }

  $('#btnCrearTutoria').addEventListener('click', () => abrirModal(null));
  $('#modalClose').addEventListener('click', () => $('#modal-overlay').classList.add('hidden'));
  $('#modal-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) $('#modal-overlay').classList.add('hidden'); });

  $('#formTutoria').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#tutId').value;
    const data = { tema: $('#tutTema').value, fecha_hora_inicio: new Date($('#tutFecha').value).toISOString() };
    try {
      if (id) { await API.actualizarTutoria(+id, data); UI.toast('Tutoría actualizada'); }
      else { await API.crearTutoria(data); UI.toast('Tutoría creada'); }
      $('#modal-overlay').classList.add('hidden');
      cargarTutorias();
    } catch (err) { UI.toast(err.message, 'error'); }
  });

  /* ==================== TUTORIAS ==================== */
  const TUTORIAS_PAGE_SIZE = 10;
  let tutoriaSearchTerm = '';
  let tutoriaPage = 1;

  $('#searchTutorias').addEventListener('input', () => {
    tutoriaSearchTerm = $('#searchTutorias').value.toLowerCase();
    tutoriaPage = 1;
    cargarTutorias(false);
  });

  function renderPaginacion(id, total, page, pageSize, onPage) {
    const el = $(`#${id}`);
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    let html = `<button ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">‹ Anterior</button>
                <span class="page-info">Pág. ${page} de ${totalPages}</span>
                <button ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}">Siguiente ›</button>`;
    el.innerHTML = html;
    el.querySelectorAll('button:not([disabled])').forEach(b => b.addEventListener('click', () => {
      onPage(+b.dataset.page);
    }));
  }

  async function cargarTutorias(showSpinner = true) {
    const div = $('#tutoriasList');
    if (showSpinner) div.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:2rem">Cargando...</p>';
    try {
      const list = await API.getTutorias();
      const user = API.getUser();

      const filtradas = tutoriaSearchTerm
        ? list.filter(t => t.tema.toLowerCase().includes(tutoriaSearchTerm) || t.docente_nombre?.toLowerCase().includes(tutoriaSearchTerm))
        : list;

      const total = filtradas.length;
      const paginated = filtradas.slice((tutoriaPage - 1) * TUTORIAS_PAGE_SIZE, tutoriaPage * TUTORIAS_PAGE_SIZE);

      if (paginated.length === 0) {
        div.innerHTML = '<div class="empty-state"><div class="empty-icon">${UI.icons.books}</div><p>No hay tutorías disponibles.</p></div>';
        renderPaginacion('paginationTutorias', 0, 1, TUTORIAS_PAGE_SIZE, () => {});
        return;
      }
      div.innerHTML = paginated.map(t => {
        const isOwner = user?.rol === 'Admin' || t.id_docente === user?.id_usuario;
        return `
          <div class="tutoria-card">
            <div class="info">
              <div class="tema">${escHtml(t.tema)}</div>
              <div class="meta">${new Date(t.fecha_hora_inicio).toLocaleString()} — ${escHtml(t.docente_nombre)}</div>
            </div>
            <div class="actions">
              <span class="badge badge-${t.estado === 'Ocupado' ? 'ocupado' : 'disponible'}">${t.estado}</span>
              ${t.estado === 'Disponible' && user?.rol === 'Estudiante' ? `<button class="btn primary small btn-reservar" data-id="${t.id_tutoria}">Reservar</button>` : ''}
              ${isOwner ? `<button class="btn secondary small btn-editar-tutoria" data-id="${t.id_tutoria}">${UI.icons.edit}</button>` : ''}
              ${isOwner && t.estado !== 'Ocupado' ? `<button class="btn danger small btn-eliminar-tutoria" data-id="${t.id_tutoria}">${UI.icons.trash}</button>` : ''}
            </div>
          </div>
        `;
      }).join('');

      div.querySelectorAll('.btn-reservar').forEach(b => b.addEventListener('click', async () => {
        try { const user = API.getUser(); const d = await API.crearReserva(+b.dataset.id, user.id_usuario); UI.toast(d.mensaje); cargarTutorias(false); }
        catch (err) { UI.toast(err.message, 'error'); }
      }));
      div.querySelectorAll('.btn-editar-tutoria').forEach(b => b.addEventListener('click', () => {
        const t = list.find(x => x.id_tutoria === +b.dataset.id);
        if (t) abrirModal(t);
      }));
      div.querySelectorAll('.btn-eliminar-tutoria').forEach(b => b.addEventListener('click', async () => {
        const ok = await UI.confirm('Eliminar tutoría', '¿Estás seguro de eliminar esta tutoría? Esta acción no se puede deshacer.', 'Eliminar');
        if (!ok) return;
        try { await API.eliminarTutoria(+b.dataset.id); UI.toast('Tutoría eliminada', 'success'); cargarTutorias(false); }
        catch (err) { UI.toast(err.message, 'error'); }
      }));

      renderPaginacion('paginationTutorias', total, tutoriaPage, TUTORIAS_PAGE_SIZE, (p) => {
        tutoriaPage = p;
        cargarTutorias(false);
      });
    } catch (err) { div.innerHTML = `<p class="error-msg">${err.message}</p>`; }
  }

  /* ==================== RESERVAS ==================== */
  async function cargarReservas() {
    const div = $('#reservasList');
    div.innerHTML = '<p style="color:var(--text-secondary);text-align:center;padding:2rem">Cargando...</p>';
    try {
      const list = await API.getReservas();
      const user = API.getUser();
      if (list.length === 0) {
        div.innerHTML = '<div class="empty-state"><div class="empty-icon">${UI.icons.clipboard}</div><p>No hay reservas.</p></div>';
        return;
      }
      div.innerHTML = list.map(r => `
        <div class="reserva-card">
          <div class="info">
            <div class="tema">${escHtml(r.tema)}</div>
            <div class="meta">
              ${new Date(r.fecha_hora_inicio).toLocaleString()} —
              ${user.rol === 'Estudiante' ? escHtml(r.docente_nombre) : escHtml(r.estudiante_nombre)}
            </div>
          </div>
          <div class="actions">
            <span class="badge badge-${r.estado_asistencia === 'Asistio' ? 'asistio' : r.estado_asistencia === 'Falto' ? 'falto' : 'pendiente'}">${r.estado_asistencia === 'Asistio' ? UI.icons.check + ' Asistió' : r.estado_asistencia === 'Falto' ? UI.icons.trash + ' Faltó' : UI.icons.clock + ' Pendiente'}</span>
            ${user.rol === 'Docente' && r.estado_asistencia === 'Pendiente'
              ? `<select class="sel-asistencia" data-id="${r.id_reserva}" style="padding:0.35rem 0.5rem;border-radius:8px;border:1px solid var(--border)">
                   <option value="Pendiente">Marcar...</option>
                   <option value="Asistio">Asistió</option>
                   <option value="Falto">Faltó</option>
                 </select>` : ''}
            ${r.estado_asistencia === 'Pendiente' && user?.rol === 'Estudiante'
              ? `<button class="btn danger small btn-cancelar-reserva" data-id="${r.id_reserva}">Cancelar</button>` : ''}
          </div>
        </div>
      `).join('');

      div.querySelectorAll('.sel-asistencia').forEach(s => s.addEventListener('change', async () => {
        try { await API.marcarAsistencia(+s.dataset.id, s.value); UI.toast('Asistencia actualizada'); cargarReservas(); }
        catch (err) { UI.toast(err.message, 'error'); }
      }));
      div.querySelectorAll('.btn-cancelar-reserva').forEach(b => b.addEventListener('click', async () => {
        const ok = await UI.confirm('Cancelar reserva', '¿Estás seguro de cancelar esta reserva?', 'Cancelar');
        if (!ok) return;
        try { await API.request('PUT', `/reservas/${b.dataset.id}/cancelar`); UI.toast('Reserva cancelada', 'warning'); cargarReservas(); cargarTutorias(false); }
        catch (err) { UI.toast(err.message, 'error'); }
      }));
    } catch (err) { div.innerHTML = `<p class="error-msg">${err.message}</p>`; }
  }

  /* ==================== USUARIOS ==================== */
  const USUARIOS_PAGE_SIZE = 15;
  let usuarioSearchTerm = '';
  let usuarioPage = 1;

  $('#searchUsuarios').addEventListener('input', () => {
    usuarioSearchTerm = $('#searchUsuarios').value.toLowerCase();
    usuarioPage = 1;
    cargarUsuarios();
  });

  async function cargarUsuarios() {
    const tbody = $('#usuariosTable tbody');
    try {
      const list = await API.getUsuarios();

      const filtradas = usuarioSearchTerm
        ? list.filter(u =>
            u.nombre_completo.toLowerCase().includes(usuarioSearchTerm) ||
            u.correo.toLowerCase().includes(usuarioSearchTerm) ||
            u.rol.toLowerCase().includes(usuarioSearchTerm))
        : list;

      const total = filtradas.length;
      const paginated = filtradas.slice((usuarioPage - 1) * USUARIOS_PAGE_SIZE, usuarioPage * USUARIOS_PAGE_SIZE);

      tbody.innerHTML = paginated.map(u => `
        <tr>
          <td>${u.id_usuario}</td>
          <td>${escHtml(u.nombre_completo)}</td>
          <td>${escHtml(u.correo)}</td>
          <td><span class="badge badge-${u.rol === 'Admin' ? 'pendiente' : u.rol === 'Docente' ? 'disponible' : 'ocupado'}">${u.rol}</span></td>
          <td>
            <button class="btn secondary small editar-usuario" data-id="${u.id_usuario}">${UI.icons.edit}</button>
            <button class="btn danger small eliminar-usuario" data-id="${u.id_usuario}">${UI.icons.trash}</button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('.eliminar-usuario').forEach(b => b.addEventListener('click', async () => {
        const ok = await UI.confirm('Eliminar usuario', '¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.', 'Eliminar');
        if (!ok) return;
        try { await API.eliminarUsuario(+b.dataset.id); UI.toast('Usuario eliminado', 'success'); cargarUsuarios(); }
        catch (err) { UI.toast(err.message, 'error'); }
      }));
      tbody.querySelectorAll('.editar-usuario').forEach(b => b.addEventListener('click', async () => {
        try {
          const u = await API.getUsuario(+b.dataset.id);
          $('#usrId').value = u.id_usuario;
          $('#usrNombre').value = u.nombre_completo;
          $('#usrCorreo').value = u.correo;
          $('#usrContrasena').value = '';
          $('#usrContrasena').placeholder = 'Dejar vacío para no cambiar';
          $('#usrRol').value = u.rol;
          $('#formUsuario button[type="submit"]').textContent = 'Actualizar';
          $('#btnCancelarUsuario').classList.remove('hidden');
        } catch (err) { UI.toast(err.message, 'error'); }
      }));
    } catch (err) { tbody.innerHTML = `<tr><td colspan="5" class="error-msg">${err.message}</td></tr>`; }

    renderPaginacion('paginationUsuarios', total, usuarioPage, USUARIOS_PAGE_SIZE, (p) => {
      usuarioPage = p;
      cargarUsuarios();
    });
  }

  $('#formUsuario').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#usrId').value;
    const data = { nombre_completo: $('#usrNombre').value, correo: $('#usrCorreo').value, rol: $('#usrRol').value };
    if ($('#usrContrasena').value) data.contrasena = $('#usrContrasena').value;
    try {
      if (id) { await API.actualizarUsuario(+id, data); UI.toast('Usuario actualizado'); }
      else { await API.crearUsuario(data); UI.toast('Usuario creado'); }
      cancelarEdicionUsuario(); cargarUsuarios();
    } catch (err) { UI.toast(err.message, 'error'); }
  });

  $('#btnCancelarUsuario').addEventListener('click', cancelarEdicionUsuario);
  function cancelarEdicionUsuario() {
    $('#formUsuario').reset(); $('#usrId').value = '';
    $('#usrContrasena').placeholder = 'Contraseña';
    $('#formUsuario button[type="submit"]').textContent = 'Guardar';
    $('#btnCancelarUsuario').classList.add('hidden');
  }

  /* ==================== PERFIL ==================== */
  async function cargarPerfil() {
    try {
      const u = await API.getPerfil();
      $('#perfilNombre').value = u.nombre_completo;
      $('#perfilContrasena').value = '';
      $('#perfilError').textContent = '';
      $('#perfilInfo').innerHTML = `
        <div class="row"><span class="label">ID</span><span class="value">${u.id_usuario}</span></div>
        <div class="row"><span class="label">Correo</span><span class="value">${escHtml(u.correo)}</span></div>
        <div class="row"><span class="label">Rol</span><span class="value"><span class="badge badge-${u.rol === 'Admin' ? 'pendiente' : u.rol === 'Docente' ? 'disponible' : 'ocupado'}">${u.rol}</span></span></div>
      `;
    } catch (err) { /* ignore */ }
  }

  $('#formPerfil').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#perfilError').textContent = '';
    const data = {};
    if ($('#perfilNombre').value) data.nombre_completo = $('#perfilNombre').value;
    if ($('#perfilContrasena').value) data.contrasena = $('#perfilContrasena').value;
    if (Object.keys(data).length === 0) { $('#perfilError').textContent = 'No hay cambios'; return; }
    try {
      const u = await API.actualizarPerfil(data);
      const user = API.getUser();
      user.nombre_completo = u.nombre_completo;
      API.setUser(user);
      updateHeader();
      UI.toast('Perfil actualizado');
      cargarPerfil();
    } catch (err) { $('#perfilError').textContent = err.message; }
  });

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /* ==================== INIT ==================== */
  if (API._tokenValido()) {
    updateHeader();
    conectarWebSocket();
    showView('dashboard');
    cargarDashboard();
  } else {
    API.clearToken();
    API.clearUser();
    showView('login');
  }
});
