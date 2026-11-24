// game.js — おかえりください勇者様 試作 v2（勇者レオンのみ）
//
// しくみ（小さく保つ）
//  ・レオンの内側は「こころの開き(0〜3)」と「いらだち(0〜5)」の2つだけ。画面には数字を出さず、姿勢・表情・吹き出しで見せる。
//  ・事情は「話題 × 深さ」（S.top）で持つ。同じせりふでも、開きが足りないと浅い答えしか返ってこない。
//  ・毎ターン、トトの返事を3つ出す（OPTIONS から、使える・まだ使っていない・いまの話に近いものを優先）。
//  ・レオンの吹き出しの下線の言葉 → クリックで聞き返す（WORDS）。……（黙って待つ）→ silence()。
//  ・🔍 観察は答えを出さず、次の返事の候補に「話のきっかけ」を足す。
//  ・メモは 推測（？）／本人が否定（✗）／確か（●）。思い違いも残る。
//  ・「まとめ」で、そうなんだよ（届いた）／まあ、そんなとこだ（ずれ）／半分はな（足りない）。
// せりふを直すときは WORDS / OPTIONS / silence / OUTCOMES を書き換える。

const $ = (s) => document.querySelector(s);
const SPEED = new URLSearchParams(location.search).has('fast') ? 0.12 : 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms * SPEED));

// ---------------- 状態 ----------------
let S;
function newState() {
  return {
    open: 0, irr: 1, turn: 0,
    top: { proof: 0, guild: 0, allow: 0, family: 0, village: 0 },
    memo: {}, memoOrder: [],
    saw: {}, used: new Set(), mirrored: new Set(), seen: {}, shown: [],
    summary: null, lastSummaryTurn: -9,
    pCert: 0, pJob: 0,
    f: { silences: 0, silenceHit: 0, mirrors: 0, askedWhy: 0, scaredEarly: 0, villageFixed: 0, jobLabel: 0 },
    face: { expr: 'proud', pose: 'point' },
    stamina: 3, busy: false, over: false,
  };
}

// ---------------- 言葉を拾う（聞き返し） ----------------
// レオンのせりふの {キー|言葉} が、クリックできる言葉になる。
const WORDS = {
  duel: () => ({ t: 'そうだ。正々堂々、一対一だ。……結果さえ{proof|持ち帰れれば}、それでいい', expr: 'proud', pose: 'point', open: S.open === 0 ? 1 : 0 }),
  mission: () => S.open >= 1
    ? { t: '……そういうことに、なってるんだよ。勇者{guild|協会}ではな', gest: '少し声が落ちた', expr: 'worried', pose: 'rest', set: { guild: 1 }, memo: [['guild', '勇者協会、というものがある', 'guess']] }
    : { t: '使命だ！ 文句あるか！', expr: 'angry', pose: 'point', irr: 1 },
  proof: () => S.top.proof >= 1 ? WORDS.proof2() : {
    t: '……ああ。持って帰らなきゃならないんだ。魔王と戦った、っていう{proof2|証}をな', gest: '目をそらした', expr: 'worried', pose: 'rest',
    set: { proof: 1 }, memo: [['proof', '魔王と戦った「証」を持ち帰りたい……らしい', 'guess']] },
  proof2: () => S.open >= 1
    ? { t: '証がなきゃ、{guild|協会}が認めない。……それだけだ', expr: 'neutral', pose: 'rest', set: { proof: 1, guild: 1 }, memo: [['proof', '魔王と戦った「証」がいる', 'sure'], ['guild', '勇者協会に、証を見せる……？', 'guess']] }
    : { t: '……なんでもない。とにかく、魔王を出せ', expr: 'angry', pose: 'point', irr: 1 },
  guild: () => S.open >= 1
    ? { t: '勇者協会だ。証がなきゃ、来月から{allow|手当}が止まる', expr: 'worried', pose: 'rest', set: { guild: 2, allow: Math.max(S.top.allow, 1) },
      memo: [['guild', '勇者協会が「証」を求めている', 'sure'], ['allow', '「手当」が止まる……？', 'guess']] }
    : { t: 'お前には関係ない', expr: 'angry', pose: 'rest' },
  allow: () => S.open >= 2 ? ALLOW_FULL() : { t: '……金の話は、したくない', gest: '目をそらした', expr: 'worried', pose: 'rest', memo: [['allow', 'お金のこと……？', 'guess']] },
  family: () => S.open >= 2
    ? { t: 'まだ十だ。……「おにいちゃん、むりしないで」だとさ', gest: '照れくさそうに笑った', expr: 'smile', pose: 'rest', open: 1, set: { family: 2 },
      memo: [['family', '十歳の妹が、帰りを待っている', 'sure']] }
    : { t: '……妹のことは、いい', expr: 'sad', pose: 'rest', set: { family: Math.max(S.top.family, 1) }, memo: [['family', '妹がいる', 'guess']] },
  tired: () => ({ t: '三日だ。北の{village|村}から、歩きどおしでな', expr: 'neutral', pose: 'rest', set: { village: 1 }, open: S.open === 0 ? 1 : 0 }),
  village: () => S.open >= 1
    ? { t: '小さい村だ。……母さんと{family|妹}がいる', expr: 'neutral', pose: 'rest', set: { family: Math.max(S.top.family, 1), village: 1 }, memo: [['family', '村に、母さんと妹がいる', 'guess']] }
    : { t: '……ただの田舎だ', expr: 'neutral', pose: 'rest', set: { village: 1 } },
  armor: () => S.open >= 2
    ? { t: '……借り物だ。貸し鎧屋で、一週間。高かったんだぞ', gest: '札を隠すのをやめた', expr: 'worried', pose: 'rest', memo: [['armor', '鎧は借り物（一週間）', 'sure']] }
    : { t: 'い、いい鎧だろう！', gest: '札を手で隠した', expr: 'surprised', pose: 'rest', irr: 1, memo: [['armor', '鎧……借り物？', 'guess']] },
  name: () => ({ t: '……どうでもいいんだ。俺が欲しいのは、そういうんじゃない', expr: 'sad', pose: 'rest', memo: [['fame', '名を上げたいわけじゃない（本人いわく）', 'denied']] }),
  slime: () => ({ t: '……二匹半だ。半分は、逃げられた', gest: 'うつむいた', expr: 'cry', pose: 'slump', open: 1, memo: [['skill', '倒した魔物は、スライム二匹半', 'sure']] }),
  alone: () => ({ t: '……親父が死んでから、ずっとな。くじで勇者に選ばれたときは、これで食わせられるって思ったんだ', gest: '遠くを見た', expr: 'sad', pose: 'slump',
    memo: [['luck', 'くじで選ばれた勇者。父はもういない', 'sure']] }),
  witness: () => ({ t: 'ああ。誰かが見てたとか、魔王の持ち物とか。そういうのがあれば、協会も文句は言えない', expr: 'neutral', pose: 'rest', set: { cond: 1 },
    memo: [['cond', '協会が信じるのは「見た者」か「魔王の持ち物」', 'sure']] }),
  name2: () => S.pJob === 2
    ? { t: '……名だ。妹にとっちゃ、俺は「勇者のおにいちゃん」なんだよ', expr: 'sad', pose: 'slump', set: { pJob: 3 }, memo: [['pride', '妹の前では「勇者」でいたい', 'sure']] }
    : { t: '……名か。名なんてな', expr: 'sad', pose: 'rest' },
  pay: () => ({ t: '……給金。……出るのか、本当に', gest: '身を乗り出した', expr: 'surprised', pose: 'rest', open: 1 }),
};
const ALLOW_FULL = () => ({ t: '勇者手当だ。……母さんと{family|妹}が、それで食ってる', gest: '声が小さくなった', expr: 'sad', pose: 'slump',
  set: { allow: 2, family: Math.max(S.top.family, 1) }, memo: [['allow', '勇者手当が止まると、家族が食べられない', 'sure'], ['family', '母さんと妹がいる', 'sure']] });

