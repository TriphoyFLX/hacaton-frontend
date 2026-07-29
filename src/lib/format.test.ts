import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCount, formatRelativeTime, pluralizeComments } from './format';

test('formatCount renders short notation', () => {
  assert.equal(formatCount(999), '999');
  assert.equal(formatCount(1200), '1.2K');
  assert.equal(formatCount(2_300_000), '2.3M');
});

test('pluralizeComments handles russian declensions', () => {
  assert.equal(pluralizeComments(1), 'комментарий');
  assert.equal(pluralizeComments(2), 'комментария');
  assert.equal(pluralizeComments(11), 'комментариев');
});

test('formatRelativeTime returns minute granularity', () => {
  const nowMinus2Min = new Date(Date.now() - 2 * 60_000).toISOString();
  assert.equal(formatRelativeTime(nowMinus2Min), '2 мин');
});
