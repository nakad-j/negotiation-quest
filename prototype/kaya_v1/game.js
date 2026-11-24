// game.js — カヤ村の畑：案を組み立てて、ふたりと交渉する試作
//
// しくみ（小さく保つ）
//  ・案は5つの部分からなる一文。部分ごとに言葉を入れ替え・付け足しできる。
//  ・話を聞く／物を見ると、トトが「案に使える言葉」を思いつく（選択肢が増える）。
//  ・案を出すと、リーナとガンタがそれぞれ言葉ごとに ✓△✕ をつけ、いちばんの不満と対案を返す。
//  ・ふたりの対案はぶつかることがある。両方をのめる形を、プレイヤーが考える。
//  ・反応は履歴で変わる（対案を取り入れた／同じ✕を繰り返した／打ち明けた恐れに応えた）。
// 調整したいときは OPT（言葉）・INFO（聞ける話）・evalLina / evalGanta（評価）を書き換える。

const $ = (s) => document.querySelector(s);
const SPEED = new URLSearchParams(location.search).has('fast') ? 0.12 : 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms * SPEED));
const MAX_ROUNDS = 6;

// ---------------- 案の部分と言葉 ----------------
const SLOTS = [
  { id: 'W', lead: '魔物たちは', max: 2, joiner: '。そして' },
  { id: 'G', lead: 'その代わり、村は', max: 2, joiner: '。さらに' },
  { id: 'P', lead: '渡し方は、', max: 1 },
  { id: 'T', lead: '始め方は、', max: 1 },
  { id: 'S', lead: '約束を守るために、', max: 2, optional: true, joiner: '。そして' },
];
const OPT = {
  w_none: { slot: 'W', t: '村を襲わないと約束する' },
  w_till: { slot: 'W', t: '荒れた畑を耕し直す', lock: true },
  w_canal: { slot: 'W', t: '崩れた水路を掘り直す', lock: true },
  g_big: { slot: 'G', t: '穀物をたっぷり渡す' },
  g_small: { slot: 'G', t: '穀物を少しずつ渡す' },
  g_land: { slot: 'G', t: '空いた畑を貸す', lock: true },
  g_seed: { slot: 'G', t: '種と育て方を教える', lock: true },
  p_pre: { slot: 'P', t: '先に渡す' },
  p_post: { slot: 'P', t: '仕事を見届けてから渡す' },
  p_weekly: { slot: 'P', t: '毎週、働いた分だけ渡す', lock: true },
  t_full: { slot: 'T', t: 'すぐ村じゅうで始める' },
  t_trial: { slot: 'T', t: 'まず畑一枚で、ひと月だけ試す' },
  s_noweapon: { slot: 'S', t: '魔物は武器を村の外に置く' },
  s_watch: { slot: 'S', t: '村の見張りが仕事を見張る' },
  s_bond: { slot: 'S', t: '証文を交わし、トトが立会人になる' },
  s_joint: { slot: 'S', t: '両方から人を出し、並んで働く', lock: true },
  s_day: { slot: 'S', t: '働くのは昼のあいだだけにする', lock: true },
};

// ---------------- 聞ける話・見られる物 ----------------
const INFO = {
  l_want: { who: 'lina', q: '村にとって、いちばん大事なことは？', kind: '望み', face: ['sad', 'amulet'], gest: 'お守りを握った',
    a: '畑を取り戻したい。水路が崩れてから、半分の畑が干上がったまま。', note: '畑を取り戻したい。崩れた水路のせいで、半分の畑が干上がっている', unlock: ['w_canal'] },
  l_fear: { who: 'lina', q: 'この話し合いで、何が怖い？', kind: '恐れ', face: ['frown', 'crossed'], gest: '腕を組んだ',
    a: '魔物を村に入れたら……夜に、また襲われるかもしれない。', note: '魔物を村に入れて、夜に襲われるのが怖い', unlock: ['s_day'] },
  l_have: { who: 'lina', q: '村から出せるものは？', kind: '事情', face: ['think', 'rest'], gest: '目をそらした',
    a: '穀物は、少ししか出せない。蓄えの半分は税で持っていかれるから。', note: '穀物は少ししか出せない（税で持っていかれる）', unlock: [] },
  map: { who: 'lina', look: true, kind: '見たもの', face: ['sad', 'rest'], gest: '地図を指でなぞった',
    a: '×印の畑は、耕す人がいないの。若い人は、みんな都へ出ていった。', note: '耕す人がいなくて、空いたままの畑がたくさんある', unlock: ['g_land'] },
  g_want: { who: 'ganta', q: '谷がいちばん欲しいものは？', kind: '望み', face: ['sad', 'rest'], gest: '帽子のつばを下げた',
    a: '冬を越す食い物だ。あと二月で雪が来る。……それと、いつまでも「敵」と呼ばれるのは、もうごめんだ。', note: '冬を越す食べ物（あと二か月で雪）。いつまでも敵扱いされたくない', unlock: ['s_joint'] },
  g_fear: { who: 'ganta', q: '人間と取引するのが、なぜ怖い？', kind: '恐れ', face: ['angry', 'crossed'], gest: '拳を握った',
    a: '前に人間の町で石を運んだ。ひと月働いて、最後に「魔物に払う金はない」と追い出された。', note: '働いても払われないのが怖い（前に踏み倒された）', unlock: ['p_weekly'] },
  g_have: { who: 'ganta', q: '谷の魔物には、何ができる？', kind: 'できること', face: ['smile', 'open'], gest: '太い腕を広げた',
    a: '土を掘るのは得意だ。魔王城の地下道も、わしらが掘った。', note: '土を掘る・耕すのが得意', unlock: ['w_till'] },
  sack: { who: 'ganta', look: true, kind: '見たもの', face: ['sad', 'chin'], gest: '空の袋を叩いた',
    a: '空っぽの種袋だ。谷の畑は焼けて、何を植えても育たん。育て方を知る年寄りも、もうおらん。', note: '谷の畑は焼けて、育て方を知る者もいない', unlock: ['g_seed'] },
};
const NAME = { lina: 'リーナ', ganta: 'ガンタ' };

