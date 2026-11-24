// tutorial.js — はじめての交渉（チュートリアル兼・最小の実験）
// 本編（game.js）とは独立。art.js と style.css だけを共有する。
//
// 場面：リーナ一行が城に着いた夜。
//   表の要求：「今夜のうちに、魔王のところへ通して」
//   裏の事情：ボルドはずぶ濡れで膝が限界、宿代も尽きた → 今夜、仲間を休ませる場所がない
// 確かめたいこと：観察で裏の事情に気づけるか／はい・いいえ・その代わりの違い／約束が数分後に返ってくる感覚

const $ = (s) => document.querySelector(s);
const SPEED = new URLSearchParams(location.search).has('fast') ? 0.15 : 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms * SPEED));

// 品の説明：「何を与えられるか」だけを書く。相手が受け取るかどうかは書かない。
const CARD = {
  chest: { ic: '📦', nm: '宝箱', what: '城の宝。値打ちのある品を贈る。', who: '見返りや報酬を求めている相手' },
  soup: { ic: '🍲', nm: '温かいスープ', what: 'お腹を満たし、冷えた体を温める。', who: 'お腹をすかせた相手、冷えきった相手' },
  bed: { ic: '🛏', nm: '物置の寝床', what: '今夜ひと晩、一行が横になって休める場所。', who: '疲れきった相手、泊まる場所のない相手' },
};
// 調べられる場所（札の位置は、人物の絵の座標 300×400 に合わせる）
const SPOTS = {
  amulet: { nm: 'お守り', x: 40, y: 226 },
  hilt: { nm: '剣', x: 252, y: 214 },
};
const ACT_LABEL = { bold: 'ボルドを調べた', purse: '財布を調べた', hilt: '剣を調べた', amulet: 'お守りを調べた' };
const HOTS = ['bold', 'purse', 'hilt', 'amulet', 'notebook']; // 結果画面で「見たもの」を数える

let S;
function newState() {
  return {
    posture: 1,
    lina: { expr: 'frown', pose: 'hilt', look: 'center' },
    bold: 'knee',
    known: {},
    clues: [],
    demand: null, // 'tonight' | 'morning'
    picking: false, // 「その代わり」を押して、手元から選んでいる
    sel: null, // 差し出す前に確認している品
    last: null, // 直前の行動と、その反応
    unlocked: false, // 最初の観察までは応答ボタンを閉じておく
    notebook: [],
    log: [],
    f: {},
    busy: false,
    over: false,
  };
}