// 「それで？」や沈黙のときに、次に出てくる話（開きが足りなければ出ない）
function nextDetail(prefix = '') {
  if (!S.top.proof) return { t: prefix + '……持って帰らなきゃならないものがあるんだよ。{proof2|証}ってやつをな', expr: 'worried', pose: 'rest', set: { proof: 1 }, memo: [['proof', '何かの「証」を持ち帰りたい……らしい', 'guess']] };
  if (S.top.guild < 1 && S.open >= 1) return { t: prefix + '証がなきゃ、{guild|協会}が認めないんだ', expr: 'neutral', pose: 'rest', set: { guild: 1 }, memo: [['guild', '勇者協会に、証を見せる……？', 'guess']] };
  if (S.top.allow < 2 && S.open >= 2) return ALLOW_FULL();
  if (S.top.family < 2 && S.top.family >= 1 && S.open >= 2) return WORDS.family();
  if (S.open < 1) return { t: prefix + '……なんでもない', expr: 'neutral', pose: 'point' };
  return { t: prefix + '……それだけだ', expr: 'neutral', pose: 'rest' };
}

// ---------------- トトの返事の候補 ----------------
// when: 出せるか／pri: 優先度（高いほど出やすい）／act: レオンの反応／keep: 何度でも出せる／kind: 見た目（special=まとめ、deal=提案）
const has = (k, lv) => S.memo[k] && (!lv || S.memo[k].lv === lv);
const OPTIONS = [
  { id: 'why', t: 'なんでまた、魔王様と？', when: () => S.turn < 8, pri: () => (S.turn < 2 ? 6 : 2),
    act: () => { S.f.askedWhy++; return { t: '勇者だからに決まってるだろう！ 魔王を倒すのが、勇者の{mission|使命}だ！', expr: 'angry', pose: 'point', irr: 1 }; } },
  { id: 'nap', t: '魔王様、いまお昼寝中なんだよね……', when: () => !S.summary && S.turn < 4, pri: () => 5,
    act: () => ({ t: 'なら起こせ！ 勇者が来たんだぞ！', expr: 'angry', pose: 'point', irr: 1 }) },
  { id: 'praise', t: 'すごい鎧だね。強そう。', when: () => !S.summary && S.turn < 5 && !S.saw.armor, pri: () => 5,
    act: () => ({ t: 'ふふん、だろう？ ……{armor|鎧}は、大事だからな', expr: 'proud', pose: 'point', open: S.open === 0 ? 1 : 0 }) },
  { id: 'tired', t: '遠くから来たんだね。少し座る？', when: () => !S.summary && (S.saw.hands || S.turn >= 2), pri: () => (S.saw.hands ? 7 : 3),
    act: () => (S.irr >= 3 ? { t: 'す、座らん！', expr: 'angry', pose: 'point' }
      : { t: 'す、座らん！ ……{tired|三日}、歩きどおしだったがな', gest: '少し肩の力を抜いた', expr: 'worried', pose: 'rest', irr: -1, open: S.open <= 1 ? 1 : 0 }) },
  { id: 'strict', t: '協会って、ずいぶん厳しいんだね。', when: () => S.top.guild >= 1 && S.top.allow < 2, pri: () => 5,
    act: () => (S.open >= 1 ? { t: '厳しいなんてもんじゃない。……証がなけりゃ、{allow|手当}は打ち切りだ', gest: '吐き捨てるように', expr: 'angry', pose: 'rest', open: 1,
      set: { allow: Math.max(S.top.allow, 1) }, memo: [['allow', '証がないと「手当」が打ち切られる', 'guess']] }
      : { t: '……まあな', expr: 'neutral', pose: 'rest' }) },
  { id: 'show', t: '誰かに、見せなきゃいけないみたいだね。', when: () => S.top.proof >= 1 && S.top.guild < 1, pri: () => 5,
    act: () => (S.open >= 1 ? { t: '……{guild|勇者協会}にな', gest: '黙りこんでから、ぽつりと', expr: 'sad', pose: 'rest', open: 1, set: { guild: 1 }, memo: [['guild', '勇者協会に、証を見せる……らしい', 'guess']] }
      : { t: '……なんで、そう思う', gest: 'こちらを見た', expr: 'surprised', pose: 'rest', open: 1 }) },
  { id: 'fame', t: '勝てば、名が上がるもんね。', when: () => !S.summary && (S.top.proof >= 1 || S.turn >= 3), pri: () => 3,
    act: () => ({ t: '名なんか{name|どうでもいい}！ ……どうでもいいんだ、そんなものは', expr: 'angry', pose: 'point', irr: 1, memo: [['fame', '名を上げたいわけじゃない（本人いわく）', 'denied']] }) },
  { id: 'village', t: '村のために、戦うんだね。', when: () => S.top.village >= 1 && !S.memo.village && S.top.family < 1, pri: () => 5,
    act: () => ({ t: '……まあ、そんなとこだ', gest: '目をそらした', expr: 'neutral', pose: 'rest', memo: [['village', '村を守るために戦っている……？', 'guess']] }) },
  { id: 'villageWait', t: '村の人たちも、帰りを待ってるんだろうね。', when: () => has('village', 'guess') && S.open >= 1, pri: () => 4,
    act: () => { S.f.villageFixed = 1; return { t: '村なんか……いや。待ってるのは、{family|妹}だ', gest: '言いかけて、やめた', expr: 'sad', pose: 'rest',
      set: { family: Math.max(S.top.family, 1) }, memo: [['village', '村のため、ではない（本人いわく）', 'denied'], ['family', '妹が待っている', 'guess']] }; } },
  { id: 'cost', t: 'その証がないと、何が困るの？', when: () => S.top.proof >= 1 && S.top.allow < 2, pri: () => 4,
    act: () => (S.open >= 2 ? ALLOW_FULL()
      : S.open === 1 ? { t: '……いろいろだ。{guild|協会}が、うるさいんだよ', expr: 'worried', pose: 'rest', set: { guild: Math.max(S.top.guild, 1) }, memo: [['guild', '勇者協会、というものがある', 'guess']] }
        : { t: 'お前には関係ない', expr: 'angry', pose: 'rest' }) },
  { id: 'alone', t: 'ずいぶん、ひとりで背負ってるんだね。', when: () => S.top.family >= 1, pri: () => 5,
    act: () => (S.open >= 2 ? { t: '…………俺しか、いないんだよ。{alone|稼げるのは}', gest: '長い沈黙のあとで', expr: 'sad', pose: 'slump', open: 2 }
      : { t: '背負ってなんか、ない', expr: 'angry', pose: 'rest' }) },
  { id: 'scared', t: '……本当は、戦いたくないんじゃない？', when: () => S.turn >= 4, pri: () => (S.open >= 3 ? 6 : 2),
    act: () => (S.open >= 3 ? { t: '……怖いさ。倒した魔物なんて、{slime|スライム}二匹半だ', gest: 'うつむいた', expr: 'cry', pose: 'slump', memo: [['scared', '本当は、戦うのが怖い', 'sure']] }
      : (S.f.scaredEarly++, { t: 'なんだと！ 俺を臆病者だと言うのか！', gest: '拳を握った', expr: 'angry', pose: 'point', irr: 2 })) },
  // 🔍 観察から生まれる返事
  { id: 'letter', t: 'その手紙、大事そうだね。', when: () => S.saw.letter, pri: () => 7,
    act: () => (S.open >= 1 ? { t: '……{family|妹}からだ', gest: '手紙を押さえた', expr: 'sad', pose: 'rest', open: 1, set: { family: Math.max(S.top.family, 1) }, memo: [['family', '妹から手紙が来ている', 'guess']] }
      : { t: 'み、見るな！', expr: 'surprised', pose: 'rest', irr: 1, memo: [['letter', '懐の手紙……家族から？', 'guess']] }) },
  { id: 'armorQ', t: 'その鎧、ぴかぴかだね。新しいの？', when: () => S.saw.armor, pri: () => 6, act: () => WORDS.armor() },
  { id: 'sword', t: 'その剣、まだ一度も抜いてないみたいだね。', when: () => S.saw.sword, pri: () => 6,
    act: () => (S.open >= 2 ? { t: '……抜いたことはある。{slime|スライム}相手にな', gest: '苦笑いした', expr: 'worried', pose: 'rest', memo: [['skill', 'スライムとしか戦ったことがない……？', 'guess']] }
      : { t: 'ぬ、抜いたことくらいある！', expr: 'angry', pose: 'point', irr: 1 }) },
  // いつでも出せる、あいづち
  { id: 'soWhat', t: 'うん。……それで？', keep: true, when: () => true, pri: () => 1, act: () => nextDetail() },
  // まとめ
  { id: 'summary', kind: 'special', t: () => summaryText(), when: () => canSummary(), pri: () => (summaryReady() ? 9 : 5), keep: true, act: () => { S.seen.summary = 0; return summaryReact(); } },
  // 一緒に考える
  { id: 'how', t: 'どうしたら、手ぶらで帰らずに済むかな？', when: () => !!S.summary, pri: () => 7,
    act: () => (S.summary === 'right' ? { t: '……せめて、魔王に会ったって証があれば。誰かが{witness|見てた}とか', gest: '考えこんだ', expr: 'neutral', pose: 'rest', set: { cond: 1 }, memo: [['cond', '「魔王に会った」証があればいい', 'sure']] }
      : S.summary === 'half' ? { t: '……証がありゃいい。それだけだ', expr: 'neutral', pose: 'rest', retry: true }
        : { t: '……さあな。魔王を倒せば済む話だ', expr: 'neutral', pose: 'point', retry: true }) },
  { id: 'what', t: '協会が信じる証って、どんなもの？', when: () => S.top.guild >= 1 && (S.summary || S.open >= 2) && !S.top.cond, pri: () => 6, act: () => WORDS.witness() },
  // 提案：書状
  { id: 'pCert', kind: 'deal', t: '魔王様のサイン入りの書状なら、頼めるかもしれない。', when: () => !!S.summary && !S.pCert, pri: () => 5,
    act: () => (S.summary === 'hollow' ? { t: '書状？ ……考えとく', expr: 'neutral', pose: 'rest', retry: true }
      : { t: '書状か……。でも紙切れ一枚じゃ、協会は信じない。誰かが{witness|見てた}、ってのがないと', gest: '首をひねった', expr: 'worried', pose: 'rest', set: { pCert: 1 } }) },
  { id: 'pShow', kind: 'deal', t: '見物人の前で、罠課に一騎打ちの舞台を作らせるよ。書状もつけて。', when: () => S.pCert >= 1 || S.top.cond, pri: () => 6,
    act: () => (S.summary === 'hollow' ? hedge() : { t: '見物人の前で……一騎打ち。……それなら、協会も文句は言えない', gest: '目を輝かせた', expr: 'joy', pose: 'point', end: 'show' }) },
  { id: 'pMeet', kind: 'deal', t: '魔王様に、ひと目だけ会ってもらおう。握手くらいなら。', when: () => S.pCert >= 1 || S.top.cond, pri: () => 5,
    act: () => (S.summary === 'hollow' ? hedge() : { t: '魔王と、握手……！ それなら、立派な証だ', gest: '身を乗り出した', expr: 'joy', pose: 'point', end: 'meet' }) },
  { id: 'pCertOnly', kind: 'deal', t: '……書状だけじゃ、やっぱり足りないよね？', when: () => S.pCert >= 1 && S.summary === 'right', pri: () => 4,
    act: () => ({ t: '……いや。あんたが、ここまで考えてくれたんだ。書状で、十分だ', gest: '小さく笑った', expr: 'smile', pose: 'rest', end: 'cert' }) },
  // 提案：勇者役
  { id: 'pJobNo', kind: 'deal', t: '勇者が魔王の城で働くなんて、ありえない……よね？', when: () => S.top.allow >= 2 && !S.pJob, pri: () => 7,
    act: () => (S.summary === 'right' || (S.open >= 3 && S.summary !== 'hollow') ? { t: '……ありえない、とは言わない。何の話だ', gest: '身を乗り出した', expr: 'surprised', pose: 'rest', set: { pJob: 1 } }
      : { t: 'ありえないな', expr: 'neutral', pose: 'point', retry: true }) },
  { id: 'pJobDirect', kind: 'deal', t: '城でね、「勇者役」を探してるんだけど。', when: () => S.top.allow >= 2 && !S.pJob, pri: () => 4,
    act: () => (S.summary === 'right' || (S.open >= 3 && S.summary !== 'hollow') ? { t: '勇者役？ ……なんだ、それは', expr: 'surprised', pose: 'rest', set: { pJob: 1 } }
      : { t: '魔王の手下になれってのか！', expr: 'angry', pose: 'point', irr: 1, retry: true }) },
  { id: 'jExplain', kind: 'deal', t: '毎日お客さんの前で、派手に戦って、派手に負ける役。給金も出るよ。', when: () => S.pJob === 1, pri: () => 9,
    act: () => ({ t: '……{pay|給金}が。……でも、俺が魔王の城で働いてるなんて知れたら、勇者の{name2|名}が……', gest: '目をそらした', expr: 'worried', pose: 'rest', set: { pJob: 2 } }) },
  { id: 'jLabel', t: '勇者でいられなくなるのが、怖いんだね。', when: () => S.pJob === 2, pri: () => 8,
    act: () => { S.f.jobLabel = 1; return { t: '……ああ。妹には、勇者の兄貴でいたいんだ', gest: 'うなずいた', expr: 'sad', pose: 'slump', set: { pJob: 3 }, memo: [['pride', '妹の前では「勇者」でいたい', 'sure']] }; } },
  { id: 'jDismiss', t: '名前なんて、気にしなくていいよ。', when: () => S.pJob === 2, pri: () => 7,
    act: () => ({ t: 'お前にはわからん！', expr: 'angry', pose: 'point', irr: 1 }) },
  { id: 'jMoney', t: '給金は、はずむよ。', when: () => S.pJob === 2, pri: () => 7,
    act: () => ({ t: '……金の問題じゃないんだ', expr: 'sad', pose: 'rest' }) },
  { id: 'jRevise', kind: 'deal', t: '肩書きは「勇者」のまま。魔王様に「勇者レオン、当城にて見事な戦いぶり」って書状も書いてもらおう。', when: () => S.pJob === 3, pri: () => 9,
    act: () => ({ t: '…………それなら、妹に胸を張れる', gest: '顔を上げた', expr: 'joy', pose: 'point', end: 'job' }) },
  { id: 'jSecret', kind: 'deal', t: '城で働いてることは、内緒にしておくよ。', when: () => S.pJob === 3, pri: () => 8,
    act: () => ({ t: '……妹に、嘘をつけってのか', expr: 'sad', pose: 'rest' }) },
];
function hedge() { return { t: '……悪くはない。悪くはないんだが……なんか、違うんだよな', gest: '首をかしげた', expr: 'worried', pose: 'rest', retry: true }; }

