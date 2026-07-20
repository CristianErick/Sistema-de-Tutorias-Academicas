const API = {
  BASE: '/api',

  getToken() {
    return localStorage.getItem('token');
  },

  setToken(token) {
    localStorage.setItem('token', token);
  },

  clearToken() {
    localStorage.removeItem('token');
  },

  getUser() {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  },

  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },

  clearUser() {
    localStorage.removeItem('user');
  },

  _logout() {
    this.clearToken();
    this.clearUser();
  },

  _tokenValido() {
    const token = this.getToken();
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch { return false; }
  },

  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const token = this.getToken();
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(`${this.BASE}${path}`, opts);
    if (res.status === 401) { this._logout(); throw new Error('Sesión expirada'); }
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Error del servidor');
    return json.data;
  },

  async login(correo, contrasena) {
    return this.request('POST', '/auth/login', { correo, contrasena });
  },

  async getTutorias() {
    return this.request('GET', '/tutorias');
  },

  async crearTutoria(data) {
    return this.request('POST', '/tutorias', data);
  },

  async actualizarTutoria(id, data) {
    return this.request('PUT', `/tutorias/${id}`, data);
  },

  async eliminarTutoria(id) {
    return this.request('DELETE', `/tutorias/${id}`);
  },

  async crearReserva(idTutoria, idUsuario) {
    return this.request('POST', '/reservas', { id_tutoria: idTutoria, id_usuario: idUsuario });
  },

  async getReservas() {
    return this.request('GET', '/reservas');
  },

  async marcarAsistencia(id, estado) {
    return this.request('PUT', `/reservas/${id}/asistencia`, { estado_asistencia: estado });
  },

  async getUsuarios() {
    return this.request('GET', '/usuarios');
  },

  async getUsuario(id) {
    return this.request('GET', `/usuarios/${id}`);
  },

  async crearUsuario(data) {
    return this.request('POST', '/usuarios', data);
  },

  async actualizarUsuario(id, data) {
    return this.request('PUT', `/usuarios/${id}`, data);
  },

  async eliminarUsuario(id) {
    return this.request('DELETE', `/usuarios/${id}`);
  },

  async getPerfil() {
    return this.request('GET', '/auth/perfil');
  },

  async actualizarPerfil(data) {
    return this.request('PUT', '/auth/perfil', data);
  },
};
