import assert from 'node:assert/strict';
import test from 'node:test';
import { templeConstruction } from '../src/components/templeConstruction';

test('a temple follows each topic independently and never substitutes the overall readiness score', () => {
  const state = templeConstruction([0.82, 0.68, 0.52, 0.74]);
  assert.deepEqual(state.columns, [0.82, 0.68, 0.52, 0.74]);
  assert.equal(state.roof, false);
});
test('85% finishes an individual column; the roof requires every topic to meet that goal', () => {
  assert.deepEqual(templeConstruction([0.85, 1, 0.9, 0.84]), { columns: [1, 1, 1, 0.84], roof: false });
  assert.deepEqual(templeConstruction([0.85, 0.85, 0.85, 0.85]), { columns: [1, 1, 1, 1], roof: true });
});
test('new accounts and malformed percentages cannot render a complete temple', () => {
  assert.deepEqual(templeConstruction([]), { columns: [], roof: false });
  assert.deepEqual(templeConstruction([0, -1, NaN, Infinity]), { columns: [0, 0, 0, 0], roof: false });
});
test('revised answers can lower one column and remove the roof', () => {
  assert.equal(templeConstruction([1, 1, 1, 1]).roof, true);
  assert.deepEqual(templeConstruction([1, 0.5, 1, 1]), { columns: [1, 0.5, 1, 1], roof: false });
});