// ---------------- 状態 ----------------
let S;
const SEEN = new Set();
function newState() {
  return {
    prop: { W: ['w_none'], G: ['g_small'], P: ['p_post'], T: ['t_full'], S: [] },
    unlocked: new Set(Object.keys(OPT).filter((k) => !OPT[k].lock)),
    fresh: new Set(), // 思いついたばかりの言葉（💡新）
    known: new Set(),
    notes: [],
    marks: {}, // optId -> { lina, ganta }
    counters: [], // 今出ている対案
    lastCounter: {}, // 前回の対案（取り入れたか判定する）
    lastNo: { lina: [], ganta: [] },
    lastSent: null, // 前回出した案（変更箇所を示す）
    trust: { lina: 0, ganta: 0 },
    patience: { lina: 3, ganta: 3 },
    rounds: MAX_ROUNDS,
    history: [],
    face: { lina: { expr: 'frown', pose: 'crossed' }, ganta: { expr: 'neutral', pose: 'crossed' } },
    posture: { lina: 1, ganta: 1 },
    busy: false, over: false, agreed: null,
  };
}
const ids = (p = S.prop) => Object.values(p).flat();
const has = (id, p = S.prop) => ids(p).includes(id);
const sentKey = (p) => ids(p).slice().sort().join(',');

// ---------------- 評価：リーナ ----------------
function evalLina(p) {
  const H = (id) => has(id, p), m = {}, lines = [], breakers = [];
  let score = 0, counter = null, cw = 0;
  const say = (t, w) => lines.push({ t, w });
  const want = (c, w) => { if (w > cw) { counter = c.add ? { to: c.add, t: c.t } : c; cw = w; } };
  const work = H('w_till') || H('w_canal');

  if (H('w_none')) {
    if (work) m.w_none = 'ok';
    else { m.w_none = 'no'; score -= 3; say('襲わないって約束だけ？ 畑は荒れたまま。それじゃ、見逃し料を払うのと同じ。', 5);
      want({ from: 'w_none', to: 'w_till', t: '荒らした畑を、元に戻してくれるなら話は別。' }, 5); }
  }
  if (H('w_till')) { m.w_till = 'ok'; score += 2; say('畑が戻るなら、助かる。', 1); }
  if (H('w_canal')) { m.w_canal = 'ok'; score += 3; say('水路が戻れば、干上がった畑が生き返る。', 2); }

  if (H('g_big')) { m.g_big = 'no'; breakers.push('g_big'); say('そんなに出せない。蓄えの半分は税で持っていかれるの。', 6);
    want({ from: 'g_big', to: 'g_small', t: '少しずつなら、なんとか出せる。' }, 6); }
  if (H('g_small')) { m.g_small = 'meh'; score -= 1; say('少しずつなら……なんとか。', 1); }
  if (H('g_land')) { m.g_land = 'ok'; say('空いた畑なら、遊ばせておくよりいい。', 1); }
  if (H('g_seed')) { m.g_seed = 'meh'; score -= 1; say('育て方まで教えるの？ いつか、村の畑を取られない？', 3); }

  if (H('p_pre')) { m.p_pre = 'no'; score -= 3; say('先に渡して、そのまま逃げられたら？', 5);
    want({ from: 'p_pre', to: 'p_post', t: '渡すのは、仕事を見届けてから。' }, 5); }
  if (H('p_post')) { m.p_post = 'ok'; score += 2; }
  if (H('p_weekly')) { m.p_weekly = 'ok'; score += 1; say('働いた分だけなら、損はしない。', 1); }

  if (H('t_trial')) { m.t_trial = 'ok'; score += 1; say('畑一枚からなら、様子が見られる。', 2); }
  if (H('t_full')) m.t_full = 'ok';

  // 魔物を村に入れるなら、安心の材料が要る
  if (work) {
    const safe = (H('s_noweapon') ? 1 : 0) + (H('s_watch') ? 2 : 0) + (H('s_joint') ? 1 : 0) + (H('s_bond') ? 1 : 0) + (H('s_day') ? 2 : 0) + (H('t_trial') ? 2 : 0);
    ['s_noweapon', 's_watch', 's_joint', 's_day'].forEach((s) => { if (H(s)) m[s] = 'ok'; });
    if (H('s_bond')) { m.s_bond = safe - 1 >= 2 ? 'ok' : 'meh'; if (m.s_bond === 'meh') say('紙切れ一枚で、牙が止まるの？', 3); }
    if (H('s_joint')) say('一緒に働く……見張りにもなるね。', 2);
    if (safe < 3) {
      breakers.push('safe');
      if (H('t_full')) m.t_full = 'meh';
      say('魔物を村に入れるのは……まだ怖い。何かあったら、誰が止めるの？', 6);
      if (!H('s_watch')) want({ add: 's_watch', t: '村の見張りを、そばにつけさせて。' }, 6);
      else if (!H('s_noweapon')) want({ add: 's_noweapon', t: '武器は、村の外に置いていって。' }, 6);
      else want({ from: 't_full', to: 't_trial', t: 'いきなり村じゅうは無理。まず小さく。' }, 6);
    }
  } else {
    ['s_noweapon', 's_watch', 's_joint', 's_bond', 's_day'].forEach((s) => { if (H(s)) m[s] = 'ok'; });
  }
  if (H('s_day') && S.known.has('l_fear')) { score += 1; say('……夜が怖いって言ったこと、覚えててくれたんだ。', 4); }
  score += S.trust.lina;
  return { m, score, breakers, lines, counter, accept: !breakers.length && score >= 2 };
}

