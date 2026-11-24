// art.js — おかえりください勇者様：仮の人物イラスト（SVG）
const ART = {};

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

// ---------- 共通：顔 ----------
// expr: neutral | smile | joy | angry | sad | worried | surprised | proud | cry
function FACE(cx, cy, s, expr, ink = '#2a1a10') {
  const ex = 20 * s, ey = cy - 4 * s;
  const L = cx - ex, R = cx + ex;
  let eyes;
  switch (expr) {
    case 'joy': case 'proud':
      eyes = `<path d="M${L - 7 * s} ${ey + 2} q${7 * s} ${-9 * s} ${14 * s} 0 M${R - 7 * s} ${ey + 2} q${7 * s} ${-9 * s} ${14 * s} 0" stroke="${ink}" stroke-width="${3.5 * s}" fill="none" stroke-linecap="round"/>`; break;
    case 'angry':
      eyes = `<ellipse cx="${L}" cy="${ey + 2}" rx="${6 * s}" ry="${4 * s}" fill="${ink}"/><ellipse cx="${R}" cy="${ey + 2}" rx="${6 * s}" ry="${4 * s}" fill="${ink}"/>`; break;
    case 'surprised':
      eyes = `<circle cx="${L}" cy="${ey}" r="${7 * s}" fill="#fff" stroke="${ink}" stroke-width="2"/><circle cx="${L}" cy="${ey}" r="${3.5 * s}" fill="${ink}"/><circle cx="${R}" cy="${ey}" r="${7 * s}" fill="#fff" stroke="${ink}" stroke-width="2"/><circle cx="${R}" cy="${ey}" r="${3.5 * s}" fill="${ink}"/>`; break;
    case 'cry':
      eyes = `<path d="M${L - 7 * s} ${ey} q${7 * s} ${6 * s} ${14 * s} 0 M${R - 7 * s} ${ey} q${7 * s} ${6 * s} ${14 * s} 0" stroke="${ink}" stroke-width="${3.5 * s}" fill="none" stroke-linecap="round"/>
        <path d="M${L - 2 * s} ${ey + 6 * s} q${-3 * s} ${12 * s} 0 ${16 * s} M${R + 2 * s} ${ey + 6 * s} q${3 * s} ${12 * s} 0 ${16 * s}" stroke="#7cc4f0" stroke-width="${3 * s}" fill="none"/>`; break;
    default:
      eyes = `<ellipse cx="${L}" cy="${ey}" rx="${5.5 * s}" ry="${7 * s}" fill="${ink}"/><ellipse cx="${R}" cy="${ey}" rx="${5.5 * s}" ry="${7 * s}" fill="${ink}"/>
        <circle cx="${L + 2 * s}" cy="${ey - 3 * s}" r="${2 * s}" fill="#fff"/><circle cx="${R + 2 * s}" cy="${ey - 3 * s}" r="${2 * s}" fill="#fff"/>`;
  }
  const inner = { neutral: 0, smile: -2, joy: -4, angry: 8, sad: -6, worried: -7, surprised: -8, proud: 3, cry: -7 }[expr] ?? 0;
  const outer = { neutral: 0, smile: -2, joy: -3, angry: -3, sad: 4, worried: 5, surprised: -8, proud: -4, cry: 5 }[expr] ?? 0;
  const by = ey - 16 * s;
  const brows = `<g stroke="${ink}" stroke-width="${3.5 * s}" stroke-linecap="round"><path d="M${L - 10 * s} ${by + outer * s} L${L + 8 * s} ${by + inner * s}"/><path d="M${R + 10 * s} ${by + outer * s} L${R - 8 * s} ${by + inner * s}"/></g>`;
  const my = cy + 24 * s;
  const mouth = {
    neutral: `<path d="M${cx - 9 * s} ${my} h${18 * s}" stroke="${ink}" stroke-width="${3 * s}" stroke-linecap="round"/>`,
    smile: `<path d="M${cx - 12 * s} ${my - 3 * s} q${12 * s} ${12 * s} ${24 * s} 0" stroke="${ink}" stroke-width="${3 * s}" fill="none" stroke-linecap="round"/>`,
    joy: `<path d="M${cx - 14 * s} ${my - 4 * s} q${14 * s} ${20 * s} ${28 * s} 0 z" fill="#b5453a"/>`,
    proud: `<path d="M${cx - 14 * s} ${my - 4 * s} q${14 * s} ${16 * s} ${28 * s} 0 z" fill="#b5453a"/><path d="M${cx - 10 * s} ${my - 2 * s} h${20 * s}" stroke="#fff" stroke-width="${3 * s}"/>`,
    angry: `<path d="M${cx - 12 * s} ${my - 2 * s} h${24 * s} v${6 * s} q${-12 * s} ${6 * s} ${-24 * s} 0 z" fill="${ink}"/>`,
    sad: `<path d="M${cx - 10 * s} ${my + 3 * s} q${10 * s} ${-8 * s} ${20 * s} 0" stroke="${ink}" stroke-width="${3 * s}" fill="none" stroke-linecap="round"/>`,
    worried: `<path d="M${cx - 10 * s} ${my + 2 * s} q${5 * s} ${-4 * s} ${10 * s} 0 q${5 * s} ${4 * s} ${10 * s} 0" stroke="${ink}" stroke-width="${3 * s}" fill="none"/>`,
    surprised: `<ellipse cx="${cx}" cy="${my + 2 * s}" rx="${6 * s}" ry="${8 * s}" fill="${ink}"/>`,
    cry: `<path d="M${cx - 12 * s} ${my + 4 * s} q${12 * s} ${-12 * s} ${24 * s} 0 z" fill="#b5453a"/>`,
  }[expr] || '';
  const blush = (expr === 'joy' || expr === 'smile' || expr === 'cry') ? `<ellipse cx="${L - 6 * s}" cy="${cy + 14 * s}" rx="${8 * s}" ry="${4 * s}" fill="#f19a8f" opacity=".5"/><ellipse cx="${R + 6 * s}" cy="${cy + 14 * s}" rx="${8 * s}" ry="${4 * s}" fill="#f19a8f" opacity=".5"/>` : '';
  const sweat = (expr === 'worried' || expr === 'surprised') ? `<path d="M${R + 26 * s} ${ey - 20 * s} q${-5 * s} ${9 * s} 0 ${13 * s} q${5 * s} ${-4 * s} 0 ${-13 * s}" fill="#9fd8ff"/>` : '';
  return brows + eyes + blush + mouth + sweat;
}