// ---------------- まとめ ----------------
function canSummary() {
  return has('proof') && has('family') && has('allow') && S.summary !== 'right' && S.turn - S.lastSummaryTurn >= 2;
}
// 話がそろっていれば、まとめは必ず候補に出す
function summaryReady() { return has('family', 'sure') && has('allow', 'sure'); }
function summaryText() {
  let s = '';
  if (has('village', 'guess')) s += '村のみんなのためにも、';
  if (has('family')) s += '妹さんたちのために、';
  s += '手ぶらじゃ帰れないんだ。';
  if (has('allow', 'sure')) s += '手当がかかってるから……';
  s += '勝つかどうかより、「戦ってきた」って証がいる。……そんなところ？';
  return s;
}
function summaryReact() {
  S.lastSummaryTurn = S.turn;
  if (has('village', 'guess')) { S.summary = 'hollow'; return { t: 'まあ……そんなとこだ', expr: 'neutral', pose: 'rest', hollow: true }; }
  if (has('family', 'sure') && has('allow', 'sure')) {
    S.summary = 'right';
    return { t: '…………そうなんだよ', gest: '長く息を吐いた', expr: 'sad', pose: 'slump', setOpen: 3, setIrr: 0, right: true,
      memo: [['core', '妹たちを食べさせるために、手ぶらでは帰れない', 'core']] };
  }
  S.summary = 'half';
  return { t: '……半分は、な', gest: '言葉をさがしている', expr: 'worried', pose: 'rest', open: S.open < 2 ? 1 : 0 };
}

