/* Verify images, fonts, and map load in real-time Chrome via CDP.
   Scrolls through the page so lazy-loaded images load. */
const PORT = process.argv[2] || '9225';

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
  await send('Page.navigate', { url: 'http://localhost:8080/' });
  await sleep(6000);

  // Progressive scroll to load lazy images
  const pageH = await ev('document.documentElement.scrollHeight');
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    await ev(`window.scrollTo({top: ${Math.floor((pageH / steps) * i)}, behavior: 'instant'})`);
    await sleep(900);
  }
  await sleep(2500);

  const imgs = await ev(`Array.from(document.images).map(i => ({ok: i.complete && i.naturalWidth > 0, w: i.naturalWidth, src: (i.currentSrc || '').split('?')[0].split('/').pop()}))`);
  const broken = imgs.filter((i) => !i.ok);
  console.log('IMAGES total:', imgs.length, '| broken:', broken.length);
  broken.forEach((b) => console.log('  BROKEN:', b.src || '(no currentSrc)'));
  const ok = imgs.filter((i) => i.ok);
  console.log('sample loaded widths:', ok.slice(0, 6).map((i) => i.w + 'px').join(', '));

  const mapOk = await ev(`(function(){ const f = document.querySelector('.location-map iframe'); return !!f && f.getBoundingClientRect().width > 100; })()`);
  console.log('map iframe rendered:', mapOk);

  const loaded = await ev(`document.fonts.check('700 48px "Barlow Condensed"') && document.fonts.check('400 16px "Inter"')`);
  console.log('fonts loaded:', loaded);

  ws.close();
  await fetch(`http://127.0.0.1:${PORT}/json/close/` + created.id);
  process.exit(0);
}

main().catch((e) => { console.error('FAIL', e); process.exit(1); });