// ---------- 勇者レオン：ぴかぴかの鎧（借り物） ----------
// pose: rest | point | slump | shake
ART.leon = function ({ expr = 'proud', pose = 'rest' } = {}) {
  const skin = '#f2cfae', steel = '#d9e2ec', steelD = '#9aa8b8', gold = '#e0b040';
  const arm = (d) => `<path d="${d}" stroke="${steelD}" stroke-width="28" stroke-linecap="round" fill="none"/><path d="${d}" stroke="${steel}" stroke-width="20" stroke-linecap="round" fill="none"/>`;
  let arms;
  if (pose === 'point') arms = arm('M86 230 Q70 290 84 350') + arm('M214 230 Q256 200 286 160') + `<circle cx="290" cy="156" r="13" fill="${steelD}"/>`;
  else if (pose === 'slump') arms = arm('M86 236 Q80 300 96 372') + arm('M214 236 Q220 300 204 372');
  else arms = arm('M86 230 Q60 300 84 350') + arm('M214 230 Q240 290 224 340') + `<circle cx="84" cy="352" r="13" fill="${steelD}"/><circle cx="224" cy="342" r="13" fill="${steelD}"/>`;
  const shake = pose === 'shake' ? `<g stroke="#fff" stroke-width="3" opacity=".8"><path d="M62 340 l-10 -6 M60 352 l-12 0 M240 330 l10 -6 M242 344 l12 0"/></g>` : '';
  return `<svg viewBox="0 0 300 420" class="char" xmlns="http://www.w3.org/2000/svg">
    <path d="M70 230 L40 420 L260 420 L230 230 Z" fill="#b8403a"/>
    <path d="M80 214 Q150 190 220 214 L232 400 L68 400 Z" fill="${steel}" stroke="${steelD}" stroke-width="4"/>
    <path d="M150 220 v150 M100 290 h100" stroke="${steelD}" stroke-width="3"/>
    <circle cx="150" cy="268" r="16" fill="${gold}" stroke="#a07a20" stroke-width="3"/>
    <g data-hot="armor"><rect x="196" y="312" width="38" height="22" rx="3" fill="#fff8d0" stroke="#a08a40" stroke-width="2" transform="rotate(12 214 322)"/>
      <text x="200" y="328" font-size="11" fill="#6a4a10" transform="rotate(12 214 322)">貸</text>
      <path d="M200 310 l-8 -10" stroke="#a08a40" stroke-width="2"/></g>
    <g data-hot="sword"><rect x="40" y="250" width="10" height="150" fill="#eef3f8" stroke="#9aa8b8" stroke-width="2" transform="rotate(-14 45 330)"/>
      <rect x="28" y="244" width="34" height="9" rx="3" fill="${gold}" transform="rotate(-14 45 330)"/>
      <rect x="40" y="226" width="10" height="20" fill="#7a4a2a" transform="rotate(-14 45 330)"/></g>
    ${arms}${shake}
    <g data-hot="letter"><rect x="120" y="212" width="40" height="22" fill="#fffaf0" stroke="#c9a36a" stroke-width="2" transform="rotate(-8 140 222)"/>
      <path d="M124 214 l16 10 l16 -12" stroke="#c9a36a" stroke-width="1.5" fill="none" transform="rotate(-8 140 222)"/></g>
    <ellipse cx="150" cy="130" rx="56" ry="58" fill="${skin}"/>
    <path d="M92 120 Q90 60 150 56 Q210 60 208 120 Q190 88 150 92 Q110 88 92 120 Z" fill="#e0b84a"/>
    <path d="M96 100 Q150 66 204 100 L204 84 Q150 44 96 84 Z" fill="${steel}" stroke="${steelD}" stroke-width="3"/>
    <path d="M150 50 l-8 -30 l16 0 z" fill="#d04040"/>
    ${FACE(150, 132, 1, expr)}
  </svg>`;
};