// ---------------- 評価：ガンタ ----------------
function evalGanta(p) {
  const H = (id) => has(id, p), m = {}, lines = [], breakers = [];
  let score = 0, counter = null, cw = 0;
  const say = (t, w) => lines.push({ t, w });
  const want = (c, w) => { if (w > cw) { counter = c.add ? { to: c.add, t: c.t } : c; cw = w; } };

  // 食べ物：冬を越せるか
  let food = (H('g_big') ? 4 : 0) + (H('g_small') ? 2 : 0) + (H('g_land') ? 2 : 0) + (H('g_seed') ? 1 : 0) - (H('t_trial') ? 1 : 0);
  const gs = ['g_big', 'g_small', 'g_land', 'g_seed'].filter(H);
  if (food >= 3) { gs.forEach((g) => (m[g] = 'ok')); score += 1 + (food >= 5 ? 1 : 0); }
  else {
    gs.forEach((g) => (m[g] = 'meh'));
    breakers.push('food');
    say('それじゃ冬を越せん。あと二月で雪だ。', 6);
    say('……谷の畑さえ生きておれば、こんな頼みはせんのだ。', 3.5);
    if (H('t_trial') && food + 1 >= 3) want({ from: 't_trial', to: 't_full', t: 'ひと月も様子見をしていたら、雪が来る。' }, 6);
    else if (!H('g_small') && !H('g_big')) want({ add: 'g_small', t: '穀物を、せめて少しは回してくれ。' }, 6);
    else if (H('g_small')) want({ from: 'g_small', to: 'g_big', t: '少しずつでは足りん。もっとよこせ。' }, 6);
  }
  if (H('g_big')) say('それなら、若い者も腹いっぱいだ。', 1);
  if (H('g_land')) say('畑を借りれば、自分らで育てられる。', 2);
  if (H('g_seed')) { score += 1; say('種と、育て方……谷の畑が、よみがえるかもしれん。', 3); }

  if (H('w_none')) { m.w_none = 'ok'; score += 1; say('約束するだけなら、たやすい。', 1); }
  if (H('w_till')) { m.w_till = 'ok'; say('土なら任せろ。', 1); }
  if (H('w_canal')) { m.w_canal = 'ok'; say('水路か。掘るのは得意だ。', 1); }
  if (H('w_till') && H('w_canal')) {
    if (H('s_joint')) say('人間も手を貸すなら、二つともやれる。', 2);
    else { m.w_till = m.w_canal = 'meh'; score -= 1; say('畑も水路もか。手が足りん。', 3); }
  }

  if (H('p_pre')) { m.p_pre = 'ok'; score += 2; say('先にもらえるなら、文句はない。', 1); }
  if (H('p_weekly')) { m.p_weekly = 'ok'; score += 2; say('週ごとなら、食い逃げされずに済む。', 2);
    if (S.known.has('g_fear')) { score += 1; say('……わしの昔話を、聞いておったか。', 4); } }
  if (H('p_post')) {
    if (H('s_bond')) { m.p_post = 'meh'; score -= 1; say('見届けてから、か……証文があるなら、まあ。', 3); }
    else { m.p_post = 'no'; breakers.push('p_post'); say('見届けてから払う？ 前もそう言われて、一粒も払われなかった。', 6);
      want({ from: 'p_post', to: 'p_pre', t: '先に払え。話はそれからだ。' }, 6); }
  }
  if (H('t_trial') && food >= 3) { m.t_trial = 'meh'; say('畑一枚か……腹は満ちきらんが。', 2); }
  if (H('t_full')) m.t_full = 'ok';

  const nw = H('s_noweapon'), wt = H('s_watch');
  if (nw) { m.s_noweapon = 'meh'; score -= 1; say('丸腰で、人間の村に入れと？', 3); }
  if (wt) { m.s_watch = 'meh'; score -= 1; say('見張られて働くのか。罪人扱いだな。', 3);
    want({ from: 's_watch', to: 's_bond', t: '見張りなどいらん。証文で十分だ。' }, 3); }
  if (nw && wt) { m.s_noweapon = m.s_watch = 'no'; breakers.push('respect'); say('武器を取り上げて、見張りまでつける？ わしらは罪人じゃない。', 7);
    want({ from: 's_watch', to: 's_bond', t: '見張りなどいらん。証文で十分だ。' }, 7); }
  if (H('s_joint')) { m.s_joint = 'ok'; score += 2; say('並んで働く、か。……悪くない。', 3); }
  if (H('s_bond')) { m.s_bond = 'ok'; score += 1; say('書いたものは残る。', 1); }
  if (H('s_day')) m.s_day = 'ok';
  score += S.trust.ganta;
  return { m, score, breakers, lines, counter, accept: !breakers.length && score >= 2 };
}