// ---------------- 描画 ----------------
function renderLina() {
  const w = $('#lina-wrap');
  w.classList.remove('p0', 'p1', 'p2', 'p3');
  w.classList.add('p' + S.posture);
  $('#lina').innerHTML = ART.lina(S.lina);
}
function badge(k, nm, style = '') {
  const done = S.known[k];
  return `<div class="badge inspect ${done ? 'done' : ''}" data-hot="${k}" style="${style}" title="${nm}を調べる">
    <span class="v">${done ? '✓ 調べた' : '🔍 調べる'}</span><span class="full">${done ? '🔍 もう一度' : '🔍'} ${nm}を調べる</span></div>`;
}
function renderBold() {
  $('#bold-wrap').innerHTML = ART.bold({ state: S.bold }) + (S.f.boldDry ? '' : '<span class="drip">💧</span>')
    + badge('bold', 'ボルド', 'left:44%;top:-4px');
}
function renderBadges() {
  $('#lina-badges').innerHTML = Object.entries(SPOTS).map(([k, p]) => badge(k, p.nm, `left:${p.x}px;top:${p.y}px`)).join('');
  const pb = $('#purse .badge'); if (pb) pb.outerHTML = badge('purse', '財布');
}
function renderHand() {
  $('#hand').classList.toggle('picking', S.picking && !S.sel);
  $('#hand').innerHTML = ['chest', 'soup', 'bed'].filter((id) => !(S.f.used || {})[id]).map((id) => {
    const d = CARD[id];
    return `<div class="card offer ${S.sel === id ? 'selected' : ''}" data-card="${id}" title="${d.nm}を差し出す">
      <div class="ic">${d.ic}</div><div class="nm">${d.nm}</div><div class="what">${d.what}</div>
      <div class="foot">${S.sel === id ? '選択中' : '🎁 差し出す'}</div></div>`;
  }).join('');
}
function renderOffer() {
  const o = $('#offer');
  if (!S.sel) { o.classList.add('hidden'); return; }
  const d = CARD[S.sel];
  const alt = S.demand === 'tonight' ? '<span class="alt-note">（「今夜通して」の代わりに）</span>' : '';
  o.innerHTML = `<div class="o-head">🎁 差し出す：<span class="o-item">${d.ic} ${d.nm}</span> → リーナへ ${alt}</div>
    <div class="o-what">${d.what}</div>
    <div class="o-who">こんな相手に：${d.who}</div>
    <div class="o-btns"><button class="r-btn alt" data-o="ok">卓に置く</button>
    <button class="r-btn" data-o="cancel">やめる <small>Esc</small></button></div>`;
  o.classList.remove('hidden');
}
function strip(h) { return h.replace(/<[^>]+>/g, ''); }
function renderStatus() {
  const st = $('#status');
  const ask = S.demand === 'tonight' ? '<span class="ask">要求</span>「今夜のうちに、魔王のところへ通して」'
    : S.demand === 'morning' ? '<span class="ask">問い</span>「明日、本当に魔王に会わせてくれる？」' : '';
  let mode;
  if (S.busy) mode = '<span class="mode watch">👀 リーナの反応を見ている…</span>';
  else if (S.demand === 'morning') mode = '<span class="mode answer">💬 下のボタンで答える番</span>';
  else if (S.sel) mode = '<span class="mode offer">🎁 差し出すものを確認中</span>';
  else if (S.picking) mode = '<span class="mode offer">🎁 手元から、代わりに差し出すものを選ぶ</span>';
  else if (!S.unlocked) mode = '<span class="mode inspect">🔍 まずは調べてみよう</span>';
  else mode = '<span class="mode">できること：<b class="c-i">🔍 調べる</b>・<b class="c-o">🎁 差し出す</b>・<b class="c-a">💬 答える</b></span>';
  const last = S.last ? `<div class="last">直前：${S.last.label}${S.last.react ? ' → ' + S.last.react : ''}</div>` : '';
  st.innerHTML = `<div class="row">${ask ? `<div class="req">${ask}</div>` : ''}${mode}</div>${last}`;
  document.body.classList.toggle('busy', S.busy);
  document.body.classList.toggle('answering', S.demand === 'morning');
}
function renderClues() {
  $('#clues').innerHTML = S.clues.length ? S.clues.map((c) => `<li>${c}</li>`).join('')
    : '<li class="empty">まだ何も読めていない。</li>';
}
function renderNotebook() { $('#nb-count').textContent = S.notebook.length ? `約束 ${S.notebook.length}件` : 'リーナの手帳'; }
function renderRespond() {
  const r = $('#respond');
  if (!S.demand) { r.classList.add('hidden'); return; }
  r.classList.toggle('hidden', !!S.sel);
  let h = '<span class="r-label">💬 答える：</span>';
  if (S.demand === 'tonight') {
    if (S.picking) {
      h += '<span>↓ 手元から、<b>その代わりに差し出すもの</b>を選んでください</span><button class="r-btn" data-r="cancel">やめる <small>Esc</small></button>';
    } else {
      const dis = S.unlocked ? '' : 'disabled';
      h += `<button class="r-btn yes" data-r="yes" ${dis}>はい<small>引き受ける</small></button>
        <button class="r-btn no" data-r="no" ${dis}>いいえ<small>断る</small></button>
        <button class="r-btn alt" data-r="alt" ${dis}>その代わり…<small>別のものを差し出す</small></button>`;
      if (!S.unlocked) h += '<span class="lock-note">← まずは 🔍 で相手を調べてから</span>';
    }
  } else if (S.demand === 'morning') {
    h += `<button class="r-btn lie" data-r="lie">「はい。明日の朝、必ず会わせます」</button>
      <button class="r-btn honest" data-r="honest">「会わせられるかは、約束できません。<br>でも明日の朝、必ずあなたの話を聞きます」</button>`;
  }
  r.innerHTML = h;
}
function render() { renderLina(); renderBold(); renderBadges(); renderHand(); renderOffer(); renderClues(); renderNotebook(); renderRespond(); renderStatus(); }

function coach(text) {
  const c = $('#coach');
  if (!text) { c.classList.add('hidden'); return; }
  c.textContent = text; c.classList.remove('hidden');
  c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
}