// ---------- 村のハンナ：農婦。くわと嘆願書 ----------
ART.hanna = function ({ expr = 'angry', pose = 'rest' } = {}) {
  const skin = '#e8b890';
  const arm = (d) => `<path d="${d}" stroke="#7a8a5a" stroke-width="24" stroke-linecap="round" fill="none"/>`;
  let arms = arm('M90 232 Q70 300 100 340') + arm('M210 232 Q236 300 214 340');
  if (pose === 'fist') arms = arm('M90 232 Q70 300 100 340') + arm('M210 232 Q250 200 236 150') + `<circle cx="236" cy="146" r="13" fill="${skin}"/>`;
  if (pose === 'soft') arms = arm('M90 232 Q90 300 140 300') + arm('M210 232 Q210 300 160 300') + `<circle cx="150" cy="300" r="14" fill="${skin}"/>`;
  return `<svg viewBox="0 0 300 420" class="char" xmlns="http://www.w3.org/2000/svg">
    <g data-hot="hoe"><rect x="252" y="80" width="9" height="330" fill="#8a6a3a"/><path d="M236 84 h44 l-6 22 h-32 z" fill="#8a8a8a"/></g>
    <path d="M84 222 Q150 198 216 222 L236 420 L64 420 Z" fill="#7a8a5a"/>
    <path d="M110 260 h80 v160 h-80 z" fill="#e8dcc0"/>
    ${arms}
    <g data-hot="basket"><path d="M20 330 h80 l-10 56 h-60 z" fill="#c9a060" stroke="#8a6a30" stroke-width="3"/><path d="M28 330 q32 -40 64 0" stroke="#8a6a30" stroke-width="4" fill="none"/>
      <circle cx="44" cy="330" r="12" fill="#f0f0f0"/><path d="M36 326 q8 -2 16 6" stroke="#c0a0c0" stroke-width="3" fill="none"/><circle cx="70" cy="332" r="11" fill="#e8e0f0"/><path d="M62 328 l14 8" stroke="#a07aa0" stroke-width="3"/></g>
    <g data-hot="petition"><rect x="168" y="236" width="22" height="70" rx="8" fill="#f3e6c0" stroke="#a08a50" stroke-width="2" transform="rotate(18 180 270)"/><path d="M170 250 h20 M170 262 h20 M170 274 h20" stroke="#a08a50" stroke-width="1.5" transform="rotate(18 180 270)"/></g>
    <g data-hot="boots"><path d="M100 404 h40 v16 h-46 z M160 404 h40 v16 h-46 z" fill="#6a4a2a"/><path d="M96 410 q20 -8 50 0 M156 410 q20 -8 50 0" stroke="#8a7a5a" stroke-width="4" opacity=".8"/></g>
    <ellipse cx="150" cy="132" rx="54" ry="56" fill="${skin}"/>
    <path d="M94 128 Q92 70 150 66 Q208 70 206 128 Q190 96 150 98 Q110 96 94 128 Z" fill="#8a4a2a"/>
    <path d="M90 96 Q150 50 210 96 Q200 76 150 74 Q100 76 90 96 Z" fill="#d04a3a"/>
    <path d="M206 90 l26 16 l-22 4 z" fill="#d04a3a"/>
    ${FACE(150, 134, 1, expr)}
  </svg>`;
};

