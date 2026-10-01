/** Real browser pointer regression: deselection must survive movement within a tap.
 * Research tooling imports this helper; nothing here is imported by the game.
 */
import assert from 'node:assert/strict';

export async function tapWithMotion(page, client, index, dx = 0, input = 'touch') {
  const p = await page.locator(`#board .tile[data-i="${index}"]`).evaluate(e => {
    const r = e.getBoundingClientRect();
    return {x: r.x + r.width / 2, y: r.y + r.height / 2};
  });
  if (input === 'mouse') {
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    if (dx) await page.mouse.move(p.x + dx, p.y + dx);
    await page.mouse.up();
  } else {
    const point = {x: p.x, y: p.y, id: 1};
    await client.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [point]});
    if (dx) await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{...point, x: p.x + dx, y: p.y + dx}],
    });
    await client.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
  }
}

export async function selectionState(page) {
  return page.evaluate(() => ({
    indices: [...document.querySelectorAll('#board .tile.sel')].map(e => Number(e.dataset.i)),
    terms: [...document.querySelectorAll('#sum-terms .sum-term')].map(e => Number(e.textContent)),
    total: document.querySelector('#sum-total').textContent,
    incorrect: document.querySelector('#selection-sum').classList.contains('incorrect'),
    penalty: document.querySelector('#time-penalty').classList.contains('is-visible'),
    ...(window.toggleProbe ? {commits: window.toggleProbe.commits, rejects: window.toggleProbe.rejects,
      moves: window.toggleProbe.moves} : {}),
  }));
}

export async function checkSelectionToggle(context, base, {expectFixed = true} = {}) {
  // Keep real markup, CSS, BoardView, rules and Hud, but not the running App.
  // The boards below are controlled interaction fixtures, not earned stages.
  const p = await context.newPage();
  await p.route(base, async route => {
    const response = await route.fetch();
    const html = (await response.text()).replace(
      '<script type="module" src="/src/main.ts"></script>',
      '<script type="module">import "/src/ui/styles/index.css";</script>',
    );
    await route.fulfill({response, body: html});
  });
  await p.goto(base, {waitUntil: 'networkidle'});
  await p.evaluate(async () => {
    const {BoardView} = await import('/src/ui/boardView.ts');
    const {Hud} = await import('/src/ui/screens/hud.ts');
    const {isSelectionValid} = await import('/src/core/rules.ts');
    for (const e of document.querySelectorAll('.screen')) e.classList.add('hidden');
    document.querySelector('#screen-game').classList.remove('hidden');
    const hud = new Hud();
    const probe = window.toggleProbe = {commits: [], rejects: [], moves: 0, board: null,
      targets: [10], required: undefined, view: null, hud};
    document.querySelector('#board').addEventListener('pointermove', () => probe.moves++);
    probe.view = new BoardView({wrap: document.querySelector('#board-wrap'), grid: document.querySelector('#board'),
      targets: () => probe.targets, requiredCount: () => probe.required,
      isValid: indices => (!probe.required || indices.length === probe.required) &&
        isSelectionValid(probe.board, indices, probe.targets),
      onSelectionChange: (values, colors) => hud.setSelection(values, colors),
      onCommit: indices => {
        probe.commits.push([...indices]);
        hud.showEquation(indices.map(i => probe.board.cells[i].value), true);
        for (const i of indices) probe.board.cells[i].cleared = true;
        probe.view.sync(probe.board);
      },
      onReject: (values, colors) => {probe.rejects.push([...values]); hud.showEquation(values, false, colors);},
    });
  });
  const client = await context.newCDPSession(p);
  const results = [];
  async function reset(config = {}) {
    await p.evaluate(config => {
      const q = window.toggleProbe;
      q.targets = config.targets ?? [10]; q.required = config.required;
      q.commits = []; q.rejects = []; q.moves = 0;
      q.board = {width: config.width ?? 3, cells: (config.values ?? [1, 2, 7, 9, 3, 4, 5, 6, 8])
        .map(value => ({value, cleared: false}))};
      q.hud.clearEquation(); q.view.setBoard(q.board);
    }, config);
    await p.waitForTimeout(80);
  }
  try {
    const scenarios = [
      {name: 'LIMITLESS 2-block lesson', width: 2, values: [1, 2, 9, 5], required: 2},
      {name: 'LIMITLESS 3-block lesson', required: 3},
      {name: 'LIMITLESS 4-block lesson', required: 4},
      {name: 'LIMITLESS 5-block lesson', required: 5},
      {name: 'LIMITLESS score round', width: 9, values: Array.from({length: 81}, (_, i) => i % 9 + 1)},
      {name: 'TIMELESS 10/20/30', targets: [10, 20, 30]},
      {name: 'ENDLESS 10'},
    ];
    for (const config of scenarios) for (const input of ['mouse', 'touch']) {
      await reset(config);
      await tapWithMotion(p, client, 0, 0, input);
      assert.deepEqual((await selectionState(p)).indices, [0]);
      await tapWithMotion(p, client, 0, 3, input);
      const actual = await selectionState(p);
      assert(actual.moves > 0, `${config.name}: real pointermove was not delivered`);
      assert.deepEqual(actual.indices, expectFixed ? [] : [0], `${config.name} ${input} micro-movement`);
      assert.deepEqual(actual.commits, []);
      assert.deepEqual(actual.rejects, []);
      assert.equal(actual.total, expectFixed ? '?' : '1');
      results.push({scenario: config.name, input, action: 'cancel with 3 CSS px movement', actual});
      if (!expectFixed) continue;
      // A new press can select again; cancelling one of two retains the other.
      await tapWithMotion(p, client, 0, 0, input);
      if (!config.required || config.required > 2) {
        await tapWithMotion(p, client, 1, 0, input);
        await tapWithMotion(p, client, 0, 3, input);
        const kept = await selectionState(p);
        assert.deepEqual(kept.indices, [1]); assert.deepEqual(kept.terms, [2]);
        assert.equal(kept.total, '2'); assert.deepEqual(kept.rejects, []);
        assert.deepEqual(kept.commits, []); assert.equal(kept.penalty, false);
        await tapWithMotion(p, client, 1, 0, input);
      } else {
        await tapWithMotion(p, client, 0, 0, input);
      }
      assert.deepEqual((await selectionState(p)).indices, []);
    }
    if (expectFixed) {
      // Drag still gathers every crossed tile on the next gesture and clears 1+2+7.
      await reset({required: 3});
      const centers = await p.locator('#board .tile').evaluateAll(es => es.slice(0, 3).map(e => {
        const r = e.getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2};
      }));
      await tapWithMotion(p, client, 0);
      await tapWithMotion(p, client, 0, 3);
      await client.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{...centers[0], id: 1}]});
      await client.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{...centers[2], id: 1}]});
      await client.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
      const drag = await selectionState(p);
      assert.deepEqual(drag.commits, [[0, 1, 2]]); assert.deepEqual(drag.rejects, []);
      assert.equal(drag.total, '10'); results.push({scenario: 'new drag after cancel', actual: drag});
      // A genuine over-target answer is still refused, not mistaken for cancellation.
      await reset({values: [9, 3, 1, 2, 4, 5, 6, 7, 8]});
      await tapWithMotion(p, client, 0); await tapWithMotion(p, client, 1);
      const wrong = await selectionState(p);
      assert.deepEqual(wrong.rejects, [[9, 3]]); assert.equal(wrong.total, '12');
      assert.equal(wrong.incorrect, true); results.push({scenario: 'real wrong answer', actual: wrong});
    }
    return results;
  } finally {await client.detach(); await p.close();}
}
