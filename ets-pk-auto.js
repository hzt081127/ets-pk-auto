// Driver for the ETS 单词PK / 词汇训练 auto-solver.
// usage: node ets-pk-auto.js install|uninstall|start|stop|status|log|learned|dry|q|watch
const fs = require('fs');
const path = require('path');
const PORT = process.env.ETS_CDP_PORT || 10086;
const VOCAB = path.join(__dirname, 'vocabulary.json');
const SRC = path.join(__dirname, 'pk-auto-inject.js');

async function pageTarget() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  return list.find(t => t.type === 'page') || list[0];
}

function evalIn(wsUrl, expression, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timer = setTimeout(() => { try { ws.close(); } catch (e) {} reject(new Error('timeout')); }, timeoutMs);
    ws.onopen = () => ws.send(JSON.stringify({
      id: 1, method: 'Runtime.evaluate',
      params: { expression, returnByValue: true, awaitPromise: true, userGesture: true }
    }));
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.id === 1) { clearTimeout(timer); ws.close(); resolve(m); }
    };
    ws.onerror = (e) => { clearTimeout(timer); reject(new Error('ws error: ' + (e && e.message))); };
  });
}

const CLEAN_BODY = `
  try { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F9', bubbles: true, cancelable: true })); } catch (e) {}
  try { if (window.__etsAuto && window.__etsAuto.kill) window.__etsAuto.kill(); } catch (e) {}
  const hudOld = document.getElementById('__ets_hud'); if (hudOld) hudOld.remove();
  window.__etsAuto = null;
`;
const CLEAN = `(() => {${CLEAN_BODY}  return 'cleaned';
})()`;

function installExpr() {
  const vocab = fs.readFileSync(VOCAB, 'utf8');
  const src = fs.readFileSync(SRC, 'utf8');
  return `(() => {${CLEAN_BODY}  window.__PK_VOCAB__ = ${vocab};
  window.__etsAuto = (${src})();
  return JSON.stringify({ ok: true, dict: window.__etsAuto.status().dictSize });
})()`;
}

function report(r) {
  if (r && r.result && r.result.exceptionDetails) {
    console.error('JS EXCEPTION:\n' + JSON.stringify(r.result.exceptionDetails, null, 1).slice(0, 2000));
    return false;
  }
  const v = r && r.result && r.result.result ? r.result.result.value : undefined;
  const out = typeof v === 'string' ? v : JSON.stringify(v, null, 1);
  console.log(out.replace(/[^\x00-\x7F]/g, '?').slice(0, 4000));
  return true;
}

(async () => {
  const cmd = process.argv[2] || 'status';

  if (cmd === 'watch') {
    console.log('守护模式已启动：自动注入，Ctrl+C 或关闭窗口退出');
    let last = null;
    for (;;) {
      try {
        const p = await pageTarget();
        if (!p) { console.log('[' + new Date().toLocaleTimeString() + '] 未找到客户端页面…'); }
        else {
          const has = await evalIn(p.webSocketDebuggerUrl, `JSON.stringify({inst: !!window.__etsAuto, hash: location.hash})`, 10000);
          const v = has && has.result && has.result.result ? has.result.result.value : null;
          let info = null; try { info = JSON.parse(v); } catch (e) {}
          if (!info || !info.inst) {
            const r = await evalIn(p.webSocketDebuggerUrl, installExpr(), 60000);
            console.log('[' + new Date().toLocaleTimeString() + '] 已注入 -> ' + (info ? info.hash : '?'));
          } else if (info.hash !== last) {
            console.log('[' + new Date().toLocaleTimeString() + '] 页面: ' + info.hash);
          }
          last = info ? info.hash : null;
        }
      } catch (e) { console.log('[' + new Date().toLocaleTimeString() + '] 连接异常: ' + e.message); }
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const p = await pageTarget();
  if (!p) { console.error('未找到客户端页面（请先打开 讯飞E听说）'); process.exit(1); }

  let expr;
  switch (cmd) {
    case 'install': expr = installExpr(); break;
    case 'uninstall': expr = CLEAN; break;
    case 'toggle': expr = `(() => { if (!window.__etsAuto) return JSON.stringify({err:'NOT INSTALLED'}); const s = window.__etsAuto.status(); if (s.enabled) { window.__etsAuto.stop(); return JSON.stringify({now:'paused'}); } window.__etsAuto.start(); return JSON.stringify({now:'started'}); })()`; break;
    case 'start': expr = `window.__etsAuto ? (window.__etsAuto.start(), 'started') : 'NOT INSTALLED'`; break;
    case 'stop': expr = `window.__etsAuto ? (window.__etsAuto.stop(), 'stopped') : 'NOT INSTALLED'`; break;
    case 'status': expr = `JSON.stringify(window.__etsAuto ? window.__etsAuto.status() : {installed:false}, null, 1)`; break;
    case 'log': expr = `JSON.stringify(window.__etsAuto ? window.__etsAuto.log() : [], null, 1)`; break;
    case 'learned': expr = `JSON.stringify(window.__etsAuto ? window.__etsAuto.learned() : {}, null, 1)`; break;
    case 'dry': expr = `JSON.stringify(window.__etsAuto ? window.__etsAuto.test() : null, null, 1)`; break;
    case 'q': expr = `JSON.stringify({hash:location.hash, title:(document.querySelector('.question-title')||document.querySelector('.container-title')||{}).innerText, items:[...document.querySelectorAll('.select-item')].map(e=>e.innerText.trim())}, null, 1)`; break;
    default: console.error('unknown cmd: ' + cmd); process.exit(1);
  }

  const r = await evalIn(p.webSocketDebuggerUrl, expr);
  if (cmd === 'toggle') {
    const v = r && r.result && r.result.result ? r.result.result.value : '';
    if (String(v).includes('started')) console.log('>>> 已开始自动答题');
    else if (String(v).includes('paused')) console.log('>>> 已暂停');
    else console.log('>>> ' + v + '（先在客户端里进到题目页面，再双击本文件）');
    process.exit(0);
  }
  fs.writeFileSync(path.join(__dirname, 'pk-out.txt'), JSON.stringify(r && r.result && r.result.result ? r.result.result.value : r, null, 1), 'utf8');
  report(r);
})().catch(e => { console.error('ERR ' + e.message); process.exit(1); });
