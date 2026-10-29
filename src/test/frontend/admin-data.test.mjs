import test from 'node:test';
import assert from 'node:assert/strict';
import { dateKey, parseDate, presetRange, normalizeOrders, demoOrders, inRange,
  summarize, dailyRevenue, searchOrders } from '../../main/resources/static/admin-data.mjs';

const today = new Date(2026, 9, 15, 12);
const makeOrder = changes => ({ number: 'ORDR#1', customer: 'Anisa', table: '02',
  service: 'Dine in', quantity: 2, status: 'Paid', note: '',
  subtotal: 40000, tax: 5000, total: 45000, savedAt: new Date(2026, 9, 15, 10).toISOString(), ...changes });

test('date presets include today and cross month boundaries', () => {
  assert.deepEqual(presetRange(7, today), { from: '2026-10-09', to: '2026-10-15' });
  assert.deepEqual(presetRange(7, new Date(2026, 0, 3)), { from: '2025-12-28', to: '2026-01-03' });
  assert.deepEqual(presetRange(1, today), { from: '2026-10-15', to: '2026-10-15' });
});

test('invalid calendar dates are rejected', () => {
  assert.equal(parseDate('2026-02-30'), null);
  assert.equal(parseDate('2026-13-01'), null);
  assert.equal(parseDate('invalid'), null);
  assert.equal(dateKey(parseDate('2024-02-29')), '2024-02-29');
});

test('range includes both local calendar days and excludes following midnight', () => {
  const rows = [makeOrder({ savedAt: new Date(2026, 9, 14, 23, 59).toISOString() }),
    makeOrder({ number: 'start', savedAt: new Date(2026, 9, 15).toISOString() }),
    makeOrder({ number: 'end', savedAt: new Date(2026, 9, 15, 23, 59, 59).toISOString() }),
    makeOrder({ savedAt: new Date(2026, 9, 16).toISOString() })];
  assert.deepEqual(inRange(rows, '2026-10-15', '2026-10-15').map(row => row.number), ['start', 'end']);
  assert.deepEqual(inRange(rows, '2026-10-16', '2026-10-15'), []);
});

test('only paid orders contribute revenue, tax, quantities and average', () => {
  const summary = summarize([makeOrder(), makeOrder({ service: 'Take Away', quantity: 1,
    subtotal: 20000, total: 25000 }), makeOrder({ status: 'Archived' })]);
  assert.deepEqual(summary, { revenue: 60000, orders: 2, items: 3, average: 30000,
    tax: 10000, dineIn: 1, takeAway: 1, archived: 1 });
});

test('empty dashboard has finite zero values', () => {
  assert.ok(Object.values(summarize([])).every(value => value === 0));
});

test('daily chart includes zero-sales dates and agrees with summary', () => {
  const rows = [makeOrder(), makeOrder({ status: 'Archived' })];
  const series = dailyRevenue(rows, '2026-10-14', '2026-10-16');
  assert.deepEqual(series.map(day => day.revenue), [0, 40000, 0]);
  assert.equal(series.reduce((sum, day) => sum + day.revenue, 0), summarize(rows).revenue);
});

test('saved order normalization rejects malformed amounts, dates, statuses and quantities', () => {
  const input = [makeOrder(), null, makeOrder({ total: 1 }), makeOrder({ tax: -1 }),
    makeOrder({ subtotal: '40000' }), makeOrder({ quantity: 0 }),
    makeOrder({ savedAt: 'not-a-date' }), makeOrder({ status: 'Unknown' })];
  assert.equal(normalizeOrders(input).length, 1);
  assert.deepEqual(normalizeOrders({}), []);
  assert.deepEqual(normalizeOrders(null), []);
});

test('cashier schema is preserved without mutating stored objects', () => {
  const original = makeOrder({ cash: 50000 });
  const copy = normalizeOrders([original])[0];
  assert.equal(copy.customer, 'Anisa');
  assert.equal(copy.total, 45000);
  assert.equal(original.cash, 50000);
  assert.notEqual(copy, original);
});

test('transaction search combines query and status, then sorts newest first', () => {
  const rows = [makeOrder({ number: 'old', savedAt: new Date(2026, 9, 14).toISOString() }),
    makeOrder({ number: 'new', status: 'Archived' }), makeOrder({ customer: 'Guest' })];
  assert.deepEqual(searchOrders(rows, ' anISA ', 'All').map(row => row.number), ['new', 'old']);
  assert.deepEqual(searchOrders(rows, 'anisa', 'Paid').map(row => row.number), ['old']);
  assert.equal(searchOrders(rows, 'missing').length, 0);
});

test('demo dataset is deterministic, valid and consistent across summary and chart', () => {
  const rows = demoOrders(today);
  assert.deepEqual(rows, demoOrders(today));
  assert.equal(normalizeOrders(rows).length, rows.length);
  assert.equal(new Set(rows.map(row => row.number)).size, rows.length);
  const range = presetRange(7, today);
  const selected = inRange(rows, range.from, range.to);
  const chart = dailyRevenue(selected, range.from, range.to);
  assert.equal(chart.length, 7);
  assert.equal(chart.reduce((sum, day) => sum + day.revenue, 0), summarize(selected).revenue);
  assert.ok(selected.length > 8);
});
