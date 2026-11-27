// storybook.js — 絵本の見た目（キービジュアル由来の絵）。導入・観察・応対・結末のすべてで使う。
//
// ・絵は assets/ の切り抜き（assets/crop_keyvisual.py で picture/keyvisual/ の設定画から作る）。すべてローカル。
// ・人物は「アーチ型の額」に入れて見せる（設定画の絵には背景がついていて、透過の立ち絵ではないため）。
// ・話している人は明るく、聞いている人は少し暗く。話し手の表情は、文章の枠の顔絵で見せる。
// ・新しい訪問者は CHARS に1つ足すだけ（絵・名前・表情の対応）。描き方のコードは共通。
// ・せりふ・進行・ルールには触れない。見た目だけ。
const BOOK = (() => {
  const A = 'assets/';
  // 背景。tint：同じ絵に色をかぶせる（専用の絵がまだない場面）
  const BG = {
    hall: { src: 'bg/throne_room.jpg' },                // 魔王の謁見室
    fire: { src: 'bg/throne_room.jpg', tint: 'fire' },  // 罠課の炎と煙の一騎打ち（謁見室に炎の色）
    gate: { src: 'bg/castle_exterior.jpg' },            // 城を出ていく（魔王城・外観）
  };
  // 人物。names：場面の話し手の名前に含まれていれば、その人。face：場面データの expr → 設定画の表情（無い表情は base）
  const CHARS = {
    toto: {
      fig: 'chara/toto_figure.jpg', name: 'トト', names: ['トト'], rank: 0, base: 'toto_basic',
      face: { neutral: 'toto_basic', sweat: 'toto_surprised', worry: 'toto_troubled', resolve: 'toto_determined', smile: 'toto_smile' },
    },
    garza2: {
      fig: 'chara/king_figure.jpg', name: '魔王ガルザ', names: ['魔王'], rank: 1, base: 'king_sleepy',
      face: { tired: 'king_sleepy', grumpy: 'king_displeased', calm: 'king_content', ouch: 'king_troubled', asleep: 'king_asleep' },
    },
    leon: {
      // flip：設定画の上半身は画面の右を向いている。場面では右側に立つので、左右を反転して会話の相手（中央）を向かせる
      fig: 'chara/leon_figure.jpg', flip: true, name: '勇者レオン', names: ['レオン'], rank: 2, base: 'leon_calm',
      face: {
        neutral: 'leon_calm', proud: 'leon_determined', angry: 'leon_angry', surprised: 'leon_surprised',
        worried: 'leon_troubled', sad: 'leon_faraway', cry: 'leon_weary', smile: 'leon_smile', joy: 'leon_relieved',
      },
      // 全身の絵（応対の画面で、話しながら調べる）。spots：game.js の LOOKS のキー → 絵の上の当たり判定 [左, 上, 幅, 高さ]。
      // 値は絵の幅・高さに対する割合（0〜1）なので、絵の大きさが変わってもずれない。1つのキーに複数の場所を持てる
      observe: {
        img: 'chara/leon_full.webp', w: 1024, h: 1536,
        spots: {
          letter: [[0.545, 0.246, 0.109, 0.047]],                                   // 胸元の封筒
          armor: [[0.602, 0.424, 0.084, 0.091]],                                    // ベルトに下がった「貸」の札
          sword: [[0.309, 0.303, 0.145, 0.129], [0.225, 0.574, 0.09, 0.176]],       // 柄と鍔／鞘の先
          hands: [[0.234, 0.495, 0.109, 0.077], [0.688, 0.503, 0.092, 0.07]],       // 左右の籠手の手
        },
      },
    },
  };
  const SLOTS = { 1: ['C'], 2: ['L', 'R'], 3: ['L', 'C', 'R'] };
  const faceSrc = (who, expr) => `${A}face/${CHARS[who].face[expr] || CHARS[who].base}.jpg`;
  const speakerOf = (name = '') => Object.keys(CHARS).find((who) => CHARS[who].names.some((n) => name.includes(n))) || null;
  const arch = (who) => `<img src="${A}${CHARS[who].fig}" alt=""${CHARS[who].flip ? ' class="flip"' : ''}>`;

  // 先に読みこんでおく（切り替えのちらつきを防ぐ）
  const pre = new Set(Object.values(BG).map((b) => A + b.src));
  Object.keys(CHARS).forEach((who) => { pre.add(A + CHARS[who].fig); Object.keys(CHARS[who].face).concat('').forEach((e) => pre.add(faceSrc(who, e))); });
  Object.values(CHARS).forEach((c) => { if (c.observe) pre.add(A + c.observe.img); });
  pre.forEach((src) => { new Image().src = src; });

  return {
    has: (who) => !!CHARS[who],
    name: (who) => CHARS[who].name,
    // この絵で描ける場面か（背景も人物も、用意した絵があるときだけ）
    supports(beats) {
      const who = new Set(beats.flatMap((b) => (b.cast || []).map(([w]) => w)));
      return who.size <= 3 && beats.every((b) => (!b.bg || BG[b.bg]) && (!b.cast || b.cast.every(([w]) => CHARS[w])));
    },
    bg(key) { const b = BG[key]; return `<img class="paint-bg" src="${A}${b.src}" alt="">${b.tint ? `<div class="paint-tint ${b.tint}"></div>` : ''}`; },
    // 応対の画面の人物（#toto / #visitor の中身）
    figure(who) { return `<div class="arch" data-who="${who}">${arch(who)}</div>`; },
    // 顔絵（文章の枠・HUD・扉）
    face(who, expr, cls = 'bk-face') { return `<img class="${cls}" src="${faceSrc(who, expr)}" alt="">`; },
    // 応対の画面：いま話している人（ほかの人は少し暗く）
    focus(who) { document.body.dataset.speaker = who; },

    // ---- 全身の絵と、調べる場所（応対の画面で、会話と同時に使う） ----
    // 全身の絵がある人だけ、体や持ち物を直接押して調べられる
    canObserve: (who) => !!(CHARS[who] && CHARS[who].observe),
    // 全身の絵と、調べられる場所（labels：キー → 名前。saw：調べ終えたキー）
    // 1つのキーの最初の場所（lead）にだけ、🔍／✓ の印をつける（同じものに印が2つ並ばないように）
    observeFigure(who, labels, saw) {
      const o = CHARS[who].observe;
      const pct = (v) => `${(v * 100).toFixed(2)}%`;
      const spots = Object.entries(o.spots).flatMap(([k, rects]) => rects.map(([x, y, w, h], i) =>
        `<button type="button" class="spot ${i === 0 ? 'lead' : ''} ${saw[k] ? 'done' : ''}" data-look="${k}" aria-label="${labels[k] || k}を調べる"
          style="left:${pct(x)};top:${pct(y)};width:${pct(w)};height:${pct(h)}"></button>`)).join('');
      return `<div class="obs-fig" style="aspect-ratio:${o.w} / ${o.h}"><img src="${A}${o.img}" alt="${CHARS[who].name}の全身">${spots}</div>`;
    },

    // ---- 場面（導入・結末） ----
    // 場面に出てくる人をまとめて並べる（ひとりなら中央、ふたりなら左右、rank の順に左から）
    setup(castEl, beats) {
      const who = [...new Set(beats.flatMap((b) => (b.cast || []).map(([w]) => w)))].sort((a, b) => CHARS[a].rank - CHARS[b].rank);
      castEl.innerHTML = who.map((w, i) => `<figure class="fig arch away" data-who="${w}" data-slot="${SLOTS[who.length][i]}">${arch(w)}</figure>`).join('');
      void castEl.offsetWidth; // 最初の登場も、ふわっと出す
    },
    // 1拍ごと：いる人・話し手・話し手の顔
    show(castEl, faceEl, cast, speaker) {
      const here = new Map(cast.map(([w, o]) => [w, o || {}]));
      const talker = speakerOf(speaker);
      castEl.querySelectorAll('.fig').forEach((f) => {
        const w = f.dataset.who;
        f.classList.toggle('away', !here.has(w));
        f.classList.toggle('speaking', here.has(w) && w === talker);
        f.classList.toggle('listening', here.has(w) && !!talker && w !== talker);
      });
      faceEl.innerHTML = talker ? `<img src="${faceSrc(talker, (here.get(talker) || {}).expr)}" alt="">` : '';
    },
  };
})();