// ---------------- 演出 ----------------
async function say(text, { demand = false, wait = 1300 } = {}) {
  const b = $('#bubble');
  b.className = demand ? 'demand' : '';
  b.innerHTML = `<span class="who">リーナ</span>${text}`;
  if (S.last && !S.last.react) S.last.react = 'リーナ「' + strip(text) + '」';
  await sleep(wait + text.length * 35);
}
async function gesture(text, wait = 1000) {
  const g = $('#gesture'); g.textContent = text; g.classList.remove('hidden');
  if (S.last && !S.last.react) S.last.react = text;
  await sleep(wait);
}
async function think(text, wait = 1400) {
  const t = $('#thought'); t.className = ''; t.innerHTML = text; await sleep(wait + text.length * 30);
}
async function totoSay(text, wait = 1100) {
  const t = $('#thought'); t.className = 'speech'; t.innerHTML = `<b style="font-size:11px;opacity:.6">トト</b><br>${text}`;
  await sleep(wait + text.length * 30);
}
async function boldSay(text, state, wait = 1200) {
  if (state) { S.bold = state; renderBold(); }
  const w = $('#bold-wrap'); w.dataset.say = 'ボルド：' + text; w.classList.add('bubble-on');
  await sleep(wait + text.length * 30);
  w.classList.remove('bubble-on');
}
function quiet() { ['#bubble', '#gesture', '#thought'].forEach((s) => $(s).classList.add('hidden')); }
function lina(expr, pose, look) { S.lina = { expr, pose: pose || S.lina.pose, look: look || 'center' }; renderLina(); }
function anim(cls) { const w = $('#lina-wrap'); w.classList.remove('bump', 'shake'); void w.offsetWidth; w.classList.add(cls); setTimeout(() => w.classList.remove(cls), 500); }
function clue(t) { if (!S.clues.includes(t)) { S.clues.push(t); renderClues(); } }
function note(text, tag = null) {
  S.notebook.push({ text, tag, status: null }); renderNotebook();
  const nb = $('#notebook'); nb.classList.remove('new'); void nb.offsetWidth; nb.classList.add('new');
  if (!S.f.coachedNotebook) { S.f.coachedNotebook = true; coach('📔 リーナは、約束を手帳に書いた。書かれた約束は消えない。'); }
}
function tableItem(id) {
  const d = CARD[id]; const el = document.createElement('div'); el.className = 't-item';
  el.innerHTML = `${d.ic}<small>${d.nm}</small>`; $('#table-items').appendChild(el); return el;
}
function clearTable(el, how = 'back') { if (!el) return; el.classList.add(how); setTimeout(() => el.remove(), 700); }

// 「bubble」「gesture」「thought」は表示時に hidden を外す
const _show = (s) => $(s).classList.remove('hidden');
const _say = say; say = async (...a) => { _show('#bubble'); return _say(...a); };
const _think = think; think = async (...a) => { _show('#thought'); return _think(...a); };
const _totoSay = totoSay; totoSay = async (...a) => { _show('#thought'); return _totoSay(...a); };

// ---------------- 入力 ----------------
async function act(label, fn) {
  if (S.busy || S.over) return;
  S.busy = true; S.last = { label, react: null }; renderStatus(); renderHand();
  try { quiet(); await fn(); } finally { S.busy = false; if (!S.over) { render(); reshowDemand(); } }
}
// 要求が残っているあいだは、吹き出しを残しておく（何を求められているか見失わないように）
function reshowDemand() {
  if (S.demand === 'tonight' && $('#bubble').classList.contains('hidden')) {
    $('#bubble').className = 'demand';
    $('#bubble').innerHTML = '<span class="who">リーナ</span>今夜のうちに、<b>魔王のところへ通して。</b>';
  }
}

$('#stage').addEventListener('click', (e) => {
  const hot = e.target.closest('[data-hot]');
  if (!hot || S.busy || S.over) return;
  const k = hot.dataset.hot;
  if (k === 'notebook') return showNotebook();
  if (S.demand === 'morning') return;
  cancelOffer();
  act('🔍 ' + ACT_LABEL[k], () => observe(k));
});
// 手元の品：クリックで「選ぶ」→ 確認パネルで「卓に置く」か「やめる」
$('#hand').addEventListener('click', (e) => {
  const c = e.target.closest('[data-card]');
  if (!c || S.busy || S.over || S.demand === 'morning') return;
  const id = c.dataset.card;
  S.sel = S.sel === id ? null : id;
  render();
});
$('#offer').addEventListener('click', (e) => {
  const b = e.target.closest('[data-o]');
  if (!b) return;
  if (b.dataset.o === 'cancel') return cancelOffer(true);
  const id = S.sel, asAlt = S.demand === 'tonight';
  S.sel = null; S.picking = false;
  act(`🎁 ${CARD[id].nm}を差し出した`, () => offer(id, asAlt));
});
function cancelOffer(andPicking) {
  if (!S.sel && !(andPicking && S.picking)) return;
  S.sel = null; if (andPicking) S.picking = false;
  render();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !S.busy) { cancelOffer(true); } });
