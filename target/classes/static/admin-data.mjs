import { normalizeArchive, roundMoney } from './pos-store.mjs';
// Pure data helpers shared by the dashboard and its Node tests.
export const ARCHIVE_KEY = 'padipos-preview-archives-v1';
export const PRODUCT = { name: 'Gado-gado Special', price: 20000 };

export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return dateKey(date) === value ? date : null;
}

export function presetRange(days, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - days + 1);
  return { from: dateKey(start), to: dateKey(now) };
}

export function normalizeOrders(input) {
  return Array.isArray(input) ? input.map(normalizeArchive).filter(Boolean) : [];
}

export function demoOrders(now = new Date()) {
  const rows = [];
  for (let day = 0; day < 30; day++) {
    const count = 3 + (day * 7 + 2) % 6;
    for (let index = 0; index < count; index++) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 9 + index * 2, 10 + index * 5);
      const quantity = 1 + (day + index * 3) % 5;
      const subtotal = quantity * PRODUCT.price;
      rows.push({ number: `DEMO-${dateKey(date).replaceAll('-', '')}-${String(index + 1).padStart(3, '0')}`,
        customer: index === 0 ? 'Anisa' : `Guest ${String(index + 1).padStart(2, '0')}`,
        table: String(index + 1).padStart(2, '0'), service: (day + index) % 3 ? 'Dine in' : 'Take Away',
        quantity, note: '', status: (day + index) % 9 === 0 ? 'Archived' : 'Paid',
        subtotal, tax: 5000, total: subtotal + 5000, savedAt: date.toISOString() });
    }
  }
  return rows;
}

export function inRange(orders, from, to) {
  const start = parseDate(from);
  const end = parseDate(to);
  if (!start || !end || start > end) return [];
  end.setDate(end.getDate() + 1);
  return orders.filter(order => {
    const time = new Date(order.savedAt).getTime();
    return time >= start.getTime() && time < end.getTime();
  });
}

export function summarize(orders) {
  const paid = orders.filter(order => order.status === 'Paid');
  const revenue = roundMoney(paid.reduce((sum, order) => sum + order.subtotal, 0));
  return { revenue, orders: paid.length, items: paid.reduce((sum, order) => sum + order.quantity, 0),
    average: paid.length ? roundMoney(revenue / paid.length) : 0,
    tax: roundMoney(paid.reduce((sum, order) => sum + order.tax, 0)),
    dineIn: paid.filter(order => order.service === 'Dine in').length,
    takeAway: paid.filter(order => order.service === 'Take Away').length,
    archived: orders.filter(order => order.status === 'Archived').length };
}

export function dailyRevenue(orders, from, to) {
  const current = parseDate(from);
  const end = parseDate(to);
  if (!current || !end || current > end) return [];
  const totals = new Map();
  for (const order of orders) {
    if (order.status !== 'Paid') continue;
    const key = dateKey(new Date(order.savedAt));
    totals.set(key, roundMoney((totals.get(key) || 0) + order.subtotal));
  }
  const result = [];
  while (current <= end) {
    const key = dateKey(current);
    result.push({ date: key, revenue: totals.get(key) || 0 });
    current.setDate(current.getDate() + 1);
  }
  return result;
}

export function searchOrders(orders, query, status = 'All') {
  const term = query.trim().toLowerCase();
  return orders.filter(order => (status === 'All' || order.status === status)
    && `${order.number} ${order.customer} ${order.service}`.toLowerCase().includes(term))
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
}

export function reportCSV(orders) {
  function cell(value) {
    let text=String(value??'');
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text="'"+text;
    return `"${text.replaceAll('"','""')}"`;
  }
  const rows=[['Order ID','Customer','Date','Order type','Items','Subtotal','Tax','Total','Status'],
    ...orders.map(order=>[order.number,order.customer||'Guest',order.savedAt,order.service,order.quantity,order.subtotal,order.tax,order.total,order.status])];
  return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
