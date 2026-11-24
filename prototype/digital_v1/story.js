/* 物語パートの文章（探索・導入） */
(function (root) {
  'use strict';

  const SPEAKERS = {
    narr: '',
    you: 'あなた',
    king: 'アルダン王',
    minister: '大臣ヘルマン',
    mother: '母',
    rio: 'リオ',
    mira: '書記官ミラ',
    gram: '鳩番グラム',
    togo: '倉番トーゴ',
    kai: '衛兵カイ',
    sys: '',
  };

  const INTRO = [
    { who: 'narr', text: '王都のはずれ。朝霧の残る石畳を、城からの使いが駆けてきた。' },
    { who: 'narr', text: '「アルダン王が、北の砦へ行く者を探している」' },
    { who: 'narr', text: '北の砦は、この二週間、何の便りもない。魔物の群れが出たという噂もある。' },
    { who: 'narr', text: 'あなたは役目を受けるつもりだ。だが手ぶらで北へ行けば死ぬ。準備の時間、物資、仲間——王と話をつけて、旅の条件を整えなければならない。' },
  ];

  const HOME = [
    { who: 'mother', text: '「城へ行くの？ ……北へ？」' },
    { who: 'mother', text: '「エダ村の叔母さんから、もうひと月も便りがないのよ。もし北へ行くなら……」' },
    { who: 'narr', text: '母はそれ以上言わなかった。', card: 'aunt' },
    { who: 'rio', text: '「よっ。城に行くんだって？ 商人見習いからひとつ忠告だ」' },
    { who: 'rio', text: '「王家の紹介状があれば、商人組合はツケで品物を出す。先代の王様のときも、そうやって遠征の支度をしたんだってさ」' },
    { who: 'rio', text: '「金がなくても、名前があれば何とかなる。覚えときな」', card: 'c1' },
    { who: 'narr', text: 'あなたは城へ向かった。' },
  ];

  const ACT1 = [
    { who: 'narr', text: '玉座の間。王は書類から目を上げないまま言った。脇には痩せた大臣が控えている。' },
    { who: 'king', text: '「そなたが北へ行くという者か。……よい。用件は三つだ」' },
    { who: 'king', text: '「一つ。三日のうちに発て。それ以上は待てぬ」' },
    { who: 'king', text: '「二つ。支度は大臣に任せる。ヘルマン」' },
    { who: 'minister', text: '「は。銀貨二十枚をご用意いたします」' },
    { who: 'king', text: '「三つ。騎士は出せぬ。騎士団は王都の守りで手一杯だ」' },
    { who: 'narr', text: '王は封蝋の付いた書状を掲げた。' },
    { who: 'king', text: '「それと、これを砦の守将ボルクに届けよ。中身は問うな」' },
    { who: 'king', text: '「正午にもう一度来い。それまでに腹を決めておけ」' },
    { who: 'narr', text: '正午まで、城の中を回れるのは三か所ほどだ。' },
  ];

  // 城の探索。each: intro, first (基本カード), follow (2択: 一方が追記、もう一方は手がかりの一言)
  const LOCATIONS = [
    {
      id: 'mira', place: '書記の間', npc: 'mira', rumor: '朝から何十通も手紙を書かされているらしい',
      intro: [{ who: 'narr', text: '書記の間では、若い書記官がインクまみれの手で羽ペンを走らせていた。' }, { who: 'mira', text: '「ごめんなさい、手が離せないの。招集状をあと三通……」' }],
      first: { text: '何の手紙を書いているの？', lines: [{ who: 'mira', text: '「諸侯会議の招集状よ。十通。十日後に、国中の諸侯が集まるの」' }], card: 'c2' },
      follow: [
        { text: '会議では何を話すの？', lines: [{ who: 'mira', text: '「議題？ ……『北の守り』とだけ書けって。砦は落ちてないわよ、便りが途絶えただけ。でも諸侯は、もう北は駄目だって噂してる」' }], card: 'c2x' },
        { text: '大変そうだね', lines: [{ who: 'mira', text: '「ありがと。……陛下もね、もう何日も眠ってないみたい。会議のことばかり気にしてる」' }] },
      ],
    },
    {
      id: 'gram', place: '鳩小屋', npc: 'gram', rumor: '城と各地の砦をつなぐ伝書鳩がいる',
      intro: [{ who: 'narr', text: '塔の上の鳩小屋。羽の舞う中、腰の曲がった老人が餌をまいている。' }, { who: 'gram', text: '「鳩に用か。若いの」' }],
      first: { text: '鳩のことを教えてください', lines: [{ who: 'gram', text: '「ここの鳩は、北の砦まで二日で飛ぶ。だがな、砦から鳩が戻らんのは、砦の鳩が尽きたからじゃろう。あそこには十羽もおらんかった」' }], card: 'c3' },
      follow: [
        { text: '鳩を借りることはできますか', lines: [{ who: 'gram', text: '「持っていくなら、籠で六羽貸せる。陛下のお許しがあればな。北で放せば、二日でここへ帰ってくる」' }], card: 'c3x' },
        { text: '砦の鳩は、なぜ尽きたんですか', lines: [{ who: 'gram', text: '「便りを出すたびに一羽ずつ減るからの。返す鳩を誰も届けておらん。……誰も北へ行きたがらんのじゃ」' }] },
      ],
    },
    {
      id: 'togo', place: '倉', npc: 'togo', rumor: '最近、倉番の仲間が何人も辞めさせられたとか',
      intro: [{ who: 'narr', text: '薄暗い倉の前で、大柄な男が帳面とにらめっこしている。' }, { who: 'togo', text: '「何だ、旅人か。倉番は俺一人になっちまったよ」' }],
      first: { text: '倉番が減ったんですか？', lines: [{ who: 'togo', text: '「倉番だけじゃない。金庫番も三人から一人に減らされた。城壁の修繕で、えらい金が出ていったらしいからな」' }], card: 'c4' },
      follow: [
        { text: '倉には何が残っているんですか', lines: [{ who: 'togo', text: '「去年の保存食と、古い鎖帷子が手つかずだ。大臣様は『非常の備え』だと言って、誰にも出さん」' }], card: 'c4x' },
        { text: 'なぜ金庫番まで減らしたんでしょう', lines: [{ who: 'togo', text: '「知らん。俺は倉番だ。……ただ、守るものがなけりゃ、番も要らんわな」' }] },
      ],
    },
    {
      id: 'kai', place: '練兵場', npc: 'kai', rumor: '騎士団で何か揉めごとがあったらしい',
      intro: [{ who: 'narr', text: '練兵場では、若い衛兵が槍の手入れをしていた。' }, { who: 'kai', text: '「北へ行くって？ 物好きだな」' }],
      first: { text: '騎士団で何かあったの？', lines: [{ who: 'kai', text: '「若い騎士のセレンが北行きを志願したんだ。でも団長が『王命がなければ出さん』って突っぱねた」' }], card: 'c5' },
      follow: [
        { text: '他に北へ行くと名乗り出た人は？', lines: [{ who: 'kai', text: '「陛下と団長はこの件で大喧嘩したらしいぜ。……で、北行きに名乗り出たのは、あんたとセレンだけだよ」' }], card: 'c5x' },
        { text: '団長はどんな人？', lines: [{ who: 'kai', text: '「頑固だよ。北に兵を出すのは無駄死にだって言ってる。陛下に命じられても、たぶん首を縦に振らない」' }] },
      ],
    },
  ];

  const NOON = [
    { who: 'narr', text: '正午の鐘が鳴った。' },
    { who: 'narr', text: 'あなたは再び玉座の間に立った。王の脇には、大臣ヘルマンが控えている。' },
    { who: 'king', text: '「腹は決まったか。……その前に一つ聞く」' },
    { who: 'king', text: '「そなた、なぜこの役目を受ける？」' },
  ];

  const S = { SPEAKERS, INTRO, HOME, ACT1, LOCATIONS, NOON };
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
  else root.STORY = S;
})(typeof window !== 'undefined' ? window : this);