// ---------------- 描画 ----------------
function renderChars() {
  $('#lina').innerHTML = ART.lina({ ...S.face.lina });
  $('#ganta').innerHTML = ART.ganta({ ...S.face.ganta });
  ['lina', 'ganta'].forEach((w) => {
    const el = $(`#${w}-wrap`); el.classList.remove('p0', 'p1', 'p2', 'p3'); el.classList.add('p' + S.posture[w]);
    const allDone = Object.entries(INFO).filter(([, v]) => v.who === w && !v.look).every(([k]) => S.known.has(k));
    el.querySelector('.ask-btn').classList.toggle('all-done', allDone);
  });
  // 袋（ガンタの腰）にも「見る」札
  if (!$('#sack-tag')) {
    const t = document.createElement('div'); t.id = 'sack-tag'; t.className = 'look sack-tag'; t.dataset.look = 'sack';
    t.innerHTML = '<span class="look-tag" style="position:static;transform:none">🔍 袋を見る</span>';
    $('#ganta-wrap').appendChild(t);
  }
  $('#sack-tag').classList.toggle('done', S.known.has('sack'));
  $('#map').classList.toggle('done', S.known.has('map'));
}
function renderRounds() {
  let h = '話し合い ';
  for (let i = 0; i < MAX_ROUNDS; i++) h += `<span class="lamp ${i < S.rounds ? '' : 'off'}">🏮</span>`;
  $('#rounds').innerHTML = h + ` 残り${S.rounds}回`;
}
function markHtml(id) {
  const mk = S.marks[id]; if (!mk) return '';
  const sym = { ok: '✓', meh: '△', no: '✕' };
  return `<span class="marks">${mk.lina ? `<span class="mk l ${mk.lina}" title="リーナ">${sym[mk.lina]}</span>` : ''}${mk.ganta ? `<span class="mk g ${mk.ganta}" title="ガンタ">${sym[mk.ganta]}</span>` : ''}</span>`;
}
function renderProposal() {
  const last = S.lastSent ? new Set(ids(S.lastSent)) : null;
  $('#sentence').innerHTML = SLOTS.map((sl) => {
    const list = S.prop[sl.id];
    const chips = list.map((id, i) => {
      const mk = S.marks[id];
      const challenged = mk && (mk.lina === 'no' || mk.ganta === 'no');
      const changed = last && !last.has(id);
      return `${i > 0 ? `<span class="lead">${sl.joiner}</span>` : ''}<span class="chip ${challenged ? 'challenged' : ''} ${changed ? 'changed' : ''}" data-slot="${sl.id}" data-idx="${i}">
        ${OPT[id].t}${markHtml(id)}${(sl.max > 1 && (list.length > 1 || sl.optional)) ? `<span class="x" data-rm="${sl.id}:${i}" title="外す">✕</span>` : ''}</span>`;
    }).join('');
    const canAdd = list.length < sl.max;
    const add = canAdd ? `<span class="chip add" data-slot="${sl.id}" data-idx="${list.length}">＋ ${list.length ? '付け足す' : '足す（なくてもよい）'}</span>` : '';
    return `<div class="line"><span class="lead">${sl.lead}</span>${chips}${add}${list.length ? '<span class="lead">。</span>' : ''}</div>`;
  }).join('');
  $('#counters').innerHTML = S.counters.map((c, i) => {
    const what = c.from ? `「${OPT[c.from].t}」→「${OPT[c.to].t}」` : `「${OPT[c.to].t}」を足す`;
    const done = has(c.to) && (!c.from || !has(c.from));
    return `<div class="counter ${c.who}"><span class="who">${NAME[c.who]}の対案</span><span>${what}</span>
      ${done ? '<span style="margin-left:auto;font-size:12px;opacity:.6">取り入れ済み</span>' : `<button data-counter="${i}">取り入れる</button>`}</div>`;
  }).join('');
  const same = S.lastSent && sentKey(S.lastSent) === sentKey(S.prop);
  $('#propose-btn').disabled = S.busy || S.over || same || !!S.agreed;
  $('#p-hint').textContent = S.over ? '' : same ? 'さっきと同じ案だ。どこかを変えてから出そう。'
    : S.lastSent ? '✕・△のついた言葉を直すか、対案を取り入れて、もう一度出せる。' : '言葉をクリックすると、別の言い方に変えられる。まずは出してみてもいい。';
}
function renderNotes() {
  const groups = ['lina', 'ganta'].map((w) => {
    const items = S.notes.filter((n) => n.who === w);
    return `<div class="n-group"><div class="n-who ${w}">${NAME[w]}${w === 'lina' ? '（カヤ村）' : '（北の谷）'}</div>
      ${items.length ? items.map((n) => `<div class="n-item"><span class="k">${n.kind}</span>${n.text}${n.idea ? `<span class="idea">💡 案に使える：${n.idea}</span>` : ''}</div>`).join('')
        : '<div class="n-empty">まだ聞いていない。「💬 話を聞く」から。</div>'}</div>`;
  });
  $('#notes-body').innerHTML = groups.join('');
}
function render() {
  renderChars(); renderRounds(); renderProposal(); renderNotes();
  document.body.classList.toggle('busy', S.busy);
}

// ---------------- 演出 ----------------
function bubble(who, text, { gest = '', cls = '' } = {}) {
  const b = $(`#${who}-bubble`);
  b.className = 'bubble ' + cls;
  b.innerHTML = (gest ? `<span class="gest">（${gest}）</span>` : '') + text;
}
function hideBubbles() { $('#lina-bubble').classList.add('hidden'); $('#ganta-bubble').classList.add('hidden'); }
function face(who, expr, pose) { S.face[who] = { expr, pose }; renderChars(); }
function anim(who, cls) { const w = $(`#${who}-wrap`); w.classList.remove('bump', 'shake'); void w.offsetWidth; w.classList.add(cls); setTimeout(() => w.classList.remove(cls), 500); }
async function think(t, ms = 1600) { const el = $('#thought'); el.innerHTML = t; el.classList.remove('hidden'); await sleep(ms + t.length * 25); el.classList.add('hidden'); }
let toastTimer;
function toast(t) { const el = $('#toast'); el.innerHTML = t; el.classList.remove('hidden'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add('hidden'), 3600 * Math.max(SPEED, .5)); }
function unlock(id, source) {
  if (S.unlocked.has(id)) return false;
  S.unlocked.add(id); S.fresh.add(id);
  toast(source ? `💡 ${source}が持ち出した案：「${OPT[id].t}」` : `💡 トトは思いついた：「${OPT[id].t}」<br><small>案の言葉として使える</small>`);
  return true;
}

// ---------------- 話を聞く・見る ----------------
function openAsk(who, anchor) {
  if (S.busy || S.over) return;
  const items = Object.entries(INFO).filter(([, v]) => v.who === who && !v.look);
  const menu = $('#ask-menu');
  menu.innerHTML = `<div class="am-title">${NAME[who]}に聞く</div>` + items.map(([k, v]) =>
    `<button data-info="${k}" class="${S.known.has(k) ? 'done' : ''}">${S.known.has(k) ? '✓ ' : ''}${v.q}</button>`).join('');
  const r = anchor.getBoundingClientRect(), st = $('#stage').getBoundingClientRect();
  menu.style.top = (r.bottom - st.top + 6) + 'px';
  menu.style.left = who === 'lina' ? (r.left - st.left) + 'px' : '';
  menu.style.right = who === 'ganta' ? (st.right - r.right) + 'px' : '';
  menu.classList.remove('hidden');
}
async function learn(k) {
  if (S.busy || S.over) return;
  $('#ask-menu').classList.add('hidden');
  const v = INFO[k];
  S.busy = true; render();
  face(v.who, v.face[0], v.face[1]); anim(v.who, 'bump');
  bubble(v.who, v.a, { gest: v.gest });
  const first = !S.known.has(k);
  S.known.add(k);
  if (first) {
    const ideas = v.unlock.filter((id) => !S.unlocked.has(id));
    S.notes.push({ who: v.who, kind: v.kind, text: v.note, idea: ideas.map((id) => `「${OPT[id].t}」`).join('、') });
    await sleep(1400 + v.a.length * 30);
    ideas.forEach((id) => unlock(id));
  } else await sleep(900);
  S.busy = false; render();
}

