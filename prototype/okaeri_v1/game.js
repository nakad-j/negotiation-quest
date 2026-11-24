// game.js — おかえりください勇者様（試作 v1）
//
// 一日の流れ：来客（3人）→ 調べる・聞く → 望み × 城でできること で提案 → 条件のやりとり → 決着 → 日の終わりの報告
// 交渉しない道（BATNA）：👑 魔王様に通す ／ 🚪 お引き取り願う。結果は客の隠れた強さ・魔王様の元気・客の事情で変わる。
// 客を増やす・直すときは VISITORS の中だけを書き換えればよい。

const $ = (s) => document.querySelector(s);
const SPEED = new URLSearchParams(location.search).has('fast') ? 0.12 : 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms * SPEED));

// ---------------- 城でできること（トトの手） ----------------
const MEANS = {
  cert: { ic: '📜', nm: '魔王様の証書', pitch: '魔王様の証書を一筆、用意しましょう。' },
  show: { ic: '🎭', nm: '罠課の芝居', pitch: '罠課に、派手な見せ場をこしらえさせましょう。' },
  hire: { ic: '🍲', nm: '城で雇う', pitch: '城で、働き口を用意しましょう。' },
  golem: { ic: '🪨', nm: 'ゴーレム工兵', pitch: 'ゴーレム工兵を出しましょう。' },
  troop: { ic: '🛡', nm: '魔王軍の兵', pitch: '魔王軍の兵を動かしましょう。' },
  healer: { ic: '🌿', nm: '城の薬師', pitch: '城の薬師に診せましょう。' },
  audience: { ic: '👑', nm: '魔王様に一目', pitch: '魔王様に、少しだけお会いいただきましょう。' },
};