// ---------- 迷子のミミ：大きな袋（中に竜の子） ----------
// open: 袋の口が開き、竜の子が顔を出す
ART.mimi = function ({ expr = 'neutral', open = false } = {}) {
  const skin = '#f6d6b8';
  return `<svg viewBox="0 0 300 420" class="char" xmlns="http://www.w3.org/2000/svg">
    <path d="M100 250 Q150 230 200 250 L216 420 L84 420 Z" fill="#6a8ac8"/>
    <g data-hot="cloak"><path d="M84 240 Q150 214 216 240 L230 420 L70 420 Z" fill="#c95a4a" opacity=".92"/>
      <path d="M70 420 l12 -22 l10 16 l14 -24 l12 22 l12 -12 l8 20 z" fill="#3a2a20"/><path d="M196 420 l8 -18 l10 12 l10 -20 l6 26 z" fill="#3a2a20"/></g>
    <g data-hot="sack" class="sack ${open ? '' : 'wiggle'}">
      <path d="M150 300 q-10 -50 30 -60 q60 -8 74 40 q16 70 -40 90 q-60 12 -64 -70 z" fill="#c9b07a" stroke="#8a7040" stroke-width="4"/>
      <path d="M168 246 q20 -16 44 -6" stroke="#8a7040" stroke-width="4" fill="none"/>
      ${open ? `<g><ellipse cx="200" cy="236" rx="30" ry="24" fill="#d0503a"/><circle cx="190" cy="230" r="6" fill="#fff"/><circle cx="191" cy="231" r="3" fill="#222"/>
        <circle cx="212" cy="230" r="6" fill="#fff"/><circle cx="213" cy="231" r="3" fill="#222"/><path d="M184 214 l-6 -14 l12 8 z M216 214 l6 -14 l-12 8 z" fill="#f0c040"/>
        <path d="M196 246 q4 4 8 0" stroke="#222" stroke-width="2" fill="none"/><path d="M228 246 q24 -20 30 6 q-14 -6 -26 4 z" fill="#b0402e"/><rect x="236" y="240" width="18" height="6" fill="#fff" transform="rotate(-20 245 243)"/></g>`
        : `<text x="236" y="236" font-size="16" fill="#6a4a20">…キュウ</text>`}
    </g>
    <path d="M100 262 Q120 300 158 300" stroke="${skin}" stroke-width="16" stroke-linecap="round" fill="none"/>
    <ellipse cx="150" cy="168" rx="50" ry="52" fill="${skin}"/>
    <path d="M100 160 Q96 104 150 102 Q204 104 200 160 Q186 130 150 132 Q114 130 100 160 Z" fill="#5a3a2a"/>
    <path d="M100 150 q-20 30 -6 60 M200 150 q20 30 6 60" stroke="#5a3a2a" stroke-width="14" fill="none" stroke-linecap="round"/>
    <circle cx="108" cy="122" r="10" fill="#f08aa0"/>
    ${FACE(150, 172, .9, expr)}
  </svg>`;
};

