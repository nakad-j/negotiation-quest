// storybook.js — 絵本の見た目（キービジュアル由来の絵）で場面を描く。game.js の playScene(beats, { painted: true }) から使う。
//
// ・絵は assets/ の切り抜き（assets/crop_keyvisual.py で picture/keyvisual/ の設定画から作る）。すべてローカル。
// ・人物は「アーチ型の額」に入れて見せる（設定画の絵には背景がついていて、透過の立ち絵ではないため）。
// ・話している人は明るく、聞いている人は少し暗く。場面にいない人は消える。
// ・話し手の表情は、文章の枠の顔絵で見せる（設定画の「表情バリエーション」から）。
// ・せりふ・進行・ルールには触れない。見た目だけ。
const BOOK = (() => {
  const A = 'assets/';
  const BG = { hall: 'bg/throne_room.jpg' }; // 魔王の謁見室
  const FIG = { toto: 'chara/toto_figure.jpg', garza2: 'chara/king_figure.jpg' };
  const ORDER = ['toto', 'garza2']; // 左から（トトは右を向いているので左に）
  // 場面データの expr → 設定画の表情。無い表情は、その人のふだんの顔
  const FACE = {
    toto: { neutral: 'toto_basic', sweat: 'toto_surprised', worry: 'toto_troubled', resolve: 'toto_determined' },
    garza2: { tired: 'king_sleepy', grumpy: 'king_displeased' },
  };
  const BASE = { toto: 'toto_basic', garza2: 'king_sleepy' };
  const faceSrc = (who, expr) => `${A}face/${FACE[who][expr] || BASE[who]}.jpg`;
  const speakerOf = (name = '') => (name.startsWith('トト') ? 'toto' : name.includes('魔王') ? 'garza2' : null);

  // 場面が始まる前に読みこんでおく（切り替えのちらつきを防ぐ）
  [...Object.values(BG), ...Object.values(FIG)].forEach((p) => { new Image().src = A + p; });
  Object.keys(FACE).forEach((who) => Object.keys(FACE[who]).concat('').forEach((e) => { new Image().src = faceSrc(who, e); }));

  return {
    // この絵で描ける場面か（背景も人物も、用意した絵があるときだけ）
    supports(beats) {
      return beats.every((b) => (!b.bg || BG[b.bg]) && (!b.cast || b.cast.every(([who]) => FIG[who])));
    },
    bg(key) { return `<img class="paint-bg" src="${A}${BG[key]}" alt="">`; },
    // castEl に人物を並べ、faceEl に話し手の顔を出す
    show(castEl, faceEl, cast, speaker) {
      if (!castEl.querySelector('.fig')) {
        castEl.innerHTML = ORDER.map((who) => `<figure class="fig fig-${who} away" data-who="${who}"><img src="${A}${FIG[who]}" alt=""></figure>`).join('');
        void castEl.offsetWidth; // 最初の登場も、ふわっと出す
      }
      const here = new Map(cast.map(([who, o]) => [who, o || {}]));
      const talker = speakerOf(speaker);
      castEl.querySelectorAll('.fig').forEach((f) => {
        const who = f.dataset.who;
        f.classList.toggle('away', !here.has(who));
        f.classList.toggle('speaking', here.has(who) && who === talker);
        f.classList.toggle('listening', here.has(who) && who !== talker);
      });
      faceEl.innerHTML = talker ? `<img src="${faceSrc(talker, (here.get(talker) || {}).expr)}" alt="">` : '';
    },
  };
})();