$('#respond').addEventListener('click', (e) => {
  const b = e.target.closest('[data-r]');
  if (!b || b.disabled) return;
  const r = b.dataset.r;
  if (r === 'alt') { S.picking = true; render(); return; }
  if (r === 'cancel') { S.picking = false; render(); return; }
  const lbl = { yes: '💬「はい」と答えた', no: '💬「いいえ」と答えた', lie: '💬「必ず会わせます」と答えた', honest: '💬「約束はできない。でも話は聞く」と答えた' }[r];
  act(lbl, () => respond(r));
});
$('#popup').addEventListener('click', (e) => {
  if (e.target.closest('[data-pop]') || e.target.id === 'popup') $('#popup').classList.add('hidden');
});

function showNotebook() {
  const items = S.notebook.length
    ? S.notebook.map((n) => `<li>✒ ${n.text}${n.status === 'struck' ? ' <span class="mark broken">守られなかった</span>' : ''}</li>`).join('')
    : '<li class="note">（まだ何も書かれていない）</li>';
  $('#popup').innerHTML = `<div class="paper"><h3>📔 リーナの手帳</h3><ul>${items}</ul>
    <button class="next-btn close" data-pop="close">閉じる</button></div>`;
  $('#popup').classList.remove('hidden');
  if (!S.known.notebook && !S.busy) {
    S.known.notebook = true; firstObservation();
    clue('リーナは、言われたことを手帳に書く');
    _show('#bubble'); _say('約束は、全部ここに書くの。');
  }
}

function firstObservation() {
  if (S.unlocked) return;
  S.unlocked = true;
  document.body.classList.remove('observe-hint');
  coach('調べてわかったことは、右の「トトの読み」に残る。もっと調べても、答えてもいい。');
  renderRespond();
}

// ---------------- 観察 ----------------
async function observe(k) {
  const first = !S.known[k];
  S.known[k] = true;
  if (k === 'bold') {
    S.log.push('👀 ボルドを見た');
    await boldSay('へっくし！ ……膝？ 平気だ、平気。', 'knee');
    lina('sad', 'rest', 'away'); anim('bump');
    await gesture('（リーナが、ボルドをちらりと見た）', 1300);
    clue('ボルドはずぶ濡れで、膝をかばっている。リーナがそれを気にしている');
  } else if (k === 'purse') {
    S.log.push('👀 卓の上の財布を見た');
    lina('surprised', 'table'); anim('shake');
    await gesture('（リーナが慌てて財布を引き寄せた）');
    const p = $('#purse'); if (p) clearTable(p, 'back');
    await say('……見ないで。');
    lina('sad', 'rest', 'down');
    await say('宿代は、昨日の村で尽きたの。');
    clue('一行には宿代がない');
  } else if (k === 'hilt') {
    S.log.push('👀 剣の柄を見た');
    lina('frown', 'hilt'); anim('bump');
    await gesture('（剣の柄を、強く握り直した）');
    await say(first ? '……今夜しかないの。' : '今夜じゃなきゃ、駄目なの。');
    clue('リーナは「今夜」にこだわっている');
    if (S.known.bold || S.known.purse) await think('（「今夜」にこだわるのは……魔王のため、だけ？）');
  } else if (k === 'amulet') {
    S.log.push('👀 お守りを見た');
    lina('think', 'amulet', 'down');
    await gesture('（お守りを、そっと握った）');
    await say('……これは、村のお守り。今は関係ない。');
    clue('お守り：今は話したくなさそう（本編で効いてくる）');
  }
  firstObservation();
}