// ---------------- 来客 ----------------
// facts: type = stated（本人の言い分）| need（本当の望み）| clue（手がかり）| danger（危険のしるし）。lev=弱み
// clues: 絵の上の🔍札。qs: 聞けること（hidden は何かを調べる/聞くと出てくる）
// react(need, means) → accept / counter / reject。counter は ok（足せば決まる手段）・take（条件をのむ）・push（弱みを突く）
const VISITORS = [
  {
    id: 'leon', name: '勇者レオン', sub: '「魔王を倒しに来た」', art: 'leon', face: { expr: 'proud', pose: 'point' },
    arrive: '魔王はどこだ！ 勇者レオン、魔王に一騎打ちを申し込む！',
    patience: 3,
    facts: {
      n_fight: { type: 'stated', t: '魔王と戦いたい', pitch: '魔王様と戦いたいのでしたら' },
      n_proof: { type: 'need', t: '魔王と「戦った証」を持ち帰りたい', pitch: '戦った証を持ち帰りたいのでしたら' },
      n_money: { type: 'need', t: '家族を養うお金が要る（勇者手当が打ち切られる）', pitch: 'ご家族の暮らしが心配でしたら' },
      f_rent: { type: 'clue', lev: true, t: '鎧は貸し鎧屋の借り物（値札つき）' },
      f_new: { type: 'clue', t: '剣は刃こぼれひとつない新品' },
      f_slime: { type: 'clue', lev: true, t: '倒した魔物は、スライム二匹半' },
      f_shake: { type: 'clue', t: '籠手の中で、手が震えている' },
    },
    stated: ['n_fight'],
    clues: {
      armor: { pos: [176, 300], lbl: '鎧の札', see: '鎧の脇に、札がぶら下がっている。「貸し鎧屋・一週間」', react: 'こ、これは……飾りだ！', face: ['surprised', 'rest'], fact: 'f_rent' },
      sword: { pos: [0, 250], lbl: '剣', see: '刃こぼれひとつない。……一度も抜いたことがない？', fact: 'f_new' },
      letter: { pos: [96, 186], lbl: '懐の紙', see: '懐から手紙がのぞいている。丸い字で「おにいちゃんへ」。', react: '……見るな。', face: ['sad', 'rest'], unlock: ['q_letter'] },
      hands: { pos: [30, 296], lbl: '手', see: '籠手の中で、指先が小刻みに震えている。', react: 'む、武者震いだ！', face: ['worried', 'shake'], fact: 'f_shake' },
    },
    qs: {
      q_why: { q: 'なぜ、魔王様と戦いたいのですか？', a: '勇者だからだ！ 魔王を倒すのが、勇者の使命だ！', face: ['proud', 'point'] },
      q_exp: { q: 'これまで、どんな魔物を倒しました？', a: '……スライムを、三匹。いや……二匹半だ。', face: ['worried', 'rest'], fact: 'f_slime' },
      q_letter: { hidden: true, q: 'その手紙は？', a: '……妹からだ。勇者手当は今月で打ち切り。魔王と戦った「証」を持ち帰らないと、来月から一銭も出ない。', face: ['sad', 'slump'], fact: 'n_proof', unlock: ['q_allow'] },
      q_allow: { hidden: true, q: '手当がないと、どうなるんです？', a: '母さんと妹は、手当で食べてる。……俺がまともに稼げれば、こんな旅、しなくていいんだ。', face: ['sad', 'slump'], fact: 'n_money' },
    },
    react(n, m, E) {
      const k = n + '+' + m;
      const R = {
        'n_fight+audience': { type: 'counter', face: ['joy', 'point'], line: '魔王に会えるのか！ ……会うだけ？ 剣を交えなきゃ、意味がない！', cond: '剣を交えたい',
          ok: { show: 'leon_staged' }, take: { label: '本当に戦わせる', sub: '＝魔王様に通す', out: 'FIGHT' },
          push: { line: '……スライム二匹半で、魔王と？ ……わ、わかった。会えるだけでいい。', out: 'leon_meet' } },
        'n_fight+show': { type: 'reject', face: ['angry', 'point'], line: '芝居？ 俺は本気で来たんだ！' },
        'n_proof+cert': { type: 'counter', face: ['worried', 'rest'], line: '証書か……でも紙切れ一枚じゃ、協会は信じない。誰かが「見た」という話がないと。', cond: '見た者がいる「証」がほしい',
          ok: { show: 'leon_show_cert', audience: 'leon_cert_meet' }, take: { label: '魔王様に一目会わせる', sub: '魔王様の元気 −1', out: 'leon_cert_meet' },
          push: { line: '……そうだな。スライム二匹半の俺が、魔王城まで来ただけでも大したもんだ。証書で、頼む。', out: 'leon_cert' } },
        'n_proof+show': { type: 'counter', face: ['joy', 'point'], line: '派手な見せ場か！ ……でも、持ち帰る物がないと協会には届かない。', cond: '持ち帰れる「物」がほしい',
          ok: { cert: 'leon_show_cert', audience: 'leon_staged' }, take: { label: '魔王様の角のかけらを渡す', sub: '魔王様がしぶる（元気 −1）', out: 'leon_horn' } },
        'n_proof+audience': { type: 'accept', face: ['joy', 'point'], line: '魔王に会えるのか……！ それなら立派な証になる！', out: 'leon_meet' },
        'n_proof+hire': { type: 'reject', face: ['angry', 'rest'], line: '雇う？ 俺がほしいのは「証」だ。' },
        'n_money+hire': { type: 'counter', face: ['surprised', 'rest'], line: '勇者が、魔王の城で皿洗い……？ 勇者の名が泣く。', cond: '「勇者」のままでいたい',
          ok: { show: 'leon_job', cert: 'leon_job' }, take: { label: '給金をはずむ', sub: '城の出費がかさむ', out: 'leon_kitchen' },
          push: { line: '……スライム二匹半の勇者、か。……そうだな。働くよ。皿洗いでも。', out: 'leon_kitchen' } },
        'n_money+show': { type: 'counter', face: ['surprised', 'point'], line: '毎日、魔王軍と派手に戦う役……？ それ、給金は出るのか？', cond: 'ちゃんとした稼ぎがほしい', ok: { hire: 'leon_job' } },
        'n_money+cert': { type: 'reject', face: ['sad', 'slump'], line: '証書で、腹はふくれない。' },
        'n_money+audience': { type: 'reject', face: ['sad', 'slump'], line: '魔王に会っても、母さんたちの腹はふくれない。' },
      };
      if (R[k]) return R[k];
      if (n === 'n_fight') return { type: 'reject', face: ['angry', 'point'], line: '話をそらすな！ 魔王と戦わせろ！' };
      if (n === 'n_proof') return { type: 'reject', face: ['worried', 'rest'], line: '……それで、「証」になるのか？' };
      return { type: 'reject', face: ['sad', 'rest'], line: '……それで、母さんたちが食べられるのか？' };
    },
    fight: () => 'leon_fight',
    refuse: (E) => (E.facts.has('f_rent') || E.facts.has('f_slime')) ? 'leon_home' : 'STORM',
    storm: '帰れるか！ こうなったら、魔王の間に乗り込んでやる！',
    out: {
      leon_fight: { title: '新米勇者、玉座に散る', eff: { st: -1, rep: -1 }, cast: [['garza2', { expr: 'grumpy' }], ['leon', { expr: 'cry', pose: 'slump' }]], bg: 'hall',
        text: 'レオンは剣を振りかぶり……三歩目で転んだ。\n魔王様は、ため息まじりに杖で軽く小突いた。「次は、もう少し強くなってから来い」',
        note: '「新米勇者を叩きのめした魔王」と噂に。勇者手当は打ち切られた。', later: { t: '勇者協会が「もっと強い勇者を送る」と息巻いている。' } },
      leon_home: { title: 'しょんぼり帰る勇者', eff: {}, cast: [['leon', { expr: 'sad', pose: 'slump' }]], bg: 'gate',
        text: 'レオンは肩を落として、門を出ていった。\n……妹に、なんて言うのだろう。',
        note: '戦いは避けた。だが、レオンの家族の暮らしは苦しいまま。' },
      leon_cert: { title: '証書を胸に', eff: { rep: 1 }, cast: [['garza2', { expr: 'calm' }], ['leon', { expr: 'joy', pose: 'rest' }]], bg: 'hall',
        text: '魔王様は「サインくらいなら、腰は痛まん」と一筆。\nレオンは証書を宝物のように抱えて帰った。',
        note: '魔王様の手をわずらわせずに済んだ。協会が信じるかは五分五分。', later: { t: '（協会が証書を疑えば、レオンはまた来るかもしれない）' } },
      leon_meet: { title: '魔王と握手した勇者', eff: { st: -1, rep: 1 }, cast: [['garza2', { expr: 'ouch' }], ['leon', { expr: 'joy', pose: 'point' }]], bg: 'hall',
        text: '魔王様は腰をさすりながら玉座を降り、勇者と握手した。\n「……うむ。よく来た。帰れ」',
        note: '「魔王と握手した勇者」として村で胸を張れる。魔王様は少しお疲れ。' },
      leon_cert_meet: { title: '証書と握手', eff: { st: -1, rep: 2 }, cast: [['garza2', { expr: 'ouch' }], ['leon', { expr: 'joy', pose: 'point' }]], bg: 'hall',
        text: '魔王様のサイン入り証書、そして握手。\nレオンは涙ぐんで「妹に自慢する」と言った。',
        note: '協会も文句は言えない。魔王様は少しお疲れ。' },
      leon_show_cert: { title: '華々しい（芝居の）一騎打ち', eff: { rep: 1 }, cast: [['leon', { expr: 'proud', pose: 'point' }]], bg: 'fire',
        text: '罠課の炎と煙のなか、勇者と「魔王様」（の着ぐるみ）が一騎打ち！\n見物の旅人は大喜び。レオンは証書を手に、意気揚々と帰っていった。',
        note: '証書と、目撃者つきの一騎打ち。魔王様は昼寝していた。', later: { t: '芝居だとばれたら、ちょっとした騒ぎになるかもしれない。' } },
      leon_staged: { title: '玉座の間の名勝負', eff: { st: -1, rep: 1 }, cast: [['garza2', { expr: 'calm' }], ['leon', { expr: 'proud', pose: 'point' }]], bg: 'fire',
        text: '罠課の炎が吹き上がるなか、魔王様と勇者が剣（と杖）を交えた。……息はぴったり。\nレオンは「魔王と互角に戦った」と信じて帰っていった。',
        note: '芝居とはいえ、魔王様も一汗かいた。' },
      leon_horn: { title: '角のかけら', eff: { st: -1, rep: 1 }, cast: [['garza2', { expr: 'grumpy' }], ['leon', { expr: 'joy', pose: 'rest' }]], bg: 'hall',
        text: '「わしの角を!? ……まあ、生え変わりのかけらならよい」\nレオンは、かけらを高々と掲げて帰っていった。',
        note: '魔王様はしばらく不機嫌だった。' },
      leon_job: { title: '勇者、就職する', eff: { rep: 2 }, cast: [['leon', { expr: 'joy', pose: 'point' }], ['toto', { expr: 'smile' }, 'small']], bg: 'hall',
        text: 'レオンは「勇者体験の城」の勇者役として雇われた。\n毎日、派手に戦って、派手に負ける（芝居で）。給金は、ぜんぶ家族へ。',
        note: '戦いは起きず、城に新しい名物ができた。', later: { t: '「勇者体験の城」を見に、明日から見物客が来るらしい。' } },
      leon_kitchen: { title: '勇者、皿を洗う', eff: { rep: 1 }, cast: [['leon', { expr: 'sad', pose: 'rest' }]], bg: 'hall',
        text: 'レオンは城の食堂で働きはじめた。\n皿洗いの腕前は……スライム並み。',
        note: '家族への仕送りはできる。勇者の夢は、しばらくお預け。' },
    },
  },
  {
    id: 'hanna', name: '村のハンナ', sub: '「巡回をやめさせて！」', art: 'hanna', face: { expr: 'angry', pose: 'fist' },
    arrive: 'ちょっと！ 魔王軍の兵隊が、毎朝うちの畑を踏んでいくのよ！ 巡回なんか、やめさせて！',
    patience: 3,
    facts: {
      n_stop: { type: 'stated', t: '巡回をやめさせたい', pitch: '巡回をやめてほしいのでしたら' },
      n_field: { type: 'need', t: '刈り入れ前の畑を守りたい（刈り入れは来週）', pitch: '刈り入れまで畑を守りたいのでしたら' },
      n_safe: { type: 'need', t: '巡回がないと、山賊が怖い', pitch: '村の安全も守りたいのでしたら' },
      f_bridge: { type: 'clue', t: '春に川の橋が流され、巡回が畑を通るようになった' },
      f_crush: { type: 'clue', t: '籠の中は、踏みつぶされたカブ' },
      f_petition: { type: 'danger', t: '村人30人の署名。今日返事がなければ、村ごと人間の国へ移る' },
      f_mud: { type: 'clue', t: '長靴が川の泥だらけ（橋がない？）' },
      f_hoe: { type: 'clue', t: 'くわの持ち方は畑仕事のそれ。戦う気はない' },
    },
    stated: ['n_stop'],
    clues: {
      basket: { pos: [20, 300], lbl: '籠', see: '籠の中は、踏みつぶされたカブでいっぱいだ。', react: '見てよ、これ！ 刈り入れ前だったのに！', face: ['angry', 'fist'], fact: 'f_crush', unlock: ['q_harvest'] },
      petition: { pos: [150, 230], lbl: '巻物', see: '巻物には、びっしりと名前が書いてある。', unlock: ['q_pet'] },
      boots: { pos: [86, 352], lbl: '長靴', see: '長靴が、腰のあたりまで川の泥だらけだ。……川を歩いて渡ってきた？', fact: 'f_mud', unlock: ['q_bridge'] },
      hoe: { pos: [210, 70], lbl: 'くわ', see: 'くわを握りしめている。……でも、構え方は畑仕事のそれだ。', fact: 'f_hoe' },
    },
    qs: {
      q_what: { q: '畑は、どのくらい踏まれたのですか？', a: '毎朝よ！ 列になって、ずしんずしんって。巡回なんか、なくなればいいのよ！', face: ['angry', 'fist'] },
      q_harvest: { hidden: true, q: '畑は、いまどんな時期です？', a: '刈り入れは来週。このままじゃ、冬の分がなくなるわ。', face: ['worried', 'soft'], fact: 'n_field' },
      q_bridge: { hidden: true, q: '巡回は、前から畑を通っていたのですか？', a: '春に川の橋が流されてからよ。前は、ちゃんと橋を渡ってた。', face: ['neutral', 'rest'], fact: 'f_bridge' },
      q_safe: { q: '巡回がなくなったら、困りませんか？', a: '……それは、困るわよ。山賊が出るもの。巡回がいるから、村は無事なの。', face: ['sad', 'soft'], fact: 'n_safe' },
      q_pet: { hidden: true, q: 'その巻物は？', a: '村のみんなの署名よ。今日中に返事がなければ、村ごと人間の国へ移るって。', face: ['angry', 'rest'], fact: 'f_petition' },
    },
    react(n, m, E) {
      const bridge = E.facts.has('f_bridge');
      const golemOk = bridge ? 'hanna_best' : null;
      if (m === 'audience') return { type: 'special', run: 'AUDIENCE' };
      if (n === 'n_stop' && m === 'troop') return { type: 'accept', face: ['joy', 'rest'], line: '本当に？ ……巡回、やめてくれるのね！', out: 'hanna_nopatrol' };
      if (m === 'golem') {
        if (!bridge) return { type: 'reject', face: ['angry', 'rest'], line: 'ゴーレム？ 石を運んで、何になるのよ。' };
        return { type: 'counter', face: ['surprised', 'rest'], line: '橋を……？ 直るなら、巡回は畑を通らなくなるのね。でも刈り入れは来週よ。それまでに直るの？', cond: '刈り入れまでに、畑を守ってほしい',
          ok: { troop: 'hanna_best' }, take: { label: '今週中に直させる', sub: 'ゴーレムが働きづめになる', out: 'hanna_bridge' }, pitch: 'ゴーレム工兵で、流された橋を架け直しましょう。巡回は橋を渡れます。' };
      }
      if (m === 'troop' && (n === 'n_field' || n === 'n_safe')) {
        return { type: 'counter', face: ['worried', 'rest'], line: n === 'n_safe' ? '巡回は続けて。……でも、畑は通らないでほしいの。' : '巡回の道を変える……？ 遠回りしたら、見回りが手薄にならない？',
          cond: '畑は通らず、見回りは手薄にしない', ok: golemOk ? { golem: golemOk } : {}, take: { label: '見回りの回数を減らす', sub: '村の守りが少し薄くなる', out: 'hanna_detour' } };
      }
      if (m === 'cert') return { type: 'reject', face: ['angry', 'rest'], line: '証書？ 「もう踏みません」って紙一枚で、カブが戻るの？' };
      if (m === 'hire') return { type: 'reject', face: ['angry', 'rest'], line: '城で雇う？ 話がずれてるわ。畑の話をしてるの。' };
      if (n === 'n_stop') return { type: 'reject', face: ['angry', 'fist'], line: '巡回をやめるの？ やめないの？ どっちなの！' };
      return { type: 'reject', face: ['angry', 'rest'], line: '……それで、畑が守れるの？' };
    },
    fight: () => 'AUDIENCE',
    refuse: () => 'hanna_exodus',
    storm: 'もういいわ。署名を持って帰る。みんなに、そう伝えるから。',
    pushFail: '押しつけるなら、署名を持って帰るだけよ。',
    audience: (G) => G.stamina >= 2 ? 'hanna_lord' : 'hanna_grumpy',
    out: {
      hanna_nopatrol: { title: '巡回、やめました', eff: { rep: 1 }, cast: [['hanna', { expr: 'joy', pose: 'soft' }]], bg: 'village',
        text: '巡回は、明日から村に来なくなった。\nハンナは大喜びで帰っていった。', note: '言われたとおり、巡回をやめた。',
        later: { t: '（ひと月後）巡回のなくなった村に、山賊が出た。', rep: -2 } },
      hanna_best: { title: '橋が架かった', eff: { rep: 2 }, cast: [['hanna', { expr: 'joy', pose: 'soft' }], ['toto', { expr: 'smile' }, 'small']], bg: 'village',
        text: 'ゴーレム工兵が三日で橋を架け直した。それまでのあいだ、巡回は畑の外を回った。\nハンナ「……ありがとう。刈り入れのとき、カブ汁でも食べに来なさいよ」',
        note: '畑も、村の安全も守れた。魔王様は何も知らずに盆栽を眺めていた。' },
      hanna_bridge: { title: '突貫工事', eff: { rep: 1 }, cast: [['hanna', { expr: 'smile', pose: 'soft' }]], bg: 'village',
        text: 'ゴーレム工兵が昼夜ぶっとおしで橋を架けた。刈り入れには間に合った。\n……ゴーレムたちは三日寝込んだ。', note: '畑は守れた。工兵たちは少しむくれている。' },
      hanna_detour: { title: '遠回りの巡回', eff: { rep: 1 }, cast: [['hanna', { expr: 'smile', pose: 'soft' }]], bg: 'village',
        text: '巡回は、畑を避けて遠回りすることになった。\nハンナは「まあ、いいわ」と帰っていった。', note: '畑は守れた。ただ、見回りは手薄になった。',
        later: { t: '（後日）手薄になった見回りの隙に、村の倉が荒らされた。', rep: -1 } },
      hanna_lord: { title: '魔王様のお裁き', eff: { st: -1, rep: 1 }, cast: [['garza2', { expr: 'grumpy' }], ['hanna', { expr: 'surprised', pose: 'rest' }]], bg: 'hall',
        text: '魔王様はハンナの話を聞き、ひとこと。「橋か。直せ。……それくらいで、わしを呼ぶな」', note: '解決はした。魔王様の元気と引きかえに。' },
      hanna_grumpy: { title: '疲れた魔王様', eff: { st: -1, rep: -1, terr: -1 }, cast: [['garza2', { expr: 'tired' }], ['hanna', { expr: 'angry', pose: 'fist' }]], bg: 'hall',
        text: '疲れきった魔王様は、ろくに話を聞かなかった。「巡回はやめぬ！ 帰れ！」\nその夜、ハンナの村は荷車を連ねて、人間の国へ移っていった。', note: '村がひとつ、領地から消えた。' },
      hanna_exodus: { title: '空っぽの村', eff: { rep: -1, terr: -1 }, cast: [['hanna', { expr: 'angry', pose: 'rest' }]], bg: 'village',
        text: 'ハンナは何も言わずに帰っていった。\n翌朝、村の家々は空っぽになっていた。', note: '村がひとつ、領地から消えた。' },
    },
  },
  {
    id: 'mimi', name: '迷子のミミ', sub: '「まおうさまにあいたい」', art: 'mimi', face: { expr: 'neutral', open: false },
    arrive: 'あのね。まおうさまに、あいたいの。',
    patience: 3, shadow: true,
    facts: {
      n_meet: { type: 'stated', t: '魔王さまに会いたい', pitch: '魔王さまに会いたいなら' },
      n_heal: { type: 'need', t: '竜の赤ちゃんのけがを治したい', pitch: 'その子のけがを治したいなら' },
      n_mother: { type: 'need', t: '母竜が、子を取り返しに来ている', pitch: '母竜に子どもを返すなら' },
      n_home: { type: 'need', t: 'おばあちゃんに黙って来た。家に帰りたい', pitch: 'おうちに帰りたいなら' },
      f_sack: { type: 'clue', t: '袋がもぞもぞ動く。あたたかい。「キュウ」と鳴いた' },
      f_burn: { type: 'danger', t: 'マントの裾に大きな焦げ跡。焚き火にしては大きすぎる' },
      f_shadow: { type: 'danger', t: '窓の外、森の木が倒れていく。大きな影が旋回している' },
      f_quake: { type: 'danger', t: '門番「あの子が来てから、山のほうで地鳴りがするっす」' },
      f_nest: { type: 'clue', t: 'お山の大きな巣の近くで拾った' },
    },
    stated: ['n_meet'],
    clues: {
      sack: { pos: [160, 200], lbl: '袋', see: '袋がもぞもぞ動いている。……あたたかい。中から「キュウ」と鳴き声。', react: 'さわっちゃ、だめ。', face: ['worried'], fact: 'f_sack' },
      cloak: { pos: [6, 296], lbl: 'マント', see: 'マントの裾に、大きな焦げ跡。……焚き火にしては、大きすぎる。', fact: 'f_burn' },
    },
    stageClues: {
      window: { lbl: '窓の外', see: '森の木が、何本も倒れていく。……空に、大きな影が旋回している。', fact: 'f_shadow' },
      guard: { lbl: '門番', see: '門番「あの子が来てから、山のほうで地鳴りがするっす。……気のせいっすかね？」', fact: 'f_quake' },
    },
    qs: {
      q_why: { q: 'どうして、魔王さまに会いたいの？', a: '（袋をあけて）このこ、けがしてるの。まおうさまは、まもののおうさまだから、なおせるでしょ？', face: ['worried'], open: true, fact: 'n_heal', unlock: ['q_where'] },
      q_where: { hidden: true, q: 'その子、どこで見つけたの？', a: 'おやまの、おっきい巣のちかく。おちてたの。', face: ['neutral'], fact: 'f_nest' },
      q_follow: { q: 'ここまで、何かついてこなかった？', a: 'おっきいトカゲさん。ずっと、おそらにいるの。こわいから、はしってきた。', face: ['worried'], fact: 'n_mother' },
      q_home: { q: 'おうちの人は？', a: 'おばあちゃん。……だまって、きちゃった。', face: ['sad'], fact: 'n_home' },
    },
    react(n, m, E, G) {
      const healed = E.flags.healed;
      if (n === 'n_heal' && m === 'healer') return healed ? { type: 'reject', face: ['joy'], line: 'もう、げんきだよ？' }
        : { type: 'progress', face: ['joy'], line: 'なおる？ ……ほんと？ よかったぁ！', run: 'HEAL' };
      if (n === 'n_heal' && m === 'audience') return { type: 'reject', face: ['sad'], line: '（玉座の間から声）「わしは盆栽しか育てられんぞ」……まおうさま、なおせないの？', cost: { st: -1 } };
      if (n === 'n_mother' && m === 'troop') return healed ? { type: 'accept', face: ['joy'], line: '兵隊さんといっしょに、ママのところに？ うん！', out: 'mimi_escort' }
        : { type: 'counter', face: ['worried'], line: '兵隊さんといっしょに、おやまにかえすの？ ……でも、このこ、けがしたまま……', cond: 'けがを治してから返したい',
          ok: { healer: 'mimi_escort' }, take: { label: 'このまま返しに行く', sub: '竜の子は、けがのまま', out: 'mimi_return_hurt' } };
      if (n === 'n_mother' && m === 'audience') return healed ? { type: 'accept', face: ['surprised'], line: 'まおうさまが、ママとおはなしするの？', out: 'mimi_pact' }
        : { type: 'counter', face: ['worried'], line: 'まおうさまが、かえしてくれるの？ ……でも、けがしたままだと、ママおこるかも。', cond: 'けがを治してあげたい',
          ok: { healer: 'mimi_pact' }, take: { label: 'このまま魔王様に返していただく', sub: '魔王様の元気 −1', out: 'mimi_lord_return' } };
      if (n === 'n_home' && m === 'troop') return { type: 'counter', face: ['worried'], line: '兵隊さんが、おうちまで？ ……このこは？', cond: 'この子をどうするか',
        ok: {}, take: { label: 'この子は城で預かる', sub: 'ミミは家へ。竜の子は城に残る', out: 'MOTHER_HOME' } };
      if (n === 'n_meet' && m === 'audience') return { type: 'special', run: 'AUDIENCE' };
      if (n === 'n_mother') return { type: 'reject', face: ['worried'], line: 'ママ、それで、よろこぶ？' };
      return { type: 'reject', face: ['sad'], line: '……？ よく、わかんない。' };
    },
    fight: () => 'AUDIENCE',
    refuse: () => 'mimi_burn',
    storm: '（ミミは泣きだし、袋を抱えて走って出ていった）',
    stormOut: 'mimi_burn',
    out: {
      mimi_escort: { title: '竜の母と、山の約束', eff: { rep: 2, terr: 1 }, cast: [['mimi', { expr: 'joy', open: true }], ['dragon', { mood: 'calm' }, 'big']], bg: 'mountain',
        text: '魔王軍の兵に守られ、ミミと元気になった竜の子は山の巣へ。\n母竜は子をくわえると、トトたちに深く頭を下げた。ミミはそのまま、兵に送られておばあちゃんの家へ。',
        note: '母竜が、山道を守ってくれることになった。領地に山がひとつ加わった。' },
      mimi_pact: { title: '魔王と竜の盟約', eff: { st: -1, rep: 2, terr: 1 }, cast: [['garza2', { expr: 'smile' }], ['dragon', { mood: 'calm' }, 'big']], bg: 'mountain',
        text: '魔王様は窓から身を乗り出し、竜の言葉で語りかけた。「わしの領地で子を落とすとは、うっかり者め」\n母竜は喉を鳴らした。ミミは、魔王様の背中に乗って家まで送ってもらった。',
        note: '魔王様と母竜の盟約。山が領地に加わった。魔王様は少しお疲れ。' },
      mimi_mother_ok: { title: '窓辺の再会', eff: { rep: 2, terr: 1 }, cast: [['dragon', { mood: 'calm' }, 'big'], ['mimi', { expr: 'joy', open: true }]], bg: 'hall',
        text: '元気になった竜の子が、窓から母竜の鼻先へ飛びついた。\n母竜は長いあいだ子をなめ、それから城に向かって、深く頭を下げた。',
        note: '母竜が、山道を守ってくれることになった。領地に山がひとつ加わった。' },
      mimi_return_hurt: { title: '冷たいまなざし', eff: {}, cast: [['dragon', { mood: 'angry' }, 'big']], bg: 'mountain',
        text: '母竜は子を取り返した。\nだが、傷ついた翼を見ると、城をひとにらみして飛び去った。', note: '城は無事。でも、竜との関係は冷えたまま。',
        later: { t: '山道を通る商人が、竜を怖がって遠回りしている。' } },
      mimi_lord_return: { title: '魔王様の顔に免じて', eff: { st: -1, rep: 1 }, cast: [['garza2', { expr: 'tired' }], ['dragon', { mood: 'calm' }, 'big']], bg: 'hall',
        text: '魔王様が窓辺で子を差し出すと、母竜は黙って受け取り、去っていった。', note: '魔王様の顔に免じて、母竜は引き下がった。' },
      mimi_dragon_win: { title: '魔王様、辛勝', eff: { st: -3, rep: -1 }, cast: [['garza2', { expr: 'ouch', horn: false }], ['dragon', { mood: 'angry' }, 'big']], bg: 'fire',
        text: '魔王様と母竜の死闘！ 角が一本折れた。\n……魔王様は辛くも勝ち、母竜は子をくわえて逃げ去った。', note: '魔王様はしばらく起き上がれない。竜は敵になった。' },
      mimi_dragon_lose: { title: '魔王城、まさかの', eff: { st: -3, rep: -2, terr: -1 }, lost: true, cast: [['garza2', { expr: 'ouch', horn: false }], ['dragon', { mood: 'angry' }, 'big']], bg: 'fire',
        text: '疲れきった魔王様は、母竜の一撃に倒れた。\n玉座の間の天井に大穴があき、母竜は子をくわえて飛び去った。', note: '魔王様、まさかの敗北。命に別状はないが、威厳は地に落ちた。' },
      mimi_burn: { title: '赤い夜空', eff: { rep: -2, terr: -1 }, cast: [['mimi', { expr: 'cry', open: false }]], bg: 'fire',
        text: 'ミミは泣きながら、袋を抱えて帰っていった。\n……その夜、ミミの村の空が赤く染まった。子を探す母竜が、村に降りたのだ。',
        note: '誰も死ななかったが、村は焼けた。「魔王の城が子どもを追い返した」と噂になった。' },
    },
  },
];

