/* Real-time CDP test driver for SENJA MOTOR landing page.
   Usage: node scripts/cdp-test.js <width> <height>
   Requires: chrome running with --remote-debugging-port=9222 */
const WIDTH = parseInt(process.argv[2] || '1440', 10);
const HEIGHT = parseInt(process.argv[3] || '1000', 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // Create a tab
  const created = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' }).then((r) => r.json());
  const ws = new WebSocket(created.webSocketDebuggerUrl);
  const pending = new Map();
  let msgId = 0;

  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m);
      pending.delete(m.id);
    }
  };
  await new Promise((r) => (ws.onopen = r));

  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++msgId;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.result && res.result.exceptionDetails) {
      return { __error: res.result.exceptionDetails.text + ' ' + (res.result.exceptionDetails.exception?.description || '') };
    }
    return res.result?.result?.value;
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH < 900,
  });

  const out = { test: WIDTH + 'x' + HEIGHT };

  await send('Page.navigate', { url: 'http://localhost:8080/' });
  await sleep(9000); // real time: fonts + images + JS

  // 1. Static checks
  out.overflow = await evaluate(`(function(){
    const r = document.documentElement;
    return r.scrollWidth + ' vs ' + r.clientWidth + ' -> ' + (r.scrollWidth <= r.clientWidth ? 'NO OVERFLOW' : 'OVERFLOW');
  })()`);
  out.waFloat = await evaluate(`(function(){
    const el = document.querySelector('.wa-float');
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return {display: cs.display, position: cs.position, w: Math.round(r.width), h: Math.round(r.height), bottom: cs.bottom, right: cs.right};
  })()`);
  out.nav = await evaluate(`({
    links: getComputedStyle(document.querySelector('.nav-links')).display,
    cta: getComputedStyle(document.querySelector('.nav-cta')).display,
    toggle: getComputedStyle(document.getElementById('navToggle')).display
  })`);
  out.heroFont = await evaluate(`getComputedStyle(document.querySelector('.hero-title')).fontFamily.split(',')[0]`);
  out.waLinks = await evaluate(`document.querySelectorAll('[data-wa]').length`);

  // 2. Scroll to trust bar (real), wait for counters
  await evaluate(`window.scrollTo({top: document.getElementById('statistik').offsetTop - 120, behavior: 'instant'})`);
  await sleep(2600);
  out.counters = await evaluate(`Array.from(document.querySelectorAll('.counter')).map(c => c.textContent)`);
  out.navbarScrolled = await evaluate(`document.getElementById('navbar').classList.contains('scrolled')`);
  out.revealVisible = await evaluate(`document.querySelectorAll('.reveal.visible').length`);

  // 3. FAQ open/close with real transitions
  out.faqBefore = await evaluate(`Math.round(document.querySelector('.acc-panel').getBoundingClientRect().height)`);
  await evaluate(`document.querySelector('.acc-btn').click()`);
  await sleep(700);
  out.faqOpen = await evaluate(`(function(){
    const p = document.querySelector('.acc-panel');
    const inner = document.querySelector('.acc-panel-inner');
    return {open: document.querySelector('.acc-item').classList.contains('open'),
            h: Math.round(p.getBoundingClientRect().height),
            textVisible: inner.getBoundingClientRect().height > 40,
            textColor: getComputedStyle(inner).color};
  })()`);
  await evaluate(`document.querySelector('.acc-btn').click()`);
  await sleep(700);
  out.faqClosedAgain = await evaluate(`Math.round(document.querySelector('.acc-panel').getBoundingClientRect().height)`);

  // 4. Lightbox
  await evaluate(`document.querySelectorAll('.gallery-item')[2].click()`);
  await sleep(500);
  out.lightbox = await evaluate(`(function(){
    const lb = document.getElementById('lightbox');
    return {open: lb.classList.contains('open'),
            caption: document.querySelector('.lb-figure figcaption').textContent,
            imgH: Math.round(document.querySelector('.lb-figure img').getBoundingClientRect().height)};
  })()`);
  await evaluate(`document.querySelector('.lb-close').click()`);
  await sleep(300);
  out.lightboxClosed = await evaluate(`!document.getElementById('lightbox').classList.contains('open')`);

  // 5. Booking form -> WhatsApp
  out.booking = await evaluate(`(function(){
    const form = document.getElementById('bookingForm');
    const set = (id, v) => { document.getElementById(id).value = v; };
    set('f-name','Budi Test'); set('f-wa','08123456789'); set('f-vehicle','Toyota Avanza 2020');
    set('f-plate','B 1234 CDE'); set('f-service','Oil Change'); set('f-date','2026-08-20');
    set('f-time','09:30'); set('f-notes','Oli cepat kotor');
    window.__wa = '';
    const orig = window.open;
    window.open = (u) => { window.__wa = u; return null; };
    form.requestSubmit();
    const url = window.__wa;
    window.open = orig;
    return {url: url.slice(0, 120),
            hasAll: url.includes('Budi%20Test') && url.includes('08123456789') && url.includes('Oil%20Change')};
  })()`);

  // 6. Mobile menu if applicable
  if (WIDTH < 900) {
    await evaluate(`document.getElementById('navToggle').click()`);
    await sleep(400);
    out.mobileMenu = await evaluate(`({
      open: document.getElementById('mobileMenu').classList.contains('open'),
      links: document.querySelectorAll('.mobile-link').length,
      bodyLocked: document.body.classList.contains('menu-open')
    })`);
  }

  console.log(JSON.stringify(out, null, 1));
  ws.close();
  await fetch('http://127.0.0.1:9222/json/close/' + created.id);
  process.exit(0);
}

main().catch((e) => { console.error('FAIL', e); process.exit(1); });
