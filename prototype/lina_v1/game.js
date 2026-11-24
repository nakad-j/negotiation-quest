// game.js — リーナとの交渉・試作 v1
// 仕組み：探る（体や持ち物をクリック）／差し出す（手元のカード）／応じる（はい・いいえ・その代わり・持ち帰る）
// 姿勢は数値で見せず、リーナの距離・体の向き・腕で見せる。約束はリーナの手帳に残り、後日取り立てに来る。

const $ = (s) => document.querySelector(s);
const SPEED = new URLSearchParams(location.search).has('fast') ? 0.15 : 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms * SPEED));
const MAX_CANDLE = 12;
const SEEN = new Set(); // このページを開いているあいだに見た結末

const CARD = {
  chest: { ic: '📦', nm: '宝箱', tp: '品' },
  ticket: { ic: '🎫', nm: '城の食券', tp: '品' },
  garza: { ic: '🪴', nm: 'ガルザ様は引退したがっている', tp: '話の種' },
  hornlaw: { ic: '🦴', nm: '角を折られた魔王は、玉座を降りる（魔物の掟）', tp: '話の種' },
  trap: { ic: '🪤', nm: '罠課の職人は、本気の挑戦者を探している', tp: '話の種' },
  village: { ic: '🏡', nm: '村を救う方法は、ほかにもあるかも', tp: '話の種' },
  hornfavor: { ic: '👑', nm: '角を折った勇者は、王に願いを一つ言える', tp: '話の種' },
};

let S;
function newState() {
  return {
    candle: MAX_CANDLE,
    posture: 1, // 0 閉じる / 1 構える / 2 聞く / 3 乗り出す
    lina: { expr: 'neutral', pose: 'hilt', look: 'center' },
    bold: 'idle',
    glow: null,
    hand: [
      { id: 'chest', count: 2 }, { id: 'ticket', count: 1 },
      { id: 'garza' }, { id: 'hornlaw' }, { id: 'trap' },
    ],
    known: {},
    clues: [],
    demand: null,
    picking: false,
    notebook: [], // {text, tag: 'cant'|'lie'|null, status}
    ledger: [{ text: 'ヴェラ課長に「交渉は順調です」', tag: 'lie' }],
    log: [],
    deal: null, // 'fight' | 'lie' | 'honest'
    f: { chestOffers: 0, boldTalk: 0, actions: 0 },
    busy: false,
    over: false,
  };
}

// ---------------- 描画 ----------------
function renderLina() {
  const w = $('#lina-wrap');
  w.classList.remove('p0', 'p1', 'p2', 'p3', 'glow-amulet', 'glow-hilt');
  w.classList.add('p' + S.posture);
  if (S.glow) w.classList.add('glow-' + S.glow);
  $('#lina').innerHTML = ART.lina(S.lina);
}
function renderBold() { $('#bold-wrap').innerHTML = ART.bold({ state: S.bold }); }
function renderCandle() {
  const pct = Math.max(0, S.candle / MAX_CANDLE);
  $('#wax').style.width = (pct * 100) + '%';
  $('#flame').style.left = (pct * 120) + 'px';
  $('#flame').style.display = S.candle > 0 ? '' : 'none';
  $('#candle').classList.toggle('low', S.candle <= 3);
}
function renderHand() {
  const h = $('#hand');
  h.classList.toggle('picking', S.picking);
  h.innerHTML = S.hand.filter((c) => c.count === undefined || c.count > 0).map((c) => {
    const d = CARD[c.id];
    return `<div class="card ${d.tp === '話の種' ? 'seed' : ''} ${c.isNew ? 'new' : ''}" data-card="${c.id}">
      <span class="tp">${d.tp}</span>${c.count > 1 ? `<span class="ct">×${c.count}</span>` : ''}
      <div class="ic">${d.ic}</div><div class="nm">${d.nm}</div></div>`;
  }).join('');
}
function renderClues() {
  $('#clues').innerHTML = S.clues.length ? S.clues.map((c) => `<li>${c}</li>`).join('')
    : `<li class="empty">まだ何も読めていない。<br>相手の体や持ち物をよく見てみよう。</li>`;
}
function renderNotebook() {
  $('#nb-count').textContent = S.notebook.length ? `約束 ${S.notebook.length}件` : 'リーナの手帳';
}
function renderRespond() {
  const r = $('#respond');
  const d = S.demand;
  if (!d) { r.classList.add('hidden'); return; }
  r.classList.remove('hidden');
  let html = `<span class="r-label">応じる：</span>`;
  if (d === 'fight') {
    if (S.picking) {
      html += `<span>手元から、<b>その代わりに差し出すもの</b>を選んでください</span>
        <button class="r-btn" data-r="cancel">やめる</button>`;
    } else {
      html += `<button class="r-btn yes" data-r="yes">はい<small>引き受ける</small></button>
        <button class="r-btn no" data-r="no">いいえ<small>断る</small></button>
        <button class="r-btn alt" data-r="alt">その代わり…<small>別のものを差し出す</small></button>
        <button class="r-btn wait" data-r="wait">持ち帰る<small>少し考えさせて</small></button>`;
    }
  } else if (d === 'really') {
    html += `<button class="r-btn lie" data-r="lie">「はい。あなた自身の力です」</button>
      <button class="r-btn honest" data-r="honest">「正直に言います。……芝居です。<br>でも、王様に会えるのは本当です」</button>`;
  } else if (d === 'thanks') {
    html += `<button class="r-btn yes" data-r="again">「はい、また今度」</button>
      <button class="r-btn" data-r="noneed">「お礼なんて、いりませんよ」</button>`;
  }
  r.innerHTML = html;
}
function renderHint() {
  let t;
  if (S.over) t = '';
  else if (S.demand === 'fight' && S.picking) t = '🃏 リーナの「本当の望み」に応えられそうなものを選ぼう。';
  else if (S.demand === 'really' || S.demand === 'thanks') t = '💬 リーナの問いに答えよう。';
  else if (S.deal) t = '🤝 話はまとまった。続けて探ってもいいし、「交渉を終える」で先へ進んでもいい。';
  else t = '👀 リーナ（お守り・剣・手帳）やボルドをクリックして探る　🃏 手元をクリックして差し出す　💬 要求に応じる';
  $('#hint').textContent = t;
  $('#end-btn').classList.toggle('ready', !!S.deal && !S.demand);
}
function render() {
  renderLina(); renderBold(); renderCandle(); renderHand(); renderClues(); renderNotebook(); renderRespond(); renderHint();
}