// ---------------- 黙って待つ ----------------
function silence() {
  S.f.silences++;
  if (S.f.silences >= 5 && S.f.silences % 2 === 1) return { t: '黙ってばかりだな、お前', expr: 'angry', pose: 'point', irr: 1 };
  if (S.pJob === 2) { S.f.silenceHit++; return { t: '……名は、俺の全部なんだ。妹にとっちゃな', gest: '沈黙に耐えきれず', expr: 'sad', pose: 'slump', set: { pJob: 3 }, memo: [['pride', '妹の前では「勇者」でいたい', 'sure']] }; }
  if (S.summary === 'hollow' && !S.f.hollowHint) { S.f.hollowHint = 1; S.f.silenceHit++; return { t: '……悪い。うまく言えねえ。村が、どうとかじゃなくてな……{family|妹}が……', gest: '頭をかいた', expr: 'worried', pose: 'rest', memo: [['village', '村のため、ではない（本人いわく）', 'denied']] }; }
  if (S.open >= 2 && S.top.family >= 1 && !S.used.has('alone') && !S.f.aloneSilence) {
    S.f.aloneSilence = 1; S.f.silenceHit++; return { t: '…………俺しか、いないんだよ。{alone|稼げるのは}', gest: '沈黙に耐えきれず', expr: 'sad', pose: 'slump', open: 1 };
  }
  if (S.open === 0 && S.irr >= 2) return { t: 'なんだ、黙りこくって！ 魔王を出せと言ってるんだ！', expr: 'angry', pose: 'point', irr: 1 };
  if (S.open >= 1) { const d = nextDetail('……'); if (!/それだけだ|なんでもない/.test(d.t)) S.f.silenceHit++; return d; }
  return { t: '……なんだよ。何か言えよ', expr: 'neutral', pose: 'point' };
}

