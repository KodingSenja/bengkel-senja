/* ============================================================
   SENJA MOTOR — Interaktif
   ============================================================ */
(() => {
  'use strict';

  /* ----------------------------------------------------------
   * Konfigurasi — GANTI dengan nomor WhatsApp bengkel asli
   * Format: kode negara + nomor tanpa +, spasi, atau tanda hubung
   * ---------------------------------------------------------- */
  const WA_NUMBER = '6281234567890';
  const WA_MSG = 'Hallo Senja Motor, saya ingin booking service.';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ----------------------------------------------------------
   * WhatsApp links — semua elemen [data-wa] otomatis diisi href
   * ---------------------------------------------------------- */
  function waLink(message) {
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
  }

  $$('[data-wa]').forEach((el) => {
    el.href = waLink(el.dataset.waText || WA_MSG);
    el.target = '_blank';
    el.rel = 'noopener';
  });

  /* ----------------------------------------------------------
   * Navbar — berubah saat scroll + scrollspy
   * ---------------------------------------------------------- */
  const navbar = $('#navbar');
  // Hanya section yang punya menu navigasi
  const navIds = ['home', 'tentang', 'layanan', 'paket', 'galeri', 'testimoni', 'faq', 'kontak'];

  function onScroll() {
    navbar.classList.toggle('scrolled', window.scrollY > 30);

    const pos = window.scrollY + window.innerHeight * 0.35;
    let current = navIds[0];
    navIds.forEach((id) => {
      const sec = document.getElementById(id);
      if (sec && pos >= sec.offsetTop) current = id;
    });
    // Bagian terakhir (CTA) mengaktifkan Kontak
    const footerTop = document.querySelector('.footer').offsetTop;
    if (window.scrollY + window.innerHeight >= footerTop) current = 'kontak';

    $$('.nav-link').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ----------------------------------------------------------
   * Mobile menu
   * ---------------------------------------------------------- */
  const navToggle = $('#navToggle');
  const mobileMenu = $('#mobileMenu');

  function setMenu(open) {
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Tutup menu navigasi' : 'Buka menu navigasi');
    mobileMenu.classList.toggle('open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('menu-open', open);
  }

  navToggle.addEventListener('click', () => {
    setMenu(navToggle.getAttribute('aria-expanded') !== 'true');
  });

  $$('.mobile-link, .mobile-cta').forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setMenu(false);
      closeLightbox();
    }
  });

  /* ----------------------------------------------------------
   * Reveal on scroll
   * ---------------------------------------------------------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  $$('.reveal').forEach((el) => revealObserver.observe(el));

  /* ----------------------------------------------------------
   * Counter animation
   * ---------------------------------------------------------- */
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const duration = 1600;
        const start = performance.now();

        function tick(now) {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const value = target * eased;
          el.textContent = decimals ? value.toFixed(decimals) : Math.round(value).toLocaleString('id-ID');
          if (progress < 1) requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
        counterObserver.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );

  $$('.counter').forEach((el) => counterObserver.observe(el));

  /* ----------------------------------------------------------
   * Booking form → WhatsApp
   * ---------------------------------------------------------- */
  const bookingForm = $('#bookingForm');
  const dateInput = $('#f-date');
  const timeInput = $('#f-time');

  // Tanggal minimum: hari ini (berdasarkan zona waktu lokal)
  const today = new Date();
  dateInput.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Set jam default (08:00) dan validasi jam operasional
  timeInput.value = '08:00';
  timeInput.min = '08:00';
  timeInput.max = '18:00';

  // Validasi sederhana: tandai field required yang kosong
  function markInvalid(field, invalid) {
    field.classList.toggle('invalid', invalid);
  }

  function validate() {
    let valid = true;
    $$('input[required], select[required]', bookingForm).forEach((field) => {
      const empty = !field.value.trim();
      markInvalid(field, empty);
      if (empty) valid = false;
    });
    return valid;
  }

  $$('input, select, textarea', bookingForm).forEach((field) => {
    field.addEventListener('input', () => markInvalid(field, false));
    field.addEventListener('change', () => markInvalid(field, false));
  });

  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) {
      const firstInvalid = $('.invalid', bookingForm);
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const val = (id) => ($(id).value || '').trim();
    const rows = [
      `Hallo Senja Motor, saya ingin booking service.`,
      '',
      `👤 Nama: ${val('#f-name')}`,
      `📱 No. WhatsApp: ${val('#f-wa')}`,
      `🚗 Jenis Kendaraan: ${val('#f-vehicle')}`,
      `🔢 Nomor Polisi: ${val('#f-plate') || '-'}`,
      `🔧 Jenis Service: ${val('#f-service')}`,
      `📅 Tanggal: ${val('#f-date')}`,
      `⏰ Jam: ${val('#f-time') || '-'}`,
      `📝 Catatan: ${val('#f-notes') || '-'}`,
    ];

    window.open(waLink(rows.join('\n')), '_blank', 'noopener');
  });

  /* ----------------------------------------------------------
   * Gallery lightbox
   * ---------------------------------------------------------- */
  const lightbox = $('#lightbox');
  const lbImage = $('.lb-figure img', lightbox);
  const lbCaption = $('.lb-figure figcaption', lightbox);
  const galleryItems = $$('.gallery-item');
  const lightboxItems = galleryItems.map((item) => ({
    src: item.querySelector('img').src,
    alt: item.querySelector('img').alt,
    caption: item.querySelector('figcaption').textContent,
  }));
  const total = lightboxItems.length;
  let currentIndex = 0;

  function openLightbox(index) {
    currentIndex = (index + total) % total;
    const item = lightboxItems[currentIndex];
    lbImage.src = item.src;
    lbImage.alt = item.alt;
    lbCaption.textContent = `${item.caption} — ${currentIndex + 1}/${total}`;
    lightbox.classList.add('open');
    document.body.classList.add('lb-open');
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.classList.remove('lb-open');
  }

  function stepLightbox(dir) {
    openLightbox(currentIndex + dir);
  }

  galleryItems.forEach((item, i) => {
    // Akses keyboard: item galeri bisa difokuskan & dibuka dengan Enter/Spasi
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `Buka gambar: ${item.querySelector('figcaption').textContent}`);
    item.addEventListener('click', () => openLightbox(i));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(i);
      }
    });
  });

  $('.lb-close', lightbox).addEventListener('click', closeLightbox);
  $('.lb-prev', lightbox).addEventListener('click', (e) => {
    e.stopPropagation();
    stepLightbox(-1);
  });
  $('.lb-next', lightbox).addEventListener('click', (e) => {
    e.stopPropagation();
    stepLightbox(1);
  });

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'ArrowLeft') stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
  });

  /* ----------------------------------------------------------
   * FAQ accordion
   * ---------------------------------------------------------- */
  $$('.acc-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isOpen = item.classList.contains('open');

      $$('.acc-item').forEach((other) => {
        other.classList.remove('open');
        $('.acc-btn', other).setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ----------------------------------------------------------
   * Footer tahun otomatis
   * ---------------------------------------------------------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