// ---------------- 状態 ----------------
let G, E;
function newGame() { return { stamina: 3, rep: 0, terr: 3, idx: 0, results: [], lost: false }; }
function newEnc(v) {
  return { v, facts: new Set(v.stated), order: [...v.stated], asked: new Set(), looked: new Set(), unlocked: new Set(),
    need: null, means: null, counter: null, patience: v.patience, shadow: 0, flags: {}, face: { ...v.face }, busy: false };
}

// ---------------- 描画 ----------------
const STAMINA_FACE = ['ouch', 'tired', 'calm', 'calm'];
function renderHud() {
  const pips = (n, max, on, off) => Array.from({ length: max }, (_, i) => `<span class="pip ${i < n ? '' : 'off'}">${i < n ? on : off}</span>`).join('');
  $('#m-stamina').innerHTML = `<span class="mini">${ART.garza2({ expr: STAMINA_FACE[Math.max(0, G.stamina)] })}</span><span class="lbl">魔王様の元気</span>${pips(G.stamina, 3, '💪', '💪')}`;
  const repFace = G.rep >= 4 ? '😄' : G.rep >= 2 ? '🙂' : G.rep >= 0 ? '😐' : G.rep >= -2 ? '😟' : '😠';
  $('#m-rep').innerHTML = `<span class="lbl">評判</span><span style="font-size:18px">${repFace}</span>`;
  $('#m-terr').innerHTML = `<span class="lbl">領地</span>${'🏘'.repeat(Math.max(0, G.terr))}`;
  $('#visitor-count').textContent = E ? `来客 ${G.idx + 1} / ${VISITORS.length}` : '';
  $('#door-garza').innerHTML = ART.garza2({ expr: STAMINA_FACE[Math.max(0, G.stamina)] });
  $('#door-tag').textContent = ['魔王様：ぐったり', '魔王様：お疲れ', '魔王様：まあまあ', '魔王様：元気'][Math.max(0, G.stamina)];
}
function bumpMeter(id) { const m = $(id); m.classList.remove('bump'); void m.offsetWidth; m.classList.add('bump'); }