// ---------------- 案の編集 ----------------
function openPicker(slotId, idx, anchor) {
  if (S.busy || S.over || S.agreed) return;
  const sl = SLOTS.find((s) => s.id === slotId);
  const list = S.prop[slotId];
  const cur = list[idx];
  const all = Object.keys(OPT).filter((k) => OPT[k].slot === slotId);
  const avail = all.filter((k) => S.unlocked.has(k) && (k === cur || !list.includes(k)));
  const hidden = all.filter((k) => !S.unlocked.has(k)).length;
  const pk = $('#picker');
  pk.innerHTML = `<div class="pk-title">${sl.lead}……</div>` + avail.map((k) =>
    `<button data-pick="${k}" class="${k === cur ? 'cur' : ''} ${S.fresh.has(k) ? 'new' : ''}">${OPT[k].t}</button>`).join('')
    + (hidden ? `<div class="more">ほかにも案があるかもしれない（${hidden}）── ふたりの話を聞いてみよう</div>` : '');
  pk.dataset.slot = slotId; pk.dataset.idx = idx;
  const r = anchor.getBoundingClientRect(), app = $('#app').getBoundingClientRect();
  pk.style.left = (r.left - app.left) + 'px';
  pk.classList.remove('hidden');
  const h = pk.offsetHeight;
  pk.style.top = (r.top - app.top - h - 6) + 'px';
}
function pick(k) {
  const pk = $('#picker'); const slotId = pk.dataset.slot, idx = +pk.dataset.idx;
  S.prop[slotId][idx] = k;
  S.fresh.delete(k);
  pk.classList.add('hidden');
  render();
}
function applyCounter(i) {
  const c = S.counters[i];
  const sl = OPT[c.to].slot, list = S.prop[sl];
  if (c.from && list.includes(c.from)) list[list.indexOf(c.from)] = c.to;
  else if (!list.includes(c.to)) {
    const max = SLOTS.find((s) => s.id === sl).max;
    if (list.length < max) list.push(c.to); else list[list.length - 1] = c.to;
  }
  S.fresh.delete(c.to);
  render();
}

// ---------------- 案を出す ----------------
function topLine(ev) { return ev.lines.slice().sort((a, b) => b.w - a.w)[0]; }
async function propose() {
  if (S.busy || S.over || S.agreed) return;
  if (S.lastSent && sentKey(S.lastSent) === sentKey(S.prop)) return;
  $('#picker').classList.add('hidden'); $('#ask-menu').classList.add('hidden');
  S.busy = true; S.rounds--; S.counters = []; hideBubbles(); render();

  const snap = JSON.parse(JSON.stringify(S.prop));
  // 前回の対案を取り入れたか → 信頼
  const extra = { lina: [], ganta: [] };
  ['lina', 'ganta'].forEach((w) => {
    const c = S.lastCounter[w];
    if (c && has(c.to) && (!c.from || !has(c.from)) && S.trust[w] < 2) {
      S.trust[w]++;
      extra[w].push({ t: w === 'lina' ? '……言ったこと、ちゃんと入れてくれたんだ。' : 'ほう。わしの言い分を入れたか。', w: 4.5 });
    }
  });
  const ev = { lina: evalLina(S.prop), ganta: evalGanta(S.prop) };
  // 同じ✕を繰り返した → 我慢が減る
  ['lina', 'ganta'].forEach((w) => {
    const noNow = Object.entries(ev[w].m).filter(([, v]) => v === 'no').map(([k]) => k);
    const repeat = noNow.filter((k) => S.lastNo[w].includes(k));
    if (repeat.length) { S.patience[w]--; extra[w].push({ t: w === 'lina' ? 'さっきも言ったよね。' : '同じことを二度言わせるな。', w: 8 }); }
    S.lastNo[w] = noNow;
  });
  S.marks = {};
  Object.keys(OPT).forEach((k) => { if (has(k)) S.marks[k] = { lina: ev.lina.m[k], ganta: ev.ganta.m[k] }; });
  S.history.push({ prop: snap, lina: ev.lina.accept, ganta: ev.ganta.accept });

  await think('（この案で、どうだろう……）', 400);
  for (const w of ['lina', 'ganta']) {
    const e = ev[w];
    let line;
    const top = [...extra[w], ...e.lines].sort((a, b) => b.w - a.w);
    if (e.accept) {
      const pre = extra[w].find((x) => x.w < 8);
      line = (pre ? pre.t + '<br>' : '') + (w === 'lina' ? '……うん。この案なら、村のみんなに話せる。' : 'ふん……これなら、谷の者にも話せる。');
      S.posture[w] = 3;
      face(w, 'smile', w === 'lina' ? 'table' : 'open');
      bubble(w, line, { gest: 'うなずいた', cls: 'ok' });
    } else {
      line = top.filter((x, i) => i === 0 || x.w >= 3).slice(0, 2).map((x) => x.t).join('<br>');
      const hard = e.breakers.length > 0;
      S.posture[w] = S.patience[w] <= 1 ? 0 : hard ? 1 : 2;
      face(w, hard ? (w === 'lina' ? 'frown' : 'angry') : 'think', hard ? 'crossed' : (w === 'lina' ? 'rest' : 'chin'));
      bubble(w, line, { gest: hard ? (w === 'lina' ? '首を横に振った' : '腕を組んだ') : '考えこんだ', cls: hard ? 'no' : '' });
      anim(w, hard ? 'shake' : 'bump');
    }
    renderProposal();
    await sleep(1500 + line.length * 28);
    if (e.counter && !e.accept) {
      if (!S.unlocked.has(e.counter.to)) unlock(e.counter.to, NAME[w]);
      S.counters.push({ who: w, ...e.counter });
    }
    S.lastCounter[w] = e.accept ? null : e.counter;
  }
  // ふたりのあいだのやりとり
  if (ev.lina.accept !== ev.ganta.accept) {
    const w = ev.lina.accept ? 'lina' : 'ganta';
    const t = w === 'lina' ? '（ガンタを見て）……そっちが断るなら、話にならないけど。' : '（リーナを見て）人間は、いつもそうだ。';
    $(`#${w}-bubble`).insertAdjacentHTML('beforeend', `<br><small style="opacity:.75">${t}</small>`);
    await sleep(1600);
  }
  S.lastSent = snap;
  S.busy = false;
  render();

  if (S.patience.lina <= 0 || S.patience.ganta <= 0) return ending('walkout', S.patience.lina <= 0 ? 'lina' : 'ganta');
  if (ev.lina.accept && ev.ganta.accept) return offerDeal();
  if (S.rounds <= 0) return ending('dusk');
}