// ---------------- 差し出す ----------------
async function offer(id, asAlt) {
  const pre = asAlt ? 'その代わり——' : '';
  const it = tableItem(id);
  if (id === 'chest') {
    S.log.push('📦 宝箱を差し出した');
    await totoSay(pre + 'まずは、こちらをお納めください。');
    lina('angry', 'crossed'); anim('shake');
    await say('宝は要らない。');
    clearTable(it, 'back');
    S.posture = Math.max(0, S.posture - 1); renderLina();
    await boldSay('……要らないのか。', 'worried');
    S.bold = 'knee';
    return;
  }
  if (id === 'soup') {
    S.log.push('🍲 スープを差し出した');
    await totoSay(pre + '食堂の、温かいスープです。');
    await boldSay('おお……！', 'grin');
    await gesture('（ボルドの腹が、盛大に鳴った）');
    lina('think', 'rest');
    await say('……ボルドには、ありがたいけど。<br>私は、魔王に会いに来たの。');
    clearTable(it, 'taken');
    (S.f.used ||= {}).soup = true;
    await think('（リーナより先に、ボルドが反応した）');
    clue('スープに、ボルドが真っ先に反応した');
    S.bold = 'knee';
    return;
  }
  if (id === 'bed') {
    if (!(S.known.bold || S.known.purse)) {
      S.log.push('🛏 寝床を差し出した（一行の事情はまだ知らない）');
      await totoSay(pre + '今夜は、この物置の寝床をお使いください。');
      lina('frown', 'crossed');
      await say('寝床？ 私は、寝に来たんじゃない。');
      clearTable(it, 'back');
      await boldSay('……寝床？', 'idle');
      await think('（ボルドさんの目が、一瞬輝いた）');
      S.bold = 'knee';
      return;
    }
    S.log.push(`🛏 寝床を差し出した${asAlt ? '（「今夜通して」の代わりに）' : ''}`);
    S.f.bed = true; (S.f.used ||= {}).bed = true;
    await totoSay(pre + '今夜は、この物置の寝床をお使いください。<br>膝を休めて、明日に備えてください。');
    lina('surprised', 'rest'); anim('bump');
    await gesture('（リーナがボルドを見て、それから身を乗り出した）');
    S.posture = 3; renderLina();
    await say('……ボルドを、休ませてあげられる？');
    clearTable(it, 'accepted');
    S.demand = 'morning';
    lina('think', 'table');
    await say('でも、明日になったら——<br><b>本当に、魔王に会わせてくれる？</b>', { demand: true, wait: 300 });
    coach(null);
  }
}

// ---------------- 応じる ----------------
async function respond(r) {
  if (r === 'yes') {
    S.demand = null; S.f.yesTonight = true;
    S.log.push('💬 「今夜、魔王のところへ通して」に「はい」');
    await totoSay('はい！ 今夜、お通しします。');
    lina('joy', 'table'); S.posture = 3; renderLina(); anim('bump');
    await say('ほんと！？ 手帳に書いとく！');
    note('今夜、魔王のところへ通してくれる');
    await think('（……通せるわけがない。魔王様はもう寝ている。でも、その場は収まった）', 1800);
    return toNight();
  }
  if (r === 'no') {
    S.log.push('💬 「今夜通して」に「いいえ」');
    await totoSay('それは……できません。');
    lina('angry', 'draw'); anim('shake');
    await gesture('（剣を抜きかけた）');
    if (S.posture === 0) {
      await say('じゃあ、自分で行く。');
      $('#lina-wrap').classList.add('leaving');
      await sleep(1200);
      return toEnd('refused');
    }
    S.posture = 0; renderLina();
    await say('じゃあ、何のためにここまで来たの。');
    lina('angry', 'crossed', 'away');
    coach('リーナが身を引いた。体の向きや腕を見てみよう。');
    return;
  }
  if (r === 'lie' || r === 'honest') {
    S.demand = null;
    if (r === 'lie') {
      S.f.morningLie = true;
      S.log.push('🤥 「明日の朝、必ず会わせます」と答えた');
      await totoSay('はい。明日の朝、必ず会わせます。');
      lina('joy', 'table'); anim('bump');
      await say('……よかった。書いとくね。');
      note('明日の朝、魔王に会わせてくれる');
      await think('（……会わせられる保証はない。でも、今夜は休んでもらえる）', 1600);
    } else {
      S.f.morningHonest = true;
      S.log.push('🙂 「会わせられるかは約束できない。でも話は必ず聞く」と答えた');
      await totoSay('会わせられるかは、約束できません。<br>でも明日の朝、必ずあなたの話を聞きます。');
      lina('frown', 'hilt', 'down'); S.posture = 2; renderLina();
      await gesture('（剣の柄に手が戻り……それから、ボルドを見た）', 1500);
      lina('smile', 'rest');
      await say('……正直だね。分かった。今夜は休む。<br>明日、ちゃんと聞いてね。');
      note('明日の朝、話を聞いてくれる');
    }
    return toMorning();
  }
}