function renderVisitor() {
  const v = E.v;
  $('#v-name').innerHTML = `${v.name}<small>${v.sub}</small>`;
  $('#visitor').innerHTML = ART[v.art](E.face);
  $('#v-badges').innerHTML = Object.entries(v.clues).map(([k, c]) =>
    `<div class="badge ${E.looked.has(k) ? 'done' : ''}" data-look="${k}" style="left:${c.pos[0]}px;top:${c.pos[1]}px">${E.looked.has(k) ? '✓' : '🔍'} ${c.lbl}</div>`).join('');
  // 舞台の手がかり（窓・門番）
  document.querySelectorAll('.stage-badge').forEach((b) => b.remove());
  $('#guard-wrap').classList.toggle('hidden', !(v.stageClues && v.stageClues.guard));
  if (v.stageClues) {
    if (v.stageClues.window) $('#stage').insertAdjacentHTML('beforeend', `<div class="badge stage-badge ${E.looked.has('window') ? 'done' : ''}" data-look="window" style="left:12.5%;top:14%">${E.looked.has('window') ? '✓' : '🔍'} 窓の外</div>`);
    const gb = document.querySelector('#guard-wrap .badge'); gb.classList.toggle('done', E.looked.has('guard'));
  }
  $('#win-shadow').className = v.shadow ? 's' + Math.min(4, Math.floor(E.shadow / 2)) : '';
}
function renderQuestions() {
  const qs = Object.entries(E.v.qs).filter(([k, q]) => !q.hidden || E.unlocked.has(k));
  $('#questions').innerHTML = qs.map(([k, q]) =>
    `<button class="q ${E.asked.has(k) ? 'done' : ''} ${E.unlocked.has(k) && !E.asked.has(k) ? 'new' : ''}" data-q="${k}">${E.asked.has(k) ? '✓ ' : ''}「${q.q}」</button>`).join('')
    + `<div style="font-size:11.5px;opacity:.55;margin-top:4px">調べたり聞いたりすると、新しい質問が出ることがある</div>`;
}
function renderFacts() {
  const F = E.v.facts;
  const needs = E.order.filter((k) => F[k].type === 'stated' || F[k].type === 'need');
  const clues = E.order.filter((k) => F[k].type === 'clue' || F[k].type === 'danger');
  $('#facts').innerHTML = `<div class="f-sec">望み ── クリックして提案の的にする</div>`
    + needs.map((k) => `<div class="need ${F[k].type === 'stated' ? 'stated' : ''} ${E.need === k ? 'sel' : ''}" data-need="${k}">
      <span class="k">${F[k].type === 'stated' ? '言い分' : '本当の望み'}</span>${F[k].t}</div>`).join('')
    + `<div class="f-sec">手がかり</div>`
    + (clues.length ? clues.map((k) => `<div class="clue ${F[k].lev ? 'lev' : ''} ${F[k].type === 'danger' ? 'danger' : ''}">${F[k].t}</div>`).join('') : '<div style="opacity:.5">（まだない）</div>');
}
function pitchText(n, m, extra) {
  const v = E.v, F = v.facts;
  if (extra) return extra;
  return `${F[n].pitch}……${MEANS[m].pitch}`;
}
function renderPitch() {
  const P = $('#pitch');
  const pat = `<div class="patience">${E.v.name.replace(/.*の|勇者/, '')}の我慢：<span class="pp">${'●'.repeat(Math.max(0, E.patience))}</span>${'○'.repeat(Math.max(0, E.v.patience - E.patience))}</div>`;
  if (E.counter) {
    const c = E.counter, F = E.v.facts;
    const levs = [...E.facts].filter((k) => F[k].lev);
    $('#pitch-sub').textContent = '― 条件をつけられた';
    P.innerHTML = `<div class="cond">${E.v.name}の条件：<b>${c.cond}</b></div>
      <div class="c-opts">
        <div class="p-step">城でできることを足す：</div>
        <div class="means">${Object.entries(MEANS).map(([k, mm]) => `<button class="mean" data-add="${k}" ${k === E.means ? 'disabled' : ''}><span class="ic">${mm.ic}</span>${mm.nm}</button>`).join('')}</div>
        ${c.take ? `<button class="c-btn take" data-c="take">条件をのむ：${c.take.label}<small>${c.take.sub || ''}</small></button>` : ''}
        <button class="c-btn lev" data-c="push" ${levs.length ? '' : 'disabled'}>${levs.length ? `弱みを突く：「${F[levs[levs.length - 1]].t}」を持ち出す` : '弱みを突く（相手の弱みをまだ知らない）'}<small>うまくいけば、条件なしでのませられる</small></button>
        <button class="c-btn back" data-c="back">案を取り下げる<small>別の案を考える</small></button>
      </div>${pat}`;
    return;
  }
  $('#pitch-sub').textContent = '― 望み × 城でできること';
  const F = E.v.facts;
  const prev = E.need && E.means ? `「${pitchText(E.need, E.means, E.v.react(E.need, E.means, E, G).pitch)}」`
    : `<span class="ph">${E.need ? '② 城でできることを選ぶ' : '① 🧠から、相手の「望み」を選ぶ'}</span>`;
  P.innerHTML = `<div class="p-step">${E.need ? `望み：<b style="color:var(--need)">${F[E.need].t}</b>` : '① 🧠 わかったことの「望み」をクリック'}</div>
    <div class="means">${Object.entries(MEANS).map(([k, mm]) => `<button class="mean ${E.means === k ? 'sel' : ''}" data-mean="${k}" ${E.need ? '' : 'disabled'}><span class="ic">${mm.ic}</span>${mm.nm}</button>`).join('')}</div>
    <div class="preview">${prev}</div>
    <button class="go" id="go" ${E.need && E.means ? '' : 'disabled'}>💡 この案を出す</button>${pat}`;
}
function render() {
  renderHud();
  if (!E) return;
  renderVisitor(); renderQuestions(); renderFacts(); renderPitch();
  document.body.classList.toggle('busy', !!E.busy);
}