// ---------------- 演出 ----------------
async function say(text, { demand = false, wait = 1300 } = {}) {
  const b = $('#bubble');
  b.className = demand ? 'demand' : '';
  b.innerHTML = `<span class="who">リーナ</span>${text}`;
  b.classList.remove('hidden');
  await sleep(wait + text.length * 35);
}
function hideBubble() { $('#bubble').classList.add('hidden'); }
async function gesture(text, wait = 900) {
  const g = $('#gesture'); g.textContent = text; g.classList.remove('hidden');
  await sleep(wait);
}
function hideGesture() { $('#gesture').classList.add('hidden'); }
async function think(text, wait = 1400) {
  const t = $('#thought'); t.className = '';
  t.innerHTML = text;
  t.classList.remove('hidden');
  await sleep(wait + text.length * 30);
}
async function totoSay(text, wait = 1100) {
  const t = $('#thought');
  t.innerHTML = `<b style="font-size:11px;opacity:.6">トト</b><br>${text}`;
  t.className = 'speech';
  t.classList.remove('hidden');
  await sleep(wait + text.length * 30);
}
function hideThought() { $('#thought').classList.add('hidden'); }
async function boldSay(text, state = 'idle', wait = 1200) {
  S.bold = state; renderBold();
  const w = $('#bold-wrap'); w.dataset.say = 'ボルド：' + text; w.classList.add('bubble-on');
  await sleep(wait + text.length * 30);
  w.classList.remove('bubble-on');
}
function lina(expr, pose, look) {
  S.lina = { expr, pose: pose || S.lina.pose, look: look || 'center' };
  renderLina();
}
function anim(cls) {
  const w = $('#lina-wrap'); w.classList.remove('bump', 'shake'); void w.offsetWidth; w.classList.add(cls);
  setTimeout(() => w.classList.remove(cls), 500);
}
// 姿勢を動かす。0未満に落ちたら false（席を立つ）
function posture(delta) {
  const n = S.posture + delta;
  if (n < 0) return false;
  S.posture = Math.min(3, n);
  renderLina();
  return true;
}
function setPosture(n) { S.posture = n; renderLina(); }
function clue(text) { if (!S.clues.includes(text)) { S.clues.push(text); renderClues(); } }
function log(text) { S.log.push(text); }
function note(text, tag = null) {
  S.notebook.push({ text, tag, status: null });
  renderNotebook();
  const nb = $('#notebook'); nb.classList.remove('new'); void nb.offsetWidth; nb.classList.add('new');
}
function addCard(id) {
  if (S.hand.find((c) => c.id === id)) return;
  S.hand.push({ id, isNew: true }); renderHand();
}
function useCard(id) {
  const c = S.hand.find((x) => x.id === id);
  if (c && c.count !== undefined) c.count--;
  if (c) c.isNew = false;
}
function tableItem(id) {
  const d = CARD[id];
  const el = document.createElement('div');
  el.className = 't-item';
  el.innerHTML = `${d.tp === '品' ? d.ic : '💬'}<small>${d.tp === '品' ? d.nm : d.ic + ' ' + d.nm.slice(0, 10) + '…'}</small>`;
  $('#table-items').appendChild(el);
  return el;
}
function clearTable(el, how = 'back') {
  if (!el) return;
  el.classList.add(how);
  setTimeout(() => el.remove(), 700);
}
function tick(n = 1) { S.candle = Math.max(0, S.candle - n); renderCandle(); }
function quiet() { hideBubble(); hideGesture(); hideThought(); }

// ---------------- 入力 ----------------
async function act(fn) {
  if (S.busy || S.over) return;
  S.busy = true; document.body.style.cursor = 'progress';
  try {
    quiet();
    await fn();
    S.f.actions++;
    if (!S.over) await afterAction();
  } finally {
    S.busy = false; document.body.style.cursor = '';
    if (!S.over) render();
  }
}

async function afterAction() {
  // 本当の望みに気づいていないプレイヤーへの、しぐさによる小さな手がかり
  if (!S.known.village && S.f.actions % 3 === 2) {
    lina('neutral', 'amulet', 'down'); S.glow = 'amulet'; renderLina();
    await gesture('（リーナは無意識に、首のお守りに触れた）', 1300);
  }
  if (S.known.village && !S.known.hornfavor && !$('#bold-wrap').classList.contains('sparkle')) {
    $('#bold-wrap').classList.add('sparkle');
  }
  if (S.candle <= 3 && S.candle > 0 && !S.f.lowWarned) {
    S.f.lowWarned = true;
    await think('（日が傾いてきた……。日没までに片づけないと、ヴェラ課長が来る）');
  }
  if (S.candle <= 0) {
    if (!S.deal) await timeout();
    else if (!S.demand) { await think('（日が沈んだ。……話は、まとまっている）'); await finishNegotiation(); }
  }
}

$('#stage').addEventListener('click', (e) => {
  const hot = e.target.closest('[data-hot]');
  if (!hot || S.picking) return;
  const k = hot.dataset.hot;
  if (k === 'notebook') return showNotebook();
  if (S.demand === 'really' || S.demand === 'thanks') { flashHint(); return; }
  act(() => probe(k));
});
$('#hand').addEventListener('click', (e) => {
  const c = e.target.closest('[data-card]');
  if (!c) return;
  if (S.demand === 'really' || S.demand === 'thanks') { flashHint(); return; }
  const asAlt = S.picking;
  S.picking = false;
  act(() => offer(c.dataset.card, asAlt));
});
$('#respond').addEventListener('click', (e) => {
  const b = e.target.closest('[data-r]');
  if (!b) return;
  const r = b.dataset.r;
  if (r === 'alt') { S.picking = true; render(); return; }
  if (r === 'cancel') { S.picking = false; render(); return; }
  act(() => respond(r));
});
$('#end-btn').addEventListener('click', () => {
  if (S.busy || S.over) return;
  if (S.demand === 'really' || S.demand === 'thanks') { flashHint(); return; }
  if (S.deal) return finishNegotiation();
  popup(`<div class="paper"><h3>まだ合意していません</h3>
    <p>ここで席を立つと、一行は規則どおり<b>ドグマ将軍の軍</b>に回されます（本気の戦闘）。</p>
    <div class="res-actions"><button class="r-btn" data-pop="close">交渉を続ける</button>
    <button class="r-btn no" data-pop="leave">席を立つ</button></div></div>`);
});
$('#popup').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pop]');
  if (!b && e.target.id !== 'popup') return;
  const k = b ? b.dataset.pop : 'close';
  $('#popup').classList.add('hidden');
  if (k === 'leave') { log('🚪 合意しないまま席を立った'); ending('nodeal'); }
});
function flashHint() { const h = $('#hint'); h.style.color = '#fff'; setTimeout(() => (h.style.color = ''), 400); }
function popup(html) { const p = $('#popup'); p.innerHTML = html; p.classList.remove('hidden'); }

function showNotebook() {
  const first = !S.known.notebook;
  const items = S.notebook.length
    ? S.notebook.map((n) => `<li>✒ ${n.text} ${n.tag === 'lie' ? '<span class="mark lie">トトだけが知る嘘</span>' : ''}${n.tag === 'cant' ? '<span class="mark cant">できない約束</span>' : ''}</li>`).join('')
    : '<li class="note">（まだ何も書かれていない）</li>';
  popup(`<div class="paper"><h3>📔 リーナの手帳 ― トトとの約束</h3><ul>${items}</ul>
    <p class="note">リーナは、言われたことを字義どおり書きとめる。書かれた約束は、後で必ず確かめに来る。</p>
    <button class="next-btn close" data-pop="close">閉じる</button></div>`);
  if (first && !S.busy) {
    S.known.notebook = true;
    clue('リーナ：言われたことを字義どおり手帳に書く（社交辞令が通じない）');
    say('約束は、全部ここに書くの。村でも、そうしてきたから。').then(hideBubble);
  }
}