// ---------------- 観察 ----------------
const LOOKS = {
  hands: { lbl: '手', pos: [30, 316], see: '籠手の中で、指先が小刻みに震えている……。', memo: ['nerve', '手が震えている。緊張……？', 'guess'] },
  armor: { lbl: '鎧の札', pos: [190, 322], see: '鎧の脇に札。「貸し鎧屋・一週間」……？', memo: ['armor', '鎧……借り物？', 'guess'] },
  sword: { lbl: '剣', pos: [0, 266], see: '刃こぼれひとつない。……一度も使っていない？' },
  letter: { lbl: '懐の紙', pos: [104, 196], see: '懐から手紙がのぞいている。丸い字で「おにいちゃんへ」。' },
};

// ---------------- 反応を反映 ----------------
function apply(r) {
  if (r.setOpen !== undefined) S.open = r.setOpen;
  if (r.setIrr !== undefined) S.irr = r.setIrr;
  const before = S.open;
  S.open = Math.max(0, Math.min(3, S.open + (r.open || 0)));
  S.irr = Math.max(0, Math.min(6, S.irr + (r.irr || 0)));
  if (S.open > before && !r.irr) S.irr = Math.max(0, S.irr - 1); // 心が開くと、少し落ち着く
  if (r.set) Object.entries(r.set).forEach(([k, v]) => { if (k === 'pCert' || k === 'pJob') S[k] = v; else S.top[k] = Math.max(S.top[k] || 0, v); });
  (r.memo || []).forEach(([k, text, lv]) => addMemo(k, text, lv));
  if (r.expr) S.face = { expr: r.expr, pose: r.pose || S.face.pose };
}
const RANK = { guess: 1, denied: 2, sure: 3, core: 4 };
function addMemo(k, text, lv) {
  const cur = S.memo[k];
  if (cur && cur.lv !== 'guess' && RANK[cur.lv] >= RANK[lv]) return; // 確かなことは、あいまいな話で上書きしない
  if (cur && cur.lv === lv && cur.text === text) return;
  if (!cur) S.memoOrder.push(k);
  S.memo[k] = { text, lv };
}