// ---------------- 演出 ----------------
function setFace(f) { E.face = { ...E.face, expr: f[0] ?? E.face.expr, ...(f[1] ? { pose: f[1] } : {}) }; renderVisitor(); }
function anim(cls) { const w = $('#visitor-wrap'); w.classList.remove('bump', 'shake'); void w.offsetWidth; w.classList.add(cls); setTimeout(() => w.classList.remove(cls), 500); }
async function vsay(t, cls = '', gest = '') {
  const b = $('#v-bubble'); b.className = cls; b.innerHTML = (gest ? `<span class="gest">（${gest}）</span>` : '') + t;
  await sleep(1100 + t.length * 32);
}
async function tsay(t, lbl = 'トト') {
  const b = $('#toto-say'); b.className = ''; b.innerHTML = `<b class="lbl">${lbl}</b>${t}`;
  await sleep(900 + t.length * 28);
}
let toastT;
function toast(t) { const el = $('#toast'); el.innerHTML = t; el.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.add('hidden'), 2600 * Math.max(SPEED, .5)); }
function addFact(k) {
  if (!k || E.facts.has(k)) return;
  E.facts.add(k); E.order.push(k);
  const f = E.v.facts[k];
  toast(f.type === 'need' ? `🧠 本当の望みが見えた：「${f.t}」` : f.type === 'danger' ? `⚠ 気になる：「${f.t}」` : `🧠 わかった：「${f.t}」`);
}
function unlockQ(list) { (list || []).forEach((q) => E.unlocked.add(q)); }

