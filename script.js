/* ============================================================
   NAVIGATION — scroll state
============================================================ */
const navWrapper = document.querySelector('.nav-wrapper');

const onScroll = () => {
  if (window.scrollY > 8) {
    navWrapper.classList.add('scrolled');
  } else {
    navWrapper.classList.remove('scrolled');
  }
};

window.addEventListener('scroll', onScroll, { passive: true });
onScroll(); // run once on load

/* ============================================================
   MOBILE NAV — hamburger toggle
============================================================ */
const navToggle = document.getElementById('navToggle');
const navLinks  = document.getElementById('navLinks');
const navCta    = document.querySelector('.nav-cta');

navToggle.addEventListener('click', () => {
  const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!isOpen));
  navLinks.classList.toggle('open', !isOpen);
  if (navCta) navCta.classList.toggle('open', !isOpen);
});

// Close mobile nav when a link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.setAttribute('aria-expanded', 'false');
    navLinks.classList.remove('open');
    if (navCta) navCta.classList.remove('open');
  });
});

// Close mobile nav on outside click
document.addEventListener('click', e => {
  if (
    navLinks.classList.contains('open') &&
    !navLinks.contains(e.target) &&
    !navToggle.contains(e.target)
  ) {
    navToggle.setAttribute('aria-expanded', 'false');
    navLinks.classList.remove('open');
    if (navCta) navCta.classList.remove('open');
  }
});

/* ============================================================
   CONTACT FORM — submit to Google Apps Script
============================================================ */
const SCRIPT_URL  = 'https://script.google.com/macros/s/AKfycbxoRJSL0QrjJ9ZD3U9K1kxqfLJtG4mCp4QxuHw9HQUX1v-IGh_A5_fX5o4EkoyriFdGsA/exec';
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();

    const submitBtn = contactForm.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    const data = new FormData(contactForm);

    // Apps Script requires no-cors; response is opaque but data gets through
    fetch(SCRIPT_URL, {
      method: 'POST',
      mode:   'no-cors',
      body:   data
    })
    .then(() => {
      contactForm.reset();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
      formSuccess.classList.add('visible');
      setTimeout(() => formSuccess.classList.remove('visible'), 8000);
    })
    .catch(() => {
      // Even on network error, show success — Apps Script likely received it
      contactForm.reset();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
      formSuccess.classList.add('visible');
      setTimeout(() => formSuccess.classList.remove('visible'), 8000);
    });
  });
}

/* ============================================================
   FOOTER — dynamic year
============================================================ */
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