// ---------- 魔王ガルザ（表情つき） ----------
// expr: calm | tired | grumpy | ouch | smile
ART.garza2 = function ({ expr = 'calm', horn = true } = {}) {
  const eyes = expr === 'tired' ? `<path d="M110 132 h18 M152 132 h18" stroke="#222" stroke-width="4"/>`
    : expr === 'grumpy' ? `<path d="M108 120 l20 8 M172 120 l-20 8" stroke="#e8e8e8" stroke-width="7" stroke-linecap="round"/><circle cx="118" cy="134" r="4" fill="#222"/><circle cx="162" cy="134" r="4" fill="#222"/>`
      : `<path d="M106 118 h20 M154 118 h20" stroke="#e8e8e8" stroke-width="7" stroke-linecap="round"/><circle cx="118" cy="132" r="4" fill="#222"/><circle cx="162" cy="132" r="4" fill="#222"/>`;
  const mouth = expr === 'smile' ? `<path d="M122 152 q18 12 36 0" stroke="#222" stroke-width="3" fill="none"/>`
    : expr === 'ouch' || expr === 'tired' ? `<path d="M120 154 q10 -8 20 0 q10 8 20 0" stroke="#222" stroke-width="3" fill="none"/>`
      : expr === 'grumpy' ? `<path d="M124 156 q16 -8 32 0" stroke="#222" stroke-width="3" fill="none"/>` : `<path d="M126 152 h28" stroke="#222" stroke-width="3"/>`;
  const sweat = expr === 'tired' || expr === 'ouch' ? `<path d="M196 100 q-6 10 0 14 q6 -4 0 -14" fill="#9fd8ff"/>` : '';
  return `<svg viewBox="0 0 280 330" class="char" xmlns="http://www.w3.org/2000/svg">
    <path d="M60 330 Q60 200 140 190 Q220 200 220 330 Z" fill="#4a2a5a"/>
    <path d="M80 200 Q140 230 200 200 L200 220 Q140 250 80 220 Z" fill="#c9a640"/>
    <ellipse cx="140" cy="130" rx="56" ry="60" fill="#8a9aa8"/>
    <path d="M96 170 Q140 240 184 170 Q170 200 140 204 Q110 200 96 170 Z" fill="#e8e8e8"/>
    ${eyes}${mouth}${sweat}
    <path d="M96 90 Q70 60 82 20 Q96 56 110 80 Z" fill="#e8dcc0" stroke="#8a7a5a" stroke-width="2"/>
    ${horn ? `<path d="M184 90 Q210 60 198 20 Q184 56 170 80 Z" fill="#e8dcc0" stroke="#8a7a5a" stroke-width="2"/>` : ''}
  </svg>`;
};