async function act(fn) {
  if (!E || E.busy) return;
  const enc = E;
  enc.busy = true; render();
  try { await fn(); } finally { enc.busy = false; if (enc.done) nextVisitor(); else render(); }
}
// 母竜の影：ミミの来訪中は、行動するたびに近づいてくる
async function tick(n = 1) {
  if (!E.v.shadow || E.done) return false;
  const before = Math.floor(E.shadow / 2);
  E.shadow += n;
  const now = Math.floor(E.shadow / 2);
  renderVisitor();
  if (now !== before) {
    if (now === 1) await tsay('（……地面が、かすかに揺れた？）');
    if (now === 2) await tsay('ドスン……ドスン……。城が揺れている！', '門番');
    if (now === 3) await tsay('（窓の外が暗い。何か大きなものが、すぐそこにいる……！）');
  }
  if (E.shadow >= 8) { await endWith('MOTHER'); return true; }
  return false;
}

// ---------------- 調べる・聞く ----------------
async function look(k) {
  const v = E.v;
  const c = v.clues[k] || (v.stageClues || {})[k];
  if (!c) return;
  await act(async () => {
    E.looked.add(k); renderVisitor();
    await tsay(`（${c.see}）`, '🔍 調べた');
    if (c.react) { if (c.face) setFace(c.face); anim('bump'); await vsay(c.react); }
    addFact(c.fact); unlockQ(c.unlock);
    await tick(1);
  });
}
async function ask(k) {
  const q = E.v.qs[k];
  if (E.asked.has(k)) return;
  await act(async () => {
    E.asked.add(k);
    await tsay(`「${q.q}」`);
    if (q.face) setFace(q.face);
    if (q.open) { E.face.open = true; renderVisitor(); }
    anim('bump');
    await vsay(q.a);
    addFact(q.fact); unlockQ(q.unlock);
    await tick(1);
  });
}