// ---------------- 場面（数分後に約束が返ってくる） ----------------
let curBg = null;
function playScene(beats) {
  return new Promise((resolve) => {
    const sc = $('#scene'); sc.classList.remove('hidden'); document.body.classList.add('in-scene');
    const q = beats.slice();
    const step = () => {
      if (!q.length) { sc.classList.add('hidden'); document.body.classList.remove('in-scene'); curBg = null; resolve(); return; }
      const b = q.shift();
      if (b.run) b.run();
      if (b.bg && b.bg !== curBg) { $('#scene-bg').innerHTML = ART.bg[b.bg]; curBg = b.bg; }
      if (b.cast) $('#scene-cast').innerHTML = b.cast.map((c) => c.prop ? `<div class="prop">${c.prop}</div>` : `<div class="c ${c.cls || ''}">${ART[c.who](c.o || {})}</div>`).join('');
      sc.querySelector('.caption-big')?.remove();
      if (b.caption) sc.insertAdjacentHTML('afterbegin', `<div class="caption-big">${b.caption}</div>`);
      $('#scene-speaker').textContent = b.speaker || '';
      $('#scene-text').innerHTML = b.text || '';
      const ch = $('#scene-choices'); ch.innerHTML = '';
      if (b.choices) {
        b.choices.forEach((c) => {
          const btn = document.createElement('button'); btn.className = 'r-btn ' + (c.cls || ''); btn.innerHTML = c.label;
          btn.onclick = () => { q.unshift(...(c.then() || [])); step(); }; ch.appendChild(btn);
        });
      } else {
        const btn = document.createElement('button'); btn.className = 'next-btn'; btn.textContent = '▶ 次へ'; btn.onclick = step; ch.appendChild(btn);
      }
    };
    step();
  });
}
const T = (expr) => ({ who: 'toto', o: { expr }, cls: 'small' });
const L = (expr, pose, look) => ({ who: 'lina', o: { expr, pose, look } });
const B = (state) => ({ who: 'bold', o: { state }, cls: 'small' });

// 約束を先延ばしにすると、手帳の約束が一つ増える
function stall(when) {
  const old = S.notebook[S.notebook.length - 1]; old.status = 'struck';
  S.f.stalled = true;
  const night = when === 'night';
  S.log.push(night ? '🤥 「魔王様はお休みで……明日の朝に」と先延ばしにした' : '🤥 「魔王様はまだお休みで……夕方には」と先延ばしにした');
  return [
    { cast: [T('sweat'), L('think', 'rest')], speaker: 'リーナ', text: night ? 'そっか……。じゃあ、明日の朝ね！ 書いとく。' : 'そっか……。じゃあ、夕方ね！ 書いとく。',
      run: () => S.notebook.push({ text: night ? '明日の朝、魔王のところへ通してくれる' : '今日の夕方、魔王に会わせてくれる', tag: null, status: 'open' }) },
    { bg: 'corridor', caption: night ? '翌朝' : '夕方', cast: [B('sleep'), L('neutral', 'hilt')],
      speaker: '', text: night
        ? '一行は、玉座の間の扉の前で一晩中待っていた。\nボルドは床で眠りこけ、膝はさらに腫れている。'
        : '一行は、玉座の間の扉の前で、昼からずっと待っていた。' },
    { cast: [T('worry'), L('neutral', 'table')], speaker: 'リーナ', text: (night ? '朝' : '夕方') + 'だよ。手帳に書いてある。……約束、これで2つ目だね。' },
    { cast: [T('worry')], speaker: '', text: '「はい」はその場を収めた。\nでも手帳には、守れない約束が積み上がっていく。' },
  ];
}

