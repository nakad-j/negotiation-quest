/* 画面とインタラクション */
(function () {
  'use strict';
  const E = window.NQ;
  const S = window.STORY;
  const app = document.getElementById('app');

  let st = null; // エンジンの状態
  let visitsLeft = 3;
  let visited = [];
  let busy = false; // 文章の表示中
  let tab = 'cards';
  let newCards = {};
  let panel = { name: 'main' };
  let lastMood = '';

  // ---------------------------------------------------------------- 小道具

  function h(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'class') n.className = attrs[k];
        else if (k === 'html') n.innerHTML = attrs[k];
        else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
        else if (k === 'disabled') { if (attrs[k]) n.disabled = true; }
        else n.setAttribute(k, attrs[k]);
      }
    }
    kids.flat().forEach((c) => { if (c == null || c === false) return; n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function clear() { app.innerHTML = ''; }
  function toast(text, kind) {
    const t = h('div', { class: 'toast ' + (kind || '') }, text);
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
  function gainCard(id) {
    if (E.has(st, id)) return;
    E.addCard(st, id);
    newCards[id] = true;
    toast('手帳に追加：【' + E.CARDS[id].name + '】');
  }

  // ---------------------------------------------------------------- 会話の再生

  // lines を順に表示し、最後に choices を出す。choices が空なら onDone
  function dialogue(bg, label, lines, choices, onDone) {
    clear();
    const who = h('div', { class: 'who' });
    const text = h('div', { class: 'text' });
    const hint = h('div', { class: 'hint' }, 'クリックで進む ▼');
    const box = h('div', { class: 'dbox' }, who, text, hint);
    const ch = h('div', { class: 'choices' });
    const scene = h('div', { class: 'scene ' + bg }, label ? h('div', { class: 'scene-label' }, label) : null, box, ch);
    app.appendChild(scene);
    let i = -1;
    function next() {
      i += 1;
      if (i >= lines.length) { finish(); return; }
      const L = lines[i];
      who.textContent = S.SPEAKERS[L.who] || '';
      text.textContent = L.text;
      text.className = 'text' + (L.who === 'narr' ? ' narr' : '');
      if (L.card) gainCard(L.card);
    }
    function finish() {
      scene.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      if (choices && choices.length) {
        hint.style.display = 'none';
        choices.forEach((c) => ch.appendChild(h('button', { class: 'choice', onclick: (ev) => { ev.stopPropagation(); c.fn(); } }, c.text, c.sub ? h('small', null, c.sub) : null)));
      } else if (onDone) onDone();
    }
    function onClick(ev) { if (ev.target.closest('.choice')) return; next(); }
    function onKey(ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); next(); } }
    scene.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    if (!lines.length) finish(); else next();
  }

  // ---------------------------------------------------------------- タイトル

  function title() {
    clear();
    app.appendChild(h('div', { class: 'title' },
      h('h1', null, 'Negotiation Quest'),
      h('h2', null, '三日の勅命'),
      h('p', null, '剣は抜かない。王の言葉の裏を読み、旅の条件を勝ち取れ。'),
      h('button', { class: 'btn-main', onclick: start }, 'はじめる'),
      h('div', { class: 'note' }, 'デジタル試作 v1 ／ 所要 15〜20分 ／ クリックまたは Enter で文章を進めます')));
  }

  function start() {
    st = E.newState();
    visitsLeft = 3; visited = []; newCards = {}; tab = 'cards'; panel = { name: 'main' };
    dialogue('bg-dawn', '序', S.INTRO, null, () =>
      dialogue('bg-home', '自宅', S.HOME, null, () =>
        dialogue('bg-throne', '玉座の間 — 第一幕', S.ACT1, null, hub)));
  }

  // ---------------------------------------------------------------- 城の探索

  function hub() {
    clear();
    const locs = S.LOCATIONS.map((L) => {
      const done = visited.indexOf(L.id) >= 0;
      return h('button', { class: 'loc' + (done ? ' done' : ''), disabled: done || visitsLeft <= 0, onclick: () => visit(L) },
        h('h3', null, L.place), h('div', { class: 'npc' }, S.SPEAKERS[L.npc]),
        h('div', { class: 'rumor' }, done ? '（話を聞いた）' : '噂：' + L.rumor));
    });
    app.appendChild(h('div', { class: 'hub' },
      h('h2', null, '王城'),
      h('div', { class: 'sub' }, visitsLeft > 0 ? '正午の鐘まで、あと ' + visitsLeft + ' か所回れる。' : '正午の鐘が近い。玉座の間へ向かおう。'),
      h('div', { class: 'locs' }, locs),
      h('div', { class: 'hub-actions' },
        h('button', { class: visitsLeft > 0 ? 'btn-sub' : 'btn-main', onclick: noon }, visitsLeft > 0 ? 'このまま玉座の間へ' : '玉座の間へ（正午）'),
        h('button', { class: 'btn-sub', onclick: notebookModal }, '手帳を見る（' + st.cards.length + '）'))));
  }

  function visit(L) {
    visitsLeft -= 1;
    visited.push(L.id);
    const back = { text: '広間へ戻る', fn: hub };
    dialogue('bg-castle', L.place, L.intro, [{
      text: L.first.text, fn: () => {
        const lines = L.first.lines.map((x, i) => Object.assign({}, x, i === L.first.lines.length - 1 ? { card: L.first.card } : {}));
        dialogue('bg-castle', L.place, lines, L.follow.map((f) => ({
          text: f.text, fn: () => {
            const fl = f.lines.map((x, i) => Object.assign({}, x, i === f.lines.length - 1 && f.card ? { card: f.card } : {}));
            dialogue('bg-castle', L.place, fl, [back]);
          },
        })).concat([back]));
      },
    }, back]);
  }

  function notebookModal() {
    const m = h('div', { class: 'modal', onclick: (ev) => { if (ev.target === m) m.remove(); } },
      h('div', { class: 'mbody' }, h('div', { class: 'panel-title' }, '手帳', h('button', { class: 'back', onclick: () => m.remove() }, '閉じる ✕')), cardList()));
    document.body.appendChild(m);
  }

  function cardList() {
    const wrap = h('div');
    if (!st.cards.length) wrap.appendChild(h('div', null, 'まだ何もない。'));
    st.cards.slice().reverse().forEach((id) => {
      const c = E.CARDS[id];
      wrap.appendChild(h('div', { class: 'cardv ' + c.kind + (newCards[id] ? ' new' : '') }, h('b', null, (c.kind === 'honne' ? '★ ' : '') + c.name), c.text));
    });
    return wrap;
  }

  // ---------------------------------------------------------------- 交渉

  let logEl, actionsEl, sideEl, topEl, kingEl;

  function noon() {
    dialogue('bg-throne', '玉座の間 — 第二幕', S.NOON, null, negotiation);
  }

  function negotiation() {
    clear();
    topEl = h('div', { class: 'neg-top' });
    kingEl = h('div', { class: 'king' });
    logEl = h('div', { class: 'log' });
    sideEl = h('div', { class: 'side' });
    actionsEl = h('div', { class: 'actions' });
    app.appendChild(h('div', { class: 'neg' }, topEl, kingEl, logEl, sideEl, actionsEl));
    addLine({ who: 'king', text: '「そなた、なぜこの役目を受ける？」' });
    panel = { name: 'motive' };
    refresh();
  }

  function speaker(who) { return { king: 'アルダン王', minister: '大臣ヘルマン', you: 'あなた' }[who] || ''; }

  function addLine(ev) {
    let n;
    if (ev.type === 'line') {
      const sp = speaker(ev.who);
      n = h('p', { class: 'ln w-' + ev.who }, sp ? h('span', { class: 'sp' }, sp) : null, ev.text);
    } else if (ev.type === 'card') {
      newCards[ev.id] = true;
      n = h('p', { class: 'ln card' }, '手帳に追加：【' + E.CARDS[ev.id].name + '】 ' + E.CARDS[ev.id].text);
    } else if (ev.type === 'unlock') {
      n = h('p', { class: 'ln unlock' }, '✦ ' + ev.text);
    } else if (ev.type === 'patience') {
      n = h('p', { class: 'ln pat' + (ev.delta > 0 ? ' up' : '') }, ev.delta > 0 ? '王の我慢が戻った（+' + ev.delta + '）' : '王の我慢が減った（' + ev.delta + '）');
    }
    if (n) { logEl.appendChild(n); logEl.scrollTop = logEl.scrollHeight; }
  }

  // イベントを少しずつ表示する
  function play(evs) {
    busy = true;
    renderActions();
    let i = 0;
    let fast = false;
    const skip = () => { fast = true; };
    logEl.addEventListener('click', skip);
    function step() {
      if (i >= evs.length) {
        logEl.removeEventListener('click', skip);
        busy = false;
        refresh();
        return;
      }
      const ev = evs[i++];
      addLine(ev);
      if (ev.type === 'patience') renderTop(ev.delta < 0);
      if (ev.type === 'card' || ev.type === 'unlock') renderSide();
      const d = fast ? 40 : ev.type === 'line' ? Math.min(1400, 380 + ev.text.length * 14) : 350;
      setTimeout(step, d);
    }
    step();
  }

  function moodOf() {
    if (st.ended) return { cls: '', text: '' };
    const p = st.patience;
    if (p <= 1) return { cls: 'angry', text: '王は肘掛けを指で叩いている。もう後がない。' };
    if (p <= 3) return { cls: 'angry', text: '王は苛立ちを隠さない。' };
    if (st.flags.r1 || st.flags.bluffBusted || st.flags.cleverSplit) return { cls: 'pleased', text: '王はあなたを値踏みするように見ている。' };
    if (st.twist) return { cls: '', text: '王の顔は険しい。北の民のことを考えている。' };
    return { cls: '', text: '王は退屈そうに、だが注意深くあなたを見ている。' };
  }

  function portraitSVG() {
    return '<svg viewBox="0 0 190 220" width="190" height="220"><defs><linearGradient id="r" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7a2e2e"/><stop offset="1" stop-color="#3a1515"/></linearGradient></defs>' +
      '<path d="M20 220 Q30 150 95 140 Q160 150 170 220 Z" fill="url(#r)"/>' +
      '<path d="M55 205 L95 150 L135 205" fill="none" stroke="#c9a24a" stroke-width="3"/>' +
      '<ellipse cx="95" cy="98" rx="38" ry="46" fill="#d8b994"/>' +
      '<path d="M57 105 Q60 160 95 165 Q130 160 133 105 Q120 130 95 128 Q70 130 57 105 Z" fill="#9a9a9a"/>' +
      '<path d="M78 92 q8 -5 14 0 M100 92 q8 -5 14 0" stroke="#3a2a1a" stroke-width="2.5" fill="none"/>' +
      '<path d="M58 62 L64 30 L80 48 L95 22 L110 48 L126 30 L132 62 Z" fill="#c9a24a" stroke="#8a6a20" stroke-width="2"/>' +
      '<circle cx="95" cy="40" r="4" fill="#9b3b2f"/></svg>';
  }

  function renderTop(flash) {
    topEl.innerHTML = '';
    const c = h('div', { class: 'candles' });
    for (let i = 0; i < st.maxPatience; i++) {
      const lit = i < st.patience;
      c.appendChild(h('div', { class: 'candle' + (lit ? '' : ' out') + (flash && i === st.patience ? ' lost' : '') }));
    }
    topEl.appendChild(h('div', { class: 'place' }, '玉座の間'));
    topEl.appendChild(h('div', null, h('div', { class: 'candle-label' }, '王の我慢'), c));
    const tags = h('div', { class: 'status' });
    tags.appendChild(h('span', { class: 'tag' + (st.private ? '' : ' warn') }, st.private ? '二人きり' : '大臣が同席'));
    if (st.twist) tags.appendChild(h('span', { class: 'tag warn' }, '砦の糧：あと8日'));
    topEl.appendChild(tags);
  }

  function renderKing() {
    kingEl.innerHTML = '';
    const md = moodOf();
    const p = h('div', { class: 'portrait ' + md.cls, html: portraitSVG() });
    kingEl.appendChild(p);
    kingEl.appendChild(h('div', { class: 'kname' }, 'アルダン王'));
    kingEl.appendChild(h('div', { class: 'mood' }, md.text));
    kingEl.appendChild(h('div', { class: 'minister' }, st.private ? '大臣ヘルマンは退出している' : '大臣ヘルマンが脇に控え、話を聞いている'));
    const kk = st.kingKnows.map((k) => ({ aunt: '北に叔母がいる', money: '報酬で動く', honor: '名を上げたい', duty: '王命に忠実', evasive: '本心を明かさない', threat: '王を脅した' }[k])).filter(Boolean);
    if (kk.length) kingEl.appendChild(h('div', { class: 'kknows' }, '王があなたについて知ったこと：', h('br'), kk.map((x) => h('span', null, h('b', null, '・' + x), h('br')))));
  }

  function renderSide() {
    sideEl.innerHTML = '';
    const tabs = h('div', { class: 'tabs' });
    [['cards', '手帳'], ['memo', '合意メモ'], ['know', '旅の知識']].forEach(([k, l]) => tabs.appendChild(h('button', { class: tab === k ? 'on' : '', onclick: () => { tab = k; renderSide(); } }, l)));
    const body = h('div', { class: 'tabbody' });
    if (tab === 'cards') body.appendChild(cardList());
    if (tab === 'memo') body.appendChild(memo());
    if (tab === 'know') body.appendChild(knowledge());
    sideEl.appendChild(tabs);
    sideEl.appendChild(body);
  }

  function memo() {
    const w = h('div');
    const defs = { depart: '三日以内（王の条件）', supply: '銀貨二十枚（王の条件）', companion: 'なし（王の条件）', report: '早馬で報告（想定）', letter: '密書を届ける（王の条件）' };
    ['depart', 'supply', 'companion', 'report', 'letter'].concat(st.twist ? ['cart'] : []).forEach((k) => {
      const v = st.deal[k];
      w.appendChild(h('div', { class: 'memo-row' }, h('span', { class: 'k' }, E.SLOT_NAMES[k]),
        h('span', { class: 'v ' + (v ? 'set' : 'def') }, v ? E.termLabel(k, v) : (k === 'cart' ? '未定（王は荷車を求めている）' : defs[k]))));
    });
    const ex = st.deal.extras.map((x) => E.termLabel('extra', x));
    w.appendChild(h('div', { class: 'memo-row' }, h('span', { class: 'k' }, 'その他'), h('span', { class: 'v ' + (ex.length ? 'set' : 'def') }, ex.length ? ex.join('、') : '—')));
    w.appendChild(h('p', { style: 'opacity:.6;margin-top:10px' }, '何も決めずに終えると、王の条件で旅立つことになる。'));
    return w;
  }

  function knowledge() {
    const L = ['今日を0日目として数える。', '北の砦まで：徒歩3日、荷車なら5日。', '早馬：砦から王都まで3日。'];
    if (E.has(st, 'c3') || E.has(st, 'h_pigeons')) L.push('伝書鳩：砦から王都まで2日。');
    if (E.has(st, 'c2') || E.has(st, 'k1')) L.push('10日目：諸侯会議。');
    else if (E.has(st, 'h_gathering')) L.push('10日目：王の言う「ある集まり」。');
    if (st.twist) L.push('砦の糧：今日からあと8日（8日目まで）。');
    if (E.has(st, 'c1') && st.twist) L.push('北街道の町ハルデン：王都から早馬で1日、砦まで荷車で2日。');
    return h('ul', { class: 'know' }, L.map((x) => h('li', null, x)));
  }

  function refresh() {
    renderTop(false);
    renderKing();
    renderSide();
    renderActions();
  }

  function act(label, sub, fn, opts) {
    opts = opts || {};
    return h('button', { class: 'act ' + (opts.cls || ''), disabled: busy || opts.disabled, onclick: fn }, label, sub ? h('small', null, sub) : null);
  }
  function go(evs) { panel = { name: 'main' }; newCards = {}; play(evs); }

  function renderActions() {
    actionsEl.innerHTML = '';
    if (busy) { actionsEl.appendChild(h('div', { style: 'opacity:.5' }, '……（ログをクリックで早送り）')); return; }

    if (st.ended) {
      actionsEl.appendChild(h('div', { class: 'row' }, act('謁見を終える', 'その後の旅へ', ending, { cls: 'primary' })));
      return;
    }

    if (panel.name === 'motive') {
      actionsEl.appendChild(h('div', { class: 'panel-title' }, 'なぜこの役目を受けるのか、答える'));
      const r = h('div', { class: 'row' });
      E.MOTIVES.forEach((m) => r.appendChild(act(m.text, null, () => go(E.setMotive(st, m.id)))));
      actionsEl.appendChild(r);
      return;
    }

    if (st.queue.length) { renderPending(); return; }

    if (panel.name === 'main') {
      const r = h('div', { class: 'row' });
      r.appendChild(act('尋ねる', '王に質問する（我慢−1）', () => { panel = { name: 'ask' }; renderActions(); }));
      r.appendChild(act('異を唱える', '王の言葉の裏を突く', () => { panel = { name: 'claim' }; renderActions(); }, { cls: 'primary' }));
      r.appendChild(act('提案する', '条件を出す', () => { panel = { name: 'prop', prop: { extras: [] } }; renderActions(); }, { cls: 'primary' }));
      r.appendChild(act(st.privateUses === 0 ? '人払いを願う' : '再び人払いを願う', '大臣を下がらせる', () => go(E.requestPrivate(st)), { disabled: !E.canPrivate(st) }));
      r.appendChild(act('辞退をちらつかせる', '強気に出る', () => go(E.threaten(st)), { cls: 'danger' }));
      r.appendChild(act('話をまとめる', '今の合意で謁見を終える', () => go(E.close(st))));
      actionsEl.appendChild(r);
      return;
    }

    if (panel.name === 'ask') {
      actionsEl.appendChild(title2('何を尋ねる？（王の我慢 −1）'));
      const r = h('div', { class: 'row' });
      E.QUESTIONS.filter((q) => !q.need || q.need(st)).forEach((q) => r.appendChild(act(q.text, st.asked[q.id] ? '尋ねた' : null, () => go(E.ask(st, q.id)))));
      actionsEl.appendChild(r);
      return;
    }

    if (panel.name === 'claim') {
      actionsEl.appendChild(title2('王のどの言葉に異を唱える？'));
      const r = h('div', { class: 'row' });
      st.claimsOpen.forEach((c) => r.appendChild(act(E.CLAIMS[c].text, null, () => { panel = { name: 'evidence', claim: c }; renderActions(); })));
      actionsEl.appendChild(r);
      return;
    }

    if (panel.name === 'evidence') {
      const c = panel.claim;
      actionsEl.appendChild(title2(E.CLAIMS[c].text + ' — 何を根拠に突く？', () => { panel = { name: 'claim' }; renderActions(); }));
      const r = h('div', { class: 'row' });
      st.cards.forEach((id) => {
        const card = E.CARDS[id];
        r.appendChild(act('【' + card.name + '】', card.kind === 'honne' ? '王の本音' : card.kind === 'clue' ? '王の様子' : card.kind === 'own' ? '自分の事情' : '城で聞いた話', () => pick(c, id)));
      });
      r.appendChild(act('根拠なしで、勘で言う', null, () => { panel = { name: 'hunch', claim: c }; renderActions(); }, { cls: 'danger' }));
      actionsEl.appendChild(r);
      return;
    }

    if (panel.name === 'hunch') {
      const c = panel.claim;
      actionsEl.appendChild(title2('勘で踏み込む — どう読む？', () => { panel = { name: 'evidence', claim: c }; renderActions(); }));
      const r = h('div', { class: 'row' });
      E.HUNCHES[c].forEach((x) => r.appendChild(act('「' + x.text + '」', null, () => pick(c, 'hunch:' + x.id))));
      actionsEl.appendChild(r);
      return;
    }

    if (panel.name === 'phrasing') {
      actionsEl.appendChild(title2('大臣が聞いている。どう言う？', () => { panel = { name: 'evidence', claim: panel.claim }; renderActions(); }));
      const r = h('div', { class: 'row' });
      r.appendChild(act('はっきり言う', '核心を突く', () => go(E.challenge(st, panel.claim, panel.ev, 'blunt')), { cls: 'danger' }));
      r.appendChild(act('遠回しに言う', '王の面子に配慮する', () => go(E.challenge(st, panel.claim, panel.ev, 'soft'))));
      actionsEl.appendChild(r);
      return;
    }

    if (panel.name === 'prop') { renderBuilder(); return; }
  }

  function pick(claim, ev) {
    if (E.needsPhrasing(st, claim, ev)) { panel = { name: 'phrasing', claim, ev }; renderActions(); return; }
    go(E.challenge(st, claim, ev));
  }

  function title2(t, backFn) {
    return h('div', { class: 'panel-title' }, t, h('button', { class: 'back', onclick: backFn || (() => { panel = { name: 'main' }; renderActions(); }) }, '← 戻る'));
  }

  function renderBuilder() {
    const prop = panel.prop;
    actionsEl.appendChild(title2('提案を組み立てる（変えたい項目だけ選ぶ）'));
    const slots = ['depart', 'supply', 'companion', 'report', 'letter'].concat(st.twist ? ['cart'] : []);
    slots.forEach((k) => {
      const opts = E.TERMS[k].filter((t) => !t.need || t.need(st));
      const row = h('div', { class: 'slot' }, h('div', { class: 'lbl' }, E.SLOT_NAMES[k], h('span', { class: 'now' }, st.deal[k] ? '（合意済み：' + E.termLabel(k, st.deal[k]) + '）' : '')));
      opts.forEach((t) => {
        const on = prop[k] === t.id;
        row.appendChild(h('button', { class: 'chip' + (on ? ' on' : '') + (t.need ? ' newt' : ''), onclick: () => { if (on) delete prop[k]; else prop[k] = t.id; renderActions(); } }, t.label));
      });
      actionsEl.appendChild(row);
    });
    const exRow = h('div', { class: 'slot' }, h('div', { class: 'lbl' }, '差し出すもの'));
    E.EXTRAS.forEach((x) => {
      const done = st.deal.extras.indexOf(x.id) >= 0;
      const on = prop.extras.indexOf(x.id) >= 0;
      exRow.appendChild(h('button', { class: 'chip' + (on ? ' on' : ''), disabled: done, onclick: () => { if (on) prop.extras = prop.extras.filter((y) => y !== x.id); else prop.extras.push(x.id); renderActions(); } }, x.label + (done ? '（合意済み）' : '')));
    });
    actionsEl.appendChild(exRow);
    const parts = [];
    slots.forEach((k) => { if (prop[k]) parts.push(E.termLabel(k, prop[k])); });
    prop.extras.forEach((x) => parts.push(E.termLabel('extra', x)));
    actionsEl.appendChild(h('div', { class: 'offer-prev' }, parts.length ? '提案：' + parts.join('、') : '（まだ何も選んでいない）'));
    actionsEl.appendChild(h('div', { class: 'row' }, act('この条件で提案する', null, () => {
      const p = {}; slots.forEach((k) => { if (prop[k]) p[k] = prop[k]; }); p.extras = prop.extras.slice();
      go(E.propose(st, p));
    }, { cls: 'primary', disabled: !parts.length })));
  }

  function renderPending() {
    const p = st.queue[0];
    const box = h('div', { class: 'pending' });
    const labels = {
      counter: '王の対案：' + p.text,
      credit: '王の求め：' + p.text,
      nudge: '王の求め：' + p.text,
      twist: '王の命：' + p.text,
      demand_dawn: '王の求め：' + p.text,
      oath: '王の求め：' + p.text,
      concession: '王が一つだけ譲ると言っている。何を求める？',
    };
    box.appendChild(h('div', { class: 'q' }, labels[p.kind] || p.text));
    const r = h('div', { class: 'row' });
    if (p.kind === 'concession') {
      r.appendChild(act('倉の保存食と装備', '物資', () => go(E.respond(st, true, 'store'))));
      r.appendChild(act('騎士を一人', '仲間', () => go(E.respond(st, true, 'selen'))));
      r.appendChild(act('北への地図', '道中の助け', () => go(E.respond(st, true, 'map'))));
    } else if (p.kind === 'twist') {
      r.appendChild(act('命に従う', '明朝、荷車を率いて発つ', () => go(E.respond(st, true)), { cls: 'primary' }));
      r.appendChild(act('別の手を考える', 'このまま交渉を続ける', () => go(E.respond(st, false))));
    } else {
      r.appendChild(act('受ける', null, () => go(E.respond(st, true)), { cls: 'primary' }));
      r.appendChild(act('断る', '王の我慢 −1', () => go(E.respond(st, false)), { cls: 'danger' }));
    }
    box.appendChild(r);
    actionsEl.appendChild(box);
  }

  // ---------------------------------------------------------------- 結末

  function ending() {
    const ep = E.epilogue(st);
    clear();
    const inner = h('div', { class: 'inner' });
    inner.appendChild(h('h1', null, ep.title));
    ep.paragraphs.forEach((t, i) => { const p = h('p', null, t); p.style.animationDelay = (i * 0.5) + 's'; inner.appendChild(p); });
    const dl = ep.diary.lines.length ? ep.diary.lines : ['今日も書くことは少ない。'];
    const diary = h('div', { class: 'diary' }, h('h3', null, '——王の私記より'), h('p', null, '北へ、若い旅人を送った。'), dl.map((x) => h('p', null, x)), h('p', null, ep.diary.end));
    diary.style.animation = 'fadein 1s both';
    diary.style.animationDelay = (ep.paragraphs.length * 0.5 + 0.5) + 's';
    inner.appendChild(diary);
    const r = ep.result;
    const mark = (ok, a, b) => h('div', { class: ok ? 'ok' : 'ng' }, (ok ? '✓ ' : '✗ ') + (ok ? a : b));
    const deal = [];
    ['depart', 'supply', 'companion', 'report', 'letter', 'cart'].forEach((k) => { if (r[k] && !(k === 'cart' && !r.cart)) deal.push(E.SLOT_NAMES[k] + '：' + E.termLabel(k, r[k])); });
    r.extras.forEach((x) => deal.push('その他：' + E.termLabel('extra', x)));
    inner.appendChild(h('div', { class: 'summary' },
      h('div', { class: 'box' }, h('h4', null, '旅の条件'), deal.map((x) => h('div', null, x)), r.forcedCart ? h('div', { class: 'ng' }, '※ 謁見の後、王命で荷車を率いることになった') : null),
      h('div', { class: 'box' }, h('h4', null, 'その結果'),
        mark(r.councilOk, '報せは会議に間に合った（' + r.reportDay + '日目）', '報せは会議に間に合わなかった（' + r.reportDay + '日目）'),
        mark(r.foodOk, '砦の糧は間に合った（' + r.foodDay + '日目）', '砦の糧は間に合わなかった'),
        mark(r.delay === 0, '道中、大きな遅れはなかった', '道中で' + r.delay + '日遅れた'),
        mark(r.companion === 'selen' || r.cart === 'ahead', 'セレンが力を貸した', '仲間はいなかった'),
        h('div', { class: r.relation === 'trust' ? 'ok' : r.relation === 'wary' ? 'ng' : '' }, '王との関係：' + { trust: '信頼された', neutral: 'それきり', wary: '警戒された' }[r.relation]))));
    inner.appendChild(h('div', { class: 'end-actions' },
      h('button', { class: 'btn-main', onclick: start }, 'もう一度、謁見に臨む'),
      h('button', { class: 'btn-sub', onclick: title }, 'タイトルへ')));
    app.appendChild(h('div', { class: 'ending' }, inner));
  }

  // デバッグ：?skip=neg で探索を飛ばして交渉から始める（全カード付き）
  const q = new URLSearchParams(location.search);
  if (q.get('skip') === 'neg') {
    st = E.newState();
    ['aunt', 'c1', 'c2', 'c3', 'c3x', 'c4', 'c4x', 'c5', 'c5x'].forEach((c) => E.addCard(st, c));
    negotiation();
  } else {
    title();
  }
})();
