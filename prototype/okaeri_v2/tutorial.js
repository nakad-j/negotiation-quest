// tutorial.js — はじめての応対（ガイドつき・1枚ずつのお知らせ）
//
// 流れ：お知らせ（OK）→ その手だけ押せる → 手が終わる → 次のお知らせ（OK）→ …
//   観察の画面で🔍手 → 「話す」→ 言葉「一騎打ち」→ 返事（3つのどれでも）→ 「これで準備は整いました」（OK で、すべて使える）
//   「話す」のお知らせのあいだは、ほかの場所も自由に調べられる（調べても次へは進まない）。
//   観察の画面がないとき（storybook.js なし）は、「話す」をとばして、手 → 言葉 へ。
// ・制限は見た目だけではない。game.js のクリック処理が TUT.allow() に聞き、だめなら何もしない。
//   お知らせが開いているあいだは、すべて断る（さらに #app を inert にして、フォーカスも届かないようにする）。
// ・使うのはふつうの遊びと同じ処理（look / turn）。ルールやせりふは変えない。
// ・一度終えると localStorage に記録し、次（「もう一度」を含む）からは出さない。?tutorial で、もう一度出せる。
const TUT = (() => {
  const KEY = 'okaeri_v2.tutorialDone';
  let saved = false;
  try { saved = localStorage.getItem(KEY) === '1'; } catch (e) { /* 保存できない環境では、毎回出す */ }
  let active = new URLSearchParams(location.search).has('tutorial') || !saved;
  // intro（導入の場面）→ modal → inspect → wait → modal → talk → wait → modal → word → wait → modal → reply → wait → modal → completed
  let step = active ? 'intro' : 'completed';
  let wordKey = null, accepted = null, modal = null, readyAt = 0;

  // ack：ひとつ前の手がうまくいったことを、次のお知らせの頭で伝える
  const STEPS = {
    inspect: { n: 1, title: '勇者の持ち物を調べてみましょう。', text: '光っている持ち物を調べると、相手について新しい情報が得られます。' },
    talk: { n: 2, ack: '見つけた！ 気づいたことは、トトのメモに書きとめられます。',
      title: '調べ終わったら、「話す」を押して、勇者と話してみましょう。', text: 'ほかのところも、押せば調べられます。話のとちゅうでも「🔍 よく見る」で、また見に来られます。' },
    word: { n: 3,
      title: '勇者の話の中から、気になる言葉を選んでみましょう。', text: '光っている言葉を押すと、その言葉をそのまま勇者に返します。' },
    reply: { n: 4, ack: '言葉をそのまま返すと、勇者は話を続けてくれます。',
      title: '勇者の話を踏まえて、返事を選んでみましょう。', text: 'どの返事を選ぶかで、勇者の反応が変わります。' },
    release: { n: 5, ack: '勇者が、返事に応えてくれました。', head: '魔王城の交渉係、仕事はじめ',
      title: 'これで準備は整いました。さあ、勇者の話を聞いてみましょう。' },
  };
  const NEXT = { inspect: 'talk', talk: 'word', word: 'reply', reply: 'release' };
  const INTERACTIVE = '.badge, .spot, #obs-talk, #btn-observe, #v-bubble .word, .reply, #silence, .d-btn';
  const observing = () => document.body.classList.contains('observing');
  const speed = () => (typeof SPEED === 'number' ? SPEED : 1);
  // 間合い（ミリ秒）：手のあと次のお知らせまで／勇者の第一声から最初のお知らせまで／お知らせが消える動き（tutorial.css の tmOut と同じ）
  const NEXT_MS = 1100, FIRST_MS = 700, CLOSE_MS = 260;

  function target() {
    if (step === 'inspect') return '.spot[data-look="hands"], .badge[data-look="hands"]';
    if (step === 'talk') return '#obs-talk';
    if (step === 'word') return `#v-bubble .word[data-w="${wordKey}"]`;
    if (step === 'reply') return '.reply';
    return null;
  }

  // 触れられるものに、いま押す相手（tut-target）と、いまは押せないもの（tut-off）の印をつける。
  // game.js が描き直すたびに呼ばれる（render / leonSay）。
  function mark() {
    if (!active) return;
    const sel = target();
    const free = step === 'talk' ? '.spot' : null; // 「話す」の前は、ほかの場所も自由に調べられる
    document.querySelectorAll(INTERACTIVE).forEach((el) => {
      const on = !!sel && el.matches(sel), isFree = !!free && el.matches(free);
      el.classList.toggle('tut-target', on);
      el.classList.toggle('tut-off', !on && !isFree);
    });
  }
  // ちがう所を押したとき：何も起こさず、いま押す相手を軽く光らせる
  function ping() {
    const sel = target(); if (!sel) return;
    document.querySelectorAll(sel).forEach((el) => { el.classList.remove('tut-ping'); void el.offsetWidth; el.classList.add('tut-ping'); });
  }

  // ---------- お知らせ（モーダル） ----------
  const dots = (n) => `<div class="tm-dots" aria-hidden="true">${[1, 2, 3, 4].map((i) => `<span class="${i < n ? 'past' : i === n ? 'now' : ''}"></span>`).join('')}</div>`;
  function openModal(key, ack) {
    const s = { ...STEPS[key], ...(ack ? { ack } : {}) };
    step = 'modal'; mark();
    const app = document.querySelector('#app');
    if (app) app.inert = true; // 下の画面には、クリックもフォーカスも届かない
    modal = document.createElement('div');
    modal.id = 'tut-modal';
    if (observing()) modal.classList.add('beside'); // 観察の画面では、勇者の体（調べる場所）にかからない位置に出す
    modal.innerHTML = `<div class="tm-box" role="dialog" aria-modal="true" aria-labelledby="tm-title">
      ${dots(s.n)}
      ${s.ack ? `<div class="tm-ack">✓ ${s.ack}</div>` : ''}
      ${s.head ? `<div class="tm-head">${s.head}</div>` : ''}
      <div class="tm-title" id="tm-title">${s.title}</div>
      ${s.text ? `<div class="tm-text">${s.text}</div>` : ''}
      <button class="tm-ok" type="button">OK</button>
    </div>`;
    document.body.appendChild(modal);
    document.body.classList.add('tut-modal-open');
    const ok = modal.querySelector('.tm-ok');
    let pressed = false;
    ok.addEventListener('click', (e) => {
      e.stopPropagation();
      if (pressed) return; // 連打しても、1回だけ
      pressed = true;
      // OK の連打が、閉じたあとの下の画面に落ちないように（最後の OK のあとも）。閉じる動き（CLOSE_MS）＋少し
      readyAt = Date.now() + CLOSE_MS + 200;
      closeModal().then(() => {
        if (key === 'release') { finish(); if (typeof toast === 'function') toast('交渉係トト、お仕事開始！'); }
        else start(key);
      });
    });
    setTimeout(() => { try { ok.focus({ preventScroll: true }); } catch (e) { /* 古いブラウザ */ } }, 50);
  }
  // ゆっくり消してから外す（消えているあいだも、下の画面は押せないまま）
  function closeModal() {
    if (!modal) return Promise.resolve();
    const m = modal; m.classList.add('closing');
    return new Promise((resolve) => setTimeout(() => {
      m.remove(); if (modal === m) modal = null;
      document.body.classList.remove('tut-modal-open');
      const app = document.querySelector('#app');
      if (app) app.inert = false;
      resolve();
    }, CLOSE_MS));
  }
  // お知らせが開いているあいだ：Esc などで閉じたり飛ばしたりしない
  document.addEventListener('keydown', (e) => {
    if (modal && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); }
  }, true);

  // ---------- 進行 ----------
  // OK のあと：その手だけを押せるようにする（OK の連打が下の画面に落ちないよう、少しだけ間をおく）
  function start(key) {
    if (key === 'word') {
      const w = document.querySelector('#v-bubble .word:not(.used)');
      if (!w) { step = 'wait'; return openModal('reply'); } // 拾える言葉がないとき（ふつうは起きない）
      wordKey = w.dataset.w;
    }
    step = key; mark();
    const el = key === 'reply' ? document.querySelector('#replies-box') : document.querySelector(target());
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  function success(done) {
    if (typeof S !== 'undefined' && S && S.over) { closeModal(); return finish(); } // 念のため：応対が終わってしまったとき
    // 勇者の反応が目に入ってから、次のお知らせ
    // 観察の画面がないとき：「話す」をとばす（見つけたことのお知らせは、言葉のお知らせの頭に）
    const skipTalk = done === 'inspect' && !observing();
    setTimeout(() => (skipTalk ? openModal('word', STEPS.talk.ack) : openModal(NEXT[done])), NEXT_MS * Math.max(speed(), 0.3));
  }
  function finish() {
    if (!active) return;
    active = false; step = 'completed';
    try { localStorage.setItem(KEY, '1'); } catch (e) { /* 保存できなくても続ける */ }
    document.querySelectorAll('.tut-target, .tut-off, .tut-ping').forEach((el) => el.classList.remove('tut-target', 'tut-off', 'tut-ping'));
    document.body.classList.remove('tut');
    document.querySelector('#stage')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); // 勇者と「お仕事開始！」が見えるように
    // 使えるようになったものを、一度だけ軽く光らせる
    document.body.classList.add('tut-free');
    setTimeout(() => document.body.classList.remove('tut-free'), 1600);
  }

  return {
    get active() { return active; },
    get step() { return step; },
    get modalOpen() { return !!modal; },
    // ページを開いたとき：導入の場面のあいだから、ふつうの手引き（下線のヒント）を隠しておく
    init() { if (active) document.body.classList.add('tut'); },
    // 導入の場面のあと（game.js の start から）。観察の画面が開いてから（観察の画面がないときは、勇者の第一声のあと）、
    // 少しおいて最初のお知らせ（そのあいだも step は intro なので、何も押せない）
    begin() { if (active && step === 'intro') setTimeout(() => { if (step === 'intro') openModal('inspect'); }, FIRST_MS * Math.max(speed(), 0.3)); },
    mark,
    // game.js のクリック処理から：kind = look / word / reply / silence / fight / refuse
    allow(kind, key) {
      if (Date.now() < readyAt) return false; // OK を押した直後は、何も受けつけない
      if (!active) return true;
      if (modal) return false; // お知らせ中は、何も受けつけない
      if (step === 'talk' && kind === 'look') return true; // ほかの場所を調べても、次へは進まない
      const ok = (step === 'inspect' && kind === 'look' && key === 'hands')
        || (step === 'talk' && kind === 'talk')
        || (step === 'word' && kind === 'word' && key === wordKey)
        || (step === 'reply' && kind === 'reply');
      if (ok) {
        if (step === 'reply') setTimeout(() => document.querySelector('#v-bubble')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300); // 勇者の反応が見えるように
        accepted = step; step = 'wait'; mark(); return true;
      }
      if (step === 'inspect' || step === 'talk' || step === 'word' || step === 'reply') ping();
      return false;
    },
    // 受けつけた手が終わったら、次のお知らせへ
    after(p) {
      if (!active || !accepted) return p;
      const done = accepted; accepted = null;
      return Promise.resolve(p).then(() => success(done));
    },
  };
})();
TUT.init();