async function toNight() {
  S.over = true; render(); coach(null);
  await playScene([
    { bg: 'corridor', caption: '真夜中', cast: [B('knee'), L('angry', 'hilt')],
      speaker: 'リーナ', text: '約束の時間だよ。手帳に「今夜、魔王のところへ通してくれる」って書いてある。',
      run: () => { S.f.boldDry = false; } },
    { cast: [T('sweat'), L('neutral', 'table')], speaker: '', text: '魔王様は、とうに寝ている。ボルドは廊下で震えている。',
      choices: [
        { label: '「……ごめんなさい。今夜は、通せません」', cls: 'honest', then: () => {
          S.notebook[0].status = 'struck'; S.f.midnightConfess = true;
          S.log.push('🙂 真夜中に「通せません」と打ち明けた');
          return [
            { cast: [L('hurt', 'crossed', 'down')], speaker: 'リーナ', text: '……最初から、そう言ってくれれば。\nボルドを、ちゃんと休ませられたのに。' },
            { cast: [B('sleep'), T('worry')], speaker: '', text: '一行は冷たい廊下で夜を明かした。トトは自分の毛布をボルドに掛けた。' },
            { cast: [L('sad', 'rest')], speaker: 'リーナ', text: '次は、できないなら、できないって言って。' },
          ];
        } },
        { label: '「魔王様はもうお休みで……明日の朝に！」', cls: 'lie', then: () => stall('night') },
      ] },
  ]);
  toEnd(S.f.stalled ? 'snowball' : 'midnight');
}

async function toMorning() {
  S.over = true; render(); coach(null);
  const rested = { bg: 'storeroom', caption: '翌朝', cast: [B('grin'), L('smile', 'rest')],
    speaker: 'ボルド', text: 'いやあ、よく寝た！ 膝もだいぶ軽い。物置ってのも悪くねえな。', run: () => { S.f.boldDry = true; } };
  if (S.f.morningHonest) {
    await playScene([rested,
      { cast: [T('smile'), L('neutral', 'table')], speaker: 'リーナ', text: '約束どおり、話を聞いてくれるんだよね。',
        run: () => { S.notebook[0].status = 'kept'; S.log.push('🤝 朝、約束どおり話を聞いた'); } },
      { cast: [L('smile', 'wave')], speaker: 'リーナ', text: '……あなたの「はい」は、信じてもいいみたい。' },
      { cast: [T('resolve')], speaker: '', text: 'ここから、本当の交渉が始まる。' },
    ]);
    return toEnd('kept');
  }
  await playScene([rested,
    { cast: [T('sweat'), L('neutral', 'hilt')], speaker: 'リーナ', text: '朝だよ。魔王に会わせて。手帳に書いてある。',
      choices: [
        { label: '「……ごめんなさい。会わせられるとは、限らないんです」', cls: 'honest', then: () => {
          S.notebook[0].status = 'struck'; S.f.morningConfess = true;
          S.log.push('🙂 朝、「会わせられるとは限らない」と打ち明けた');
          return [
            { cast: [L('hurt', 'crossed', 'down')], speaker: 'リーナ', text: '……そうなんだ。' },
            { cast: [L('sad', 'rest')], speaker: 'リーナ', text: 'ボルドを休ませてくれたのは、本当だから。……怒らない。\nでも、次は最初から本当のことを言って。' },
          ];
        } },
        { label: '「魔王様は、まだお休みで……夕方には！」', cls: 'lie', then: () => stall('morning') },
      ] },
  ]);
  toEnd(S.f.stalled ? 'snowball' : 'rested_confess');
}

// ---------------- 結果 ----------------
const END = {
  kept: { t: '守れる約束', s: '「今夜通して」には応えなかった。でも、リーナが本当に困っていたことには応えた。', expr: 'smile', pose: 'wave',
    g: ['ボルドは休めた', 'リーナは、トトの言葉を信じ始めた', '手帳の約束を、その朝のうちに守れた'], l: ['魔王には会わせていない（要求そのものは叶えていない）'] },
  rested_confess: { t: '休ませたが、嘘も残った', s: '一行は休めた。でも「必ず会わせます」は、朝には守れない約束だった。', expr: 'sad', pose: 'rest',
    g: ['ボルドは休めた', '自分から打ち明けた（ばれるより傷は浅い）'], l: ['リーナの信頼は一度下がった'] },
  midnight: { t: '真夜中の告白', s: '「はい」でその場は収まった。真夜中に、それが返ってきた。', expr: 'hurt', pose: 'crossed',
    g: ['嘘を重ねずに、自分から打ち明けた'], l: ['一行は廊下で夜を明かした', 'リーナ「最初から言ってくれれば」'] },
  snowball: { t: '約束が雪だるまになった', s: '先延ばしの「はい」が、手帳の約束を一つ増やした。', expr: 'neutral', pose: 'hilt',
    g: ['リーナは、まだトトを信じている（今のところ）'], l: ['手帳に、守れない約束が2つ', '次に取り立てに来るのは、もうすぐ'] },
  refused: { t: '閉じた扉', s: '嘘はつかなかった。でも、リーナの手には何も残らなかった。', expr: 'angry', pose: 'crossed',
    g: ['嘘はついていない'], l: ['一行は城門の外で野宿した', 'リーナ「嘘はつかなかったね。でも、何もしてくれなかった」'] },
};