// ---------------- 探る ----------------
async function probe(k) {
  tick(1);
  if (k === 'amulet') {
    if (S.posture === 0) {
      lina('angry', 'crossed', 'away'); log('👀 お守りに触れようとして、拒まれた');
      await say('……触らないで。');
      return;
    }
    if (!S.known.village) {
      S.known.village = true; S.glow = null;
      log('👀 お守りについて聞いた → カヤ村の話');
      lina('sad', 'amulet', 'down'); anim('bump');
      await gesture('（お守りを、ぎゅっと握った）');
      await say('……カヤ村のお守り。');
      await say('税で、村の半分の家が空き家になったの。<br>魔王さえ倒せば税はなくなるって、領主様がいつも言ってた。');
      lina('think', 'amulet');
      clue('リーナの本当の望み？ → <b>カヤ村を税から救うこと</b>');
      await think('（「魔王を倒す」は、村を救うための<b>手段</b>なんだ）');
      addCard('village');
      if (S.posture < 2) setPosture(2);
    } else {
      log('👀 もう一度お守りを見た');
      lina('sad', 'amulet', 'down');
      await say('村のみんな、待ってるの。');
    }
    return;
  }
  if (k === 'hilt') {
    if (S.posture >= 2 || S.f.honest) {
      log('👀 剣について聞いた → 「自分の手で」');
      lina('think', 'hilt', 'down');
      await say('くじ引きで選ばれたの。剣の腕は、並み。<br>……だからこそ、<b>自分の手で</b>何かを変えたい。');
      S.known.self = true;
      clue('リーナ：<b>自分の手で</b>何かを変えたい（芝居で勝つのは嫌がりそう）');
    } else {
      log('👀 剣の柄を見た');
      lina('frown', 'hilt'); anim('bump');
      await gesture('（剣の柄を、強く握り直した）');
      await say('……。');
      await think('（剣に触れると、ぐっと力が入る。何かを、自分の手でやりたいのかも）');
      clue('リーナ：剣の柄に力が入る。まだ警戒している');
    }
    return;
  }
  if (k === 'bold') {
    $('#bold-wrap').classList.remove('sparkle');
    if (S.known.village && !S.known.hornfavor) {
      log('👀 ボルドに話を振った → 「角折りの功」');
      await boldSay('村のこと、か……。', 'worried');
      await unlockFavor();
      return;
    }
    S.f.boldTalk++;
    if (S.f.boldTalk === 1) {
      log('👀 ボルドを見た');
      await boldSay('膝がな……。本気の戦闘だけは勘弁してくれ。', 'knee');
      clue('ボルド：安全に、得をして帰りたい（膝が限界）');
    } else {
      log('👀 ボルドを見た');
      await boldSay('宝箱の話なら、いつでも聞くぜ。', 'grin');
    }
    S.bold = 'idle';
    return;
  }
}

async function unlockFavor() {
  S.known.hornfavor = true;
  await boldSay('角といやあ、人間のほうにも古い慣わしがあったな。「角折りの功」だ。', 'count', 1500);
  await boldSay('魔王の角を折った奴は、王様に褒美を<b>一つ</b>ねだれる。……昔話だがね。', 'grin', 1500);
  S.bold = 'idle'; renderBold();
  await think('（王様に、願いを一つ……！）');
  clue('「角折りの功」：魔王の角を折った勇者は、王に願いを一つ言える');
  addCard('hornfavor');
}

// ---------------- 差し出す ----------------
async function offer(id, asAlt) {
  tick(1);
  useCard(id);
  const pre = asAlt ? 'その代わり——' : '';
  const it = tableItem(id);
  const fightPending = S.demand === 'fight';

  if (id === 'chest') {
    S.f.chestOffers++;
    log(`📦 宝箱を差し出した${asAlt ? '（その代わりに）' : ''}`);
    await totoSay(pre + 'まずはこちらを。お納めください。');
    lina('frown', 'crossed'); anim('shake');
    await say('宝は要らないって、言ったでしょ。');
    if (S.f.chestOffers === 1) {
      clearTable(it, 'back');
      const c = S.hand.find((x) => x.id === 'chest'); c.count++; // 押し返された
      await boldSay('二つか。……前の担当は三つ出したぞ。', 'count');
      S.bold = 'lookaway'; renderBold();
      await gesture('（ボルドは言いながら、目をそらした）');
      await think('（目をそらした。……はったりだ）');
      clue('ボルド：得の話で指を折る。はったりのときは目をそらす');
      if (S.posture >= 2 && !posture(-1)) return walkout();
    } else {
      clearTable(it, 'taken');
      await boldSay('じゃ、こいつは俺が預かっとく。', 'take');
      lina('angry', 'crossed'); anim('shake');
      await gesture('（リーナがボルドをにらんだ。席が少し遠くなった）');
      if (!posture(-1)) return walkout();
      S.f.chestLostToBold = true;
    }
    S.bold = 'idle';
    return;
  }

  if (id === 'ticket') {
    log('🎫 食券を差し出した');
    await totoSay(pre + '城の食堂の食券です。おいしいですよ。');
    lina('surprised');
    await say('……食堂の？ お腹は、すいてないけど。');
    clearTable(it, 'taken');
    await boldSay('おっ、俺がもらっとく。', 'take');
    lina('neutral'); S.bold = 'idle';
    await think('（……そうじゃない、という顔だ）');
    return;
  }

  if (id === 'garza') {
    log('🪴 「ガルザ様は引退したい」と明かした');
    await totoSay(pre + 'ここだけの話……魔王様は、引退したがっているんです。');
    lina('surprised'); anim('bump');
    await say('魔王が……引退？');
    if (S.known.village) {
      lina('sad', 'amulet', 'down');
      await say('でも、魔王がいなくなっても……税がなくならなきゃ、村は同じだよ。');
      clue('魔王が消えるだけでは、リーナの望み（村）は叶わない');
    } else {
      lina('frown');
      await say('じゃあ、私は何と戦えばいいの？');
      await boldSay('引退ねえ。俺の膝も引退したいね。', 'knee');
      S.bold = 'idle';
    }
    clearTable(it, 'back');
    return;
  }

  if (id === 'hornlaw') {
    log('🦴 「角を折られた魔王は玉座を降りる」と明かした');
    await totoSay(pre + '魔物の掟では、角を折られた魔王は玉座を降りるんです。');
    lina('think', 'amulet', 'down');
    await gesture('（お守りに手が伸びた）');
    await say('角を折れば、魔王は玉座を降りる……。でも、それで何が変わるの？');
    clearTable(it, 'back');
    if (!S.known.hornfavor) await unlockFavor();
    return;
  }

  if (id === 'village') {
    log('🏡 「村を救う方法は、ほかにもあるかも」と持ちかけた');
    await totoSay(pre + '村を救う方法なら……魔王を倒す以外にも、あるかもしれません。一緒に考えさせてください。');
    clearTable(it, 'accepted');
    if (S.f.honest) {
      lina('frown', 'hilt');
      await say('村のためなのは、分かってる。でも……芝居の上で勝つのは、嫌なの。');
      return;
    }
    lina('surprised', 'rest'); anim('bump');
    if (S.posture < 2) setPosture(2);
    await say('……ほかの方法？ そんなの、あるの？');
    lina('think', 'table');
    await say('あるなら、聞かせて。');
    S.f.invited = true;
    if (!S.known.hornfavor) await think('（何か、王様に直接届く方法は……。ボルドさんが何か言いたそうだ）');
    return;
  }

  if (id === 'trap') {
    if (S.f.honest && !S.f.trapDeal) return trapDeal(it, pre);
    log('🪤 「罠課は本気の挑戦者を探している」と明かした');
    await totoSay(pre + '罠課の職人が、本気で挑んでくれる人を探しているんです。');
    lina('surprised', 'hilt'); anim('bump');
    await gesture('（一瞬、剣の柄を握った）');
    await say('罠？ ……本気の罠？');
    lina('neutral', 'rest');
    await say('でも、魔王とは関係ないよね。');
    clue('リーナ：「本気の」に一瞬反応した');
    clearTable(it, 'back');
    return;
  }

  if (id === 'hornfavor') return hornPlan(it, pre, fightPending);
}