// ---------------- 描画 ----------------
function postureClass() {
  return `o${S.open} ${S.irr >= 4 ? 'boil' : S.irr >= 3 ? 'hot' : ''}`;
}
function renderLeon() {
  const w = $('#visitor-wrap');
  w.classList.remove('o0', 'o1', 'o2', 'o3', 'hot', 'boil');
  postureClass().split(' ').filter(Boolean).forEach((c) => w.classList.add(c));
  $('#visitor').innerHTML = ART.leon(S.face);
  $('#v-badges').innerHTML = Object.entries(LOOKS).map(([k, l]) =>
    `<div class="badge ${S.saw[k] ? 'done' : ''}" data-look="${k}" style="left:${l.pos[0]}px;top:${l.pos[1]}px">${S.saw[k] ? '✓' : '🔍'} ${l.lbl}</div>`).join('');
}
function renderHud() {
  const face = ['ouch', 'tired', 'calm', 'calm'][S.stamina];
  $('#m-stamina').innerHTML = `<span class="mini">${ART.garza2({ expr: face })}</span><span class="lbl">魔王様の元気</span>${Array.from({ length: 3 }, (_, i) => `<span class="pip ${i < S.stamina ? '' : 'off'}">💪</span>`).join('')}`;
  $('#door-garza').innerHTML = ART.garza2({ expr: face });
  $('#door-tag').textContent = '玉座の間：魔王様（お昼寝中）';
}
// 見せたのに選ばれなかった返事は、少しずつ後ろに下がる（同じ3つが居座らないように）
const score = (o) => o.pri() - 1.6 * (S.seen[o.id] || 0);
function pickOptions() {
  const avail = OPTIONS.filter((o) => (o.keep || !S.used.has(o.id)) && o.when() && o.id !== 'soWhat');
  avail.sort((a, b) => score(b) - score(a));
  const pick = [];
  const sp = avail.find((o) => o.kind === 'special' && summaryReady());
  if (sp) pick.push(sp);
  const dealSlots = S.summary === 'right' ? 2 : (S.summary === 'half' || S.pJob || S.pCert) && S.summary !== 'hollow' ? 1 : 0;
  const deals = avail.filter((o) => o.kind === 'deal' && !pick.includes(o)).slice(0, dealSlots);
  pick.push(...deals);
  for (const o of avail) { if (pick.length >= 3) break; if (!pick.includes(o)) pick.push(o); }
  if (pick.length < 3) pick.push(OPTIONS.find((o) => o.id === 'soWhat'));
  return pick.slice(0, 3);
}
function renderReplies() {
  const opts = pickOptions();
  S.shown = opts.map((o) => o.id);
  $('#replies').innerHTML = opts.map((o) => `<button class="reply ${o.kind || ''}" data-o="${o.id}">「${typeof o.t === 'function' ? o.t() : o.t}」</button>`).join('');
}
function renderMemo() {
  $('#memo-list').innerHTML = S.memoOrder.length ? S.memoOrder.map((k) => `<li class="${S.memo[k].lv}">${S.memo[k].text}</li>`).join('')
    : '<li class="empty">（まだ何も書いていない）</li>';
}
function render() {
  renderLeon(); renderHud(); renderMemo();
  if (!S.over) renderReplies();
  document.body.classList.toggle('busy', S.busy);
  TUT.mark();
}
function wordsToHtml(t) {
  return t.replace(/\{(\w+)\|([^}]+)\}/g, (_, k, w) => `<span class="word ${S.mirrored.has(k) ? 'used' : ''}" data-w="${k}" data-txt="${w}">${w}</span>`);
}
async function leonSay(r) {
  const b = $('#v-bubble');
  b.className = r.right ? 'right' : S.irr >= 3 ? 'hot' : S.open >= 3 ? 'soft' : '';
  b.innerHTML = (r.gest ? `<span class="gest">（${r.gest}）</span>` : '') + wordsToHtml(r.t);
  TUT.mark();
  const w = $('#visitor-wrap'); w.classList.remove('bump', 'shake'); void w.offsetWidth; w.classList.add((r.irr || 0) > 0 ? 'shake' : 'bump');
  setTimeout(() => w.classList.remove('bump', 'shake'), 500);
  if (S.f.mirrors === 0 && /\{/.test(r.t) && S.turn <= 6) $('#word-hint').classList.remove('hidden'); else $('#word-hint').classList.add('hidden');
  await sleep(500 + r.t.length * 22);
}
async function totoSay(t, think = false) {
  const b = $('#toto-say'); b.className = think ? 'think' : ''; b.innerHTML = t;
  await sleep(500 + t.length * 22);
}
let toastT;
function toast(t) { const el = $('#toast'); el.innerHTML = t; el.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.add('hidden'), 2600 * Math.max(SPEED, .5)); }

// ---------------- 1ターン ----------------
async function turn(totoLine, getReaction) {
  if (S.busy || S.over) return;
  S.busy = true; render();
  try {
    await totoSay(totoLine);
    S.turn++;
    (S.shown || []).forEach((id) => { S.seen[id] = (S.seen[id] || 0) + 1; });
    const r = getReaction();
    if (r.retry && S.lastOpt) { S.used.delete(S.lastOpt); S.seen[S.lastOpt] = (S.seen[S.lastOpt] || 0) + 3; } // 「考えとく」などは、少し間をおけば、もう一度言える
    apply(r);
    renderLeon(); renderMemo();
    await leonSay(r);
    if (r.end) return finish(r.end);
    await clock();
    if (S.irr >= 5) return storm();
  } finally {
    if (!S.over) { S.busy = false; render(); }
  }
}
// 長引くと、扉の向こうの魔王様と、レオンの我慢が動く
async function clock() {
  if (S.turn === 16) { await totoSay('（扉の向こうから）……トト、まだかの。腰が冷える', true); }
  if (S.turn >= 22 && S.summary !== 'right') { S.irr++; renderLeon(); await leonSayPlain('いつまで話してるんだ。魔王を出せ', 'angry'); }
}
async function leonSayPlain(t, expr) { apply({ expr, pose: 'point' }); renderLeon(); await leonSay({ t }); }

async function storm() {
  apply({ expr: 'angry', pose: 'point' }); renderLeon();
  await leonSay({ t: 'もういい！ 自分で魔王の間に乗り込んでやる！', gest: '剣を抜いた' });
  return finish('storm');
}

