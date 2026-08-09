/* Verify the light theme renders correctly (no black backgrounds, correct palettes). */
const fs = require('fs');
const PORT = process.argv[2] || '9227';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const created = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' }).then((r) => r.json());
  const ws = new WebSocket(created.webSocketDebuggerUrl);
  const pending = new Map();
  let id = 0;
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params = {}) => new Promise((res) => {
    const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params }));
  });
  const ev = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result.result.value;

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8080/' });
  await sleep(9000);

  const out = {};
  out.bodyBg = await ev(`getComputedStyle(document.body).backgroundColor`);
  out.navbarBg = await ev(`getComputedStyle(document.getElementById('navbar')).backgroundColor`);
  out.heroBg = await ev(`getComputedStyle(document.querySelector('.hero')).backgroundColor`);
  out.heroTitleColor = await ev(`getComputedStyle(document.querySelector('.hero-title')).color`);
  out.trustBarBg = await ev(`getComputedStyle(document.querySelector('.trust-bar')).backgroundColor`);
  out.trustNumColor = await ev(`getComputedStyle(document.querySelector('.trust-num .counter')).color`);
  out.servicesBg = await ev(`getComputedStyle(document.getElementById('layanan')).backgroundColor`);
  out.serviceIconColor = await ev(`getComputedStyle(document.querySelector('.service-icon')).color`);
  out.packagesBg = await ev(`getComputedStyle(document.getElementById('paket')).backgroundColor`);
  out.bookingBg = await ev(`getComputedStyle(document.getElementById('booking')).backgroundColor`);
  out.bookingTitleColor = await ev(`getComputedStyle(document.querySelector('.booking-info .section-title')).color`);
  out.formBg = await ev(`getComputedStyle(document.querySelector('.booking-form')).backgroundColor`);
  out.testiBg = await ev(`getComputedStyle(document.getElementById('testimoni')).backgroundColor`);
  out.faqBg = await ev(`getComputedStyle(document.getElementById('faq')).backgroundColor`);
  out.locationBg = await ev(`getComputedStyle(document.getElementById('kontak')).backgroundColor`);
  out.ctaBg = await ev(`getComputedStyle(document.querySelector('.cta')).backgroundColor`);
  out.footerBg = await ev(`getComputedStyle(document.querySelector('.footer')).backgroundColor`);
  out.waFloatBg = await ev(`getComputedStyle(document.querySelector('.wa-float')).backgroundColor`);
  out.waFloatSize = await ev(`(function(){ const r = document.querySelector('.wa-float').getBoundingClientRect(); return r.width + 'x' + r.height; })()`);
  out.heroImageLoaded = await ev(`(function(){ const i = document.querySelector('.hero-img-wrap img'); return i.complete && i.naturalWidth > 0; })()`);
  out.heroCardVisible = await ev(`(function(){ const c = document.querySelector('.hero-card'); const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0; })()`);
  out.shapes = await ev(`document.querySelectorAll('.hero-shape, .cta-shape').length`);
  out.overflow = await ev(`(function(){ const d = document.documentElement; return d.scrollWidth + ' vs ' + d.clientWidth + ' -> ' + (d.scrollWidth <= d.clientWidth ? 'NO OVERFLOW' : 'OVERFLOW'); })()`);

  // Full page screenshot
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  fs.writeFileSync('/tmp/light_fullpage.png', Buffer.from(shot.result.data, 'base64'));
  out.fullpageBytes = fs.statSync('/tmp/light_fullpage.png').size;

  // Mobile screenshot
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: 'http://localhost:8080/' });
  await sleep(6000);
  const shot2 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync('/tmp/light_mobile.png', Buffer.from(shot2.result.data, 'base64'));
  out.mobileBytes = fs.statSync('/tmp/light_mobile.png').size;
  out.mobileOverflow = await ev(`(function(){ const d = document.documentElement; return d.scrollWidth + ' vs ' + d.clientWidth + ' -> ' + (d.scrollWidth <= d.clientWidth ? 'NO OVERFLOW' : 'OVERFLOW'); })()`);

  console.log(JSON.stringify(out, null, 1));
  ws.close();
  await fetch(`http://127.0.0.1:${PORT}/json/close/` + created.id);
  process.exit(0);
}

main().catch((e) => { console.error('FAIL', e); process.exit(1); });