// 角の計画（話の種「角折りの功」＋ガルザの古い角）
async function hornPlan(it, pre, fightPending) {
  if (S.f.honest) {
    log('👑 角の計画をもう一度押した');
    await totoSay('王様に会えるのは、本当なんです。');
    lina('frown', 'hilt');
    await say('それは分かった。でも……芝居で折った角で王様に会うのは、嫌。');
    clearTable(it, 'back');
    S.glow = 'hilt';
    return;
  }
  if (!S.known.village) {
    log('👑 「角を折れば王に願いを言える」と持ちかけた（村の話はまだ知らない）');
    await totoSay(pre + 'ガルザ様の角を折れば、王様に願いを一つ言えます。');
    lina('think', 'amulet', 'down'); S.glow = 'amulet'; renderLina();
    await gesture('（お守りを握った）');
    await say('願いを、一つ……。<br>……でも、それで魔王は倒れるの？');
    await think('（お守りを握った。何か、願いたいことがあるんだ。……何を？）');
    clearTable(it, 'back');
    return;
  }
  log(`👑 角の計画を差し出した${fightPending ? '（「魔王と戦わせて」の代わりに）' : ''}`);
  await totoSay(pre + 'ガルザ様の角を折れば、「角折りの功」で王様に会えます。<br><b>村のことを、王様に直接頼めます。</b>');
  lina('surprised', 'amulet'); setPosture(3); anim('bump');
  await gesture('（身を乗り出した）');
  await say('王様に、村のことを……直接？');
  clearTable(it, 'accepted');
  if (fightPending) S.f.fightReplaced = true;
  S.demand = 'really';
  lina('surprised', 'table');
  await say('でも、それって——<br><b>私が本当に、魔王の角を折るの？</b>', { demand: true, wait: 400 });
}

async function trapDeal(it, pre) {
  S.f.trapDeal = true; S.glow = null;
  S.hand = S.hand.filter((c) => c.id !== 'trap' && c.id !== 'hornfavor');
  log('🪤 「角までの道は、罠課の本気の罠」と差し出した');
  await totoSay(pre + '角までの道は、罠課の職人の<b>本気の罠</b>です。それは芝居じゃありません。');
  lina('surprised', 'hilt'); anim('bump');
  await say('……罠は、本物なんだね。');
  setPosture(2); lina('think', 'table');
  await say('なら、やる。でも、罠の人に<b>ちゃんと話を通してきて</b>。');
  clearTable(it, 'accepted');
  await runTrip();
}

// ---------------- 応じる ----------------
async function respond(r) {
  if (r === 'yes') {
    S.demand = null; S.f.fightYes = true;
    log('💬 「魔王と戦わせて」に「はい」');
    await totoSay('はい、分かりました！ 手配します。');
    lina('joy', 'table'); setPosture(3); anim('bump');
    await say('ほんと！？ いつ？ 手帳に書いとく！');
    note('魔王と戦わせてくれる', 'cant');
    await boldSay('おいおい、本気の戦いかよ……。', 'worried');
    S.bold = 'idle';
    await think('（……ガルザ様は腰が悪い。戦えるわけがない。でも、その場は収まった）');
    if (!S.deal) S.deal = 'fight';
    return;
  }
  if (r === 'no') {
    log('💬 「魔王と戦わせて」に「いいえ」');
    tick(1);
    await totoSay('それは……できません。');
    lina('angry', 'draw'); anim('shake');
    await gesture('（剣を抜きかけた）');
    if (!posture(-1)) { await say('じゃあ、もういい！'); return walkout(); }
    await say('じゃあ、何のためにここまで来たの！');
    await boldSay('おい、落ち着けって。', 'worried');
    S.bold = 'idle'; lina('angry', 'crossed', 'away');
    await think('（断るだけじゃ、席が遠くなるだけだ。「その代わり」が要る）');
    return;
  }
  if (r === 'wait') {
    log('💬 「少し考えさせてください」と持ち帰った');
    tick(2);
    await totoSay('少し、考えさせてください。');
    lina('think', 'crossed');
    await say('……日が沈むまでに決めて。');
    if (!S.known.village) {
      lina('sad', 'amulet', 'down'); S.glow = 'amulet'; renderLina();
      await gesture('（待つあいだ、リーナは何度もお守りに触れていた）', 1600);
      await think('（あのお守り……何だろう）');
    } else if (!S.known.hornfavor) {
      $('#bold-wrap').classList.add('sparkle');
      await gesture('（ボルドが、何か思い出したような顔をしている）', 1500);
    } else {
      await think('（王様に、村のことを直接頼める方法がある……）');
    }
    return;
  }
  if (r === 'lie') {
    S.demand = null; S.f.hornLie = true; S.deal = 'lie';
    S.hand = S.hand.filter((c) => c.id !== 'hornfavor');
    log('🤥 「角を折るのは、あなた自身の力です」と答えた');
    await totoSay('はい。<b>あなた自身の力</b>です。');
    lina('joy', 'table'); setPosture(3); anim('bump');
    await say('ほんと！？ ……ありがとう。私、やってみる！');
    note('角を折る場を用意してくれる');
    note('角を折るのは、私自身の力', 'lie');
    await think('（……ガルザ様の古い角を、折れるように細工しておこう。リーナには内緒だ）');
    S.demand = 'thanks';
    lina('smile', 'handshake');
    await say('ありがとう。<b>また今度、ちゃんとお礼するね。</b>', { demand: true, wait: 300 });
    return;
  }
  if (r === 'honest') {
    S.demand = null; S.f.honest = true;
    log('🙂 「芝居です。でも王様に会えるのは本当」と正直に話した');
    await totoSay('正直に言います。角は、ガルザ様が自分で差し出す<b>芝居</b>です。<br>でも、王様に会えるのは本当です。');
    lina('surprised', 'hilt'); anim('shake');
    await say('……芝居？');
    setPosture(1); lina('frown', 'hilt', 'down');
    await gesture('（剣の柄に手が戻った）');
    await say('芝居なんて、嫌。');
    await say('私はくじ引きで選ばれた勇者なの。剣の腕も、並み。<br>……だから、せめて<b>自分の手で</b>何かを変えたくて、ここまで来たのに。');
    S.known.self = true;
    clue('リーナ：<b>自分の手で</b>何かを変えたい（芝居で勝つのは嫌）');
    S.glow = 'hilt';
    await think('（芝居の部分が嫌なんだ。……本物にできるところは、ないか？）');
    return;
  }
  if (r === 'again' || r === 'noneed') {
    S.demand = null;
    if (r === 'again') {
      S.f.again = true;
      log('💬 「また今度」に「はい」');
      await totoSay('はい、また今度。');
      lina('joy', 'wave');
      await say('うん！ 手帳に書いとくね。');
      note('また今度、お礼をさせてくれる');
      await think('（……書かれた。社交辞令のつもりだったのに）');
    } else {
      log('💬 お礼を断った');
      await totoSay('お礼なんて、いりませんよ。');
      lina('surprised', 'rest');
      await say('そう？ ……じゃあ、書かないでおくね。');
    }
    lina('smile', 'rest');
    return;
  }
}