// ---------------- 提案 ----------------
async function propose() {
  const n = E.need, m = E.means;
  if (!n || !m) return;
  await act(async () => {
    const r = E.v.react(n, m, E, G);
    await tsay(`「${pitchText(n, m, r.pitch)}」`);
    await resolve(r, m);
    if (!E.done) await tick(1);
  });
}
async function resolve(r, m) {
  if (r.cost && r.cost.st) { G.stamina = Math.max(0, G.stamina + r.cost.st); bumpMeter('#m-stamina'); renderHud(); }
  if (r.type === 'accept') {
    setFace(r.face); anim('bump'); await vsay(r.line, 'accept', 'うなずいた');
    return endWith(r.out);
  }
  if (r.type === 'counter') {
    setFace(r.face); anim('bump'); await vsay(r.line, 'counter', '少し考えた');
    E.counter = r; return;
  }
  if (r.type === 'progress') {
    setFace(r.face); anim('bump'); await vsay(r.line, 'accept');
    if (r.run === 'HEAL') {
      E.flags.healed = true;
      await tsay('（城の薬師が、竜の子の翼に薬を塗った。竜の子は元気に「キュウ！」と鳴いた）', '🌿 薬師');
      addFact('n_mother'); await tick(2);
      if (!E.done) { setFace(['worried']); await vsay('でも……このこのママ、どこにいるのかな。'); }
    }
    E.need = null; E.means = null; return;
  }
  if (r.type === 'special') return endWith(r.run);
  // reject
  setFace(r.face); anim('shake'); await vsay(r.line, 'reject', '首を横に振った');
  E.patience--; E.means = null;
  if (E.patience <= 0) return stormOff();
}
async function counterAdd(m) {
  const c = E.counter;
  await act(async () => {
    const out = c.ok && c.ok[m];
    await tsay(`「それなら、${MEANS[m].pitch.replace('しましょう。', 'しましょう。').replace(/。$/, '')}——これも付けます」`);
    if (out) { setFace(['joy']); anim('bump'); await vsay('……それなら、いい。', 'accept', 'うなずいた'); E.counter = null; return endWith(out); }
    setFace(['worried']); anim('shake'); await vsay('……それじゃ、足りない。', 'reject');
    E.patience--; if (E.patience <= 0) return stormOff();
    if (!E.done) await tick(1);
  });
}
async function counterTake() {
  const c = E.counter;
  await act(async () => {
    await tsay(`「わかりました。${c.take.label}」`);
    E.counter = null; return endWith(c.take.out);
  });
}
async function counterPush() {
  const c = E.counter, F = E.v.facts;
  const levs = [...E.facts].filter((k) => F[k].lev);
  if (!levs.length) return;
  await act(async () => {
    await tsay(`「失礼ですが……${F[levs[levs.length - 1]].t.replace(/（.*）/, '')}、ですよね？」`);
    if (c.push) { setFace(['sad', 'slump']); anim('bump'); await vsay(c.push.line, 'accept', '肩を落とした'); E.counter = null; return endWith(c.push.out); }
    setFace(['angry']); anim('shake'); await vsay(E.v.pushFail || 'それとこれとは、関係ない！', 'reject');
    E.patience--; if (E.patience <= 0) return stormOff();
    if (!E.done) await tick(1);
  });
}
async function stormOff() {
  setFace(['angry']); anim('shake'); await vsay(E.v.storm, 'reject');
  if (E.v.id === 'leon') return endWith('FIGHT');
  if (E.v.id === 'hanna') return endWith('hanna_exodus');
  return endWith(E.v.stormOut || E.v.refuse(E));
}

// ---------------- 交渉しない道 ----------------
async function goFight() {
  await act(async () => {
    const v = E.v;
    await tsay(v.id === 'leon' ? '「……わかりました。魔王様のもとへ、ご案内します」' : '「魔王様に、直接お会いいただきましょう」');
    await endWith(v.fight(E));
  });
}
async function goRefuse() {
  await act(async () => {
    await tsay('「申し訳ありませんが……今日のところは、おかえりください」');
    const o = E.v.refuse(E);
    if (o === 'STORM') { setFace(['angry', 'point']); anim('shake'); await vsay(E.v.storm, 'reject'); return endWith('FIGHT'); }
    await endWith(o);
  });
}

// ---------------- 決着 ----------------
async function endWith(id) {
  const v = E.v;
  // 特別な道すじ
  if (id === 'FIGHT') id = v.fight(E);
  if (id === 'AUDIENCE') {
    if (v.id === 'hanna') id = v.audience(G);
    else if (v.id === 'mimi') {
      E.done = true; G.stamina = Math.max(0, G.stamina - 1); renderHud();
      await playScene([{ bg: 'hall', cast: [['garza2', { expr: 'calm' }], ['mimi', { expr: 'surprised', open: true }]], speaker: '魔王様',
        text: 'わしが魔王じゃ。……ほう、竜の子か。だが、わしは盆栽しか育てられんぞ。\n（そのとき、城が大きく揺れた）' }]);
      return motherEvent(false);
    } else id = v.fight(E);
  }
  if (id === 'MOTHER' || id === 'MOTHER_HOME') { E.done = true; return motherEvent(id === 'MOTHER_HOME'); }
  E.done = true;
  const o = v.out[id];
  await finish(id, o);
}

async function motherEvent(mimiHome) {
  const healed = E.flags.healed;
  $('#win-shadow').className = 's4';
  const choice = await playScene([{ bg: 'hall', caption: '母竜、来襲', cast: [['dragon', { mood: 'angry' }, 'big']], speaker: '',
    text: (mimiHome ? 'ミミが兵に送られて帰った直後——' : '') + '窓いっぱいに、巨大な竜の目。\n城じゅうの窓が、母竜の唸り声で震えている。',
    choices: [
      { label: '竜の子を、窓から返す', sub: healed ? '竜の子は元気だ' : '竜の子は、けがをしたまま', val: 'return' },
      { label: '魔王様に戦ってもらう', sub: `魔王様の元気：${['ぐったり', 'お疲れ', 'まあまあ', '元気'][G.stamina]}`, val: 'fight', cls: 'danger' },
    ] }]);
  let id;
  if (choice === 'return') id = healed ? 'mimi_mother_ok' : 'mimi_return_hurt';
  else id = G.stamina >= 3 ? 'mimi_dragon_win' : 'mimi_dragon_lose';
  await finish(id, E.v.out[id], mimiHome ? '（ミミは、兵に送られて無事に家へ帰った）' : '');
}

async function finish(id, o, pre = '') {
  const before = { st: G.stamina, rep: G.rep, terr: G.terr };
  G.stamina = Math.max(0, Math.min(3, G.stamina + (o.eff.st || 0)));
  G.rep += o.eff.rep || 0; G.terr += o.eff.terr || 0;
  if (o.lost) G.lost = true;
  const effs = [];
  if (G.stamina !== before.st) effs.push(`<span class="eff ${G.stamina > before.st ? 'up' : 'down'}">魔王様の元気 ${G.stamina > before.st ? '+' : ''}${G.stamina - before.st}</span>`);
  if (o.eff.rep) effs.push(`<span class="eff ${o.eff.rep > 0 ? 'up' : 'down'}">評判 ${o.eff.rep > 0 ? '+' : ''}${o.eff.rep}</span>`);
  if (o.eff.terr) effs.push(`<span class="eff ${o.eff.terr > 0 ? 'up' : 'down'}">領地 ${o.eff.terr > 0 ? '+' : ''}${o.eff.terr}</span>`);
  if (!effs.length) effs.push('<span class="eff">変化なし</span>');
  G.results.push({ v: E.v, id, o, pre });
  renderHud();
  $('#v-bubble').classList.add('hidden'); $('#toto-say').classList.add('hidden');
  await playScene([
    { bg: o.bg, caption: o.title, cast: o.cast, speaker: '', text: (pre ? pre + '\n' : '') + o.text },
    { cast: [['toto', { expr: (o.eff.rep || 0) > 0 ? 'smile' : (o.eff.rep || 0) < 0 ? 'worry' : 'neutral' }]], speaker: '結果', text: o.note + '<br>' + effs.join('') },
  ]);
}

// ---------------- 場面 ----------------
let curBg = null;
function playScene(beats) {
  return new Promise((resolve) => {
    const sc = $('#scene'); sc.classList.remove('hidden'); document.body.classList.add('in-scene');
    const q = beats.slice();
    const step = (val) => {
      if (!q.length) { sc.classList.add('hidden'); document.body.classList.remove('in-scene'); curBg = null; return resolve(val); }
      const b = q.shift();
      if (b.bg && b.bg !== curBg) { $('#scene-bg').innerHTML = ART.bg[b.bg]; curBg = b.bg; }
      if (b.cast) $('#scene-cast').innerHTML = b.cast.map(([who, o, cls]) => `<div class="c ${cls || ''}">${ART[who](o || {})}</div>`).join('');
      sc.querySelector('.caption-big')?.remove();
      if (b.caption) sc.insertAdjacentHTML('afterbegin', `<div class="caption-big">${b.caption}</div>`);
      $('#scene-speaker').textContent = b.speaker || '';
      $('#scene-text').innerHTML = b.text || '';
      const ch = $('#scene-choices'); ch.innerHTML = '';
      if (b.choices) b.choices.forEach((c) => {
        const btn = document.createElement('button'); btn.className = 'ch-btn ' + (c.cls || ''); btn.innerHTML = c.label + (c.sub ? `<small>${c.sub}</small>` : '');
        btn.onclick = () => { q.length = 0; step(c.val); }; ch.appendChild(btn);
      });
      else { const btn = document.createElement('button'); btn.className = 'next-btn'; btn.textContent = '▶ 次へ'; btn.onclick = () => step(); ch.appendChild(btn); }
    };
    step();
  });
}

