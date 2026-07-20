const API = {
  base: '/api',

  getToken() { return localStorage.getItem('token'); },
  setToken(t) { localStorage.setItem('token', t); },
  clearToken() { localStorage.removeItem('token'); },
  getUser() {
    const d = localStorage.getItem('usuario');
    return d ? JSON.parse(d) : null;
  },
  setUser(u) { localStorage.setItem('usuario', JSON.stringify(u)); },
  clearUser() { localStorage.removeItem('usuario'); },

  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const token = this.getToken();
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(this.base + path, opts);
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || 'Error de red');
    }

    return json.data;
  },

  login(correo, contrasena) {
    return this.request('POST', '/auth/login', { correo, contrasena });
  },

  getUsuarios() { return this.request('GET', '/usuarios'); },
  getUsuario(id) { return this.request('GET', `/usuarios/${id}`); },
  crearUsuario(d) { return this.request('POST', '/usuarios', d); },
  actualizarUsuario(id, d) { return this.request('PUT', `/usuarios/${id}`, d); },
  eliminarUsuario(id) { return this.request('DELETE', `/usuarios/${id}`); },

  getTutorias() { return this.request('GET', '/tutorias'); },
  getTutoria(id) { return this.request('GET', `/tutorias/${id}`); },
  crearTutoria(d) { return this.request('POST', '/tutorias', d); },
  actualizarTutoria(id, d) { return this.request('PUT', `/tutorias/${id}`, d); },
  eliminarTutoria(id) { return this.request('DELETE', `/tutorias/${id}`); },

  getPerfil() { return this.request('GET', '/auth/me'); },

  getReservas() { return this.request('GET', '/reservas'); },
  crearReserva(idTutoria, idEstudiante) {
    return this.request('POST', '/reservas/nueva', {
      id_tutoria: idTutoria,
      id_estudiante: idEstudiante,
    });
  },
  marcarAsistencia(id, estado) {
    return this.request('PUT', `/reservas/${id}/asistencia`, { estado_asistencia: estado });
  },
};
