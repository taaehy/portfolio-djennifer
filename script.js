const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('.nav');
const menuLinks = document.querySelectorAll('.nav a');

function toggleMenu(forceClose = false) {
  const shouldOpen = forceClose ? false : !menu.classList.contains('is-open');
  menu.classList.toggle('is-open', shouldOpen);
  menuButton.setAttribute('aria-expanded', String(shouldOpen));
  document.body.classList.toggle('menu-open', shouldOpen);
}

menuButton.addEventListener('click', () => toggleMenu());
menuLinks.forEach((link) => link.addEventListener('click', () => toggleMenu(true)));

window.addEventListener('scroll', () => {
  header.classList.toggle('is-scrolled', window.scrollY > 80);
}, { passive: true });

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

document.getElementById('contact-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const buttonLabel = button.querySelector('.button-label');
  const status = document.getElementById('form-status');
  const data = Object.fromEntries(new FormData(form));

  button.disabled = true;
  buttonLabel.textContent = 'Enviando...';
  status.className = 'form-note';
  status.textContent = 'Enviando sua mensagem com segurança...';

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || 'Não foi possível enviar agora.');
    }

    form.reset();
    status.className = 'form-note is-success';
    status.textContent = 'Mensagem enviada! Obrigada pelo contato.';
  } catch (error) {
    status.className = 'form-note is-error';
    status.textContent = `${error.message} Você também pode falar comigo por e-mail ou LinkedIn.`;
  } finally {
    button.disabled = false;
    buttonLabel.textContent = 'Enviar mensagem';
  }
});

document.getElementById('current-year').textContent = new Date().getFullYear();