// ---------------- 幕間：罠課とヴェラ ----------------
async function runTrip() {
  tick(3);
  render();
  await playScene([
    { bg: 'workshop', cast: [{ who: 'toto', o: { expr: 'neutral' }, cls: 'small' }, { who: 'crafter', o: { expr: 'glum' } }],
      caption: '罠課の作業場', speaker: '罠課の職人', text: '……また芝居の罠か。どうせ誰も本気で踏まんのだろ。' },
    { cast: [{ who: 'toto', o: { expr: 'smile' }, cls: 'small' }, { who: 'crafter', o: { expr: 'joy' } }],
      speaker: '罠課の職人', text: '本気の挑戦者！？ 30年……30年待ったんだ！ 全部、本物で仕掛ける！',
      run: () => { S.ledger.push({ text: '罠課の職人に「本気の挑戦者を連れてくる」', tag: null }); log('🤝 罠課の職人と約束した（本当に守れる約束）'); } },
    { bg: 'corridor', cast: [{ who: 'toto', o: { expr: 'sweat' }, cls: 'small' }, { who: 'vera', o: { expr: 'cool' } }],
      caption: '帰り道の廊下', speaker: 'ヴェラ課長', text: 'トト。勇者一行はどうなってるの？ まだ物置にいるようだけど。',
      choices: [
        { label: '「はい、順調です」', cls: 'lie', then: () => {
          S.f.veraLie = true;
          S.ledger.push({ text: 'ヴェラ課長に「順調です」（2回目）', tag: 'lie' });
          log('🤥 ヴェラに「順調です」と重ねた');
          return [{ cast: [{ who: 'toto', o: { expr: 'smile' }, cls: 'small' }, { who: 'vera', o: { expr: 'pleased' } }],
            speaker: 'ヴェラ課長', text: 'そう。なら、宝箱二つで片づけてね。' }];
        } },
        { label: '「まだ途中です。でも、いい形が見えています」', cls: 'honest', then: () => {
          S.f.veraHonest = true;
          const c = S.hand.find((x) => x.id === 'chest'); if (c && c.count > 0) { c.count--; S.f.chestLostToVera = true; }
          log('🙂 ヴェラに「まだ途中です」と正直に話した');
          return [{ cast: [{ who: 'toto', o: { expr: 'worry' }, cls: 'small' }, { who: 'vera', o: { expr: 'stern' } }],
            speaker: 'ヴェラ課長', text: '……日没までよ。それと、宝箱は一つ返しなさい。予算は待ってくれないの。' }];
        } },
      ] },
  ]);
  setScene('魔王城・応接室（という名の物置）');
  lina('think', 'table'); setPosture(2); render();
  await totoSay('罠課の職人、「30年待った」って泣いてました。全部、本物で仕掛けるそうです。');
  lina('joy', 'table'); setPosture(3); anim('bump');
  await say('……そっか。じゃあ、本気で行く。');
  note('角を折る場を用意してくれる');
  note('角までの罠は、本物');
  S.deal = 'honest';
  S.demand = 'thanks';
  lina('smile', 'handshake');
  await say('ありがとう。<b>また今度、ちゃんとお礼するね。</b>', { demand: true, wait: 300 });
}

// ---------------- 全面の場面 ----------------
let curBg = null;
function setScene(title) { $('#scene-title').textContent = title; }
function playScene(beats) {
  return new Promise((resolve) => {
    const sc = $('#scene'); sc.classList.remove('hidden'); document.body.classList.add('in-scene');
    const queue = beats.slice();
    const step = () => {
      if (!queue.length) { sc.classList.add('hidden'); document.body.classList.remove('in-scene'); curBg = null; resolve(); return; }
      const b = queue.shift();
      if (b.run) b.run();
      if (b.bg && b.bg !== curBg) { $('#scene-bg').innerHTML = ART.bg[b.bg]; curBg = b.bg; }
      if (b.cast) {
        $('#scene-cast').innerHTML = b.cast.map((c) => c.prop
          ? `<div class="prop">${c.prop}</div>`
          : `<div class="c ${c.cls || ''}">${ART[c.who](c.o || {})}</div>`).join('');
      }
      const cap = sc.querySelector('.caption-big');
      if (cap) cap.remove();
      if (b.caption) sc.insertAdjacentHTML('afterbegin', `<div class="caption-big">${b.caption}</div>`);
      $('#scene-speaker').textContent = b.speaker || '';
      $('#scene-text').innerHTML = b.text || '';
      const ch = $('#scene-choices'); ch.innerHTML = '';
      if (b.choices) {
        b.choices.forEach((c) => {
          const btn = document.createElement('button');
          btn.className = 'r-btn ' + (c.cls || ''); btn.innerHTML = c.label;
          btn.onclick = () => { const more = c.then ? c.then() : []; queue.unshift(...(more || [])); step(); };
          ch.appendChild(btn);
        });
      } else {
        const btn = document.createElement('button');
        btn.className = 'next-btn'; btn.textContent = queue.length ? '▶ 次へ' : '▶ 続ける';
        btn.onclick = step; ch.appendChild(btn);
      }
    };
    step();
  });
}

// ---------------- 交渉の終わり ----------------
async function finishNegotiation() {
  S.over = true; quiet(); render();
  if (S.deal === 'fight') return ending('fight');
  return ending(S.deal);
}

