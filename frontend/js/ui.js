const UI = {
  toast(message, type = 'success', duration = 3500) {
    const icons = {
      success: '✓',
      error: '✗',
      info: 'ℹ',
      warning: '⚠',
    };
    const container = document.getElementById('toast-container');
    const existing = container.querySelectorAll('.toast');
    if (existing.length >= 5) existing[0].remove();

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-text">${message}</span>
      <div class="toast-progress"></div>
    `;
    el.addEventListener('click', () => {
      el.classList.add('toast-leaving');
      setTimeout(() => el.remove(), 300);
    });
    container.appendChild(el);

    requestAnimationFrame(() => {
      const bar = el.querySelector('.toast-progress');
      bar.style.transition = `width ${duration}ms linear`;
      bar.style.width = '0%';
    });

    setTimeout(() => {
      el.classList.add('toast-leaving');
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  confirm(title, message, confirmText = 'Eliminar', cancelText = 'Cancelar') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-modal">
          <div class="confirm-header">
            <h3>${title}</h3>
          </div>
          <div class="confirm-body">
            <p>${message}</p>
          </div>
          <div class="confirm-footer">
            <button class="btn btn-cancel">${cancelText}</button>
            <button class="btn btn-danger">${confirmText}</button>
          </div>
        </div>
      `;
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { overlay.remove(); resolve(false); }
      });
      overlay.querySelector('.btn-cancel').addEventListener('click', () => {
        overlay.remove(); resolve(false);
      });
      overlay.querySelector('.btn-danger').addEventListener('click', () => {
        overlay.remove(); resolve(true);
      });
      document.body.appendChild(overlay);
    });
  },
};
