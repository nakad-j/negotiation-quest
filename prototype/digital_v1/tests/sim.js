// 交渉ロジックの通しテスト: node tests/sim.js
const NQ = require('../engine.js');
const assert = require('assert');

function run(name, cards, steps) {
  const s = NQ.newState();
  cards.forEach((c) => NQ.addCard(s, c));
  const log = [];
  const push = (evs) => evs.forEach((e) => log.push(e));
  push(NQ.setMotive(s, steps.motive || 'honor'));
  for (const st of steps.actions) {
    if (s.ended) break;
    // 保留中の王の求めがあれば、指定どおり応答（指定がなければ断る）
    while (s.queue.length && !s.ended) {
      const p = s.queue[0];
      const ans = (steps.respond && steps.respond[p.kind]) || [false];
      push(NQ.respond(s, ans[0], ans[1]));
    }
    if (s.ended) break;
    const [kind, ...args] = st;
    if (kind === 'ask') push(NQ.ask(s, args[0]));
    if (kind === 'ch') push(NQ.challenge(s, args[0], args[1], args[2]));
    if (kind === 'prop') push(NQ.propose(s, args[0]));
    if (kind === 'private') push(NQ.requestPrivate(s));
    if (kind === 'threat') push(NQ.threaten(s));
    if (kind === 'close') push(NQ.close(s));
  }
  while (s.queue.length && !s.ended) {
    const p = s.queue[0];
    const ans = (steps.respond && steps.respond[p.kind]) || [false];
    push(NQ.respond(s, ans[0], ans[1]));
  }
  if (!s.ended) push(NQ.close(s));
  const ep = NQ.epilogue(s);
  console.log('\n=== ' + name + ' ===');
  if (process.argv.includes('-v')) log.filter((e) => e.type === 'line').forEach((e) => console.log('  [' + e.who + '] ' + e.text));
  console.log('ended:', s.ended, '| patience:', s.patience, '| turn:', s.turn, '| twist:', s.twist);
  console.log('deal:', JSON.stringify(s.deal));
  console.log('result:', ep.title, '| report day', ep.result.reportDay, '| food day', ep.result.foodDay);
  console.log('diary:', ep.diary.lines.join(' / '), '||', ep.diary.end);
  return { s, ep, log };
}

// 1. 鳩と猶予（会議を見抜き、鳩を持って行く）。転機の後は荷車を先に出す
let r = run('鳩と猶予 → 荷と人を分ける', ['aunt', 'c1', 'c2', 'c3', 'c3x', 'c5'], {
  motive: 'honor',
  actions: [
    ['ch', 'A', 'c2'],
    ['prop', { depart: 'd5', report: 'pigeons' }],
    ['prop', { companion: 'selen' }],
    ['ask', 'q_fort'],
    ['prop', { cart: 'ahead' }],
    ['close'],
  ],
  respond: { credit: [true], twist: [false] },
});
assert.strictEqual(r.s.deal.depart, 'd5');
assert.strictEqual(r.s.deal.cart, 'ahead');
assert.ok(r.ep.result.councilOk && r.ep.result.foodOk);

// 2. 情報なしで正面突破
r = run('正面突破（情報なし）', ['aunt', 'c1'], {
  motive: 'money',
  actions: [
    ['prop', { supply: 'gold' }],
    ['prop', { depart: 'd5' }],
    ['prop', { companion: 'knights' }],
    ['ask', 'q_why'],
    ['prop', { depart: 'd3' }],
    ['close'],
  ],
  respond: { counter: [false], twist: [true], credit: [true] },
});

// 3. 金庫を人前で突く → 我慢切れ
r = run('無作法で打ち切り', ['aunt', 'c1', 'c4', 'c5'], {
  actions: [
    ['ch', 'B', 'c4', 'blunt'],
    ['ch', 'C', 'c5', 'blunt'],
    ['ch', 'A', 'hunch:demon'],
    ['ch', 'A', 'hunch:test'],
    ['ask', 'q_letter'],
    ['ask', 'q_fort'],
  ],
  respond: { demand_dawn: [false] },
});
assert.strictEqual(r.s.ended, 'cutoff');

// 4. 人払いで本音を聞き、倉の物資と段取り
r = run('人払い → 倉の物資', ['aunt', 'c1', 'c4', 'c4x'], {
  motive: 'aunt',
  actions: [
    ['private'],
    ['ch', 'B', 'c4'],
    ['prop', { supply: 'store' }],
    ['ask', 'q_knights'],
    ['prop', { cart: 'with', depart: 'd3' }],
    ['close'],
  ],
  respond: { credit: [true], counter: [true], twist: [false] },
});

// 5. 転機の前に締める
r = run('早く締める', ['aunt', 'c1'], {
  actions: [['prop', { supply: 'letter' }], ['close']],
  respond: { credit: [true] },
});
assert.ok(r.ep.result.forcedCart);

// 6. はったりを見破る
r = run('はったりを見破る', ['aunt', 'c1', 'c5', 'c5x'], {
  actions: [
    ['prop', { letter: 'refuse' }],
    ['ch', 'E', 'c5x'],
    ['prop', { depart: 'd3' }],
    ['close'],
  ],
  respond: { concession: [true, 'selen'], credit: [false], twist: [true] },
});
assert.ok(r.s.flags.bluffBusted);

// 7. 脅し二回で追い出される
r = run('脅し二回', ['aunt', 'c1'], {
  actions: [['threat'], ['threat']],
  respond: { concession: [true, 'map'] },
});
assert.strictEqual(r.s.ended, 'dismissed');

console.log('\nall scenarios ran');