async function toEnd(key) {
  S.over = true; quiet(); coach(null);
  if (key === 'refused') {
    await playScene([
      { bg: 'field', caption: 'その夜', cast: [B('knee'), L('angry', 'crossed', 'away')], speaker: '',
        text: '一行は城門の外で野宿した。翌朝、リーナは一人で城に乗り込もうとして、門番に追い返された。' },
      { cast: [L('frown', 'crossed', 'away')], speaker: 'リーナ', text: 'あなたは、嘘はつかなかったね。……でも、何もしてくれなかった。' },
    ]);
  }
  const e = END[key];
  const seen = HOTS.filter((h) => S.known[h]).length;
  const mark = (n) => n.status === 'kept' ? '<span class="mark kept">守った</span>'
    : n.status === 'struck' ? '<span class="mark broken">守られなかった</span>'
      : n.status === 'open' ? '<span class="mark cant">まだ残っている</span>' : '';
  const nb = S.notebook.length ? S.notebook.map((n) => `<li>✒ ${n.text} ${mark(n)}</li>`).join('') : '<li>（何も書かれなかった）</li>';
  const el = document.createElement('div');
  el.id = 'result';
  el.innerHTML = `
    <h1>${e.t}</h1><div class="sub">${e.s}</div>
    <div class="res-grid">
      <div class="res-portrait">${ART.lina({ expr: e.expr, pose: e.pose })}</div>
      <div class="res-box"><h4>得たもの</h4><ul>${e.g.map((x) => `<li class="gain">${x}</li>`).join('')}</ul>
        <h4 style="margin-top:10px">失ったもの・残ったもの</h4><ul>${e.l.map((x) => `<li class="loss">${x}</li>`).join('')}</ul></div>
      <div class="res-box"><h4>📔 リーナの手帳</h4><ul>${nb}</ul>
        <div class="found">見たもの：${seen} / ${HOTS.length}${seen < HOTS.length ? '　（まだ見ていないところがある）' : ''}</div></div>
    </div>
    <div class="res-box" style="margin-top:14px"><h4>あなたの交渉（${S.log.length}手）</h4><ol>${S.log.map((x) => `<li>${x}</li>`).join('')}</ol></div>
    <div class="res-actions">
      <button class="r-btn yes" id="again-btn">もう一度</button>
    </div>`;
  $('#stage').appendChild(el);
  $('#stage').style.height = '560px';
  document.body.classList.add('ended');
  $('#again-btn').onclick = start;
}

// ---------------- 開始 ----------------
async function start() {
  $('#result')?.remove();
  $('#stage').style.height = '';
  document.body.classList.remove('ended');
  S = newState();
  $('#bg').innerHTML = ART.bg.storeroom;
  $('#toto').innerHTML = ART.toto({ expr: 'neutral' });
  $('#lina-wrap').classList.remove('leaving');
  $('#table-items').innerHTML = '<div class="t-item hot-item" id="purse" data-hot="purse" title="財布を調べる">👛<small>財布</small><div class="badge"></div></div>';
  quiet(); coach(null); render();
  S.busy = true;
  await playScene([
    { bg: 'corridor', caption: 'はじめての交渉', cast: [T('neutral')], speaker: '',
      text: 'あなたは小鬼のトト。魔王城の渉外課で、勇者一行と「話をつける」のが仕事だ。' },
    { bg: 'storeroom', cast: [B('knee'), L('frown', 'hilt')], speaker: '',
      text: '雨の夜。ずぶ濡れの勇者一行が、城に着いた。\n卓の向こうには、勇者リーナと、戦士ボルド。' },
  ]);
  S.demand = 'tonight';
  render();
  _show('#bubble');
  await say('今夜のうちに、<b>魔王のところへ通して。</b>', { demand: true, wait: 300 });
  document.body.classList.add('observe-hint');
  coach('要求には、すぐ答えなくていい。まずは 🔍 の札がついたところを調べてみよう。');
  S.busy = false;
  render();
}

start();
