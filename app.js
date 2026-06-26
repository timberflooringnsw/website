// ── GA4 event helper ───────────────────────────────────────────
function trackEvent(name, params) {
  if (typeof gtag === 'function') gtag('event', name, params);
}

// ── Business hours status ──────────────────────────────────────
function updateStatus() {
  const now  = new Date();
  const day  = now.getDay();
  const h    = now.getHours() + now.getMinutes() / 60;
  const open = (day >= 1 && day <= 5 && h >= 7 && h < 18) || (day === 6 && h >= 8 && h < 14);
  const text = open ? 'Open now' : 'Closed';
  const cls  = open ? 'status-open' : 'status-closed';

  ['statusDot', 'statusDotMobile'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = 'status-dot ' + cls;
  });
  ['statusText', 'statusTextMobile'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  });

  const navCallBtn    = document.getElementById('navCallBtn');
  const navTextBtn    = document.getElementById('navTextBtn');
  const mobileCallBtn = document.getElementById('mobileCallBtn');
  const mobileTextBtn = document.getElementById('mobileTextBtn');
  if (navCallBtn && navTextBtn) {
    navCallBtn.classList.toggle('hidden', !open);
    navTextBtn.classList.toggle('hidden', open);
  }
  if (mobileCallBtn && mobileTextBtn) {
    mobileCallBtn.classList.toggle('hidden', !open);
    mobileTextBtn.classList.toggle('hidden', open);
  }
}

updateStatus();

// ── Nav scroll + scroll-to-top ────────────────────────────────
const navbar       = document.getElementById('navbar');
const scrollTopBtn = document.getElementById('scrollTop');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 60);
  scrollTopBtn.classList.toggle('show', window.scrollY > 400);
});

// ── Mobile menu ────────────────────────────────────────────────
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(open));
});
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// ── Fade-in on scroll ──────────────────────────────────────────
const fadeObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.08 });
document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));

// ── Gallery + lightbox ────────────────────────────────────────
let galleryPhotos        = [];
let activePhotoIndex     = 0;
let lastFocusedGalleryEl = null;

function makeGalleryCard(photo, index) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'photo-item gallery-card';
  card.setAttribute('aria-label', `Open photo: ${photo.title}`);
  card.dataset.index = String(index);

  const blur = document.createElement('img');
  blur.className = 'gallery-blur';
  blur.src = photo.src;
  blur.alt = '';
  blur.setAttribute('aria-hidden', 'true');
  blur.loading = 'lazy';

  const img = document.createElement('img');
  img.className = 'gallery-main';
  img.src = photo.src;
  img.alt = photo.alt;
  img.loading = 'lazy';
  img.decoding = 'async';

  img.addEventListener('load', () => {
    const isPortrait = img.naturalWidth <= img.naturalHeight;
    card.classList.toggle('is-portrait', isPortrait);
    photo.isPortrait = isPortrait;
  });
  img.addEventListener('error', () => {
    card.classList.add('is-portrait');
    card.innerHTML = '<div class="gallery-empty" style="height:100%;display:flex;align-items:center;justify-content:center">Image unavailable</div>';
  });

  const caption = document.createElement('div');
  caption.className = 'gallery-caption';
  caption.innerHTML = `<span class="text-cream/90 text-xs font-body">${photo.title}</span>`;

  card.appendChild(blur);
  card.appendChild(img);
  card.appendChild(caption);
  card.addEventListener('click', () => openLightbox(index, card));
  return card;
}

function setLightboxPhoto(index) {
  if (!galleryPhotos.length) return;
  activePhotoIndex = (index + galleryPhotos.length) % galleryPhotos.length;
  const photo    = galleryPhotos[activePhotoIndex];
  const image    = document.getElementById('lightboxImage');
  const imageBg  = document.getElementById('lightboxImageBg');
  const viewport = document.getElementById('lightboxViewport');

  image.src   = photo.src;
  image.alt   = photo.alt;
  imageBg.src = photo.src;
  document.getElementById('lightboxTitle').textContent       = photo.title;
  document.getElementById('lightboxDescription').textContent = photo.description;
  document.getElementById('lightboxCounter').textContent     = `${activePhotoIndex + 1} / ${galleryPhotos.length}`;

  if (typeof photo.isPortrait === 'boolean') {
    viewport.classList.toggle('is-portrait', photo.isPortrait);
  } else {
    viewport.classList.remove('is-portrait');
  }
  image.onload = () => {
    const isPortrait = image.naturalWidth <= image.naturalHeight;
    photo.isPortrait = isPortrait;
    viewport.classList.toggle('is-portrait', isPortrait);
  };
}