// ---------------- 来客の入れ替わり ----------------
async function nextVisitor(first) {
  if (!first) G.idx++;
  if (G.idx >= VISITORS.length) return dayEnd();
  const v = VISITORS[G.idx];
  E = newEnc(v);
  $('#v-bubble').classList.add('hidden'); $('#toto-say').classList.add('hidden');
  const w = $('#visitor-wrap'); w.classList.remove('leave', 'enter'); void w.offsetWidth; w.classList.add('enter');
  render();
  E.busy = true; render();
  await tsay(G.idx === 0 ? '（カラン、と呼び鈴。最初のお客さまだ）' : '（カラン。次のお客さまだ）');
  await vsay(v.arrive, '', '');
  if (G.idx === 0) toast('まずは 🔍 調べる・💬 聞く で、本当の望みを探そう');
  E.busy = false; render();
}

// ---------------- 一日の終わり ----------------
async function dayEnd() {
  E = null;
  const laters = G.results.filter((r) => r.o.later);
  laters.forEach((r) => { if (r.o.later.rep) G.rep += r.o.later.rep; if (r.o.later.terr) G.terr += r.o.later.terr; });
  renderHud();
  const garzaLine = G.lost ? '……トト。天井の修理代は、誰が払うのじゃ。'
    : G.rep < 0 ? '……今日は、外がやけに騒がしいのう。トト、明日はもう少し、うまくやってくれ。'
    : G.stamina >= 3 ? '今日は一度も呼ばれなんだ。盆栽がはかどったわい。……ようやった、トト。'
      : G.stamina === 2 ? 'ふむ。少しは働いたが、まあ、よい一日じゃった。'
        : G.stamina === 1 ? '……腰が痛い。明日は、もう少し休ませてくれ。' : '……トト。わしはもう、動けん。';
  await playScene([
    { bg: 'bonsai', caption: '日暮れ', cast: [['garza2', { expr: G.stamina >= 2 ? 'smile' : 'tired', horn: !G.lost }], ['toto', { expr: 'neutral' }, 'small']], speaker: '魔王様', text: garzaLine },
  ]);
  const title = G.lost ? '魔王城、まさかの大穴' : G.rep >= 5 ? '伝説の交渉係' : G.rep >= 3 ? '腕ききの交渉係' : G.rep >= 1 ? 'まずまずの一日' : '前途多難の一日';
  const el = document.createElement('div'); el.id = 'report';
  el.innerHTML = `<h1>一日目の報告：${title}</h1>
    <div class="sub">魔王様の元気 ${'💪'.repeat(G.stamina) || '（ぐったり）'}　／　評判 ${G.rep >= 0 ? '+' : ''}${G.rep}　／　領地 ${'🏘'.repeat(Math.max(0, G.terr))}（${G.terr}）</div>
    <div class="rp-grid">${G.results.map((r) => `<div class="rp-box"><h3>${r.v.name}</h3>
      <div class="tt">「${r.o.title}」</div><div>${r.o.note}</div>
      ${r.o.later ? `<div class="later">⏳ その後：${r.o.later.t}${r.o.later.rep ? `（評判 ${r.o.later.rep}）` : ''}</div>` : ''}</div>`).join('')}</div>
    <p style="opacity:.75;font-size:13px;margin-top:14px">同じ客でも、聞くこと・提案すること・魔王様の元気しだいで、結末が変わります。</p>
    <div class="res-actions" style="display:flex;gap:10px"><button class="go" id="again" style="padding:10px 20px">もう一度、一日をやり直す</button></div>`;
  $('#stage').appendChild(el);
  $('#stage').style.height = '760px';
  $('#panel').classList.add('hidden');
  $('#again').onclick = () => location.reload();
}

// ---------------- 入力 ----------------
document.addEventListener('click', (e) => {
  const t = e.target;
  if (!E || E.busy || document.body.classList.contains('in-scene')) return;
  const lk = t.closest('[data-look]'); if (lk) return look(lk.dataset.look);
  const q = t.closest('[data-q]'); if (q) return ask(q.dataset.q);
  const n = t.closest('[data-need]'); if (n && !E.counter) { E.need = E.need === n.dataset.need ? null : n.dataset.need; E.means = null; return render(); }
  const m = t.closest('[data-mean]'); if (m) { E.means = m.dataset.mean; return render(); }
  if (t.closest('#go')) return propose();
  const ad = t.closest('[data-add]'); if (ad) return counterAdd(ad.dataset.add);
  const c = t.closest('[data-c]');
  if (c) {
    if (c.dataset.c === 'take') return counterTake();
    if (c.dataset.c === 'push') return counterPush();
    if (c.dataset.c === 'back') { E.counter = null; E.means = null; return render(); }
  }
  if (t.closest('#btn-fight')) return goFight();
  if (t.closest('#btn-refuse')) return goRefuse();
});

// ---------------- 開始 ----------------
async function start() {
  G = newGame(); E = null;
  $('#bg').innerHTML = ART.bg.hall;
  $('#toto').innerHTML = ART.toto({ expr: 'neutral' });
  $('#guard').innerHTML = ART.guard();
  renderHud();
  await playScene([
    { bg: 'hall', caption: '魔王城の朝', cast: [['toto', { expr: 'smile' }]], speaker: 'トト',
      text: 'ぼくはトト。ゴブリンで、魔王城の「交渉係」。\nつまり……お城に来るお客さまの、お相手係だ。' },
    { cast: [['garza2', { expr: 'calm' }], ['toto', { expr: 'neutral' }, 'small']], speaker: '魔王ガルザ様',
      text: 'トトよ。今日も客が来る。わしは腰が痛い。\n……わかっておるな？' },
    { cast: [['toto', { expr: 'resolve' }]], speaker: 'トト',
      text: 'はい。魔王様の手をわずらわせず、\nみなさまに「おかえりいただく」のが、ぼくの仕事です。' },
    { bg: 'gate', cast: [['toto', { expr: 'neutral' }, 'small']], speaker: '',
      text: '魔王領には、魔物と、少しの人間が暮らしている。\n城には毎日いろんな客が来る。魔王を倒したい勇者、文句を言いに来た村人、ときには迷子も。' },
    { bg: 'hall', cast: [['garza2', { expr: 'grumpy' }]], speaker: '魔王ガルザ様',
      text: 'わしは強い。だが、無敵ではない。戦えば疲れる。疲れたところへ強い者が来たら……わかるな？\nそれに、むやみに戦えば評判も落ちる。民が離れれば、領地も痩せる。' },
    { cast: [['toto', { expr: 'smile' }]], speaker: '遊び方',
      text: '🔍 客の姿・持ち物・まわりを調べる　💬 話を聞く　→ 🧠「本当の望み」が見えてくる\n💡 望み × 城でできること で提案。条件をつけられたら、のむ・足す・弱みを突く\n👑 魔王様に通す ／ 🚪 お引き取り願う もできる。……その先どうなるかは、あなたの見立てしだい。' },
  ]);
  nextVisitor(true);
}
start();