function offerDeal() {
  const bar = $('#deal-bar');
  bar.innerHTML = `<span>🤝 <b>ふたりとも、うなずいた。</b> この案で手を打つ？</span>
    <button class="btn go" id="deal-yes">手を打つ（合意）</button>
    <button class="btn sub" id="deal-more">${S.rounds > 0 ? 'もう少し直す' : ''}</button>`;
  if (S.rounds <= 0) $('#deal-more').remove();
  bar.classList.remove('hidden');
  $('#deal-yes').onclick = () => { bar.classList.add('hidden'); S.agreed = JSON.parse(JSON.stringify(S.prop)); ending('deal'); };
  const more = $('#deal-more'); if (more) more.onclick = () => { bar.classList.add('hidden'); };
}

// ---------------- 場面 ----------------
let curBg = null;
function playScene(beats) {
  return new Promise((resolve) => {
    const sc = $('#scene'); sc.classList.remove('hidden'); document.body.classList.add('in-scene');
    const q = beats.slice();
    const step = () => {
      if (!q.length) { sc.classList.add('hidden'); document.body.classList.remove('in-scene'); curBg = null; return resolve(); }
      const b = q.shift();
      if (b.bg && b.bg !== curBg) { $('#scene-bg').innerHTML = ART.bg[b.bg]; curBg = b.bg; }
      if (b.cast) $('#scene-cast').innerHTML = b.cast.map((c) => c.prop ? `<div class="prop">${c.prop}</div>` : `<div class="c ${c.cls || ''}">${ART[c.who](c.o || {})}</div>`).join('');
      sc.querySelector('.caption-big')?.remove();
      if (b.caption) sc.insertAdjacentHTML('afterbegin', `<div class="caption-big">${b.caption}</div>`);
      $('#scene-speaker').textContent = b.speaker || '';
      $('#scene-text').innerHTML = b.text || '';
      const ch = $('#scene-choices'); ch.innerHTML = '';
      const btn = document.createElement('button'); btn.className = 'next-btn'; btn.textContent = q.length ? '▶ 次へ' : '▶ 結果を見る'; btn.onclick = step; ch.appendChild(btn);
    };
    step();
  });
}
const L = (expr, pose) => ({ who: 'lina', o: { expr, pose } });
const G = (expr, pose) => ({ who: 'ganta', o: { expr, pose } });
const T = (expr) => ({ who: 'toto', o: { expr }, cls: 'small' });

// ---------------- 結末 ----------------
function classify(p) {
  const H = (id) => has(id, p);
  if (H('s_joint')) return 'joint';
  if (H('g_seed')) return 'seed';
  if (H('t_trial')) return 'trial';
  if (H('s_watch') || H('s_noweapon')) return 'guarded';
  return 'plain';
}
const ENDS = {
  joint: { t: '並んで鍬を振る', s: '人間と魔物が、同じ畑で働きはじめた。' },
  seed: { t: '谷に芽吹くもの', s: '魔物たちは、自分の畑を取り戻す道を歩きはじめた。' },
  trial: { t: '畑一枚の約束', s: '小さく始めた約束が、少しずつ育ちはじめた。' },
  guarded: { t: '見張りつきの平和', s: '襲撃は止んだ。だが、互いの目はまだ冷たい。' },
  plain: { t: '取引成立', s: '襲撃は止み、畑に人の手（と魔物の手）が戻った。' },
  walkout: { t: '席を立った', s: '話し合いは、途中で終わった。' },
  dusk: { t: '日が暮れた', s: '案はまとまらないまま、日が沈んだ。' },
};

