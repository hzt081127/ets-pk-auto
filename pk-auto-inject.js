() => {
  const V = window.__PK_VOCAB__ || [];
  const KEY = '__ets_pk_learned_v1';

  const norm = (s) => (s || '').normalize('NFKC')
    .replace(/[\s\u3000()（）\[\]【】{};；,，.。、:：'"“”‘’!！?？\-—–_/\\|]/g, '')
    .toLowerCase();

  const dict = new Map();          // word(lower) -> definition string
  const wordsByDef = new Map();    // norm(def) -> word
  for (const e of V) {
    const w = (e.english || '').toLowerCase().trim();
    if (!w) continue;
    const d = (e.meanings || []).map(m => (m.pos || '') + (m.chinese || '')).join('');
    dict.set(w, (dict.get(w) || '') + d);
    wordsByDef.set(norm(d), w);
  }

  let learned = {};
  try { learned = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { learned = {}; }
  const saveLearned = () => { try { localStorage.setItem(KEY, JSON.stringify(learned)); } catch (e) {} };

  function bigrams(s) { const g = new Set(); for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2)); return g; }
  function sim(a, b) {
    a = norm(a); b = norm(b);
    if (!a || !b) return 0;
    if (a === b) return 1;
    const A = bigrams(a), B = bigrams(b);
    let inter = 0; for (const g of A) if (B.has(g)) inter++;
    const dice = (2 * inter) / ((A.size + B.size) || 1);
    const sa = new Set(a), sb = new Set(b);
    let ci = 0; for (const c of sa) if (sb.has(c)) ci++;
    const jac = ci / ((sa.size + sb.size - ci) || 1);
    const contain = (a.includes(b) || b.includes(a)) ? 0.12 : 0;
    return dice * 0.6 + jac * 0.4 + contain;
  }
  const isLatin = (s) => /^[\x20-\x7E]+$/.test((s || '').trim());

  function defOf(word) {
    const w = (word || '').toLowerCase().trim();
    if (dict.has(w)) return dict.get(w);
    let best = null, bs = 0.72;
    for (const k of dict.keys()) { const s = sim(w, k); if (s > bs) { bs = s; best = k; } }
    return best ? dict.get(best) : null;
  }

  function readQuestion() {
    // 兼容两种作业页：单词PK(#/pk) 用 .question-title；词汇训练(#/homeworkWordQuestion) 用 .container-title
    const t = document.querySelector('.question-title') || document.querySelector('.container-title');
    const items = [...document.querySelectorAll('.select-item')];
    if (!t || items.length !== 4) return null;
    const title = (t.innerText || '').trim();
    const texts = items.map(e => {
      const c = e.querySelector('.select-item-content') || e.querySelector('.select-item-title');
      return ((c ? c.innerText : e.innerText) || '').trim();
    });
    if (!title || texts.some(x => !x)) return null;
    return { title, texts, items };
  }

  function rank(q) {
    const latinOpts = q.texts.filter(isLatin).length;
    const titleLatin = isLatin(q.title);
    const mode = (latinOpts >= 3 && !titleLatin) ? 'C2E' : 'E2C';
    let scores = q.texts.map(() => 0);

    // learned override (question text -> the option that once turned green)
    const learnedHit = learned[norm(q.title)];

    if (mode === 'C2E') {
      // title = 中文释义, options = 英文单词
      scores = q.texts.map(w => { const d = defOf(w); return d ? sim(q.title, d) : 0; });
    } else {
      // title = 英文单词, options = 中文释义
      const d = defOf(q.title);
      scores = q.texts.map(o => d ? sim(d, o) : sim(q.title, o));
    }

    if (learnedHit) {
      const idx = q.texts.findIndex(t => norm(t) === learnedHit);
      if (idx >= 0) scores[idx] = Math.max(scores[idx], 1.5);
    }

    const order = scores.map((s, i) => ({ i, s })).sort((a, b) => b.s - a.s);
    return { mode, scores, order, pick: order[0].i, second: order[1].i };
  }

  function statusOf(el) {
    let vals = (el.style.borderColor || '') + ' ' + (el.style.backgroundColor || '');
    try {
      const cs = getComputedStyle(el);
      vals += ' ' + cs.borderColor + ' ' + cs.backgroundColor + ' ' + cs.color;
    } catch (e) {}
    for (const m of vals.matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)) {
      const r = +m[1], g = +m[2], b = +m[3];
      if (g > 150 && g - r > 40 && g - b > 30) return 'right';   // 绿
      if (r > 150 && r - g > 40 && r - b > 40) return 'wrong';   // 红
    }
    return 'none';
  }

  function fire(el) {
    const r = el.getBoundingClientRect();
    const o = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, view: window };
    try { el.dispatchEvent(new PointerEvent('pointerdown', o)); } catch (e) {}
    el.dispatchEvent(new MouseEvent('mousedown', o));
    try { el.dispatchEvent(new PointerEvent('pointerup', o)); } catch (e) {}
    el.dispatchEvent(new MouseEvent('mouseup', o));
    el.dispatchEvent(new MouseEvent('click', o));
  }

  const S = { enabled: false, key: '', tried: [], cur: null, log: [] };

  function hud(msg) {
    let h = document.getElementById('__ets_hud');
    if (!h) {
      h = document.createElement('div');
      h.id = '__ets_hud';
      h.style.cssText = 'position:fixed;left:10px;bottom:10px;z-index:2147483647;background:rgba(0,0,0,.75);color:#7CFC9A;font:12px/1.6 Consolas,monospace;padding:8px 12px;border-radius:10px;white-space:pre;pointer-events:none;max-width:640px';
      document.body.appendChild(h);
    }
    h.textContent = '塔菲PK脚本 ' + (S.enabled ? '[运行中]' : '[已暂停]') + '\n' + msg + '\nF8=开始/暂停  F9=退出';
  }

  function tick() {
    if (!S.enabled) return;
    const q = readQuestion();
    if (!q) { hud('等待题目…'); return; }
    const key = q.title + '|' + q.texts.join('|');

    if (key !== S.key) {
      S.key = key; S.tried = [];
      const r = rank(q);
      S.cur = { q, r };
      S.tried.push(r.pick);
      fire(q.items[r.pick]);
      S.log.push({ t: Date.now(), mode: r.mode, title: q.title.slice(0, 40), pick: q.texts[r.pick].slice(0, 30), conf: +r.scores[r.pick].toFixed(3), alt: q.texts[r.second].slice(0, 30), conf2: +r.scores[r.second].toFixed(3) });
      hud('模式 ' + r.mode + '  选 #' + r.pick + ' (' + r.scores[r.pick].toFixed(2) + ')');
      return;
    }

    const lastIdx = S.tried[S.tried.length - 1];
    const st = statusOf(q.items[lastIdx]);
    if (st === 'right') {
      learned[norm(q.title)] = norm(q.texts[lastIdx]);
      saveLearned();
      hud('答对 ✓ 等系统切题（已学习 ' + Object.keys(learned).length + ' 条）');
      return;
    }
    if (st === 'wrong') {
      if (S.tried.length < 2) {
        const nx = S.cur.r.order.find(x => !S.tried.includes(x.i));
        const q2 = readQuestion();
        const sameQ = q2 && (q2.title + '|' + q2.texts.join('|')) === S.key;
        if (nx && sameQ) {
          S.tried.push(nx.i);
          fire(q2.items[nx.i]);
          S.log.push({ t: Date.now(), retry: true, pick: q.texts[nx.i].slice(0, 30), conf: +S.cur.r.scores[nx.i].toFixed(3) });
          hud('第一次错 → 补第二次 #' + nx.i);
          return;
        }
      }
      hud('两次已用完，等系统切题');
      return;
    }
    hud('模式 ' + S.cur.r.mode + '  已点 #' + lastIdx + '，等判定…');
  }

  const timer = setInterval(() => { try { tick(); } catch (e) { hud('err ' + e.message); } }, 90);

  function killSelf() {
    S.enabled = false;
    try { clearInterval(timer); } catch (e) {}
    try { document.removeEventListener('keydown', onKey, true); } catch (e) {}
    const h = document.getElementById('__ets_hud'); if (h) h.remove();
    if (window.__etsAuto === API) window.__etsAuto = null;
  }

  function onKey(e) {
    if (e.key === 'F8') { S.enabled = !S.enabled; S.key = ''; S.tried = []; hud(S.enabled ? '已启动' : '已暂停'); e.preventDefault(); e.stopPropagation(); }
    if (e.key === 'F9') { killSelf(); e.preventDefault(); e.stopPropagation(); }
  }
  document.addEventListener('keydown', onKey, true);

  S.enabled = false;
  hud('就绪，按 F8 开始');

  const API = {
    kill: killSelf,
    start() { S.enabled = true; S.key = ''; S.tried = []; hud('已启动'); return true; },
    stop() { S.enabled = false; hud('已暂停'); return true; },
    status() { return { enabled: S.enabled, dictSize: dict.size, learned: Object.keys(learned).length, last: S.log.slice(-6) }; },
    log() { return S.log; },
    learned() { return learned; },
    test() {
      const q = readQuestion();
      if (!q) return { noQuestion: true };
      const r = rank(q);
      return { title: q.title, texts: q.texts, mode: r.mode, scores: r.scores.map(s => +s.toFixed(3)), pick: r.pick, pickText: q.texts[r.pick] };
    }
  };
  return API;
}