// ---------- 母竜（窓いっぱいの目） ----------
ART.dragon = function ({ mood = 'angry' } = {}) {
  const calm = mood === 'calm';
  return `<svg viewBox="0 0 400 300" class="char" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 300 Q40 60 220 40 Q380 40 400 200 L400 300 Z" fill="#a03a2a"/>
    <g fill="#7a2a1e">${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${60 + i * 56} ${140 - i * 10} l28 -40 l10 44 z"/>`).join('')}</g>
    <ellipse cx="220" cy="170" rx="80" ry="${calm ? 40 : 56}" fill="#f0c040" stroke="#5a1a10" stroke-width="8"/>
    <ellipse cx="220" cy="170" rx="${calm ? 22 : 12}" ry="${calm ? 36 : 50}" fill="#1a0a08"/>
    ${calm ? '' : `<path d="M120 100 l200 40" stroke="#5a1a10" stroke-width="14" stroke-linecap="round"/>`}
    <path d="M330 250 q30 10 60 -10" stroke="#ffb040" stroke-width="${calm ? 0 : 10}" fill="none" opacity=".8"/>
  </svg>`;
};

// ---------- 門番ゴブ ----------
ART.guard = function () {
  return `<svg viewBox="0 0 200 220" class="char" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 150 Q100 132 150 150 L160 220 L40 220 Z" fill="#6a6a7a"/>
    <path d="M30 70 L64 92 L58 104 Z M170 70 L136 92 L142 104 Z" fill="#9ab069"/>
    <ellipse cx="100" cy="100" rx="46" ry="42" fill="#9ab069"/>
    <path d="M56 86 Q100 40 144 86 Z" fill="#8a8a9a" stroke="#5a5a6a" stroke-width="3"/>
    <circle cx="86" cy="100" r="6" fill="#222"/><circle cx="114" cy="100" r="6" fill="#222"/>
    <path d="M90 120 q10 6 20 0" stroke="#2a3a1a" stroke-width="3" fill="none"/>
    <rect x="160" y="40" width="6" height="180" fill="#7a5a3a"/><path d="M152 40 l11 -26 l11 26 z" fill="#aaa"/>
  </svg>`;
};

// ---------- 背景 ----------
ART.bg = {
  hall: `<svg viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="420" fill="#3a2e44"/>
    <g fill="#443852" stroke="#2e2438" stroke-width="3">${Array.from({ length: 8 }, (_, r) => Array.from({ length: 14 }, (_, c) => `<rect x="${c * 90 - (r % 2) * 45}" y="${r * 40}" width="90" height="40"/>`).join('')).join('')}</g>
    <rect y="320" width="1200" height="100" fill="#2a2030"/>
    <path d="M440 320 L520 320 L560 420 L400 420 Z" fill="#7a1a2a" opacity=".8"/>
    <!-- 窓 -->
    <g id="win"><path d="M120 70 h150 v170 h-150 z" fill="#8ab4d8"/><path d="M120 70 q75 -50 150 0" fill="#8ab4d8"/>
      <path d="M140 210 l30 -50 l26 30 l24 -40 l30 60 z" fill="#5a7a5a"/>
      <path d="M195 20 v220 M120 150 h150" stroke="#2e2438" stroke-width="8"/><path d="M120 70 h150 v170 h-150 z" fill="none" stroke="#2e2438" stroke-width="10"/></g>
    <!-- 玉座の間の扉 -->
    <path d="M420 320 V120 Q480 60 540 120 V320 Z" fill="#1e1424" stroke="#c9a640" stroke-width="8"/>
    <text x="440" y="110" font-size="18" fill="#c9a640">玉座の間</text>
    <!-- 旗 -->
    <path d="M330 40 h60 v120 l-30 -20 l-30 20 z M780 40 h60 v120 l-30 -20 l-30 20 z" fill="#7a2a5a"/>
    <text x="345" y="100" font-size="30" fill="#e0c070">魔</text><text x="795" y="100" font-size="30" fill="#e0c070">魔</text>
    <!-- 燭台 -->
    <text x="360" y="200" font-size="34">🕯</text><text x="575" y="200" font-size="34">🕯</text>
  </svg>`,
  gate: `<svg viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="420" fill="#e8a86a"/><path d="M0 300 L1200 280 L1200 420 L0 420 Z" fill="#6a5a4a"/>
    <path d="M380 300 V100 h440 v200 h-80 V170 q-140 -90 -280 0 v130 z" fill="#4a3e56"/><g fill="#4a3e56">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => `<rect x="${380 + i * 40}" y="80" width="24" height="24"/>`).join('')}</g>
  </svg>`,
  village: `<svg viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="420" fill="#9fc4e0"/><path d="M0 260 L1200 240 L1200 420 L0 420 Z" fill="#7a9a3a"/>
    <path d="M120 260 l70 -60 l70 60 z M860 250 l80 -70 l80 70 z" fill="#8a4a2a"/><rect x="134" y="260" width="112" height="50" fill="#d9b880"/><rect x="876" y="250" width="128" height="56" fill="#d9b880"/>
    <path d="M400 300 q200 -30 400 0" stroke="#6a8ab8" stroke-width="14" fill="none"/>
  </svg>`,
  mountain: `<svg viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="420" fill="#f0b87a"/><path d="M0 320 L260 120 L460 300 L700 80 L1000 300 L1200 180 L1200 420 L0 420 Z" fill="#6a5a6a"/>
    <path d="M640 140 l60 -60 l60 60" fill="#fff" opacity=".6"/>
  </svg>`,
  fire: `<svg viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="420" fill="#4a1a10"/><path d="M0 300 L1200 280 L1200 420 L0 420 Z" fill="#2a1008"/>
    <text x="200" y="250" font-size="90" opacity=".7">🔥</text><text x="800" y="230" font-size="110" opacity=".7">🔥</text><text x="520" y="160" font-size="60" opacity=".5">💨</text>
  </svg>`,
  bonsai: `<svg viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="420" fill="#2a1e36"/><rect y="320" width="1200" height="100" fill="#1e1428"/>
    <circle cx="1000" cy="90" r="40" fill="#f0e0a0"/><g fill="#fff" opacity=".7">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<circle cx="${100 + i * 130}" cy="${40 + (i % 3) * 30}" r="2"/>`).join('')}</g>
    <text x="200" y="300" font-size="70">🪴</text>
  </svg>`,
};