function summarize(p) {
  const H = (id) => has(id, p);
  const v = { gain: ['夜の襲撃が止む'], give: [], }, g = { gain: [], give: [] }, risk = [], rel = [];
  if (H('w_till')) { v.gain.push('荒れた畑が耕し直される'); g.give.push('毎日の力仕事'); }
  if (H('w_canal')) { v.gain.push('水路が戻り、干上がった畑がよみがえる'); g.give.push('水路を掘る重労働'); }
  if (H('g_big')) { v.give.push('蓄えの多く'); g.gain.push('たっぷりの穀物'); }
  if (H('g_small')) { v.give.push('蓄えから、穀物を少しずつ'); g.gain.push('冬をつなぐ穀物'); }
  if (H('g_land')) { v.give.push('空いた畑を魔物に貸す'); g.gain.push('自分たちで育てられる畑'); }
  if (H('g_seed')) { v.give.push('畑の知恵'); g.gain.push('谷の畑をよみがえらせる種と知恵'); risk.push('いつか谷の畑が、村の畑と張り合うかもしれない'); }
  if (H('p_pre')) risk.push('先に渡した分を、持ち逃げされるかもしれない');
  if (H('p_post')) { g.give.push('払われるまで、ただ働きを信じて待つこと'); }
  if (H('p_weekly')) { v.give.push('毎週、払う手間'); g.gain.push('働いた分が毎週確かに入る'); }
  if (H('t_trial')) { v.gain.push('畑一枚で、様子を見られる'); g.give.push('ひと月の様子見（腹は満ちきらない）'); risk.push('試しが長引けば、谷は冬に間に合わない'); }
  if (H('s_noweapon')) g.give.push('武器');
  if (H('s_watch')) { g.give.push('見張られて働く屈辱'); risk.push('見張りと働き手のあいだに、不満がくすぶる'); }
  if (H('s_joint')) { v.give.push('村からも働き手を出すこと'); g.gain.push('「敵」ではなく、隣で働く者として扱われる'); }
  if (H('s_bond')) { v.gain.push('トトが立会人の証文'); g.gain.push('破られたら訴えられる証文'); }
  if (H('s_day')) { v.gain.push('夜は魔物が村にいない安心'); g.give.push('昼だけの仕事'); }
  if (!H('s_bond')) risk.push('約束は口だけ。破られても、証がない');
  const food = (H('g_big') ? 4 : 0) + (H('g_small') ? 2 : 0) + (H('g_land') ? 2 : 0) + (H('g_seed') ? 1 : 0) - (H('t_trial') ? 1 : 0);
  if (food <= 3) risk.push('谷が冬を越せるかは、ぎりぎり');
  // 関係：対案を聞き入れた回数＋打ち明けられた事情に応えた数＋並んで働くか
  const hL = (H('s_day') && S.known.has('l_fear') ? 1 : 0) + (H('g_land') && S.known.has('map') ? 1 : 0);
  const hG = (H('p_weekly') && S.known.has('g_fear') ? 1 : 0) + (H('g_seed') && S.known.has('sack') ? 1 : 0);
  const r = S.trust.lina + S.trust.ganta + hL + hG + (H('s_joint') ? 1 : 0);
  if (H('s_joint')) rel.push('並んで働くうちに、名前で呼び合う者が出てきた。');
  if (H('s_watch') || H('s_noweapon')) rel.push('村人と魔物は、目を合わせずにすれ違う。');
  if (hL) rel.push('リーナは「村の事情を、わかってもらえた」と感じている。');
  if (hG) rel.push('ガンタは「谷の事情を、わかってもらえた」と感じている。');
  if (r >= 4) rel.push('リーナとガンタは、別れ際に短く握手した。');
  else if (r >= 2) rel.push('リーナとガンタは、次に会う日を自分たちで決めた。');
  else rel.push(hL || hG ? 'リーナとガンタは、まだ互いを信じきってはいない。' : H('s_joint') ? 'リーナとガンタは、まだぎこちない。' : 'リーナとガンタは、最後まで目を合わせなかった。');
  return { v, g, risk, rel };
}

async function ending(kind, who) {
  S.over = true; S.busy = false; render();
  $('#picker').classList.add('hidden'); $('#ask-menu').classList.add('hidden');
  let key = kind, beats = [];
  if (kind === 'deal') {
    key = classify(S.agreed);
    const p = S.agreed, H = (id) => has(id, p);
    const work = H('w_canal') ? '水路' : H('w_till') ? '畑' : null;
    beats = [
      { bg: 'meeting', cast: [L('smile', 'table'), T('smile'), G('smile', 'open')], speaker: '', text: 'トトは、まとまった案を読み上げた。\nリーナとガンタは、それぞれ小さくうなずいた。' },
      { bg: 'fields', caption: 'ひと月後', cast: key === 'joint' ? [L('joy', 'wave'), G('smile', 'open')] : key === 'guarded' ? [L('neutral', 'crossed'), G('neutral', 'crossed')] : [L('smile', 'rest'), G('smile', 'rest')],
        speaker: '', text: {
          joint: `村の若者と谷の魔物が、並んで${work || '畑'}に鍬を入れている。\n昼休み、同じ鍋を囲む姿もあった。`,
          seed: '貸した畑の隅で、谷の魔物が芽を数えている。\n「来年は、谷でも育ててみる」とガンタは言った。',
          trial: '約束の畑一枚は、見違えるほど黒い土になった。\n村人たちは「次の一枚も」と言いはじめている。',
          guarded: '見張りの視線の下で、魔物たちは黙々と働いている。\n襲撃は止んだ。けれど、誰も笑わない。',
          plain: `${work ? work + 'に手が入り、' : ''}夜の襲撃は止んだ。\n村にも谷にも、少しだけ余裕が戻った。`,
        }[key] },
      { cast: [T('resolve')], speaker: 'トト', text: '（この形は、誰に言われたものでもない。ぼくが組み立てた案だ）' },
    ];
  } else if (kind === 'walkout') {
    beats = [
      { bg: 'meeting', cast: who === 'lina' ? [L('angry', 'crossed'), T('worry')] : [T('worry'), G('angry', 'crossed')], speaker: NAME[who],
        text: who === 'lina' ? 'もういい。村は、自分たちで守る。' : '話にならん。谷の者には、わしから言っておく。' },
      { bg: 'field', caption: 'その夜', cast: [T('worry')], speaker: '', text: who === 'lina' ? '村は見張りを増やし、夜ごと松明を焚いた。\n……谷の若い者たちは、また山を下りてきた。' : '谷の若い者たちは、腹をすかせたまま山を下りた。\n村の畑は、また荒らされた。' },
    ];
  } else {
    const t = S.trust.lina + S.trust.ganta;
    beats = [
      { bg: 'meeting', caption: '日暮れ', cast: [L('think', 'rest'), T('worry'), G('think', 'chin')], speaker: '',
        text: t >= 1 ? '案はまとまらなかった。\nそれでも、ふたりは次に会う日を決めた。「次は、もう少し詰めて」' : '案はまとまらなかった。\nふたりは別々の道を帰っていった。次の日取りは、決まらなかった。' },
    ];
  }
  await playScene(beats);
  showResult(key);
}

