// tutorial.js — はじめての応対（ガイドつき）
//
// ・1手ずつ、決まった相手にだけ触れられる：🔍手 → 言葉「一騎打ち」→ 返事（3つのどれでも）→ 送り出し。
// ・制限は見た目だけではない。game.js のクリック処理が TUT.allow() に聞き、だめなら何もしない。
// ・使うのはふつうの遊びと同じ処理（look / turn）。ルールやせりふは変えない。
// ・一度終えると localStorage に記録し、次（「もう一度」を含む）からは出さない。?tutorial で、もう一度出せる。
const TUT = (() => {
  const KEY = 'okaeri_v2.tutorialDone';
  let saved = false;
  try { saved = localStorage.getItem(KEY) === '1'; } catch (e) { /* 保存できない環境では、毎回出す */ }
  let active = new URLSearchParams(location.search).has('tutorial') || !saved;
  // intro（導入の場面）→ inspect → word → reply → release → completed。手を受けてから次までは wait。
  let step = active ? 'intro' : 'completed';
  let wordKey = null, accepted = null, coach = null;

  const STEPS = {
    inspect: { n: 1, text: '勇者の持ち物を調べてみましょう。', sub: '光っている🔍の札を押してください。',
      ok: '見つけた！ 気づいたことは、トトのメモに書きとめられます。' },
    word: { n: 2, text: '勇者の話の中から、気になる言葉を選んでみましょう。', sub: '選んだ言葉を、そのまま勇者に返します。',
      ok: '言葉をそのまま返すと、勇者は話を続けてくれます。' },
    reply: { n: 3, text: '勇者の話を踏まえて、返事を選んでみましょう。', sub: '3つのうち、どれを選んでもかまいません。',
      ok: '返事しだいで、勇者の様子が変わっていきます。' },
  };
  const ORDER = ['inspect', 'word', 'reply', 'release'];
  const INTERACTIVE = '.badge, #v-bubble .word, .reply, #silence, .d-btn';
  const speed = () => (typeof SPEED === 'number' ? SPEED : 1);

  function target() {
    if (step === 'inspect') return '.badge[data-look="hands"]';
    if (step === 'word') return `#v-bubble .word[data-w="${wordKey}"]`;
    if (step === 'reply') return '.reply';
    return null;
  }

  // ---------- 表示 ----------
  function ensureCoach() {
    if (coach) return coach;
    coach = document.createElement('div');
    coach.id = 'coach';
    coach.setAttribute('role', 'status'); coach.setAttribute('aria-live', 'polite');
    document.body.appendChild(coach);
    return coach;
  }
  function show(html, cls) {
    const c = ensureCoach();
    c.className = cls || '';
    c.innerHTML = html;
    const h = c.offsetHeight + 16;
    document.documentElement.style.setProperty('--coach-h', `${h}px`);
  }
  const dots = (n) => `<div class="co-dots">${[1, 2, 3].map((i) => `<span class="${i < n ? 'past' : i === n ? 'now' : ''}"></span>`).join('')}</div>`;
  function showStep() {
    const s = STEPS[step];
    show(`${dots(s.n)}<div class="co-text">${s.text}</div><div class="co-sub">${s.sub}</div>`);
  }

  // 触れられるものに、いま押す相手（tut-target）と、いまは押せないもの（tut-off）の印をつける。
  // game.js が描き直すたびに呼ばれる（render / leonSay）。
  function mark() {
    if (!active) return;
    const sel = target();
    document.querySelectorAll(INTERACTIVE).forEach((el) => {
      const on = !!sel && el.matches(sel);
      el.classList.toggle('tut-target', on);
      el.classList.toggle('tut-off', !on);
    });
  }
  function nudge() {
    if (!coach) return;
    coach.classList.remove('nudge'); void coach.offsetWidth; coach.classList.add('nudge');
    const sel = target();
    document.querySelectorAll(sel || '#coach-go').forEach((el) => { el.classList.remove('tut-ping'); void el.offsetWidth; el.classList.add('tut-ping'); });
  }

  // ---------- 進行 ----------
  function go(s) {
    step = s;
    if (s === 'word') {
      const w = document.querySelector('#v-bubble .word:not(.used)');
      if (!w) return go('reply'); // 拾える言葉がないとき（ふつうは起きない）
      wordKey = w.dataset.w;
    }
    if (s === 'release') return release();
    showStep(); mark();
    const el = s === 'reply' ? document.querySelector('#replies-box') : document.querySelector(target());
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function success(done) {
    if (typeof S !== 'undefined' && S && S.over) return finish(); // 念のため：応対が終わってしまったとき
    show(`${dots(STEPS[done].n)}<div class="co-text co-ok">✓ ${STEPS[done].ok}</div>`, 'ok');
    setTimeout(() => go(ORDER[ORDER.indexOf(done) + 1]), 1900 * Math.max(speed(), 0.3));
  }
  function release() {
    step = 'release'; mark();
    show(`<div class="co-title">魔王城の交渉係、仕事はじめ</div>
      <div class="co-text">これで準備は整いました。さあ、勇者の話を聞いてみましょう。</div>
      <div class="co-sub">ここからは、どの手を使っても自由です。</div>
      <button id="coach-go">話を聞く</button>`, 'release');
    const btn = document.querySelector('#coach-go');
    btn.addEventListener('click', () => { finish(); if (typeof toast === 'function') toast('交渉係トト、お仕事開始！'); }, { once: true });
    btn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function finish() {
    if (!active) return;
    active = false; step = 'completed';
    try { localStorage.setItem(KEY, '1'); } catch (e) { /* 保存できなくても続ける */ }
    document.querySelectorAll('.tut-target, .tut-off, .tut-ping').forEach((el) => el.classList.remove('tut-target', 'tut-off', 'tut-ping'));
    document.body.classList.remove('tut');
    if (coach) { coach.remove(); coach = null; }
    document.documentElement.style.removeProperty('--coach-h');
    // 使えるようになったものを、一度だけ軽く光らせる
    document.body.classList.add('tut-free');
    setTimeout(() => document.body.classList.remove('tut-free'), 1600);
  }

  return {
    get active() { return active; },
    get step() { return step; },
    // ページを開いたとき：導入の場面のあいだから、ふつうの手引き（下線のヒント）を隠しておく
    init() { if (active) document.body.classList.add('tut'); },
    // 最初のせりふのあと（game.js の start から）
    begin() { if (active && step === 'intro') go('inspect'); },
    mark,
    // game.js のクリック処理から：kind = look / word / reply / silence / fight / refuse
    allow(kind, key) {
      if (!active) return true;
      const ok = (step === 'inspect' && kind === 'look' && key === 'hands')
        || (step === 'word' && kind === 'word' && key === wordKey)
        || (step === 'reply' && kind === 'reply');
      if (ok) { accepted = step; step = 'wait'; mark(); return true; }
      if (step !== 'wait' && step !== 'intro') nudge(); // ちがう所を押した：何も起こさず、いま押す所を知らせる
      return false;
    },
    // 受けつけた手が終わったら、次へ
    after(p) {
      if (!active || !accepted) return p;
      const done = accepted; accepted = null;
      return Promise.resolve(p).then(() => success(done));
    },
  };
})();
TUT.init();