// ---------------- 結末 ----------------
const OUTCOMES = {
  job: { title: '勇者、就職する', eff: { rep: 2 }, cast: [['leon', { expr: 'joy', pose: 'point' }], ['toto', { expr: 'smile' }, 'small']], bg: 'hall',
    text: 'レオンは「勇者体験の城」の勇者役として雇われた。\n毎日、見物客の前で派手に戦い、派手に負ける。書状には魔王様の字で「勇者レオン、当城にて見事な戦いぶり」。\n給金は、ぜんぶ家族へ。',
    last: '「妹に手紙を書くよ。おにいちゃんは、魔王城で勇者をやってるって」' },
  show: { title: '華々しい（芝居の）一騎打ち', eff: { rep: 1 }, cast: [['leon', { expr: 'proud', pose: 'point' }]], bg: 'fire',
    text: '見物の旅人たちの前で、罠課の炎と煙のなか、勇者と「魔王様」（の着ぐるみ）が一騎打ち！\nレオンは書状を手に、意気揚々と帰っていった。',
    last: '「見てた奴が、こんなにいるんだ。協会も文句は言えない」', later: '芝居だとばれたら、ちょっとした騒ぎになるかもしれない。' },
  meet: { title: '魔王と握手した勇者', eff: { st: -1, rep: 2 }, cast: [['garza2', { expr: 'ouch' }], ['leon', { expr: 'joy', pose: 'point' }]], bg: 'hall',
    text: '魔王様は腰をさすりながら玉座を降り、勇者と握手した。\n「……うむ。よく来た。帰れ」',
    last: '「魔王の手、あったかかったな……」', later: '魔王様は「わしを起こすな」と少しご機嫌ななめ。' },
  cert: { title: '書状を胸に', eff: { rep: 1 }, cast: [['garza2', { expr: 'calm' }], ['leon', { expr: 'smile', pose: 'rest' }]], bg: 'hall',
    text: '魔王様は「サインくらいなら、腰は痛まん」と一筆。\nレオンは書状を大事そうに懐にしまった。妹の手紙の隣に。',
    last: '「協会が信じるかは、半々だな。……でも、話を聞いてもらえてよかった」', later: '協会が書状を疑えば、レオンはまた来るかもしれない。' },
  fight: { title: '新米勇者、玉座に散る', eff: { st: -1, rep: -1 }, cast: [['garza2', { expr: 'grumpy' }], ['leon', { expr: 'cry', pose: 'slump' }]], bg: 'hall',
    text: 'レオンは剣を振りかぶり……三歩目で転んだ。\n魔王様は、ため息まじりに杖で軽く小突いた。「次は、もう少し強くなってから来い」',
    last: '「…………」', later: '勇者手当は打ち切られた。勇者協会が「もっと強い勇者を送る」と息巻いている。' },
  storm: { title: '怒れる勇者、玉座に散る', eff: { st: -1, rep: -1 }, cast: [['garza2', { expr: 'grumpy' }], ['leon', { expr: 'cry', pose: 'slump' }]], bg: 'hall',
    text: '怒ったレオンは玉座の間に駆けこみ……昼寝中の魔王様の上に転んだ。\n魔王様は不機嫌そうに起き上がり、杖で一突き。',
    last: '「…………くそっ」', later: '勇者手当は打ち切られた。勇者協会が「もっと強い勇者を送る」と息巻いている。' },
  sad: { title: 'しょんぼり帰る勇者', eff: {}, cast: [['leon', { expr: 'sad', pose: 'slump' }]], bg: 'gate',
    text: 'レオンは肩を落として、門を出ていった。', last: '「……妹に、なんて言えばいいんだろうな」', later: 'レオンの家族の暮らしは、苦しいまま。' },
};

async function finish(id) {
  S.over = true; S.busy = false;
  const o = OUTCOMES[id];
  const before = S.stamina;
  S.stamina = Math.max(0, S.stamina + (o.eff.st || 0));
  renderHud();
  $('#v-bubble').classList.add('hidden'); $('#toto-say').classList.add('hidden'); $('#word-hint').classList.add('hidden');
  await sleep(600);
  await playScene([{ bg: o.bg, caption: o.title, cast: o.cast, speaker: '', text: o.text }, { cast: [['leon', S.face]], speaker: 'レオン', text: o.last }]);
  report(id, o, before);
}