function showResult(key) {
  SEEN.add(key);
  const e = ENDS[key];
  const final = S.agreed || S.prop;
  const sentence = SLOTS.map((sl) => final[sl.id].length ? sl.lead + final[sl.id].map((id) => OPT[id].t).join(sl.joiner || '、') + '。' : '').join('');
  let body;
  if (S.agreed) {
    const sm = summarize(S.agreed);
    const li = (a, c) => a.length ? a.map((x) => `<li class="${c}">${x}</li>`).join('') : '<li style="opacity:.5">―</li>';
    body = `<div class="r-sentence"><b>合意した案：</b>${sentence}</div>
      <div class="r-grid">
        <div class="r-box lina"><h4>カヤ村（リーナ）</h4><b>得たもの</b><ul>${li(sm.v.gain, 'gain')}</ul><b>譲ったもの</b><ul>${li(sm.v.give, 'loss')}</ul></div>
        <div class="r-box ganta"><h4>北の谷（ガンタ）</h4><b>得たもの</b><ul>${li(sm.g.gain, 'gain')}</ul><b>譲ったもの</b><ul>${li(sm.g.give, 'loss')}</ul></div>
        <div class="r-box"><h4>残るリスク</h4><ul>${li(sm.risk, 'risk')}</ul></div>
        <div class="r-box"><h4>関係の変化</h4><ul>${li(sm.rel, '')}</ul></div>
      </div>`;
  } else {
    const t = S.trust.lina + S.trust.ganta;
    body = `<div class="r-sentence"><b>最後に出していた案：</b>${sentence}</div>
      <div class="r-grid">
        <div class="r-box"><h4>残ったもの</h4><ul>
          <li class="loss">襲撃は止まらない。村の畑も、谷の冬も、そのまま</li>
          ${t >= 1 ? '<li class="gain">それでも、対案を聞き入れたトトのことは覚えている</li>' : ''}
          <li class="risk">わかったこと：${S.notes.length} / ${Object.keys(INFO).length}</li></ul></div>
        <div class="r-box"><h4>ふたりの最後の言葉</h4><ul>
          <li>リーナ：${S.patience.lina <= 0 ? '「同じことを何度も言わせないで」' : S.trust.lina > 0 ? '「……あなたは、聞いてはくれた」' : '「結局、魔物の味方なんでしょ」'}</li>
          <li>ガンタ：${S.patience.ganta <= 0 ? '「話にならん」' : S.trust.ganta > 0 ? '「おぬしとなら、また話してもいい」' : '「人間の側の小鬼め」'}</li></ul></div>
      </div>`;
  }
  const el = $('#result');
  el.innerHTML = `<h1>${e.t}</h1><div class="sub">${e.s}（話し合い ${S.history.length}回）</div>${body}
    <div class="r-actions"><button class="btn go" id="again">別の案で、もう一度</button>
    <span style="opacity:.7;font-size:13px">見た結末：${SEEN.size} / ${Object.keys(ENDS).length}</span></div>`;
  el.classList.remove('hidden');
  $('#again').onclick = start;
}

// ---------------- 入力 ----------------
document.addEventListener('click', (e) => {
  const t = e.target;
  if (!t.closest('#picker') && !t.closest('.chip')) $('#picker').classList.add('hidden');
  if (!t.closest('#ask-menu') && !t.closest('.ask-btn')) $('#ask-menu').classList.add('hidden');
  const ask = t.closest('.ask-btn'); if (ask) return openAsk(ask.dataset.ask, ask);
  const info = t.closest('[data-info]'); if (info) return learn(info.dataset.info);
  const look = t.closest('[data-look]'); if (look) return learn(look.dataset.look);
  if (t.closest('#ganta [data-hot="sack"]')) return learn('sack');
  const rm = t.closest('[data-rm]');
  if (rm) { if (S.busy || S.over || S.agreed) return; const [sl, i] = rm.dataset.rm.split(':'); S.prop[sl].splice(+i, 1); return render(); }
  const chip = t.closest('.chip'); if (chip) return openPicker(chip.dataset.slot, +chip.dataset.idx, chip);
  const pk = t.closest('[data-pick]'); if (pk) return pick(pk.dataset.pick);
  const c = t.closest('[data-counter]'); if (c) return applyCounter(+c.dataset.counter);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('#picker').classList.add('hidden'); $('#ask-menu').classList.add('hidden'); } });
$('#propose-btn').addEventListener('click', propose);

// ---------------- 開始 ----------------
async function start() {
  S = newState();
  $('#result').classList.add('hidden');
  $('#deal-bar').classList.add('hidden');
  $('#bg').innerHTML = ART.bg.meeting;
  $('#toto').innerHTML = ART.toto({ expr: 'neutral' });
  hideBubbles(); render();
  await playScene([
    { bg: 'meeting', caption: 'カヤ村のはずれ', cast: [L('frown', 'crossed'), T('neutral'), G('neutral', 'crossed')], speaker: '',
      text: '昨夜も、北の谷の魔物が村の畑を荒らした。\n村の代表リーナと、谷の世話役ガンタ。ふたりは目を合わせようとしない。' },
    { cast: [L('angry', 'crossed'), G('angry', 'crossed')], speaker: 'リーナ ／ ガンタ', text: 'リーナ「畑を荒らすのを、やめさせて」\nガンタ「食い物さえあれば、若い者は山を下りん」' },
    { cast: [T('resolve')], speaker: 'トト（あなた）', text: '間に立つのは、魔王城の交渉係トト。\n💬 ふたりの話を聞くと、案に使える言葉が増える。\n📜 案の言葉を入れ替えて出す。断られても、直してまた出せる（6回まで）。' },
  ]);
  bubble('lina', '畑を荒らすのを、やめさせて。', { gest: '腕を組んだ' });
  bubble('ganta', '食い物さえあれば、若い者は山を下りん。', { gest: '腕を組んだ' });
  render();
}
start();