function openLightbox(index, triggerEl) {
  const lightbox = document.getElementById('galleryLightbox');
  lastFocusedGalleryEl = triggerEl || document.activeElement;
  lightbox.hidden = false;
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setLightboxPhoto(index);
  document.getElementById('lightboxClose').focus();
  const photo = galleryPhotos[index];
  if (photo) trackEvent('gallery_photo_opened', { photo_title: photo.title, photo_index: index, total_photos: galleryPhotos.length });
}

function closeLightbox() {
  const lightbox = document.getElementById('galleryLightbox');
  lightbox.hidden = true;
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (lastFocusedGalleryEl && typeof lastFocusedGalleryEl.focus === 'function') {
    lastFocusedGalleryEl.focus();
  }
}

function nextLightboxPhoto() {
  const next = (activePhotoIndex + 1) % galleryPhotos.length;
  setLightboxPhoto(next);
  const photo = galleryPhotos[next];
  if (photo) trackEvent('gallery_photo_navigated', { direction: 'next', photo_title: photo.title, photo_index: next });
}

function prevLightboxPhoto() {
  const prev = (activePhotoIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
  setLightboxPhoto(prev);
  const photo = galleryPhotos[prev];
  if (photo) trackEvent('gallery_photo_navigated', { direction: 'prev', photo_title: photo.title, photo_index: prev });
}

async function initGallery() {
  const grid = document.getElementById('galleryGrid');
  if (!grid) return;
  try {
    const response = await fetch('./static/photos/gallery.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load gallery metadata');
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Gallery metadata is not an array');
    galleryPhotos = data.map(item => ({
      ...item,
      src: `./static/photos/${item.filename}`,
      isPortrait: item.size === 'portrait' ? true : item.size === 'landscape' ? false : undefined,
    }));
    grid.innerHTML = '';
    galleryPhotos.forEach((photo, index) => grid.appendChild(makeGalleryCard(photo, index)));
    if (!galleryPhotos.length) grid.innerHTML = '<div class="gallery-empty">No photos available yet.</div>';
  } catch {
    grid.innerHTML = '<div class="gallery-empty">Gallery is temporarily unavailable.</div>';
  }
}

document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
document.getElementById('lightboxBackdrop').addEventListener('click', closeLightbox);
document.getElementById('lightboxNext').addEventListener('click', nextLightboxPhoto);
document.getElementById('lightboxPrev').addEventListener('click', prevLightboxPhoto);

document.addEventListener('keydown', event => {
  const lightbox = document.getElementById('galleryLightbox');
  if (!lightbox || lightbox.hidden) return;
  if (event.key === 'Escape')     { closeLightbox();       return; }
  if (event.key === 'ArrowRight') { nextLightboxPhoto();   return; }
  if (event.key === 'ArrowLeft')  { prevLightboxPhoto(); }
});

// ── FAQ accordion ──────────────────────────────────────────────
const faqs = [
  { q: 'What types of flooring do you supply and install?', a: 'We supply and install hardwood (Spotted Gum, Blackbutt, Jarrah and more), engineered timber, hybrid, and laminate flooring. We also do parquetry, pre-finished floors, decking, and stair treads.' },
  { q: 'Do you service all of NSW?', a: 'Yes — we service Sydney and surrounding NSW regions including Parramatta, Liverpool, Campbelltown, Penrith, Cronulla, Wollongong, and beyond. Call us to check your area.' },
  { q: 'Do you offer free on-site quotes?', a: "Absolutely. We always quote on-site so we can properly assess the subfloor, measure accurately, and give you a price that reflects the actual job. There's no cost or obligation." },
  { q: 'Do you remove existing flooring before installation?', a: 'Yes. We offer complete old floor removal — carpet, or timber — and prepare the subfloor for your new installation. This includes levelling and repair work where needed.' },
  { q: 'How long does a typical installation take?', a: "A standard room (20–30 m²) typically takes one day. A full home (100–200 m²) is usually 2–4 days depending on flooring type and prep required. We'll give you a timeline when we quote." },
  { q: 'Can you sand and refinish my existing timber floors?', a: "Yes. Floor sanding and coating is one of our core services. It's often the most cost-effective way to restore tired or scratched floors without replacing them entirely." },
  { q: 'Which flooring is best for pets and kids?', a: "Hybrid flooring is our top recommendation for pet and kid households — it's 100% waterproof, extremely scratch resistant (AC4–AC5 wear ratings), and easy to clean." },
];

const faqList = document.getElementById('faqList');
faqs.forEach((item, i) => {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'background:rgba(255,255,255,0.05);border-radius:0.4rem;overflow:hidden;border:1px solid rgba(255,255,255,0.08)';
  wrap.innerHTML = `
    <button onclick="toggleFaq(${i})" style="width:100%;text-align:left;padding:1.25rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;background:none;border:none;cursor:pointer" aria-expanded="false" id="faqBtn${i}">
      <span style="font-family:Inter,sans-serif;font-weight:500;color:#F5EFE4;font-size:0.92rem">${item.q}</span>
      <span id="faqIcon${i}" style="flex-shrink:0;color:#C8873A;font-size:1.2rem;transition:transform 0.3s">+</span>
    </button>
    <div id="faqAnswer${i}" style="max-height:0;overflow:hidden;transition:max-height 0.35s ease">
      <p style="padding:0 1.25rem 1.25rem;font-family:Inter,sans-serif;color:rgba(245,239,228,0.55);font-size:0.875rem;line-height:1.65">${item.a}</p>
    </div>
  `;
  faqList.appendChild(wrap);
});

function toggleFaq(i) {
  const answer = document.getElementById('faqAnswer' + i);
  const icon   = document.getElementById('faqIcon' + i);
  const btn    = document.getElementById('faqBtn' + i);
  const isOpen = answer.style.maxHeight !== '0px' && answer.style.maxHeight !== '';
  faqs.forEach((_, j) => {
    document.getElementById('faqAnswer' + j).style.maxHeight = '0px';
    document.getElementById('faqIcon'   + j).textContent = '+';
    document.getElementById('faqIcon'   + j).style.transform = 'rotate(0deg)';
    document.getElementById('faqBtn'    + j).setAttribute('aria-expanded', 'false');
  });
  if (!isOpen) {
    answer.style.maxHeight = answer.scrollHeight + 'px';
    icon.textContent = '−';
    btn.setAttribute('aria-expanded', 'true');
    trackEvent('faq_opened', { question_index: i, question_text: faqs[i].q.substring(0, 80) });
  }
}

// ── DOMContentLoaded ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initGallery();

  const ua        = navigator.userAgent || navigator.vendor || window.opera;
  const isAndroid = /android/i.test(ua);
  const isIOS     = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const separator = isAndroid ? '?&' : isIOS ? '&' : null;

  document.querySelectorAll('a.sms-button').forEach(link => {
    let href = link.getAttribute('href');
    if (href && href.startsWith('sms:')) {
      const bodyIndex = href.search(/[?&;]body=/);
      if (bodyIndex !== -1) {
        if (separator) {
          const phoneNumber = href.substring(0, bodyIndex);
          const bodyText    = href.substring(bodyIndex + 1);
          link.setAttribute('href', phoneNumber + separator + bodyText);
        } else {
          link.setAttribute('href', href.substring(0, bodyIndex));
        }
      }
    }
    link.addEventListener('click', () => {
      const loc = link.id === 'navTextBtn' ? 'nav_desktop'
                : link.id === 'mobileTextBtn' ? 'mobile_menu'
                : 'hero';
      trackEvent('click_sms', { location: loc });
    });
  });

  document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', () => {
      const loc = link.id === 'navCallBtn' ? 'nav_desktop'
                : link.id === 'mobileCallBtn' ? 'mobile_menu'
                : link.closest('footer') ? 'footer'
                : 'hero';
      trackEvent('click_call', { location: loc });
    });
  });
});