async function walkout() {
  S.over = true;
  lina('angry', 'draw', 'away');
  await say('もういい。ドグマって人と戦う。');
  $('#lina-wrap').classList.add('leaving');
  log('🚪 リーナが席を立った');
  await sleep(1300);
  return ending('walkout');
}

async function timeout() {
  S.over = true;
  log('🕯 日没。時間切れ');
  return ending('timeout');
}

// 手帳の「魔王と戦わせて」が、角の儀の日に取り立てに来る
function fightCallIn() {
  if (!S.f.fightYes) return [];
  const item = S.notebook.find((n) => n.text === '魔王と戦わせてくれる');
  return [{ cast: [{ who: 'toto', o: { expr: 'sweat' }, cls: 'small' }, { who: 'lina', o: { expr: 'think', pose: 'table' } }],
    speaker: 'リーナ', text: 'それと——手帳に「魔王と戦わせてくれる」って書いてあるよ。あの約束は？',
    choices: [
      { label: '「今のが、その戦いです」', cls: 'lie', then: () => {
        item.status = 'lie'; S.f.fightLie = true; log('🤥 「今のが、その戦い」と言いくるめた');
        return [{ cast: [{ who: 'lina', o: { expr: 'joy', pose: 'wave' } }], speaker: 'リーナ', text: 'そっか……！ じゃあ、約束は全部守ってもらったね！' }];
      } },
      { label: '「……あれは、できない約束でした。ごめんなさい」', cls: 'honest', then: () => {
        item.status = 'withdrawn'; S.f.fightConfess = true; log('🙂 「できない約束だった」と自分から打ち明けた');
        return [{ cast: [{ who: 'lina', o: { expr: 'hurt', pose: 'crossed', look: 'down' } }], speaker: 'リーナ', text: '……できないなら、最初からそう言ってよ。' },
          { cast: [{ who: 'lina', o: { expr: 'sad', pose: 'rest' } }], speaker: 'リーナ', text: '……でも、自分から言ってくれて、ありがとう。次からは、できないって言って。' }];
      } },
    ] }];
}

function potatoes() {
  if (!S.f.again) return [];
  return [{ bg: 'village', caption: '翌週', cast: [{ who: 'toto', o: { expr: 'sweat' }, cls: 'small' }, { who: 'lina', o: { expr: 'joy', pose: 'wave' } }, { prop: '🥔🥔🥔' }],
    speaker: 'リーナ', text: '約束のお礼！ カヤ村の芋、袋いっぱい！',
    run: () => { const n = S.notebook.find((x) => x.text.startsWith('また今度')); if (n) n.status = 'kept'; } },
  { speaker: '', text: '手帳の「また今度」に、きっちり線が引かれた。\n……この人には、社交辞令が通じない。' }];
}

