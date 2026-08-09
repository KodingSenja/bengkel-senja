/* Final sanity check: theme colors + core interactions after copy fixes. */
const PORT = process.argv[2] || '9222';
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
  await sleep(8000);

  const out = {};
  out.bodyBg = await ev(`getComputedStyle(document.body).backgroundColor`);
  out.bookingLead = await ev(`document.querySelector('.booking-info .lead').textContent.trim().slice(0, 60)`);
  out.aboutEyebrow = await ev(`document.querySelector('.about .eyebrow').textContent.trim()`);
  out.testi1 = await ev(`document.querySelector('.testi-quote').textContent.trim().slice(0, 50)`);
  out.faqClosed = await ev(`Math.round(document.querySelector('.acc-panel').getBoundingClientRect().height)`);
  await ev(`document.querySelector('.acc-btn').click()`);
  await sleep(700);
  out.faqOpen = await ev(`Math.round(document.querySelector('.acc-panel').getBoundingClientRect().height)`);
  out.overflow = await ev(`(function(){ const d = document.documentElement; return d.scrollWidth + ' vs ' + d.clientWidth; })()`);
  out.waBg = await ev(`getComputedStyle(document.querySelector('.wa-float')).backgroundColor`);
  out.footerMark = await ev(`getComputedStyle(document.querySelector('.footer .brand-mark')).backgroundColor`);

  console.log(JSON.stringify(out, null, 1));
  ws.close();
  await fetch(`http://127.0.0.1:${PORT}/json/close/` + created.id);
  process.exit(0);
}

main().catch((e) => { console.error('FAIL', e); process.exit(1); });
