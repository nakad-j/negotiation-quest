// art.js — 仮の人物イラスト（SVG）。表情・しぐさを部品で切り替える。
// すべて関数で SVG 文字列を返す。

const ART = {};

// ---------- リーナ ----------
// expr: neutral | smile | joy | frown | angry | sad | surprised | think | hurt
// pose: rest | crossed | amulet | hilt | draw | table | handshake | wave
// look: center | away | down
ART.lina = function ({ expr = 'neutral', pose = 'rest', look = 'center' } = {}) {
  const skin = '#f6d3b3', hair = '#6b3b22', tunic = '#3f6fb5', tunicDark = '#2e5490';
  const lx = look === 'away' ? -9 : 0;
  const ly = look === 'down' ? 6 : 0;

  // 目
  let eyes;
  const ex1 = 128 + lx, ex2 = 172 + lx, ey = 138 + ly;
  switch (expr) {
    case 'joy':
      eyes = `<path d="M${ex1 - 9} ${ey + 2} q9 -10 18 0" stroke="#2a1a10" stroke-width="4" fill="none" stroke-linecap="round"/>
              <path d="M${ex2 - 9} ${ey + 2} q9 -10 18 0" stroke="#2a1a10" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      break;
    case 'angry':
    case 'think':
      eyes = `<ellipse cx="${ex1}" cy="${ey + 2}" rx="7" ry="4.5" fill="#2a1a10"/><ellipse cx="${ex2}" cy="${ey + 2}" rx="7" ry="4.5" fill="#2a1a10"/>`;
      break;
    case 'surprised':
      eyes = `<circle cx="${ex1}" cy="${ey}" r="8" fill="#fff" stroke="#2a1a10" stroke-width="2"/><circle cx="${ex1}" cy="${ey}" r="4.5" fill="#2a1a10"/>
              <circle cx="${ex2}" cy="${ey}" r="8" fill="#fff" stroke="#2a1a10" stroke-width="2"/><circle cx="${ex2}" cy="${ey}" r="4.5" fill="#2a1a10"/>`;
      break;
    case 'sad':
    case 'hurt':
      eyes = `<ellipse cx="${ex1}" cy="${ey + 3}" rx="6" ry="6.5" fill="#2a1a10"/><ellipse cx="${ex2}" cy="${ey + 3}" rx="6" ry="6.5" fill="#2a1a10"/>
              <circle cx="${ex1 + 2}" cy="${ey + 1}" r="2" fill="#fff"/><circle cx="${ex2 + 2}" cy="${ey + 1}" r="2" fill="#fff"/>`;
      break;
    default:
      eyes = `<ellipse cx="${ex1}" cy="${ey}" rx="6.5" ry="8" fill="#2a1a10"/><ellipse cx="${ex2}" cy="${ey}" rx="6.5" ry="8" fill="#2a1a10"/>
              <circle cx="${ex1 + 2}" cy="${ey - 3}" r="2.2" fill="#fff"/><circle cx="${ex2 + 2}" cy="${ey - 3}" r="2.2" fill="#fff"/>`;
  }

  // 眉
  const by = 120;
  // 眉は左右の傾きで表現（内側の端の高さ）
  const inner = { neutral: 0, smile: -2, joy: -4, frown: 5, angry: 9, sad: -6, surprised: -8, think: 4, hurt: -6 }[expr] ?? 0;
  const outer = { neutral: 0, smile: -2, joy: -3, frown: 0, angry: -2, sad: 4, surprised: -8, think: -3, hurt: 5 }[expr] ?? 0;
  const brows = `<g stroke="${hair}" stroke-width="4.5" stroke-linecap="round" fill="none">
      <path d="M${ex1 - 12} ${by + outer} L${ex1 + 10} ${by + inner}"/>
      <path d="M${ex2 + 12} ${by + outer} L${ex2 - 10} ${by + inner}"/>
    </g>`;

  // 口
  const mouthMap = {
    neutral: `<path d="M140 172 q10 3 20 0" stroke="#7a3b2a" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    smile: `<path d="M136 168 q14 14 28 0" stroke="#7a3b2a" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    joy: `<path d="M134 166 q16 22 32 0 z" fill="#b5453a"/><path d="M140 170 q10 4 20 0" fill="#fff"/>`,
    frown: `<path d="M140 176 q10 -7 20 0" stroke="#7a3b2a" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    angry: `<path d="M138 170 h24 v6 q-12 6 -24 0 z" fill="#7a3b2a"/>`,
    sad: `<path d="M140 177 q10 -8 20 0" stroke="#7a3b2a" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    surprised: `<ellipse cx="150" cy="174" rx="7" ry="9" fill="#7a3b2a"/>`,
    think: `<path d="M142 173 h14" stroke="#7a3b2a" stroke-width="3.5" stroke-linecap="round"/>`,
    hurt: `<path d="M140 176 q5 -4 10 0 q5 4 10 0" stroke="#7a3b2a" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  };
  const blush = (expr === 'joy' || expr === 'smile')
    ? `<ellipse cx="114" cy="160" rx="10" ry="5" fill="#f19a8f" opacity=".55"/><ellipse cx="186" cy="160" rx="10" ry="5" fill="#f19a8f" opacity=".55"/>` : '';
  const tear = (expr === 'hurt') ? `<path d="M${ex1 - 4} ${ey + 10} q-3 9 0 12 q4 -3 0 -12" fill="#7cc4f0"/>` : '';
  const sweat = (expr === 'surprised') ? `<path d="M200 105 q-6 10 0 14 q6 -4 0 -14" fill="#9fd8ff"/>` : '';
  const angerMark = (expr === 'angry') ? `<g stroke="#d4382c" stroke-width="4" stroke-linecap="round"><path d="M200 92 l10 -4 M204 84 l3 10 M214 96 l-4 -9"/></g>` : '';

  // 剣（椅子に立てかけ、柄が右手側に見える）
  const swordDrawn = pose === 'draw';
  const sword = swordDrawn
    ? `<g data-hot="hilt"><rect x="236" y="150" width="9" height="120" fill="#cfd8e3" stroke="#7d8896" stroke-width="2" transform="rotate(-18 240 270)"/>
         <rect x="224" y="262" width="34" height="9" rx="3" fill="#8a6a2a" transform="rotate(-18 240 270)"/>
         <rect x="236" y="270" width="9" height="34" rx="3" fill="#5a3a1a" transform="rotate(-18 240 270)"/></g>`
    : `<g data-hot="hilt" class="hot-g"><rect x="236" y="236" width="9" height="30" rx="3" fill="#5a3a1a"/>
         <rect x="224" y="262" width="34" height="9" rx="3" fill="#8a6a2a"/>
         <circle cx="240.5" cy="232" r="6" fill="#c9a640"/>
         <rect x="234" y="271" width="13" height="80" fill="#6a4a2a"/></g>`;

  // 腕
  const arm = (d) => `<path d="${d}" stroke="${tunicDark}" stroke-width="26" stroke-linecap="round" fill="none"/>`;
  const hand = (x, y) => `<circle cx="${x}" cy="${y}" r="12" fill="${skin}" stroke="#d9ab88" stroke-width="2"/>`;
  let arms = '';
  switch (pose) {
    case 'crossed':
      arms = arm('M96 230 Q92 300 150 300') + arm('M204 230 Q208 300 150 300') +
        `<path d="M110 296 L190 296" stroke="${tunicDark}" stroke-width="26" stroke-linecap="round"/>` + hand(112, 292) + hand(188, 300);
      break;
    case 'amulet':
      arms = arm('M204 230 Q214 300 206 360') + arm('M96 230 Q86 290 140 252') + hand(146, 246);
      break;
    case 'hilt':
      arms = arm('M96 230 Q90 300 96 360') + arm('M204 230 Q226 250 238 256') + hand(240, 256);
      break;
    case 'draw':
      arms = arm('M96 230 Q90 300 96 360') + arm('M204 230 Q226 260 236 286') + hand(238, 286);
      break;
    case 'table':
      arms = arm('M96 230 Q86 320 116 384') + arm('M204 230 Q214 320 184 384') + hand(118, 386) + hand(182, 386);
      break;
    case 'handshake':
      arms = arm('M96 230 Q90 300 96 360') + arm('M110 240 Q130 330 108 392') + hand(104, 394);
      break;
    case 'wave':
      arms = arm('M96 230 Q90 300 96 360') + arm('M204 230 Q236 190 236 140') + hand(236, 132);
      break;
    default:
      arms = arm('M96 230 Q86 300 96 370') + arm('M204 230 Q214 300 204 370');
  }

  return `<svg viewBox="0 0 300 400" class="char lina" xmlns="http://www.w3.org/2000/svg">
    ${sword}
    <!-- 後ろ髪 -->
    <path d="M88 120 Q86 60 150 58 Q214 60 212 120 L216 205 Q150 222 84 205 Z" fill="${hair}"/>
    <!-- 胴 -->
    <path d="M84 222 Q150 196 216 222 L232 400 L68 400 Z" fill="${tunic}"/>
    <path d="M128 206 L150 236 L172 206" fill="#e9e1cf"/>
    <rect x="138" y="182" width="24" height="28" fill="${skin}"/>
    <!-- お守り -->
    <g data-hot="amulet" class="hot-g">
      <path d="M134 204 Q150 232 166 204" stroke="#8a5a2a" stroke-width="2.5" fill="none"/>
      <circle cx="150" cy="238" r="11" fill="#b9873f" stroke="#6b4a1f" stroke-width="3"/>
      <path d="M145 238 h10 M150 233 v10" stroke="#6b4a1f" stroke-width="2.5"/>
    </g>
    ${arms}
    <!-- 頭 -->
    <ellipse cx="150" cy="135" rx="58" ry="60" fill="${skin}"/>
    <!-- 前髪・鉢巻 -->
    <path d="M92 118 Q96 64 150 66 Q206 64 208 118 Q186 96 160 104 Q150 88 134 104 Q112 96 92 118 Z" fill="${hair}"/>
    <path d="M93 104 Q150 84 207 104" stroke="#c9403a" stroke-width="7" fill="none"/>
    <path d="M206 104 l18 10 l-6 6 z" fill="#c9403a"/>
    ${brows}${eyes}${blush}${mouthMap[expr] || mouthMap.neutral}${tear}${sweat}${angerMark}
  </svg>`;
};