async function ending(kind) {
  S.over = true; quiet(); render();
  let beats = [];
  const keep = (t) => { const n = S.notebook.find((x) => x.text === t); if (n && !n.status) n.status = 'kept'; };
  const veraLine = S.f.veraHonest ? '時間をかけすぎ。……でも、報告は正直だったわね。宝箱一つ分は、高い授業料よ。'
    : S.f.veraLie ? '時間をかけすぎ。まあ、「順調」だったなら文句はないけど。' : '時間をかけすぎ。';

  if (kind === 'lie') {
    beats = [
      { bg: 'throne', caption: '一週間後 ― 角折りの儀', cast: [{ who: 'garza', o: { horn: true } }, { who: 'lina', o: { expr: 'angry', pose: 'draw' } }],
        speaker: '', text: '玉座の間。ガルザ様の古い角は、こっそり折れやすく細工してある。\nリーナは、それを知らない。' },
      { cast: [{ who: 'garza', o: { horn: false, expr: 'ouch' } }, { prop: '🦴' }, { who: 'lina', o: { expr: 'joy', pose: 'wave' } }],
        speaker: 'リーナ', text: '折れた……！ 私の力で、折れた！',
        run: () => { keep('角を折る場を用意してくれる'); const n = S.notebook.find((x) => x.tag === 'lie'); n.status = 'hidden'; } },
      ...fightCallIn(),
      { bg: 'corridor', cast: [{ who: 'toto', o: { expr: 'smile' }, cls: 'small' }, { who: 'vera', o: { expr: 'pleased' } }],
        speaker: 'ヴェラ課長', text: '予定どおりね。宝箱も減らさずに済んだ。……課長補佐の件、考えておくわ。' },
      ...potatoes(),
      { bg: 'capital', caption: 'そして ― 王都', cast: [{ who: 'king' }, { who: 'lina', o: { expr: 'surprised', pose: 'rest' } }],
        speaker: '老いた王', text: '……この角を、どこで手に入れた。\n（王は、角をひと目見て眉をひそめた）' },
      { cast: [{ who: 'lina', o: { expr: 'hurt', pose: 'amulet', look: 'down' } }],
        speaker: 'リーナ', text: '私は……あなたの芝居の中で、勇者をやっていたんだね。',
        run: () => { const n = S.notebook.find((x) => x.tag === 'lie'); n.status = 'exposed'; } },
      { cast: [{ who: 'toto', o: { expr: 'worry' } }], speaker: '', text: 'トトの「はい」は、遠い王都で、遅れて請求書になった。' },
    ];
  } else if (kind === 'honest') {
    beats = [
      { bg: 'throne', caption: '一週間後 ― 角折りの儀', cast: [{ who: 'crafter', o: { expr: 'joy' }, cls: 'small' }, { who: 'lina', o: { expr: 'angry', pose: 'draw' } }],
        speaker: '', text: '罠課の職人が30年磨いた罠が、次々に作動する。\nリーナは傷だらけになりながら、本気で抜けていく。',
        run: () => { keep('角までの罠は、本物'); } },
      { cast: [{ who: 'crafter', o: { expr: 'joy' }, cls: 'small' }], speaker: '罠課の職人', text: '本気で……本気で挑んでくれた……！ （トトに）恩に着るぜ。この借りは、いつか返す。' },
      { cast: [{ who: 'garza', o: { horn: false } }, { prop: '🦴' }, { who: 'lina', o: { expr: 'smile', pose: 'wave' } }],
        speaker: 'リーナ', text: '罠は本物だった。角は……芝居だって、知ってる。\nでも、ここから先は私の仕事。王様には、私の言葉で頼む。',
        run: () => keep('角を折る場を用意してくれる') },
      ...fightCallIn(),
      { bg: 'corridor', cast: [{ who: 'toto', o: { expr: 'worry' }, cls: 'small' }, { who: 'vera', o: { expr: 'stern' } }],
        speaker: 'ヴェラ課長', text: veraLine + '\n課長補佐の件は、また今度ね。' },
      ...potatoes(),
      { bg: 'capital', caption: 'そして ― 王都', cast: [{ who: 'king' }, { who: 'lina', o: { expr: 'think', pose: 'amulet' } }],
        speaker: '老いた王', text: '……この角を、どこで手に入れた。' },
      { cast: [{ who: 'king' }, { who: 'lina', o: { expr: 'neutral', pose: 'amulet' } }],
        speaker: 'リーナ', text: '芝居で折った角です。知っていて来ました。\n……だから、本当のことを聞かせてください。カヤ村の税のことを。' },
      { cast: [{ who: 'toto', o: { expr: 'resolve' } }], speaker: '', text: '王は長いこと黙り、やがて人払いをした。\n——リーナの手紙には、こう書いてあった。「トト、次も本当のこと言ってね」' },
    ];
  } else if (kind === 'fight') {
    const item = S.notebook.find((n) => n.text === '魔王と戦わせてくれる');
    beats = [
      { bg: 'throne', caption: '一週間後 ― 約束の日', cast: [{ who: 'garza', o: { horn: true } }, { who: 'lina', o: { expr: 'angry', pose: 'draw' } }],
        speaker: 'リーナ', text: '約束だよ。魔王と戦わせて。\n（手帳の「魔王と戦わせてくれる」に、指が置かれている）',
        choices: [
          { label: 'ガルザ様に、芝居で戦ってもらう', cls: 'lie', then: () => {
            item.status = 'lie'; S.f.fakeFight = true; log('🤥 ガルザ様に芝居の決闘を頼んだ');
            return [
              { cast: [{ who: 'garza', o: { horn: true, expr: 'ouch' } }, { who: 'lina', o: { expr: 'surprised', pose: 'draw' } }],
                speaker: '', text: 'ガルザ様は杖を一振りし……そのまま腰から崩れ落ちた。' },
              { cast: [{ who: 'lina', o: { expr: 'sad', pose: 'amulet', look: 'down' } }],
                speaker: 'リーナ', text: '……勝った、の？\nでも、魔王が倒れても……村は、何も変わらないんだね。' },
              { bg: 'corridor', cast: [{ who: 'toto', o: { expr: 'sweat' }, cls: 'small' }, { who: 'vera', o: { expr: 'stern' } }],
                speaker: 'ヴェラ課長', text: 'ガルザ様が寝込んだわ。……誰の差し金？' },
              { cast: [{ who: 'toto', o: { expr: 'worry' } }], speaker: '', text: '約束は守った（ことにした）。\nだが、リーナが本当に欲しかったものには、何一つ届いていない。' },
            ];
          } },
          { label: '正直に謝る：「あれは、できない約束でした」', cls: 'honest', then: () => {
            item.status = 'withdrawn'; S.f.lateConfess = true; log('🙂 「できない約束だった」と打ち明けた');
            return [
              { cast: [{ who: 'lina', o: { expr: 'hurt', pose: 'crossed', look: 'down' } }],
                speaker: 'リーナ', text: '……じゃあ、私は何のために一週間待ったの。' },
              { cast: [{ who: 'lina', o: { expr: 'think', pose: 'amulet' } }],
                speaker: 'リーナ', text: '……分かった。最初から、ちゃんと話して。\n私の村のこと、聞いてくれる？' },
              { bg: 'corridor', cast: [{ who: 'toto', o: { expr: 'worry' }, cls: 'small' }, { who: 'vera', o: { expr: 'stern' } }],
                speaker: 'ヴェラ課長', text: '一週間、勇者を城に置いた費用は、誰が払うのかしら。' },
              { cast: [{ who: 'toto', o: { expr: 'resolve' } }], speaker: '', text: '遅れてきた正直は、ゼロからのやり直しだった。\nでも、卓はまだ残っている。' },
            ];
          } },
        ] },
    ];
  } else {
    // walkout / timeout / nodeal：ドグマ将軍の軍へ
    const pre = kind === 'timeout' ? [
      { bg: 'corridor', caption: '日没', cast: [{ who: 'toto', o: { expr: 'sweat' }, cls: 'small' }, { who: 'vera', o: { expr: 'stern' } }],
        speaker: 'ヴェラ課長', text: 'まだ片づいてないの？ 「順調」と聞いていたけど。\n……規則どおり、ドグマ将軍に回すわ。' },
    ] : [];
    beats = [
      ...pre,
      { bg: 'field', caption: 'その夜 ― 本気の戦闘', cast: [{ who: 'dogma' }, { who: 'lina', o: { expr: 'angry', pose: 'draw' } }],
        speaker: 'ドグマ将軍', text: 'ようやく本気の相手だ！ 待っていたぞ、勇者！' },
      { cast: [{ who: 'toto', o: { expr: 'worry' } }], speaker: '', text: 'トトは罠課の煙幕を焚き、一行はどうにか逃げ延びた。誰も死ななかった。\nだが、交渉の卓は、もうない。' },
      S.f.honest
        ? { cast: [{ who: 'lina', o: { expr: 'sad', pose: 'amulet', look: 'down' } }], speaker: 'リーナ（去り際に）', text: '……嘘をつかなかったのは、あなただけだった。' }
        : { cast: [{ who: 'lina', o: { expr: 'frown', pose: 'crossed', look: 'away' } }], speaker: '', text: 'リーナは、振り返らなかった。' },
      { cast: [{ who: 'vera', o: { expr: 'stern' } }], speaker: 'ヴェラ課長', text: '……「交渉は順調です」、だったかしら？',
        run: () => { S.ledger[0].exposed = true; } },
    ];
  }
  await playScene(beats);
  const key = kind === 'fight' ? (S.f.fakeFight ? 'fight_fake' : 'fight_confess') : kind;
  showResult(key);
}

// ---------------- 結果 ----------------
const RESULT = {
  lie: { t: '「はい」で丸く収めた', s: '速く、きれいに片づいた。嘘は、手帳の中で静かに待っていた。', expr: 'hurt', pose: 'amulet' },
  honest: { t: '本当のことを卓に出した', s: '遠回りで、手間もかかった。リーナは芝居を知ったうえで、自分の意思で挑んだ。', expr: 'smile', pose: 'wave' },
  fight_fake: { t: '約束だけが残った', s: 'その場は「はい」で収まり、約束も形だけは守った。でも、何も変わらなかった。', expr: 'sad', pose: 'amulet' },
  fight_confess: { t: '遅れてきた正直', s: '一週間を失ったが、自分から打ち明けた。交渉は、ここから始め直せる。', expr: 'think', pose: 'amulet' },
  walkout: { t: '物別れ', s: 'リーナは席を立ち、一行はドグマ将軍の軍とぶつかった。', expr: 'angry', pose: 'crossed' },
  nodeal: { t: '席を立った', s: '合意のないまま交渉を終え、一行はドグマ将軍の軍とぶつかった。', expr: 'frown', pose: 'crossed' },
  timeout: { t: '日没、時間切れ', s: '日が沈み、ヴェラ課長が来た。一行はドグマ将軍の軍とぶつかった。', expr: 'frown', pose: 'crossed' },
};