function reflections() {
  const r = [];
  if (S.f.mirrors >= 2) r.push('レオンの言葉をそのまま聞き返したら、自分から話を続けてくれた。');
  if (S.f.silenceHit) r.push('黙って待ったら、ぽつりと本音がこぼれた。');
  if (S.f.askedWhy) r.push('「なんで？」と聞いたら、レオンは意地になった。');
  if (S.f.scaredEarly) r.push('「本当は戦いたくない」は、早すぎると怒らせる一言だった。');
  if (S.f.villageFixed || has('village', 'denied')) r.push('「村のため」という思いこみは、レオン自身が正してくれた。');
  if (S.summary === 'right') r.push('「……そうなんだよ」。わかってもらえた、という顔だった。');
  else if (S.summary === 'hollow') r.push('「まあ、そんなとこだ」。どこか、ずれていた。');
  else if (S.summary === 'half') r.push('「半分は、な」。まだ聞けていないことがあった。');
  if (S.f.jobLabel) r.push('反対されたとき、その裏の気持ちを言葉にしたら、話が前に進んだ。');
  if (!r.length) r.push('レオンのことは、ほとんどわからないまま終わった。');
  return r;
}
function report(id, o, before) {
  const el = document.createElement('div'); el.id = 'report';
  const memo = S.memoOrder.map((k) => `<li class="${S.memo[k].lv}">${S.memo[k].text}</li>`).join('') || '<li class="empty">（なし）</li>';
  const eff = [];
  if (S.stamina !== before) eff.push(`魔王様の元気 ${S.stamina - before}`);
  if (o.eff.rep) eff.push(`評判 ${o.eff.rep > 0 ? '+' : ''}${o.eff.rep}`);
  el.innerHTML = `<h1>${o.title}</h1>
    <div class="sub">${eff.join('　／　') || '魔王様の元気・評判に変化なし'}　（やりとり ${S.turn} 回）</div>
    <div class="rp-grid" style="grid-template-columns: 1fr 1fr">
      <div class="rp-box"><h3>その後</h3><div>${o.text.replace(/\n/g, '<br>')}</div>${o.later ? `<div class="later">⏳ ${o.later}</div>` : ''}</div>
      <div class="rp-box" style="background:#f3ead2;color:#3a2a1a"><h3 style="color:#7a3a10">トトのメモ</h3><ul id="memo-list" style="list-style:none;padding:0;margin:0;line-height:26px">${memo}</ul></div>
    </div>
    <div class="ref"><h3>トトの気づき</h3>${reflections().map((x) => `・${x}`).join('<br>')}</div>
    <div style="margin-top:14px;display:flex;gap:12px;align-items:center"><button class="go" id="again" style="padding:10px 22px">もう一度、レオンと話す</button>
    <span style="opacity:.6;font-size:13px">話し方を変えると、レオンの話すことも、結末も変わる。</span></div>`;
  $('#stage').appendChild(el);
  $('#stage').style.height = '700px';
  $('#talk').classList.add('hidden');
  $('#again').onclick = () => location.reload();
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
      if (b.cast) $('#scene-cast').innerHTML = b.cast.map(([who, o, cls]) => `<div class="c ${cls || ''}">${ART[who](o || {})}</div>`).join('');
      sc.querySelector('.caption-big')?.remove();
      if (b.caption) sc.insertAdjacentHTML('afterbegin', `<div class="caption-big">${b.caption}</div>`);
      $('#scene-speaker').textContent = b.speaker || '';
      $('#scene-text').innerHTML = b.text || '';
      const ch = $('#scene-choices'); ch.innerHTML = '';
      const btn = document.createElement('button'); btn.className = 'next-btn'; btn.textContent = q.length ? '▶ 次へ' : '▶ 続ける'; btn.onclick = step; ch.appendChild(btn);
    };
    step();
  });
}

// ---------------- 入力 ----------------
// 手引きのあいだは、TUT.allow() が「いま押してよい相手か」を決める（tutorial.js）。だめなら何も起こさない。
document.addEventListener('click', (e) => {
  const t = e.target;
  if (!S || S.busy || S.over || document.body.classList.contains('in-scene')) return;
  const w = t.closest('.word');
  if (w) {
    const k = w.dataset.w, txt = w.dataset.txt;
    if (!TUT.allow('word', k)) return;
    const again = S.mirrored.has(k);
    S.mirrored.add(k); S.f.mirrors++; S.lastOpt = null;
    return TUT.after(turn(`「……${txt.replace(/[。、！？]$/, '')}？」`, () => (again ? { t: '……さっきも言ったろ', expr: 'neutral', pose: S.face.pose } : WORDS[k]())));
  }
  const o = t.closest('[data-o]');
  if (o) {
    if (!TUT.allow('reply', o.dataset.o)) return;
    const opt = OPTIONS.find((x) => x.id === o.dataset.o);
    if (!opt.keep) S.used.add(opt.id);
    S.lastOpt = opt.id;
    const line = typeof opt.t === 'function' ? opt.t() : opt.t;
    return TUT.after(turn(`「${line}」`, opt.act));
  }
  if (t.closest('#silence')) { if (!TUT.allow('silence')) return; S.lastOpt = null; return turn('……', silence); }
  const lk = t.closest('[data-look]');
  if (lk) { if (!TUT.allow('look', lk.dataset.look)) return; return TUT.after(look(lk.dataset.look)); }
  if (t.closest('#btn-fight')) { if (!TUT.allow('fight')) return; return goFight(); }
  if (t.closest('#btn-refuse')) { if (!TUT.allow('refuse')) return; return goRefuse(); }
});

async function look(k) {
  if (S.saw[k]) return;
  S.busy = true; S.saw[k] = true; render();
  await totoSay(`🔍 ${LOOKS[k].see}`, true);
  if (LOOKS[k].memo) addMemo(...LOOKS[k].memo);
  toast('話のきっかけが、ひとつ増えた');
  S.busy = false; render();
}
async function goFight() {
  S.busy = true; render();
  await totoSay('「……わかりました。魔王様のもとへ、ご案内します」');
  return finish('fight');
}
async function goRefuse() {
  S.busy = true; render();
  await totoSay('「ごめん。今日のところは、おかえりいただけるかな」');
  if (S.open >= 2) return finish('sad');
  apply({ expr: 'angry', pose: 'point' }); renderLeon();
  await leonSay({ t: '帰れるか！ こうなったら、魔王の間に乗り込んでやる！', gest: '剣を抜いた' });
  return finish('storm');
}

// ---------------- 開始 ----------------
async function start() {
  S = newState();
  $('#bg').innerHTML = ART.bg.hall;
  $('#toto').innerHTML = ART.toto({ expr: 'neutral' });
  render();
  await playScene([
    { bg: 'hall', caption: '魔王城の昼さがり', cast: [['garza2', { expr: 'tired' }], ['toto', { expr: 'neutral' }, 'small']], speaker: '魔王ガルザ様',
      text: 'トトよ。わしは昼寝をする。腰が痛い。\n……誰が来ても、起こすでないぞ。' },
    { cast: [['toto', { expr: 'resolve' }]], speaker: 'トト（あなた）',
      text: 'はい。お客さまには、ぼくがお話をうかがって……\nなるべく、おかえりいただきます。' },
  ]);
  S.busy = true; render();
  await totoSay('（カラン、と呼び鈴。……ぴかぴかの鎧の若者だ）', true);
  await leonSay({ t: '魔王はどこだ！ 勇者レオン、魔王に{duel|一騎打ち}を申し込む！' });
  S.busy = false; render();
  TUT.begin(); // はじめての人には、1手ずつの手引き（tutorial.js）
}
start();
