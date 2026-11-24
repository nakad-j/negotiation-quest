/*
 * Negotiation Quest — デジタル試作 v1 「三日の勅命」
 * ルールエンジンとシナリオデータ（DOM に依存しない。Node でもブラウザでも動く）
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------- データ

  const CARDS = {
    aunt: { name: '叔母の便り', kind: 'own', text: '母「北のエダ村の叔母から、ひと月も便りがないの」' },
    c1: { name: '紹介状の前例', kind: 'info', text: 'リオ「王家の紹介状があれば、組合はツケで品を出す。先代の王様もそうしたって」' },
    c2: { name: '招集状', kind: 'info', text: '書記官ミラ「十日後に諸侯会議があるの。招集状を十通も書いたわ」' },
    c2x: { name: '会議の議題', kind: 'info', text: 'ミラ「議題は『北の守り』とだけ。砦は落ちてないわ、便りが途絶えただけ」' },
    c3: { name: '伝書鳩', kind: 'info', text: '鳩番グラム「砦まで鳩なら二日。砦から鳩が戻らんのは、砦の鳩が尽きたからじゃろう」' },
    c3x: { name: '鳩の籠', kind: 'info', text: 'グラム「持っていくなら、籠で六羽貸せる。陛下のお許しがあればな」' },
    c4: { name: '減った金庫番', kind: 'info', text: '倉番トーゴ「金庫番は三人から一人に減らされた。城壁の修繕で、えらい金が出ていったらしい」' },
    c4x: { name: '倉の中身', kind: 'info', text: 'トーゴ「倉には去年の保存食と古い鎖帷子が手つかずだ。大臣様は『非常の備え』だと言って出さん」' },
    c5: { name: '志願騎士', kind: 'info', text: '衛兵カイ「若い騎士のセレンが北行きを志願した。団長は『王命がなければ出さん』って止めたんだ」' },
    c5x: { name: '名乗り出た者', kind: 'info', text: 'カイ「陛下と団長はこの件で大喧嘩さ。北行きに名乗り出たのは、あんたとセレンだけだよ」' },
    h_urgent: { name: '目をそらした王', kind: 'clue', text: '急ぐ理由を問うと、王は「それだけだ」と言って目をそらした' },
    h_glance: { name: '大臣への目配せ', kind: 'clue', text: '金の話になると大臣が咳払いをし、王はちらりと大臣を見た' },
    h_gathering: { name: '十日後の集まり', kind: 'clue', text: '王「十日後に、ある集まりがある。それ以上は言わぬ」' },
    h_council: { name: '書記官への舌打ち', kind: 'clue', text: '会議のことを尋ねると、王は「書記官め、口の軽い」と舌打ちした' },
    h_selen: { name: '志願した若造', kind: 'clue', text: '王「志願した若造がおるとは聞いた。だが団長が許さぬそうだ」' },
    h_knights: { name: '騎士団の事情', kind: 'clue', text: '王「騎士団には騎士団の事情がある」——王は一瞬、言葉に詰まった' },
    h_pigeons: { name: '戻らぬ鳩', kind: 'clue', text: '王「鳩なら二日だが、砦の鳩は戻らぬ。尽きたのだろう」' },
    t_refugees: { name: '最後の鳩', kind: 'clue', text: '砦より「民百二十名が逃げ込んだ。糧は今日からあと八日。これが最後の鳩なり」' },
    k1: { name: '本音：会議', kind: 'honne', text: '王「十日後、諸侯は北を捨てるかどうか決める。余はそれまでに知らねばならん」' },
    k2: { name: '本音：金庫', kind: 'honne', text: '王「金庫は修繕で使い果たした。銀貨二十枚が精一杯だ」' },
    k3: { name: '本音：団長', kind: 'honne', text: '王「命じて断られれば、王の言葉は紙切れになる」' },
    k4: { name: '本音：密書', kind: 'honne', text: '王「守れぬなら民を連れて退けと書いた。責めは余が負う」' },
  };

  // 王の言葉（異を唱える対象）
  const CLAIMS = {
    A: { text: '「三日のうちに発て」' },
    B: { text: '「支度は大臣に任せる」（銀貨二十枚）' },
    C: { text: '「騎士は出せぬ。王都の守りで手一杯だ」' },
    D: { text: '「密書の中身は問うな」' },
    E: { text: '「届けぬと言うなら、他の者を探すまでだ」' },
  };

  // 根拠なしで言う読み
  const HUNCHES = {
    A: [
      { id: 'deadline', text: '急がれるのは、何か期限があるからでは', res: 'pA' },
      { id: 'demon', text: '魔王軍がすぐにも攻めてくるのでは', res: 'W1' },
      { id: 'test', text: '私の覚悟を試しておられるのでは', res: 'W3' },
    ],
    B: [
      { id: 'money', text: 'お金のことで、何かご事情がおありなのでは', res: 'pB' },
      { id: 'trust', text: '私を信用しておられないのでは', res: 'W2' },
    ],
    C: [
      { id: 'knights', text: '騎士団と何かあったのでは', res: 'pC' },
      { id: 'danger', text: '王都がそれほど危ういのですか', res: 'Wc' },
    ],
    D: [
      { id: 'important', text: 'よほど大事なことが書かれているのでは', res: 'pD' },
      { id: 'abandon', text: 'その密書、砦を捨てる指図では', res: 'R4' },
    ],
    E: [
      { id: 'none', text: '他に行く者など、いないのでは', res: 'pE' },
    ],
  };

  // 王の言葉 × 根拠カード → 結果
  const EVIDENCE = {
    A: { c2: 'R1', c2x: 'R1', h_council: 'R1', h_gathering: 'R1', k1: 'R1', h_urgent: 'pA' },
    B: { c4: 'R2', c4x: 'R2', h_glance: 'R2', k2: 'R2' },
    C: { c5: 'R3', c5x: 'R3', h_selen: 'R3', h_knights: 'R3', k3: 'R3' },
    D: { t_refugees: 'R4' },
    E: { c5x: 'BUST' },
  };

  const QUESTIONS = [
    { id: 'q_why', text: 'なぜ三日なのですか' },
    { id: 'q_money', text: '支度金は、どれほどいただけますか' },
    { id: 'q_knights', text: 'なぜ騎士を出せないのですか' },
    { id: 'q_letter', text: '密書には何が書かれているのですか' },
    { id: 'q_fort', text: '砦はいま、どうなっているのですか' },
    { id: 'q_pigeon', text: '砦との連絡に、鳩は使えないのですか' },
    { id: 'q_council', text: '十日後の会議とは何ですか', need: (s) => has(s, 'c2') || has(s, 'h_gathering') },
    { id: 'q_food', text: '砦の民は、あと何日もちますか', need: (s) => s.twist },
  ];

  const DAY = { dawn: 1, d3: 3, d4: 4, d5: 5 };

  // 提案の条件
  const TERMS = {
    depart: [
      { id: 'dawn', label: '明朝に発つ' },
      { id: 'd3', label: '三日以内に発つ' },
      { id: 'd4', label: '四日目に発つ' },
      { id: 'd5', label: '五日の準備をして発つ' },
    ],
    supply: [
      { id: 'silver', label: '銀貨二十枚のまま' },
      { id: 'gold', label: '支度金を金貨で増やしてもらう' },
      { id: 'letter', label: '王家の紹介状（先代の前例あり）', need: (s) => has(s, 'c1') },
      { id: 'store', label: '倉の保存食と古い装備', need: (s) => has(s, 'c4x') || s.flags.storeKnown },
    ],
    companion: [
      { id: 'none', label: '一人で行く' },
      { id: 'selen', label: '志願騎士セレンの同行を、陛下のお許しで', need: (s) => s.flags.selenKnown || has(s, 'c5') || has(s, 'c5x') },
      { id: 'knights', label: '騎士の一隊を付けてもらう' },
    ],
    report: [
      { id: 'rider', label: '砦に着いたら早馬を返す' },
      { id: 'pigeons', label: '鳩を籠で連れて行き、着いたら飛ばす', need: (s) => has(s, 'c3x') || s.flags.pigeonIdea },
    ],
    letter: [
      { id: 'deliver', label: '密書を必ず届ける' },
      { id: 'refuse', label: '密書は預からない' },
    ],
    cart: [
      { id: 'with', label: '糧の荷車を自分が率いて運ぶ', need: (s) => s.twist },
      { id: 'ahead', label: '荷車はセレンに任せて先に出す', need: (s) => s.twist && termAvailable(s, 'companion', 'selen') },
      { id: 'halden', label: '紹介状でハルデンの組合から糧を送らせる', need: (s) => s.twist && has(s, 'c1') },
    ],
  };
  const EXTRAS = [
    { id: 'credit', label: '功績は王家の名で語る' },
    { id: 'village', label: '北の村の民を助ける' },
  ];
  const SLOT_NAMES = { depart: '出発', supply: '物資', companion: '仲間', report: '報告', letter: '密書', cart: '糧の荷車' };
  const DEFAULTS = { depart: 'd3', supply: 'silver', companion: 'none', report: 'rider', letter: 'deliver' };

  function termLabel(slot, id) {
    if (slot === 'extra') {
      if (id === 'map') return '城の地図の写し';
      const e = EXTRAS.find((x) => x.id === id);
      return e ? e.label : id;
    }
    const t = (TERMS[slot] || []).find((x) => x.id === id);
    return t ? t.label : id;
  }

  // ---------------------------------------------------------------- 状態

  function newState() {
    return {
      cards: [],
      patience: 7,
      maxPatience: 7,
      turn: 0,
      twist: false,
      private: false,
      privateUses: 0,
      deal: { extras: [] },
      kingKnows: [],
      flags: {},
      asked: {},
      claimsOpen: ['A', 'B', 'C', 'D'],
      wrongStreak: 0,
      acceptedOnce: false,
      queue: [],
      ended: null,
      motive: null,
      log: [],
    };
  }

  function has(s, id) { return s.cards.indexOf(id) >= 0; }
  function knows(s, k) { return s.kingKnows.indexOf(k) >= 0; }
  function addKnow(s, k) { if (!knows(s, k)) s.kingKnows.push(k); }

  function termAvailable(s, slot, id) {
    const t = (TERMS[slot] || []).find((x) => x.id === id);
    if (!t) return false;
    return !t.need || t.need(s);
  }

  // ---------------------------------------------------------------- イベント

  function Ev(s) {
    const out = [];
    const api = {
      say(who, text) { out.push({ type: 'line', who, text }); return api; },
      narr(text) { out.push({ type: 'line', who: 'narr', text }); return api; },
      sys(text) { out.push({ type: 'line', who: 'sys', text }); return api; },
      card(id) {
        if (!has(s, id)) { s.cards.push(id); out.push({ type: 'card', id }); }
        return api;
      },
      unlock(text) { out.push({ type: 'unlock', text }); return api; },
      pat(d) {
        const before = s.patience;
        s.patience = Math.max(0, Math.min(s.maxPatience, s.patience + d));
        if (s.patience !== before) out.push({ type: 'patience', delta: s.patience - before, value: s.patience });
        return api;
      },
      out,
    };
    return api;
  }

  function addCard(s, id) { if (!has(s, id)) s.cards.push(id); }

  // ---------------------------------------------------------------- 開幕

  const MOTIVES = [
    { id: 'aunt', text: '北のエダ村に叔母がいます。無事を確かめたいのです' },
    { id: 'money', text: '報酬のためです。旅は金になります' },
    { id: 'honor', text: '名を上げたいのです' },
    { id: 'duty', text: '王命ですから' },
    { id: 'evade', text: '……理由は、旅の途中で見つけます' },
  ];

  function setMotive(s, id) {
    const e = Ev(s);
    s.motive = id;
    const m = MOTIVES.find((x) => x.id === id);
    e.say('you', '「' + m.text + '」');
    if (id === 'aunt') { addKnow(s, 'aunt'); e.say('king', '「……そうか。北に縁者がおるのか」').narr('王はわずかに目を細めた。'); }
    if (id === 'money') { addKnow(s, 'money'); e.say('king', '「金で動く者は、金で寝返る。……まあよい。金より名だ。北を見てきた者として、会議で名を呼ばれる方がよほど得だぞ」'); }
    if (id === 'honor') { addKnow(s, 'honor'); e.say('king', '「若いな。嫌いではない」'); }
    if (id === 'duty') { addKnow(s, 'duty'); e.say('king', '「殊勝なことだ。ならば話は早い」'); }
    if (id === 'evade') { addKnow(s, 'evasive'); e.say('king', '「……用心深いな。よかろう」'); }
    e.say('king', '「さて。そなたの望みを聞こう。手短にな」');
    return e.out;
  }

  // ---------------------------------------------------------------- 共通の後処理

  function penalty(s, base) { return s.twist ? Math.min(base, -2) : base; }

  function wrong(s, e) {
    s.wrongStreak += 1;
    let d = -1;
    if (s.wrongStreak >= 2) { d = -2; e.say('king', '「当て推量はやめよ」'); }
    e.pat(penalty(s, d));
  }

  function spendTurn(s) { s.turn += 1; }

  function after(s, e) {
    // 終了・転機・王の一手の判定
    if (s.ended) return e.out;
    if (s.patience <= 0) {
      e.say('king', '「もうよい。下がれ。明朝発て」').narr('王は手を振った。謁見は終わった。');
      s.ended = 'cutoff';
      return e.out;
    }
    if (s.queue.length) return e.out;
    if (s.turn >= 4 && !s.twist) { twist(s, e); return e.out; }
    if (s.patience <= 3 && !s.flags.nudged && !s.deal.depart) {
      s.flags.nudged = true;
      if (s.twist) {
        e.say('king', '「余の我慢にも限りがある。荷車と明朝発て。城の地図の写しも持たせる」');
        s.queue.push({ kind: 'nudge', text: '明朝、荷車と出発する（地図の写し付き）' });
      } else {
        e.say('king', '「余の我慢にも限りがある。明朝発つと言え。そうすれば城の地図の写しを持たせよう」');
        s.queue.push({ kind: 'nudge', text: '明朝に出発する（地図の写し付き）' });
      }
    }
    return e.out;
  }

  // ---------------------------------------------------------------- 転機

  function twist(s, e) {
    s.twist = true;
    const wasPrivate = s.private;
    s.private = false;
    e.narr('扉が勢いよく開いた。' + (wasPrivate ? '下がっていたはずの' : '') + '大臣ヘルマンが、小さな筒を手に駆け込んでくる。');
    e.say('minister', '「陛下！ 北の砦から、鳩が！」');
    e.say('minister', '「……『砦はなお持ちこたえる。されどエダ村ほか二村の民、百二十名が砦に逃げ込みたり。糧は十日ともたず。これが最後の鳩なり』」');
    e.say('minister', '「この鳩が放たれたのは二日前。糧が残るのは、今日からあと八日にございます」');
    e.card('t_refugees');
    e.narr('王は長いあいだ黙っていた。');
    e.say('king', '「……ヘルマン。倉を開けよ」');
    e.say('minister', '「陛下、あれは非常の備えにございます！」');
    e.say('king', '「今が非常でなくて何だ」');
    if (knows(s, 'aunt')) {
      e.say('king', '「砦に逃げ込んだ民の中に、そなたの叔母もおるやもしれぬな。……今夜にも発ちたかろう」');
    }
    e.say('king', '「話が変わった。荷車に糧を積んで、明朝発て」');
    e.unlock('新しい条件：糧の荷車');
    s.queue.push({ kind: 'twist', text: '明朝、糧の荷車を率いて出発する' });
  }

  // ---------------------------------------------------------------- 尋ねる

  function ask(s, qid) {
    const e = Ev(s);
    const q = QUESTIONS.find((x) => x.id === qid);
    spendTurn(s);
    s.wrongStreak = 0;
    e.say('you', '「' + q.text + '」');
    s.asked[qid] = (s.asked[qid] || 0) + 1;
    const n = s.asked[qid];
    switch (qid) {
      case 'q_why':
        if (s.flags.r1) { e.say('king', '「会議だと申したであろう」'); break; }
        e.say('king', '「北の様子が分からぬのは困る。……それだけだ」').narr('王は「それだけだ」と言いながら、目をそらした。');
        e.card('h_urgent');
        break;
      case 'q_money':
        if (s.private) { e.say('king', '「……ここだけの話だ。銀貨二十枚より先は、どこを叩いても出ぬ」'); e.card('k2'); s.flags.storeKnown = true; break; }
        e.say('king', '「支度は大臣に任せたと申した」');
        e.say('minister', '「（ごほん）」').narr('大臣が咳払いをした。王はちらりと大臣を見た。');
        e.card('h_glance');
        break;
      case 'q_knights':
        if (n === 1 && !s.private) {
          e.say('king', '「王都の守りで手一杯だと申した」');
        } else {
          e.say('king', s.private ? '「……志願した若造がおる。セレンとかいったか。だが団長が、余の命なくば出さぬと抜かす」' : '「くどい。……志願した若造がおるとは聞いたが、団長が許さぬそうだ」');
          e.card('h_selen');
          if (!s.flags.selenKnown) { s.flags.selenKnown = true; e.unlock('新しい条件：志願騎士セレン'); }
        }
        break;
      case 'q_letter':
        e.say('king', '「問うなと申した。届ければよい」');
        break;
      case 'q_fort':
        if (s.twist) e.say('king', '「持ちこたえてはおる。だが、民が飢える」');
        else e.say('king', '「分からぬから、そなたを行かせるのだ」');
        break;
      case 'q_pigeon':
        e.say('king', '「鳩なら砦から二日だ。だが砦の鳩は戻らぬ。尽きたのだろう」');
        e.card('h_pigeons');
        if ((has(s, 'c3') || has(s, 'c3x')) && !s.flags.pigeonIdea && !has(s, 'c3x')) {
          s.flags.pigeonIdea = true;
          e.narr('鳩小屋の老人の顔が浮かんだ。——砦の鳩が尽きたのなら、ここから連れて行けばいい。');
          e.unlock('新しい条件：鳩を籠で連れて行く');
        }
        break;
      case 'q_council':
        if (s.flags.r1) { e.say('king', '「もう話した。諸侯が北の行く末を決める」'); break; }
        e.say('king', '「……書記官め、口の軽い」').narr('王は小さく舌打ちした。それ以上は答えない。');
        e.card('h_council');
        break;
      case 'q_food':
        e.say('king', '「今日からあと八日。荷車なら砦まで五日かかる。……分かるな」');
        break;
    }
    e.pat(-1);
    return after(s, e);
  }

  // ---------------------------------------------------------------- 異を唱える

  function resolveChallenge(s, claim, evidence) {
    if (evidence && evidence.indexOf('hunch:') === 0) {
      const h = (HUNCHES[claim] || []).find((x) => x.id === evidence.slice(6));
      return h ? h.res : 'X';
    }
    const t = EVIDENCE[claim] || {};
    return t[evidence] || 'X';
  }

  function needsPhrasing(s, claim, evidence) {
    if (s.private) return false;
    const r = resolveChallenge(s, claim, evidence);
    return r === 'R2' || r === 'R3';
  }

  function challenge(s, claim, evidence, phrasing) {
    const e = Ev(s);
    spendTurn(s);
    const r = resolveChallenge(s, claim, evidence);
    const ctext = CLAIMS[claim].text;
    if (evidence && evidence.indexOf('hunch:') !== 0 && CARDS[evidence]) {
      e.narr('あなたは王の言葉 ' + ctext + ' に異を唱え、【' + CARDS[evidence].name + '】の件を持ち出した。');
    } else {
      e.narr('あなたは王の言葉 ' + ctext + ' に、勘で踏み込んだ。');
    }
    if (r !== 'W1' && r !== 'W2' && r !== 'W3' && r !== 'Wc' && r !== 'X') s.wrongStreak = 0;

    switch (r) {
      case 'R1':
        e.say('you', '「急がれるのは、十日後の会議までに北の様子を知りたいから——ではありませんか」');
        if (s.flags.r1) { e.say('king', '「それはもう聞いた」'); e.pat(-1); break; }
        s.flags.r1 = true;
        e.narr('王は黙った。しばらくして、口の端がわずかに上がった。');
        e.say('king', '「……ほう。そうだ。十日後、諸侯は北を捨てるかどうか決める。余はそれまでに、砦がどうなっているか知らねばならん」');
        e.card('k1');
        e.say('king', '「目の利く者は嫌いではない。続けよ」');
        break;
      case 'R2':
        if (s.private) {
          e.say('you', '「二人きりですから申し上げます。金庫が苦しいのでは」');
          e.say('king', '「……修繕で使い果たした。銀貨二十枚が精一杯だ。だが倉の古い物なら、出せぬこともない」');
          e.card('k2');
          s.flags.r2private = true;
          if (!s.flags.storeKnown) { s.flags.storeKnown = true; e.unlock('新しい条件：倉の保存食と古い装備'); }
        } else if (phrasing === 'blunt') {
          e.say('you', '「失礼ながら……金庫が苦しいのではありませんか」');
          e.narr('広間が凍りついた。大臣があなたをにらみつける。');
          e.say('king', '「余の金庫を案じるとは、大した旅人だ」');
          s.flags.r2public = true;
          e.pat(-2);
        } else {
          e.say('you', '「金貨でなくともかまいません。城に眠っている物でも、私には十分です」');
          e.narr('王の口元がゆるんだ。');
          e.say('king', '「……ヘルマン。何か眠っておるか」');
          e.say('minister', '「……倉に、去年の保存食と古い鎖帷子が」').narr('大臣は渋々答えた。');
          s.flags.r2discreet = true;
          if (!s.flags.storeKnown) { s.flags.storeKnown = true; e.unlock('新しい条件：倉の保存食と古い装備'); }
        }
        break;
      case 'R3':
        if (s.private) {
          e.say('you', '「陛下は、団長に命じて断られるのを避けておられるのでは」');
          e.say('king', '「……命じて断られれば、王の言葉は紙切れになる。だから命じぬ」');
          e.card('k3');
          s.flags.r3private = true;
        } else if (phrasing === 'blunt') {
          e.say('you', '「陛下は、団長に命じて断られるのを恐れておられるのでは」');
          e.say('king', '「口を慎め」').narr('だが王は一瞬、言葉に詰まった。');
          s.flags.r3public = true;
          e.pat(-2);
        } else {
          e.say('you', '「志願者がいるのなら、陛下はお命じになる必要はありません。お許しになるだけで済むのでは」');
          e.say('king', '「許す、か。……それならば団長も文句は言えまい」');
          s.flags.r3discreet = true;
        }
        if (!s.flags.selenKnown) { s.flags.selenKnown = true; e.unlock('新しい条件：志願騎士セレン'); }
        break;
      case 'R4':
        e.say('you', '「その密書……砦を捨てる指図ではありませんか」');
        if (s.private && s.twist) {
          e.narr('王は玉座の肘掛けを強く握った。');
          e.say('king', '「……守将への指図だ。守れぬなら、民を連れて退けと書いた。責めは余が負う。会議の前に漏れれば、余は北を捨てた王になる。だから問うなと申した」');
          e.card('k4');
          s.flags.r4 = true;
        } else {
          e.narr('長い沈黙。');
          e.say('king', '「……それを二度と口にするな。この話は誰にも言わぬと誓え」');
          s.flags.r4public = true;
          s.queue.push({ kind: 'oath', text: '密書のことは誰にも言わないと誓う' });
        }
        break;
      case 'BUST':
        e.say('you', '「北行きに名乗り出たのは、私とセレンだけと聞きました」');
        e.narr('王は長く黙り、それから声を立てて笑った。');
        e.say('king', '「……城の者は口が軽い。よかろう、そなたしかおらん。何が要る。一つだけ聞いてやる」');
        s.flags.bluffBusted = true;
        s.queue.push({ kind: 'concession', text: '王が一つだけ譲る' });
        break;
      case 'pA':
        e.say('you', '「急がれるのは、何か期限があるからでは」');
        e.say('king', '「……十日後に、ある集まりがある。それ以上は言わぬ」');
        e.card('h_gathering');
        e.pat(-1);
        break;
      case 'pB':
        e.say('you', '「お金のことで、何かご事情がおありなのでは」');
        e.narr('王は答えず、黙って大臣を見た。大臣が咳払いをする。');
        e.card('h_glance');
        e.pat(-1);
        break;
      case 'pC':
        e.say('you', '「騎士団と、何かあったのでは」');
        e.say('king', '「騎士団には騎士団の事情がある」').narr('王は一瞬、言葉に詰まった。');
        e.card('h_knights');
        e.pat(-1);
        break;
      case 'pD':
        e.say('you', '「よほど大事なことが書かれているのでは」');
        e.say('king', '「大事でなければ、そなたに託さぬ」');
        e.pat(-1);
        break;
      case 'pE':
        e.say('you', '「他に行く者など、いないのではありませんか」');
        e.say('king', '「そなたの知ったことではない」').narr('王の声が、ほんの少し硬くなった。');
        e.pat(-1);
        break;
      case 'W1':
        e.say('you', '「魔王軍が、すぐにも攻めてくるのですね」');
        e.say('king', '「……そう思うなら、なおさら急げ。明朝発て」').narr('王は否定しなかった。');
        s.flags.w1 = true;
        wrong(s, e);
        if (!s.deal.depart) s.queue.push({ kind: 'demand_dawn', text: '明朝に出発する' });
        break;
      case 'W2':
        e.say('you', '「私を、信用しておられないのでは」');
        e.say('king', '「信用せぬ者に密書は託さぬ」').narr('大臣が鼻で笑った。');
        wrong(s, e);
        break;
      case 'W3':
        e.say('you', '「私の覚悟を試しておられるのですね」');
        e.say('king', '「試されていると思うなら、励め」').narr('王は面白がっているだけだ。');
        wrong(s, e);
        break;
      case 'Wc':
        e.say('you', '「王都が、それほど危ういのですか」');
        e.say('king', '「そう申したはずだ」');
        wrong(s, e);
        break;
      default: {
        const nm = CARDS[evidence] ? CARDS[evidence].name : '';
        e.say('you', '「' + ctext.replace(/[「」]/g, '').split('（')[0] + '……それは、' + nm + 'の件と関わりがあるのでは」');
        e.say('king', '「何の話だ。筋が通らぬ」');
        wrong(s, e);
      }
    }
    return after(s, e);
  }

  // ---------------------------------------------------------------- 提案

  function merged(s, prop) {
    const m = Object.assign({}, DEFAULTS, s.deal, prop);
    delete m.extras;
    return m;
  }

  function reportDay(m) {
    const travel = m.cart === 'with' ? 5 : 3;
    return DAY[m.depart] + travel + (m.report === 'pigeons' ? 2 : 3);
  }
  function foodDay(m) {
    if (m.cart === 'ahead') return 6;
    if (m.cart === 'with') return DAY[m.depart] + 5;
    if (m.cart === 'halden') return 3;
    return Infinity;
  }

  function evaluate(s, prop) {
    const m = merged(s, prop);
    const fails = [];
    let gains = 0;
    let gives = false;
    const extras = prop.extras || [];

    // 問1 報せ
    if (prop.depart || prop.report || prop.cart === 'with') {
      if (reportDay(m) > 10) fails.push('time'); else gains += 1;
    }
    // 問2 懐
    if (prop.supply === 'gold') fails.push('money');
    if (prop.supply === 'letter') gains += 1;
    if (prop.supply === 'store') {
      if (!s.private && !s.twist && !s.flags.r2discreet) fails.push('minister');
      else gives = true;
    }
    // 問3 権威
    if (prop.companion === 'knights') fails.push('knights');
    if (prop.companion === 'selen') { gains += 1; gives = true; }
    // 問4 密書
    if (prop.letter === 'refuse' && !s.flags.bluffBusted) fails.push('letter');
    if (prop.letter === 'deliver' && s.deal.letter !== 'deliver') gains += 1;
    // 問5 糧
    if (s.twist && (prop.cart || (prop.depart && m.cart === 'with'))) {
      if (foodDay(m) > 8) fails.push('food'); else gains += 2;
    }
    if (prop.cart === 'ahead' || prop.cart === 'halden') gives = true;
    if (prop.report === 'pigeons') gives = true;
    if (extras.indexOf('credit') >= 0 && s.deal.extras.indexOf('credit') < 0) gains += 1;
    if (extras.indexOf('village') >= 0 && s.deal.extras.indexOf('village') < 0) gains += 1;
    return { fails, gains, gives, m };
  }

  function propText(prop) {
    const parts = [];
    ['depart', 'supply', 'companion', 'report', 'letter', 'cart'].forEach((k) => { if (prop[k]) parts.push(termLabel(k, prop[k])); });
    (prop.extras || []).forEach((x) => parts.push(termLabel('extra', x)));
    return parts;
  }

  function lockIn(s, prop) {
    ['depart', 'supply', 'companion', 'report', 'letter', 'cart'].forEach((k) => { if (prop[k]) s.deal[k] = prop[k]; });
    (prop.extras || []).forEach((x) => { if (s.deal.extras.indexOf(x) < 0) s.deal.extras.push(x); });
  }

  function acceptLines(s, prop, m, e) {
    const lines = [];
    if (prop.cart === 'ahead') { lines.push('「……荷と人を分けるか。考えたな」'); s.flags.cleverSplit = true; }
    if (prop.report === 'pigeons') {
      s.flags.pigeonPlan = true;
      if (DAY[m.depart] === 5 && m.cart !== 'with') lines.push('「……五日、三日、鳩で二日。会議の朝か。ぎりぎりだな。よかろう」');
      else lines.push('「鳩を連れてゆく、か。……砦の鳩が尽きたなら、持たせればよいだけのことだったな」');
    }
    if (prop.supply === 'letter') lines.push('「先代もそうしたか。……王家の名が役に立つなら、書こう」');
    if (prop.companion === 'selen') lines.push('「許す、か。……それならば団長も文句は言えまい」');
    if (prop.supply === 'store') lines.push('「古い物でよければ、持ってゆけ」');
    if (prop.cart === 'with') lines.push('「頼んだぞ。民が待っておる」');
    if (prop.cart === 'halden') lines.push('「組合に糧を出させるか。……そなたの名で借りるのだぞ」');
    if ((prop.extras || []).indexOf('village') >= 0) lines.push('「……よかろう。北の民を頼む」');
    if (prop.depart === 'dawn') lines.push('「話が早い」');
    if (!lines.length) lines.push('「よかろう」');
    lines.slice(0, 2).forEach((l) => e.say('king', l));
  }

  function propose(s, prop) {
    const e = Ev(s);
    spendTurn(s);
    s.wrongStreak = 0;
    const parts = propText(prop);
    e.say('you', '「' + parts.join('、') + '——これでいかがでしょう」');
    const ev = evaluate(s, prop);

    if (ev.fails.length) {
      const f = ev.fails[0];
      if (f === 'time') {
        // 間に合う出発日で対案
        const opts = ['d4', 'd3', 'dawn'];
        let pick = null;
        for (const o of opts) {
          const mm = Object.assign({}, ev.m, { depart: o });
          if (reportDay(mm) <= 10) { pick = o; break; }
        }
        const counter = Object.assign({}, prop, { depart: pick });
        e.say('king', s.flags.r1 ? '「それでは会議に間に合わぬ」' : '「それでは間に合わぬ」');
        if (!s.flags.r1) e.narr('「間に合わぬ」——何に、とは言わなかった。');
        e.say('king', '「' + termLabel('depart', pick).replace('に発つ', '').replace('発つ', '') + 'だ。それならば考えてもよい」');
        s.queue.push({ kind: 'counter', prop: counter, text: propText(counter).join('、') });
        e.pat(penalty(s, -1));
        return after(s, e);
      }
      if (f === 'money') {
        e.say('king', '「支度は大臣に任せたと申した」');
        e.say('minister', '「（ごほん）」').narr('大臣が咳払いをした。王はちらりと大臣を見た。');
        e.card('h_glance');
      } else if (f === 'minister') {
        e.say('minister', '「陛下、倉の物は非常の備えにございます」');
        e.say('king', '「……ヘルマンが渋る。他に案はないのか」').narr('王は、大臣の前では押し切れないようだ。');
      } else if (f === 'knights') {
        e.say('king', '「騎士団は手一杯だと申した」').narr('王の顎がこわばった。');
        e.card('h_knights');
      } else if (f === 'letter') {
        e.say('king', '「届けぬと言うなら、他の者を探すまでだ」');
        if (s.claimsOpen.indexOf('E') < 0) { s.claimsOpen.push('E'); e.unlock('異を唱えられる王の言葉が増えた'); }
      } else if (f === 'food') {
        e.say('king', '「それでは糧が間に合わぬ。民を飢えさせる気か！」');
      }
      e.pat(penalty(s, -1));
      return after(s, e);
    }

    if (ev.gives && ev.gains === 0) {
      // 見返りを求める
      const counter = Object.assign({}, prop);
      let ask = null;
      if (s.deal.extras.indexOf('credit') < 0) { counter.extras = (prop.extras || []).concat(['credit']); ask = '功績は王家の名で語れ'; }
      else if (s.deal.letter !== 'deliver' && !prop.letter) { counter.letter = 'deliver'; ask = '密書は必ず届けよ'; }
      else if (!s.deal.depart && !prop.depart) { counter.depart = 'd3'; ask = '三日のうちに発て'; }
      if (ask) {
        e.say('king', '「よかろう。代わりに——' + ask + '」');
        s.queue.push({ kind: 'counter', prop: counter, text: propText(counter).join('、') });
        return after(s, e);
      }
    }

    if (ev.gains > 0 || ev.gives) {
      acceptLines(s, prop, ev.m, e);
      let bonus = 0;
      if ((prop.extras || []).indexOf('credit') >= 0 && s.deal.extras.indexOf('credit') < 0) bonus = 1;
      if (prop.letter === 'deliver' && s.deal.letter !== 'deliver') bonus = 1;
      lockIn(s, prop);
      e.sys('合意：' + parts.join('、'));
      if (bonus) e.pat(bonus);
      if (!s.acceptedOnce) {
        s.acceptedOnce = true;
        if (s.deal.extras.indexOf('credit') < 0) {
          e.say('king', '「代わりに、そなたの功績は王家の名で語れ。吟遊詩人にもそう歌わせる」');
          s.queue.push({ kind: 'credit', text: '功績を王家の名で語る' });
        }
      }
      return after(s, e);
    }

    e.say('king', '「それで、余に何の得がある」');
    e.pat(penalty(s, -1));
    return after(s, e);
  }

  // ---------------------------------------------------------------- 王の求めへの応答

  function respond(s, accept, choice) {
    const e = Ev(s);
    const p = s.queue.shift();
    if (!p) return e.out;
    switch (p.kind) {
      case 'counter':
        if (accept) {
          e.say('you', '「お受けします」');
          lockIn(s, p.prop);
          e.say('king', '「決まりだ」');
          e.sys('合意：' + p.text);
          e.pat(1);
          if (!s.acceptedOnce) s.acceptedOnce = true;
        } else { e.say('you', '「それでは、お受けできません」'); e.say('king', '「……ならば別の案を出せ」'); e.pat(-1); }
        break;
      case 'credit':
        if (accept) { e.say('you', '「かまいません」'); s.deal.extras.push('credit'); e.say('king', '「それでよい」'); e.sys('合意：功績は王家の名で語る'); e.pat(1); }
        else { e.say('you', '「功績は、私の名でいただきます」'); e.say('king', '「……欲の深いことだ」'); e.pat(-1); }
        break;
      case 'nudge':
        if (accept) {
          e.say('you', '「分かりました。明朝発ちます」');
          s.deal.depart = 'dawn';
          if (s.twist && !s.deal.cart) s.deal.cart = 'with';
          s.deal.extras.push('map');
          e.say('king', '「よし」'); e.sys('合意：' + (s.twist ? '明朝、荷車と出発、' : '明朝に出発、') + '城の地図の写し');
          e.pat(1);
        } else { e.say('you', '「まだ申し上げたいことがあります」'); e.say('king', '「……手短にせよ」'); e.pat(-1); }
        break;
      case 'twist':
        if (accept) {
          e.say('you', '「分かりました。荷車を率いて、明朝発ちます」');
          s.deal.depart = 'dawn'; s.deal.cart = 'with';
          e.say('king', '「頼んだぞ」'); e.sys('合意：明朝、糧の荷車を率いて出発');
          e.pat(1);
        } else { e.say('you', '「お待ちください。別の手を考えさせてください」'); e.say('king', '「ならば急げ。民は待たぬ」'); }
        break;
      case 'demand_dawn':
        if (accept) { e.say('you', '「……明朝、発ちます」'); s.deal.depart = 'dawn'; e.sys('合意：明朝に出発'); e.pat(1); }
        else { e.say('you', '「それでは準備が間に合いません」'); e.say('king', '「急げと申したはずだ」'); e.pat(-1); }
        break;
      case 'oath':
        if (accept) { e.say('you', '「誓います」'); s.flags.oath = true; e.say('king', '「……よい」'); e.pat(1); }
        else { e.say('you', '「誓いは、中身を知ってからです」'); s.flags.oathRefused = true; e.say('king', '「……覚えておく」').narr('王の目が冷たくなった。'); e.pat(-1); }
        break;
      case 'concession': {
        const c = choice || 'map';
        if (c === 'store') { s.deal.supply = 'store'; s.flags.storeKnown = true; e.say('you', '「倉の保存食と装備を」'); e.say('king', '「ヘルマン、出してやれ」'); e.say('minister', '「……は」'); }
        if (c === 'selen') { s.deal.companion = 'selen'; s.flags.selenKnown = true; e.say('you', '「騎士を一人、付けてください」'); e.say('king', '「志願した若造がおる。セレンだ。余が許す」'); }
        if (c === 'map') { s.deal.extras.push('map'); e.say('you', '「北への地図を」'); e.say('king', '「城の地図の写しを持たせよう」'); }
        e.sys('合意：' + (c === 'store' ? '倉の保存食と古い装備' : c === 'selen' ? '志願騎士セレン' : '城の地図の写し'));
        break;
      }
    }
    return after(s, e);
  }

  // ---------------------------------------------------------------- 人払い・辞退・締める

  function canPrivate(s) {
    if (s.private) return false;
    if (s.privateUses === 0) return true;
    return s.twist && s.privateUses === 1 && !s.flags.r4;
  }

  function requestPrivate(s) {
    const e = Ev(s);
    spendTurn(s);
    s.wrongStreak = 0;
    e.say('you', s.privateUses === 0 ? '「陛下。大臣殿の前では申し上げにくいことがございます」' : '「陛下。密書のことで、どうしても二人きりでお話を」');
    if (s.patience < 3) {
      e.say('king', '「そんな暇はない」');
      return after(s, e);
    }
    s.privateUses += 1;
    s.private = true;
    e.say('king', '「……ヘルマン、下がれ」');
    e.narr('大臣は不満そうに一礼し、広間を出ていった。王の肩から、少し力が抜けたように見えた。');
    if (!s.flags.ministerGrudge) s.flags.ministerGrudge = true;
    e.say('king', '「さて。二人きりだ。何が言いたい」');
    return after(s, e);
  }

  function threaten(s) {
    const e = Ev(s);
    spendTurn(s);
    s.wrongStreak = 0;
    e.say('you', '「その条件では、お受けできません」');
    if (s.flags.threatened) {
      e.say('king', '「二度目はない。ならば去れ」').narr('王は背を向けた。');
      s.ended = 'dismissed';
      return e.out;
    }
    s.flags.threatened = true;
    addKnow(s, 'threat');
    e.narr('王の眉が動いた。');
    e.say('king', '「……余を脅すか。よかろう、何が要る。一つだけ聞いてやる」');
    e.pat(-1);
    if (s.patience > 0) s.queue.push({ kind: 'concession', text: '王が一つだけ譲る' });
    return after(s, e);
  }

  function close(s) {
    const e = Ev(s);
    e.say('you', '「これで決まりです」');
    e.say('king', '「よかろう。下がって支度をせよ」');
    s.ended = 'closed';
    return e.out;
  }

  // ---------------------------------------------------------------- 結末

  function outcome(s) {
    const d = s.deal;
    const r = {};
    let depart = d.depart || (s.ended === 'cutoff' || s.ended === 'dismissed' ? 'dawn' : 'd3');
    let cart = d.cart || null;
    r.forcedCart = false;
    if (!s.twist) {
      // 謁見の後に鳩が届く
      r.forcedCart = true;
      r.lostPrep = DAY[depart] > 1;
      depart = 'dawn';
      cart = 'with';
    }
    const m = { depart, cart, report: d.report || 'rider' };
    r.depart = depart;
    r.cart = cart;
    r.report = m.report;
    r.supply = d.supply || 'silver';
    r.companion = d.companion || 'none';
    r.letter = d.letter || 'deliver';
    r.extras = d.extras.slice();
    r.prep = DAY[depart] >= 4 ? 'good' : DAY[depart] === 3 ? 'fair' : 'poor';
    // 旅の過酷さ：準備・物資・仲間が足りないと、道中で遅れる
    r.alone = r.companion !== 'selen' || cart === 'ahead';
    let risk = 0;
    if (r.prep === 'poor') risk += 1;
    if (r.prep === 'good') risk -= 1;
    if (r.supply === 'silver') risk += 1;
    if (r.alone) risk += 1;
    if (r.extras.indexOf('map') >= 0) risk -= 1;
    r.risk = risk;
    r.delay = risk >= 3 ? 2 : risk >= 2 ? 1 : 0;
    r.reportDay = reportDay(m) + r.delay;
    r.councilOk = r.reportDay <= 10;
    r.foodDay = foodDay(m) + (cart === 'with' ? r.delay : 0);
    r.foodOk = r.foodDay <= 8;
    return r;
  }

  function epilogue(s) {
    const r = outcome(s);
    const P = [];
    if (s.ended === 'dismissed') P.push('謁見の間を追い出されたあなたに、翌朝、大臣の使いが銀貨と密書を届けに来た。「陛下のご温情です」と、使いは冷たく言った。');
    if (r.forcedCart) {
      P.push('城を出たその夜、宿の戸を叩く者がいた。王の使いだった。「砦から鳩が来た。民が逃げ込み、糧が足りぬ。糧を積んだ荷車を連れて、明朝発て。王命である」');
      if (r.lostPrep) P.push('もらったはずの準備の日々は、一晩で消えた。');
    }
    if (r.depart === 'dawn') P.push('夜明け前、半分眠ったまま城門を出た。地図は途中の宿で買い直した。');
    else if (r.depart === 'd3') P.push('三日で靴と外套は整った。地図の写しは間に合わなかった。');
    else P.push((r.depart === 'd5' ? '五日' : '四日') + 'のあいだに、地図を写し、靴を慣らし、北の言葉をいくつか覚えた。');

    if (r.supply === 'silver') P.push('銀貨二十枚は、二つ目の町で尽きた。そこから先は、狩りと物乞いでしのいだ。');
    if (r.supply === 'store') P.push('倉の保存食は固かったが、腹は満ちた。古い鎖帷子は二日目に留め金が壊れ、革紐で縛り直した。');
    if (r.supply === 'letter') P.push('町ごとに品は手に入った。組合の帳面には、王家の名と、あなたの名が並んで書かれた。');
    if (r.extras.indexOf('map') >= 0) P.push('城の地図の写しは古かったが、北の街道の分かれ道は正しく描かれていた。');

    if (r.companion === 'selen' && r.cart !== 'ahead') P.push('セレンは剣の腕が立ち、夜ごと王への手紙を書いていた。あなたのことも書いているらしい。');
    if (r.alone) P.push('北の街道は静かすぎた。夜の焚き火の番は、ずっと一人だった。');
    if (r.delay === 1) P.push('三日目の夜、吹雪に巻かれて道を失った。一日を棒に振った。');
    if (r.delay === 2) P.push('準備も物資も足りなかった。熱を出して二日寝込み、峠で道を失った。砦は、思っていたよりずっと遠かった。');

    if (r.cart === 'ahead') P.push('糧の荷車は、セレンに率いられて一足先に砦へ着いた。あなたが砦の門をくぐったとき、民はもう温かい粥をすすっていた。');
    else if (r.cart === 'with') P.push(r.foodOk ? '荷車は遅く、ぬかるみで二度はまった。それでも糧は、民がもつうちに届いた。' : '荷車は遅く、ぬかるみで何度もはまった。砦に着いたとき、糧はすでに尽きていた。');
    else if (r.cart === 'halden') P.push('ハルデンの組合が送った糧は、三日目には砦に届いていた。組合からの請求書には、あなたの名前が大きく書かれていた。');
    else P.push('砦に着いたとき、糧はすでに尽きていた。何人かは、春を待たずに死んだ。');

    if (r.report === 'pigeons') {
      P.push(r.councilOk ? (r.reportDay === 10 ? '砦に着くと、鳩が南へ飛んだ。会議の朝、最後の鳩が会議の間に舞い込んだ。' : '砦に着くと、鳩が南へ飛んだ。報せは会議の前に王の手に届いた。') : '鳩は飛んだが、報せが着いたのは会議の後だった。');
    } else {
      P.push(r.councilOk ? '砦から早馬を返した。報せは会議に間に合った。' : '早馬の報せが王都に着いたのは、会議の翌日だった。諸侯は北の砦を捨てると決めていた。');
    }
    if (r.letter === 'deliver') P.push('守将ボルクは密書を読み、長く目を閉じた。');
    else P.push('密書は別の使いに託された。その使いが砦に着いたかどうかは、誰も知らない。');
    if (r.extras.indexOf('credit') >= 0) P.push('後に吟遊詩人は「王の英断」を歌った。あなたの名は、三番の歌詞の端に一度だけ出てくる。');
    if (s.flags.ministerGrudge) P.push('帰還後、大臣ヘルマンは、あなたの報酬の書類を三か月ほど机の奥にしまい込んだ。');

    // 叔母
    if (r.foodOk) P.push('砦の粥の列に、叔母がいた。痩せていたが、あなたを見て笑った。');
    else P.push('叔母は生きていた。だが、隣の家の子どもは助からなかったと、小さな声で言った。');

    // 王との関係
    const f = s.flags;
    let rel = 0;
    ['r1', 'r2discreet', 'r3discreet', 'cleverSplit', 'pigeonPlan', 'oath', 'bluffBusted'].forEach((k) => { if (f[k]) rel += 1; });
    ['r2public', 'r3public', 'threatened', 'oathRefused', 'w1'].forEach((k) => { if (f[k]) rel -= 1; });
    if (s.ended === 'dismissed' || s.ended === 'cutoff') rel -= 1;
    r.relation = rel >= 2 ? 'trust' : rel <= -1 ? 'wary' : 'neutral';
    if (r.relation === 'trust') P.push('帰還したあなたを、王は再び玉座の間に呼んだ。「次の仕事がある。……そなたなら、話が早い」');
    else if (r.relation === 'wary') P.push('帰還後、王があなたを呼ぶことはなかった。城の者たちは、あなたの名を聞くと少し声を落とした。');
    else P.push('帰還後、王からは短い礼状が一通届いた。それきりだった。');

    let title;
    if (r.foodOk && r.councilOk) title = '北は、まだ見捨てられていない';
    else if (r.foodOk) title = '民は救われ、北は捨てられた';
    else if (r.councilOk) title = '報せは届き、糧は届かなかった';
    else title = '冬の砦';

    return { title, paragraphs: P, result: r, diary: diary(s, r) };
  }

  function diary(s, r) {
    const L = [];
    const add = (cond, t) => { if (cond && L.length < 4) L.push(t); };
    add(s.flags.r1, '会議のことを見抜かれた。書記官の口が軽いのか、あの者の目が良いのか。');
    add(s.flags.pigeonPlan, '鳩を連れてゆくとは。砦の鳩が尽きたなら、持たせればよいだけのことだった。余は疲れているらしい。');
    add(s.flags.cleverSplit, '荷と人を分けるとは考えなかった。余は、あの者に糧を運ばせることしか頭になかった。');
    add(s.flags.r2public, '大臣の前で金庫の話をされた。あの無作法は忘れぬ。');
    add(s.flags.r2discreet, '「眠っている物でもよい」と言った。あれは分かって言っている。礼を言いそびれた。');
    add(r.companion === 'selen' || r.cart === 'ahead', '団長に命じずに済んだ。許すだけでよいとは。');
    add(knows(s, 'aunt') && s.twist, 'あの者には北に縁者がいる。だから急がせた。……卑怯だったかもしれぬ。');
    add(s.flags.threatened, '余を脅した。肝の太い者は嫌いではないが、二度目はない。');
    add(s.flags.bluffBusted, '他の者などおらぬと見抜かれた。城の者の口に戸は立てられぬ。');
    add(s.flags.w1, '魔王軍が迫っていると信じていたようだ。否定はしなかった。');
    add(s.flags.r4, '密書のことまで話してしまった。あの者にだけは、北を捨てた王と思われたくなかったのだ。');
    add(knows(s, 'money') && L.length < 2, '金で動くと言った。正直な者は扱いやすい。');
    let end;
    if (s.ended === 'dismissed') end = '追い返したが、行かせるしかなかった。あの者が無事に戻ることを祈る。';
    else if (r.foodOk && r.councilOk) end = '民はもつ。会議で、北を捨てるなとまだ言える。';
    else if (r.foodOk) end = '民は救われた。だが会議には間に合わなかった。北を守れと言う言葉が、余には残っていなかった。';
    else if (s.ended === 'cutoff') end = '急かしすぎたか。あの者が無事に戻ることを祈る。';
    else end = '民がもつうちに糧を届けると、余は言えなかった。';
    return { lines: L, end };
  }

  // ---------------------------------------------------------------- 公開

  const API = {
    CARDS, CLAIMS, HUNCHES, QUESTIONS, TERMS, EXTRAS, SLOT_NAMES, DEFAULTS, MOTIVES, DAY,
    newState, addCard, has, termAvailable, termLabel,
    setMotive, ask, challenge, needsPhrasing, resolveChallenge, propose, respond,
    canPrivate, requestPrivate, threaten, close, epilogue, outcome, evaluate,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.NQ = API;
})(typeof window !== 'undefined' ? window : this);
