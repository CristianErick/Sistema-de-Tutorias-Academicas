const { WebSocketServer } = require('ws');

let wss;

function setup(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');
    const rol = url.searchParams.get('rol');

    if (!userId) {
      ws.close();
      return;
    }

    ws.userId = parseInt(userId, 10);
    ws.rol = rol;
  });

  return wss;
}

function notifyDocente(docenteId, event, data) {
  if (!wss) return;

  const message = JSON.stringify({ event, data });

  wss.clients.forEach((ws) => {
    if (ws.readyState === 1 && (ws.userId === docenteId || ws.rol === 'Admin')) {
      ws.send(message);
    }
  });
}

function notifyEstudiante(estudianteId, event, data) {
  if (!wss) return;

  const message = JSON.stringify({ event, data });

  wss.clients.forEach((ws) => {
    if (ws.readyState === 1 && (ws.userId === estudianteId || ws.rol === 'Admin')) {
      ws.send(message);
    }
  });
}

module.exports = { setup, notifyDocente, notifyEstudiante };