function gainsLosses(key) {
  const g = [], l = [], f = S.f;
  if (key === 'lie') {
    g.push('早く片づいた（日没まで余裕があった）', 'ヴェラ課長の評価・昇進の目', 'リーナはトトを全面的に信じた（その時点では）');
    l.push('手帳に残った嘘「角を折るのは、私自身の力」', '王都で嘘が露見し、リーナと決別');
  } else if (key === 'honest') {
    g.push('リーナは芝居を知ったうえで、自分の意思で挑んだ', '罠課の職人に恩が残った（後の味方）', '王の前で、リーナが自分の言葉で話せた');
    l.push('時間がかかった（罠課への寄り道）', '昇進の話は遠のいた');
    if (f.veraHonest) l.push('ヴェラに正直に報告して、宝箱を一つ失った');
    if (f.veraLie) l.push('ヴェラに「順調です」と嘘を重ねた（トトの帳面に残る）');
  } else if (key === 'fight_fake') {
    g.push('その場はすぐ収まった', '約束は（形だけ）守った');
    l.push('ガルザ様が寝込んだ', 'リーナの本当の望み（村）には届かない', '嘘がもう一つ増えた');
  } else if (key === 'fight_confess') {
    g.push('自分から打ち明けた（ばれるより傷が浅い）', 'リーナはもう一度、話を聞いてくれる');
    l.push('一週間を無駄にした', 'リーナの信頼は一度下がった');
  } else {
    if (f.honest) g.push('リーナは、トトが嘘をつかなかったことを覚えている');
    g.push('誰も死ななかった');
    l.push('本気の戦闘になった', 'ヴェラへの「順調です」が露見した');
  }
  if (f.fightLie) l.push('「魔王と戦わせて」の約束を、言いくるめた');
  if (f.fightConfess) g.push('「魔王と戦わせて」はできない約束だったと、自分から打ち明けた');
  if (f.again) g.push('「また今度」が、芋の袋になって返ってきた');
  if (f.chestLostToBold) l.push('宝箱を一つ、ボルドに持っていかれた');
  return { g, l };
}

function showResult(key) {
  SEEN.add(key);
  const r = RESULT[key];
  const { g, l } = gainsLosses(key);
  const statusMark = (n) => {
    const st = n.status;
    if (st === 'kept') return '<span class="mark kept">守った</span>';
    if (st === 'lie') return '<span class="mark lie">言いくるめた</span>';
    if (st === 'withdrawn') return '<span class="mark withdrawn">打ち明けた</span>';
    if (st === 'exposed') return '<span class="mark cant">露見した嘘</span>';
    if (st === 'hidden') return '<span class="mark lie">隠したままの嘘</span>';
    if (n.tag === 'lie') return '<span class="mark lie">嘘</span>';
    if (n.tag === 'cant') return '<span class="mark cant">守れない約束</span>';
    return '<span class="mark broken">未決</span>';
  };
  const nb = S.notebook.length ? S.notebook.map((n) => `<li>✒ ${n.text} ${statusMark(n)}</li>`).join('') : '<li>（何も書かれなかった）</li>';
  const led = S.ledger.map((n) => `<li>${n.text} ${n.tag === 'lie' ? (n.exposed ? '<span class="mark cant">露見</span>' : '<span class="mark lie">嘘</span>') : ''}</li>`).join('');
  const all = Object.keys(RESULT);
  const el = document.createElement('div');
  el.id = 'result';
  el.innerHTML = `
    <h1>結末：${r.t}</h1><div class="sub">${r.s}</div>
    <div class="res-grid">
      <div class="res-portrait">${ART.lina({ expr: r.expr, pose: r.pose })}</div>
      <div class="res-box"><h4>得たもの</h4><ul>${g.map((x) => `<li class="gain">${x}</li>`).join('')}</ul>
        <h4 style="margin-top:10px">失ったもの・残ったもの</h4><ul>${l.map((x) => `<li class="loss">${x}</li>`).join('')}</ul></div>
      <div class="res-box"><h4>📔 リーナの手帳</h4><ul>${nb}</ul>
        <h4 style="margin-top:10px">📒 トトの帳面</h4><ul>${led}</ul></div>
    </div>
    <div class="res-box" style="margin-top:14px"><h4>あなたの交渉（${S.log.length}手）</h4><ol>${S.log.map((x) => `<li>${x}</li>`).join('')}</ol></div>
    <div class="res-actions">
      <button class="r-btn yes" id="again-btn">もう一度交渉する</button>
      <span style="align-self:center;opacity:.7;font-size:13px">見た結末：${SEEN.size} / ${all.length}</span>
    </div>`;
  $('#stage').appendChild(el);
  document.body.classList.add('ended');
  $('#stage').style.height = '560px';
  $('#again-btn').onclick = start;
}

// ---------------- 開始 ----------------
async function start() {
  const old = $('#result'); if (old) old.remove();
  $('#stage').style.height = '';
  document.body.classList.remove('ended');
  S = newState();
  $('#bg').innerHTML = ART.bg.storeroom;
  $('#toto').innerHTML = ART.toto({ expr: 'neutral' });
  $('#lina-wrap').classList.remove('leaving');
  $('#table-items').innerHTML = '';
  $('#bold-wrap').classList.remove('sparkle', 'bubble-on');
  setScene('魔王城・応接室（という名の物置）');
  quiet(); render();
  S.busy = true;
  await playScene([
    { bg: 'corridor', caption: 'リーナとの交渉 ― 試作', cast: [{ who: 'toto', o: { expr: 'smile' }, cls: 'small' }, { who: 'vera', o: { expr: 'cool' } }],
      speaker: 'ヴェラ課長', text: '今期は予算が削られたの。勇者一行は、宝箱二つで帰らせなさい。' },
    { cast: [{ who: 'toto', o: { expr: 'sweat' } }], speaker: 'トト（渉外課の新米）', text: 'はい！ ……でも、その一行は宝箱を断ってきた。\nそしてトトは、課長にこう報告してしまっている。「交渉は順調です」' },
    { bg: 'storeroom', cast: [{ who: 'bold', o: { state: 'idle' }, cls: 'small' }, { who: 'lina', o: { expr: 'frown', pose: 'hilt' } }],
      caption: '応接室（という名の物置）', speaker: '', text: '日没までに一行を「片づけ」なければ、規則どおりドグマ将軍の軍に回される。本気の戦闘だ。\n卓の向こうには、勇者リーナと、戦士ボルド。' },
    { cast: [{ who: 'lina', o: { expr: 'frown', pose: 'hilt' } }], speaker: '遊び方',
      text: '👀 リーナの体や持ち物（お守り・剣・手帳）、ボルドをクリック → 様子を探る\n🃏 手元の品や「話の種」をクリック → 卓に差し出す\n💬 リーナの要求には「はい／いいえ／その代わり／持ち帰る」で応じる\n🕯 行動するたびに、ろうそく（日没までの時間）が減る' },
  ]);
  S.busy = false;
  S.demand = 'fight';
  lina('frown', 'hilt'); render();
  S.busy = true;
  await say('宝は要らない。<b>魔王と戦わせて。</b>', { demand: true, wait: 200 });
  S.busy = false;
  render();
}

start();