// ---------- ボルド（戦士） ----------
// state: idle | count | knee | grin | worried | take | lookaway | sleep
ART.bold = function ({ state = 'idle' } = {}) {
  const skin = '#d8a57e';
  const eyes = state === 'grin' || state === 'take'
    ? `<path d="M108 98 q7 -7 14 0 M138 98 q7 -7 14 0" stroke="#222" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
    : state === 'lookaway'
      ? `<circle cx="110" cy="98" r="3.5" fill="#222"/><circle cx="140" cy="98" r="3.5" fill="#222"/>`
      : state === 'sleep'
        ? `<path d="M108 99 h12 M138 99 h12" stroke="#222" stroke-width="3" />`
        : `<circle cx="116" cy="98" r="4" fill="#222"/><circle cx="146" cy="98" r="4" fill="#222"/>`;
  const mouth = state === 'grin' || state === 'take'
    ? `<path d="M116 128 q14 12 28 0" stroke="#5a2a1a" stroke-width="3.5" fill="none"/>`
    : state === 'worried' ? `<path d="M118 132 q12 -6 24 0" stroke="#5a2a1a" stroke-width="3.5" fill="none"/>`
      : `<path d="M120 130 h20" stroke="#5a2a1a" stroke-width="3.5"/>`;
  let arms = `<path d="M70 170 Q56 230 66 280" stroke="#7a5a3a" stroke-width="28" stroke-linecap="round" fill="none"/>
              <path d="M190 170 Q204 230 194 280" stroke="#7a5a3a" stroke-width="28" stroke-linecap="round" fill="none"/>`;
  if (state === 'count') {
    arms = `<path d="M70 170 Q56 230 66 280" stroke="#7a5a3a" stroke-width="28" stroke-linecap="round" fill="none"/>
            <path d="M190 170 Q214 150 196 118" stroke="#7a5a3a" stroke-width="28" stroke-linecap="round" fill="none"/>
            <circle cx="196" cy="110" r="14" fill="${skin}"/><path d="M190 98 v-14 M197 96 v-16 M204 98 v-12" stroke="${skin}" stroke-width="6" stroke-linecap="round"/>`;
  } else if (state === 'knee') {
    arms = `<path d="M70 170 Q56 230 66 280" stroke="#7a5a3a" stroke-width="28" stroke-linecap="round" fill="none"/>
            <path d="M190 170 Q200 240 160 290" stroke="#7a5a3a" stroke-width="28" stroke-linecap="round" fill="none"/><circle cx="158" cy="292" r="14" fill="${skin}"/>`;
  } else if (state === 'take') {
    arms = `<path d="M70 170 Q56 230 66 280" stroke="#7a5a3a" stroke-width="28" stroke-linecap="round" fill="none"/>
            <path d="M190 170 Q240 210 250 260" stroke="#7a5a3a" stroke-width="28" stroke-linecap="round" fill="none"/><circle cx="252" cy="266" r="14" fill="${skin}"/>`;
  }
  const zz = state === 'sleep' ? `<text x="170" y="70" font-size="22" fill="#555">z z</text>` : '';
  return `<svg viewBox="0 0 270 300" class="char bold" xmlns="http://www.w3.org/2000/svg">
    <path d="M56 170 Q130 140 204 170 L218 300 L42 300 Z" fill="#8a6a4a"/>
    <path d="M70 170 Q130 158 190 170 L196 214 Q130 230 64 214 Z" fill="#9aa3ad"/>
    ${arms}
    <ellipse cx="130" cy="104" rx="46" ry="48" fill="${skin}"/>
    <path d="M86 92 Q90 50 130 52 Q172 50 176 92 Q160 74 130 76 Q100 74 86 92 Z" fill="#555"/>
    <path d="M92 118 Q130 166 168 118 Q160 146 130 150 Q100 146 92 118 Z" fill="#6a5a4a"/>
    <path d="M104 88 h22 M134 88 h22" stroke="#444" stroke-width="5" stroke-linecap="round"/>
    ${eyes}${mouth}${zz}
    <rect x="186" y="96" width="10" height="16" rx="3" fill="#e0b090" opacity="0"/>
  </svg>`;
};

// ---------- トト（主人公・小鬼） ----------
// expr: neutral | sweat | smile | worry | resolve | bow
ART.toto = function ({ expr = 'neutral' } = {}) {
  const g = '#7fb069', gd = '#5d8a4a';
  const mouth = {
    neutral: `<path d="M104 120 q8 4 16 0" stroke="#2a3a1a" stroke-width="3" fill="none"/>`,
    smile: `<path d="M98 116 q14 14 28 0" stroke="#2a3a1a" stroke-width="3.5" fill="none"/>`,
    sweat: `<path d="M100 120 q6 -4 12 0 q6 4 12 0" stroke="#2a3a1a" stroke-width="3" fill="none"/>`,
    worry: `<path d="M102 124 q10 -7 20 0" stroke="#2a3a1a" stroke-width="3" fill="none"/>`,
    resolve: `<path d="M102 121 h20" stroke="#2a3a1a" stroke-width="3.5"/>`,
    bow: `<path d="M98 116 q14 14 28 0" stroke="#2a3a1a" stroke-width="3.5" fill="none"/>`,
  }[expr];
  const drop = (expr === 'sweat' || expr === 'worry') ? `<path d="M150 70 q-6 10 0 14 q6 -4 0 -14" fill="#9fd8ff"/>` : '';
  const brows = expr === 'worry' || expr === 'sweat'
    ? `<path d="M92 82 l14 4 M132 82 l-14 4" stroke="#2a3a1a" stroke-width="3.5" stroke-linecap="round"/>`
    : expr === 'resolve' ? `<path d="M92 80 l14 6 M132 80 l-14 6" stroke="#2a3a1a" stroke-width="3.5" stroke-linecap="round"/>` : '';
  return `<svg viewBox="0 0 220 230" class="char toto" xmlns="http://www.w3.org/2000/svg">
    <path d="M60 150 Q112 132 164 150 L176 230 L48 230 Z" fill="#6a4a8a"/>
    <path d="M60 150 Q112 166 164 150" stroke="#e0c070" stroke-width="5" fill="none"/>
    <!-- 帳面 -->
    <rect x="128" y="168" width="54" height="44" rx="4" fill="#c9a36a" stroke="#7a5a2a" stroke-width="3" transform="rotate(-10 150 190)"/>
    <path d="M140 180 h30 M140 190 h26 M140 200 h22" stroke="#7a5a2a" stroke-width="2" transform="rotate(-10 150 190)"/>
    <path d="M34 70 L70 92 L64 104 Z" fill="${g}"/><path d="M190 70 L154 92 L160 104 Z" fill="${g}"/>
    <ellipse cx="112" cy="100" rx="50" ry="46" fill="${g}"/>
    <path d="M100 56 l6 -18 l8 18 z" fill="${gd}"/>
    <ellipse cx="96" cy="96" rx="9" ry="11" fill="#fff"/><ellipse cx="128" cy="96" rx="9" ry="11" fill="#fff"/>
    <circle cx="98" cy="98" r="5" fill="#222"/><circle cx="130" cy="98" r="5" fill="#222"/>
    ${brows}${mouth}${drop}
  </svg>`;
};

// ---------- 脇役（後日・幕間で使う簡単な絵） ----------
ART.vera = function ({ expr = 'cool' } = {}) {
  const mouth = expr === 'pleased' ? `<path d="M88 104 q12 10 24 0" stroke="#5a1a2a" stroke-width="3" fill="none"/>`
    : expr === 'stern' ? `<path d="M90 108 q10 -5 20 0" stroke="#5a1a2a" stroke-width="3" fill="none"/>`
      : `<path d="M90 106 h20" stroke="#5a1a2a" stroke-width="3"/>`;
  return `<svg viewBox="0 0 200 320" class="char vera" xmlns="http://www.w3.org/2000/svg">
    <path d="M70 300 Q40 250 80 210 Q120 180 100 150 L120 150 Q150 200 110 240 Q80 270 130 300 Z" fill="#5c8f6a"/>
    <path d="M60 300 Q110 290 170 310 L60 320 Z" fill="#4a7a58"/>
    <path d="M72 150 Q100 132 128 150 L124 220 L76 220 Z" fill="#2c2c3c"/>
    <ellipse cx="100" cy="92" rx="34" ry="38" fill="#cfe3c8"/>
    <path d="M64 92 Q62 44 100 46 Q140 44 136 92 Q130 60 100 62 Q72 60 64 92 Z" fill="#2a4a3a"/>
    <rect x="76" y="80" width="20" height="12" rx="3" fill="none" stroke="#222" stroke-width="2.5"/>
    <rect x="104" y="80" width="20" height="12" rx="3" fill="none" stroke="#222" stroke-width="2.5"/>
    <path d="M96 86 h8" stroke="#222" stroke-width="2.5"/>
    <circle cx="86" cy="86" r="3" fill="#222"/><circle cx="114" cy="86" r="3" fill="#222"/>
    ${mouth}
    <rect x="122" y="160" width="40" height="52" fill="#efe6d0" stroke="#8a7a5a" stroke-width="2"/>
    <path d="M128 172 h28 M128 182 h24 M128 192 h26" stroke="#8a7a5a" stroke-width="2"/>
  </svg>`;
};

ART.garza = function ({ horn = true, expr = 'calm' } = {}) {
  const mouth = expr === 'ouch' ? `<path d="M120 150 q10 -10 20 0 q10 10 20 0" stroke="#222" stroke-width="3" fill="none"/>`
    : `<path d="M124 150 q16 8 32 0" stroke="#222" stroke-width="3" fill="none"/>`;
  return `<svg viewBox="0 0 280 330" class="char garza" xmlns="http://www.w3.org/2000/svg">
    <path d="M60 330 Q60 200 140 190 Q220 200 220 330 Z" fill="#4a2a5a"/>
    <path d="M80 200 Q140 230 200 200 L200 220 Q140 250 80 220 Z" fill="#c9a640"/>
    <ellipse cx="140" cy="130" rx="56" ry="60" fill="#8a9aa8"/>
    <path d="M96 170 Q140 240 184 170 Q170 200 140 204 Q110 200 96 170 Z" fill="#e8e8e8"/>
    <path d="M106 116 h20 M154 116 h20" stroke="#e8e8e8" stroke-width="7" stroke-linecap="round"/>
    <circle cx="118" cy="130" r="4" fill="#222"/><circle cx="162" cy="130" r="4" fill="#222"/>
    ${mouth}
    <path d="M96 90 Q70 60 82 20 Q96 56 110 80 Z" fill="#e8dcc0" stroke="#8a7a5a" stroke-width="2"/>
    ${horn ? `<path d="M184 90 Q210 60 198 20 Q184 56 170 80 Z" fill="#e8dcc0" stroke="#8a7a5a" stroke-width="2"/>`
      : `<path d="M184 90 L178 76 L170 80 Z" fill="#e8dcc0" stroke="#8a7a5a" stroke-width="2"/>`}
    ${expr === 'ouch' ? `<text x="200" y="230" font-size="28" fill="#d4382c" font-weight="bold">腰っ…</text>` : ''}
  </svg>`;
};

ART.crafter = function ({ expr = 'glum' } = {}) {
  const happy = expr === 'joy';
  return `<svg viewBox="0 0 220 260" class="char crafter" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 260 Q50 170 110 166 Q170 170 170 260 Z" fill="#8a5a3a"/>
    <rect x="70" y="190" width="80" height="50" fill="#c9a36a"/>
    <ellipse cx="110" cy="110" rx="56" ry="52" fill="#a8b878"/>
    <path d="M58 92 L30 70 L64 80 Z M162 92 L190 70 L156 80 Z" fill="#a8b878"/>
    <circle cx="90" cy="104" r="14" fill="#fff" stroke="#444" stroke-width="3"/><circle cx="130" cy="104" r="14" fill="#fff" stroke="#444" stroke-width="3"/>
    <circle cx="90" cy="106" r="5" fill="#222"/><circle cx="130" cy="106" r="5" fill="#222"/>
    ${happy ? `<path d="M88 132 q22 22 44 0" stroke="#333" stroke-width="4" fill="none"/>
               <path d="M80 122 q-4 14 0 18 M140 122 q4 14 0 18" stroke="#7cc4f0" stroke-width="4" fill="none"/>`
      : `<path d="M92 138 q18 -8 36 0" stroke="#333" stroke-width="4" fill="none"/>`}
    <rect x="160" y="160" width="12" height="60" fill="#777" transform="rotate(20 166 190)"/>
  </svg>`;
};

ART.dogma = function () {
  return `<svg viewBox="0 0 300 340" class="char dogma" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 340 Q40 190 150 180 Q260 190 260 340 Z" fill="#a0463a"/>
    <ellipse cx="150" cy="120" rx="70" ry="66" fill="#c0705a"/>
    <path d="M96 80 L84 40 L110 70 Z M204 80 L216 40 L190 70 Z" fill="#eee"/>
    <path d="M108 104 l26 10 M192 104 l-26 10" stroke="#222" stroke-width="6" stroke-linecap="round"/>
    <circle cx="124" cy="124" r="6" fill="#222"/><circle cx="176" cy="124" r="6" fill="#222"/>
    <path d="M116 160 q34 24 68 0" stroke="#222" stroke-width="5" fill="#fff"/>
    <path d="M250 60 L270 330" stroke="#6a4a2a" stroke-width="12"/>
    <path d="M226 50 Q290 40 290 110 Q256 90 236 110 Z" fill="#bcc4cc" stroke="#666" stroke-width="3"/>
  </svg>`;
};

ART.king = function () {
  return `<svg viewBox="0 0 240 320" class="char king" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 320 Q40 190 120 180 Q200 190 200 320 Z" fill="#7a5a3a"/>
    <path d="M60 196 Q120 170 180 196 L170 230 Q120 210 70 230 Z" fill="#9a7a5a"/>
    <ellipse cx="120" cy="118" rx="48" ry="52" fill="#e8c8a8"/>
    <path d="M72 100 Q70 50 120 50 Q170 50 168 100 Q140 30 72 100 Z" fill="#8a7a6a"/>
    <path d="M84 150 Q120 210 156 150 Q140 176 120 178 Q100 176 84 150 Z" fill="#ddd"/>
    <path d="M100 112 h14 M126 112 h14" stroke="#555" stroke-width="3"/>
    <circle cx="107" cy="122" r="3.5" fill="#222"/><circle cx="133" cy="122" r="3.5" fill="#222"/>
    <path d="M110 150 h20" stroke="#555" stroke-width="3"/>
  </svg>`;
};

// 背景
ART.bg = {
  storeroom: `<svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <rect width="1000" height="560" fill="#3b2f3f"/>
    <rect y="380" width="1000" height="180" fill="#2a2030"/>
    <g fill="#5a4636" stroke="#3a2a20" stroke-width="4">
      <rect x="40" y="90" width="220" height="16"/><rect x="40" y="190" width="220" height="16"/><rect x="40" y="290" width="220" height="16"/>
      <rect x="740" y="90" width="220" height="16"/><rect x="740" y="190" width="220" height="16"/><rect x="740" y="290" width="220" height="16"/>
    </g>
    <g opacity=".75">
      <rect x="60" y="50" width="40" height="40" fill="#8a6a3a"/><rect x="110" y="62" width="60" height="28" fill="#6a7a8a"/>
      <circle cx="210" cy="170" r="20" fill="#9a4a3a"/><rect x="70" y="150" width="50" height="40" fill="#7a6a4a"/>
      <rect x="760" y="56" width="70" height="34" fill="#7a6a4a"/><path d="M860 90 l20 -40 l20 40 z" fill="#aaa"/>
      <rect x="780" y="250" width="40" height="40" fill="#5a7a5a"/><rect x="840" y="244" width="80" height="46" fill="#8a6a3a"/>
      <text x="800" y="180" font-size="34" fill="#bbb">⚔ ⛓</text><text x="70" y="280" font-size="30" fill="#bbb">🕯 📜</text>
    </g>
    <rect x="430" y="40" width="140" height="120" fill="#1e2a44" stroke="#5a4636" stroke-width="8"/>
    <path d="M500 40 v120 M430 100 h140" stroke="#5a4636" stroke-width="6"/>
    <g fill="#6a4a2a"><ellipse cx="300" cy="420" rx="40" ry="14"/><rect x="260" y="350" width="80" height="70"/><ellipse cx="300" cy="350" rx="40" ry="14" fill="#7a5a3a"/></g>
    <text x="280" y="395" font-size="18" fill="#3a2a1a">樽</text>
  </svg>`,
  corridor: `<svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <rect width="1000" height="560" fill="#2c2838"/><path d="M0 420 L1000 420 L1000 560 L0 560Z" fill="#1f1b28"/>
    <g fill="#3c3648">${[0, 1, 2, 3, 4].map(i => `<rect x="${60 + i * 200}" y="80" width="80" height="340"/>`).join('')}</g>
    <g>${[0, 1, 2, 3].map(i => `<circle cx="${200 + i * 200}" cy="160" r="12" fill="#f0b040"/><circle cx="${200 + i * 200}" cy="160" r="40" fill="#f0b040" opacity=".15"/>`).join('')}</g>
  </svg>`,
  workshop: `<svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <rect width="1000" height="560" fill="#3a3a2a"/><rect y="400" width="1000" height="160" fill="#2a2a1e"/>
    <g stroke="#8a8a6a" stroke-width="5" fill="none"><circle cx="150" cy="160" r="60"/><circle cx="150" cy="160" r="20"/><path d="M150 100 v120 M90 160 h120"/>
    <circle cx="850" cy="200" r="80"/><path d="M850 120 v160 M770 200 h160"/></g>
    <text x="380" y="140" font-size="48" fill="#aaa" opacity=".6">⚙ 🪤 ⛓</text>
  </svg>`,
  throne: `<svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <rect width="1000" height="560" fill="#2a1830"/><rect y="400" width="1000" height="160" fill="#3a2040"/>
    <path d="M440 420 L560 420 L600 560 L400 560 Z" fill="#8a1a2a"/>
    <g fill="#4a2a50">${[0, 1, 2, 3].map(i => `<rect x="${80 + i * 260}" y="40" width="60" height="380"/>`).join('')}</g>
    <path d="M430 400 L430 160 Q500 100 570 160 L570 400 Z" fill="#6a3a2a" stroke="#c9a640" stroke-width="6"/>
    <text x="160" y="200" font-size="42" opacity=".6">🔥</text><text x="800" y="200" font-size="42" opacity=".6">🔥</text>
  </svg>`,
  capital: `<svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <rect width="1000" height="560" fill="#3a3448"/><rect y="400" width="1000" height="160" fill="#4a4258"/>
    <g fill="#5a5070">${[0, 1, 2, 3, 4].map(i => `<rect x="${40 + i * 220}" y="60" width="50" height="340"/>`).join('')}</g>
    <path d="M300 60 h400 v40 h-400z" fill="#7a2a3a"/><text x="455" y="90" font-size="26" fill="#e0c070">王都 謁見の間</text>
  </svg>`,
  field: `<svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <rect width="1000" height="560" fill="#7a3a2a"/><rect y="380" width="1000" height="180" fill="#4a2a1a"/>
    <text x="80" y="200" font-size="70" opacity=".5">🔥</text><text x="820" y="160" font-size="70" opacity=".5">💥</text>
  </svg>`,
  village: `<svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <rect width="1000" height="560" fill="#8fb4d8"/><rect y="380" width="1000" height="180" fill="#7a9a4a"/>
    <path d="M100 380 l60 -60 l60 60z M700 380 l80 -70 l80 70z" fill="#8a5a3a"/>
    <text x="420" y="160" font-size="36" fill="#fff" opacity=".8">☁ ☁</text>
  </svg>`,
};
