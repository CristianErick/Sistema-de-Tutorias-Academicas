let ws;

function conectarWebSocket() {
  const user = API.getUser();
  if (!user || ws?.readyState === WebSocket.OPEN) return;

  const protocolo = location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocolo}//${location.host}/ws?userId=${user.id_usuario}&rol=${user.rol}`);

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      toast(msg.data.mensaje, msg.event === 'nueva-reserva' ? 'success' : 'info');
    } catch { /* ignore */ }
  };

  ws.onclose = () => {
    setTimeout(conectarWebSocket, 3000);
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  function toast(message, type = 'success') {
    const colors = { success: '#27ae60', error: '#e74c3c', info: '#3498db' };
    const c = $('#toast-container');
    const el = document.createElement('div');
    el.className = 'toast';
    el.style.background = colors[type] || colors.success;
    el.textContent = message;
    c.appendChild(el);
    setTimeout(() => { el.remove(); }, 3500);
  }

  const views = ['login', 'tutorias', 'reservas', 'usuarios', 'perfil'];
  const viewEls = {};
  views.forEach(v => { viewEls[v] = $(`#view-${v}`); });

  function showView(name) {
    views.forEach(v => viewEls[v].classList.toggle('hidden', v !== name));
  }

  function updateHeader() {
    const user = API.getUser();
    if (user) {
      $('#header').classList.remove('hidden');
      $('#headerUser').textContent = user.nombre_completo;
      $('#btnUsuarios').classList.toggle('hidden', user.rol !== 'Admin');
      $('#btnCrearTutoria').classList.toggle('hidden', user.rol === 'Estudiante');
    } else {
      $('#header').classList.add('hidden');
    }
  }

  /* ==================== LOGIN ==================== */
  $('#formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginError').textContent = '';
    $('#btnLogin').disabled = true;
    $('#btnLogin').textContent = 'Ingresando...';
    try {
      const data = await API.login($('#loginCorreo').value, $('#loginContrasena').value);
      API.setToken(data.token);
      API.setUser(data.usuario);
      toast(`Bienvenido, ${data.usuario.nombre_completo}`);
      conectarWebSocket();
      updateHeader();
      showView('tutorias');
      cargarTutorias();
    } catch (err) {
      $('#loginError').textContent = err.message;
    } finally {
      $('#btnLogin').disabled = false;
      $('#btnLogin').textContent = 'Ingresar';
    }
  });

  /* ==================== LOGOUT ==================== */
  $('#btnLogout').addEventListener('click', () => {
    API.clearToken();
    API.clearUser();
    if (ws) ws.close();
    updateHeader();
    showView('login');
    $('#formLogin').reset();
    toast('Sesión cerrada');
  });

  /* ==================== NAV ==================== */
  $$('#header nav button[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.view;
      showView(v);
      if (v === 'tutorias') cargarTutorias();
      if (v === 'reservas') cargarReservas();
      if (v === 'usuarios') cargarUsuarios();
      if (v === 'perfil') cargarPerfil();
    });
  });

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
  $('#modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) $('#modal-overlay').classList.add('hidden');
  });

  $('#formTutoria').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#tutId').value;
    const data = {
      tema: $('#tutTema').value,
      fecha_hora_inicio: new Date($('#tutFecha').value).toISOString(),
    };
    try {
      if (id) {
        await API.actualizarTutoria(+id, data);
        toast('Tutoría actualizada');
      } else {
        await API.crearTutoria(data);
        toast('Tutoría creada');
      }
      $('#modal-overlay').classList.add('hidden');
      cargarTutorias();
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  /* ==================== TUTORIAS ==================== */
  async function cargarTutorias() {
    const div = $('#tutoriasList');
    div.innerHTML = '<p style="color:var(--text-light)">Cargando...</p>';
    try {
      const list = await API.getTutorias();
      const user = API.getUser();
      if (list.length === 0) {
        div.innerHTML = '<p style="color:var(--text-light)">No hay tutorías disponibles.</p>';
        return;
      }
      div.innerHTML = list.map(t => {
        const isOwner = user?.rol === 'Admin' || t.id_docente === user?.id_usuario;
        return `
          <div class="tutoria-card">
            <div class="info">
              <div class="tema">${escHtml(t.tema)}</div>
              <div class="meta">${new Date(t.fecha_hora_inicio).toLocaleString()} — ${escHtml(t.docente_nombre)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
              <span class="badge badge-${t.estado === 'Ocupado' ? 'ocupado' : 'disponible'}">${t.estado}</span>
              ${t.estado === 'Disponible' && user?.rol === 'Estudiante'
                ? `<button class="btn primary small btn-reservar" data-id="${t.id_tutoria}">Reservar</button>` : ''}
              ${isOwner ? `<button class="btn secondary small btn-editar-tutoria" data-id="${t.id_tutoria}">Editar</button>` : ''}
              ${isOwner && t.estado !== 'Ocupado' ? `<button class="btn danger small btn-eliminar-tutoria" data-id="${t.id_tutoria}">Eliminar</button>` : ''}
            </div>
          </div>
        `;
      }).join('');

      div.querySelectorAll('.btn-reservar').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            const data = await API.crearReserva(+btn.dataset.id, user.id_usuario);
            toast(data.mensaje);
            cargarTutorias();
          } catch (err) { toast(err.message, 'error'); }
        });
      });
      div.querySelectorAll('.btn-editar-tutoria').forEach(btn => {
        btn.addEventListener('click', () => {
          const t = list.find(x => x.id_tutoria === +btn.dataset.id);
          if (t) abrirModal(t);
        });
      });
      div.querySelectorAll('.btn-eliminar-tutoria').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('¿Eliminar esta tutoría?')) return;
          try {
            await API.eliminarTutoria(+btn.dataset.id);
            toast('Tutoría eliminada');
            cargarTutorias();
          } catch (err) { toast(err.message, 'error'); }
        });
      });
    } catch (err) {
      div.innerHTML = `<p class="error-msg">${err.message}</p>`;
    }
  }

  /* ==================== RESERVAS ==================== */
  async function cargarReservas() {
    const div = $('#reservasList');
    div.innerHTML = '<p style="color:var(--text-light)">Cargando...</p>';
    try {
      const list = await API.getReservas();
      const user = API.getUser();
      if (list.length === 0) {
        div.innerHTML = '<p style="color:var(--text-light)">No hay reservas.</p>';
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
          <div style="display:flex;align-items:center;gap:0.5rem">
            <span class="badge badge-${r.estado_asistencia === 'Asistio' ? 'asistio' : r.estado_asistencia === 'Falto' ? 'falto' : 'pendiente'}">${r.estado_asistencia}</span>
            ${user.rol === 'Docente' && r.estado_asistencia === 'Pendiente'
              ? `<select class="sel-asistencia" data-id="${r.id_reserva}" style="padding:0.35rem 0.5rem;border-radius:8px;border:1px solid var(--border)">
                   <option value="Pendiente">---</option>
                   <option value="Asistio">Asistió</option>
                   <option value="Falto">Faltó</option>
                 </select>` : ''}
          </div>
        </div>
      `).join('');

      div.querySelectorAll('.sel-asistencia').forEach(sel => {
        sel.addEventListener('change', async () => {
          try {
            await API.marcarAsistencia(+sel.dataset.id, sel.value);
            toast('Asistencia actualizada');
            cargarReservas();
          } catch (err) { toast(err.message, 'error'); }
        });
      });
    } catch (err) {
      div.innerHTML = `<p class="error-msg">${err.message}</p>`;
    }
  }

  /* ==================== USUARIOS ==================== */
  async function cargarUsuarios() {
    const tbody = $('#usuariosTable tbody');
    try {
      const list = await API.getUsuarios();
      tbody.innerHTML = list.map(u => `
        <tr>
          <td>${u.id_usuario}</td>
          <td>${escHtml(u.nombre_completo)}</td>
          <td>${escHtml(u.correo)}</td>
          <td><span class="badge badge-${u.rol === 'Admin' ? 'pendiente' : u.rol === 'Docente' ? 'disponible' : 'ocupado'}">${u.rol}</span></td>
          <td>
            <button class="btn secondary small editar-usuario" data-id="${u.id_usuario}">Editar</button>
            <button class="btn danger small eliminar-usuario" data-id="${u.id_usuario}">Eliminar</button>
          </td>
        </tr>
      `).join('');

      tbody.querySelectorAll('.eliminar-usuario').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('¿Eliminar usuario?')) return;
          try {
            await API.eliminarUsuario(+btn.dataset.id);
            toast('Usuario eliminado');
            cargarUsuarios();
          } catch (err) { toast(err.message, 'error'); }
        });
      });
      tbody.querySelectorAll('.editar-usuario').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            const u = await API.getUsuario(+btn.dataset.id);
            $('#usrId').value = u.id_usuario;
            $('#usrNombre').value = u.nombre_completo;
            $('#usrCorreo').value = u.correo;
            $('#usrContrasena').value = '';
            $('#usrContrasena').placeholder = 'Dejar vacío para no cambiar';
            $('#usrRol').value = u.rol;
            $('#formUsuario button[type="submit"]').textContent = 'Actualizar';
            $('#btnCancelarUsuario').classList.remove('hidden');
          } catch (err) { toast(err.message, 'error'); }
        });
      });
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="error-msg">${err.message}</td></tr>`;
    }
  }

  $('#formUsuario').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#usrId').value;
    const data = {
      nombre_completo: $('#usrNombre').value,
      correo: $('#usrCorreo').value,
      rol: $('#usrRol').value,
    };
    if ($('#usrContrasena').value) data.contrasena = $('#usrContrasena').value;

    try {
      if (id) {
        await API.actualizarUsuario(+id, data);
        toast('Usuario actualizado');
      } else {
        await API.crearUsuario(data);
        toast('Usuario creado');
      }
      cancelarEdicionUsuario();
      cargarUsuarios();
    } catch (err) { toast(err.message, 'error'); }
  });

  $('#btnCancelarUsuario').addEventListener('click', cancelarEdicionUsuario);
  function cancelarEdicionUsuario() {
    $('#formUsuario').reset();
    $('#usrId').value = '';
    $('#usrContrasena').placeholder = 'Contraseña';
    $('#formUsuario button[type="submit"]').textContent = 'Guardar';
    $('#btnCancelarUsuario').classList.add('hidden');
  }

  /* ==================== PERFIL ==================== */
  async function cargarPerfil() {
    try {
      const u = await API.getPerfil();
      $('#perfilInfo').innerHTML = `
        <p><strong>ID:</strong> ${u.id_usuario}</p>
        <p><strong>Nombre:</strong> ${escHtml(u.nombre_completo)}</p>
        <p><strong>Correo:</strong> ${escHtml(u.correo)}</p>
        <p><strong>Rol:</strong> ${u.rol}</p>
      `;
    } catch (err) {
      $('#perfilInfo').innerHTML = `<p class="error-msg">${err.message}</p>`;
    }
  }

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /* ==================== INIT ==================== */
  if (API.getToken()) {
    updateHeader();
    conectarWebSocket();
    showView('tutorias');
    cargarTutorias();
  } else {
    showView('login');
  }
});
