import { renderHome } from './pages/home.js';
import { renderCategories } from './pages/categories.js';
import { renderDirectory } from './pages/directory.js';
import { renderProfile } from './pages/profile.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderVerification } from './pages/verification.js';
import { renderProfileIntecnia } from './pages/profile-intecnia.js';

const routes = {
  '/': renderHome,
  '/categories': renderCategories,
  '/directory': renderDirectory,
  '/profile': renderProfile,
  '/dashboard': renderDashboard,
  '/verification': renderVerification,
  '/profile-intecnia': renderProfileIntecnia,
};

export const router = {
  init() {
    window.addEventListener('popstate', () => this.render());
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-route]');
      if (link) {
        e.preventDefault();
        this.navigate(link.dataset.route);
      }
    });
    this.render();
  },

  navigate(path) {
    window.history.pushState({}, '', path);
    this.render();
  },

  render() {
    const path = window.location.pathname;
    const app = document.getElementById('app');
    const renderFn = routes[path] || routes['/'];
    app.innerHTML = '';
    app.innerHTML = renderFn();
    window.scrollTo(0, 0);
    // Re-attach any interactive scripts
    this.attachInteractions();
  },

  attachInteractions() {
    // Banner close
    document.querySelectorAll('[data-dismiss]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.notif-banner')?.remove();
      });
    });
    // Chat typing simulation
    const chatInput = document.querySelector('#chat-input');
    const chatSend = document.querySelector('#chat-send');
    if (chatInput && chatSend) {
      chatSend.addEventListener('click', () => {
        const msg = chatInput.value.trim();
        if (!msg) return;
        const msgs = document.querySelector('#chat-messages');
        msgs.innerHTML += `<div class="chat-bubble user">${msg}</div>`;
        chatInput.value = '';
        msgs.scrollTop = msgs.scrollHeight;
        setTimeout(() => {
          msgs.innerHTML += `<div class="chat-bubble bot">Gracias por tu mensaje. Estoy procesando tu solicitud...</div>`;
          msgs.scrollTop = msgs.scrollHeight;
        }, 1000);
      });
    }
    // Filter toggles
    document.querySelectorAll('[data-view-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-view-toggle]').forEach(b => b.classList.remove('active-toggle'));
        btn.classList.add('active-toggle');
      });
    });
  }
};
