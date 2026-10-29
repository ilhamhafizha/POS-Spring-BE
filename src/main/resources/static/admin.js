import { $, el as element, money, picture, notify } from './shell.mjs';
import { normalizeItems, roundMoney } from './pos-store.mjs';
import { fetchReport, getSession } from './api.mjs';
import { parseDate, presetRange, normalizeOrders,
  inRange, summarize, dailyRevenue, searchOrders, reportCSV } from './admin-data.mjs';

const integer = value => new Intl.NumberFormat('en-US').format(value);
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTime = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const pageSize = 8;
const transactionScope=getSession().role==='Admin'?'Store transactions':'My transactions';
if(getSession().role!=='Admin'){
  $('#data-source option').textContent=transactionScope;
  $('.preview-badge').textContent='Cashier';
  $('.page-description').textContent='Review your own sales, inspect transactions, and export your report.';
}
let range = presetRange(7);
let source = 'server';
let requestSequence=0;
let page = 1;
let orders = [];
let periodOrders = [];

async function loadOrders() {
  const sequence=++requestSequence;
  $('#source-description').textContent=`Loading ${transactionScope.toLowerCase()}…`;
  try {
    const report=await fetchReport(range);
    if(sequence!==requestSequence)return;
    orders=normalizeOrders(report.orders);
    $('#source-description').textContent=`${transactionScope}. Paid orders contribute to sales; archived orders remain unpaid.`;
    renderDashboard();
  }catch(error){if(sequence===requestSequence){orders=[];$('#source-description').textContent='Transactions could not be loaded. '+error.message;renderDashboard();notify(error.message,true);}}
}

function renderChart(summary) {
  const series = dailyRevenue(periodOrders, range.from, range.to);
  const chart = $('#revenue-chart');
  const table = $('#chart-data-body');
  chart.replaceChildren();
  table.replaceChildren();
  const highest = Math.max(0, ...series.map(day => day.revenue));
  const ceiling = Math.max(100000, Math.ceil(highest / 100000) * 100000);
  $('#axis-max').textContent = money(ceiling);
  $('#axis-mid').textContent = money(ceiling / 2);
  $('#chart-period').textContent = `${dateFormat.format(parseDate(range.from))} – ${dateFormat.format(parseDate(range.to))}`;
  $('#chart-total').textContent = money(summary.revenue);
  $('#chart-empty').hidden = summary.orders > 0;
  chart.style.gridTemplateColumns = `repeat(${series.length}, minmax(0, 1fr))`;
  chart.style.minWidth = `${series.length * 28}px`;
  chart.setAttribute('aria-label', `Daily paid revenue over ${series.length} days: ${money(summary.revenue)}, excluding tax. A daily data table follows.`);
  const labelEvery = Math.max(1, Math.ceil(series.length / 7));
  series.forEach((day, index) => {
    const date = parseDate(day.date);
    const column = element('div', undefined, 'chart-column');
    const track = element('div', undefined, 'bar-track');
    const bar = element('div', undefined, 'revenue-bar');
    bar.style.height = `${day.revenue / ceiling * 100}%`;
    bar.title = `${dateFormat.format(date)}: ${money(day.revenue)}`;
    track.append(bar);
    const label = element('span', index % labelEvery === 0 || index === series.length - 1 ? shortDate.format(date) : '', 'bar-date');
    column.append(track, label);
    chart.append(column);
    const row = element('tr');
    row.append(element('td', dateFormat.format(date)), element('td', money(day.revenue)));
    table.append(row);
  });
}

function renderDashboard() {
  periodOrders = inRange(orders, range.from, range.to);
  const summary = summarize(periodOrders);
  $('#metric-revenue').textContent = money(summary.revenue);
  $('#metric-orders').textContent = integer(summary.orders);
  $('#metric-items').textContent = integer(summary.items);
  $('#metric-average').textContent = money(summary.average);
  $('#summary-revenue').textContent = money(summary.revenue);
  $('#summary-tax').textContent = money(summary.tax);
  $('#summary-total').textContent = money(summary.revenue + summary.tax);
  $('#summary-archived').textContent = integer(summary.archived);
  const ranking = new Map();
  for (const order of periodOrders.filter(order => order.status === 'Paid')) for (const item of normalizeItems(order)) {
    const key = item.productId || item.name;
    const entry = ranking.get(key) || { ...item, sold: 0, revenue: 0 };
    entry.sold += item.quantity; entry.revenue = roundMoney(entry.revenue + item.quantity * item.price); ranking.set(key, entry);
  }
  const best = [...ranking.values()].sort((a,b) => b.sold-a.sold || b.revenue-a.revenue)[0];
  const top = document.querySelector('.top-product'); top.replaceChildren();
  if (best) {
    const copy = element('div'); copy.append(element('h3',best.name),element('p',`${best.category} · Most units sold`));
    top.append(picture(best,'top-product-photo'),copy);
  } else top.append(element('p','No paid product sales in this period.','muted'));
  $('#product-sold').textContent = integer(best?.sold || 0);
  $('#product-revenue').textContent = money(best?.revenue || 0);
  $('#product-caption').textContent = 'Based on product details recorded at checkout.';
  $('#donut-total').textContent = integer(summary.orders);
  $('#dine-count').textContent = integer(summary.dineIn);
  $('#away-count').textContent = integer(summary.takeAway);
  const degrees = summary.orders ? summary.dineIn / summary.orders * 360 : 0;
  $('#service-donut').style.background = summary.orders
    ? `conic-gradient(var(--blue) 0deg ${degrees}deg, #c2d4fa ${degrees}deg 360deg)` : 'var(--line)';
  $('#service-donut').setAttribute('aria-label', `${summary.dineIn} dine-in and ${summary.takeAway} take-away paid orders.`);
  renderChart(summary);
  renderTransactions();
}

function renderTransactions() {
  const filtered = searchOrders(periodOrders, $('#admin-search').value, $('#status-filter').value);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  page = Math.max(1, Math.min(page, pages));
  const start = (page - 1) * pageSize;
  const body = $('#transaction-body');
  body.replaceChildren();
  filtered.slice(start, start + pageSize).forEach(order => {
    const row = element('tr');
    const id = element('td');
    const open = element('button', order.number, 'order-link');
    open.setAttribute('aria-label', `View order ${order.number}`);
    open.addEventListener('click', () => openDetail(order));
    id.append(open);
    const date = element('td', dateTime.format(new Date(order.savedAt)));
    date.title = new Date(order.savedAt).toLocaleString();
    const status = element('td');
    status.append(element('span', order.status, `status-pill${order.status === 'Archived' ? ' archived' : ''}`));
    row.append(id, element('td', order.customer || 'Guest'), date,
      element('td', order.service), element('td', money(order.total)), status);
    body.append(row);
  });
  $('#transactions-empty').hidden = filtered.length > 0;
  $('#page-description').textContent = filtered.length
    ? `Showing ${start + 1}–${Math.min(start + pageSize, filtered.length)} of ${filtered.length} transactions`
    : '0 transactions';
  $('#page-number').textContent = `${page} / ${pages}`;
  $('#previous-page').disabled = page === 1;
  $('#next-page').disabled = page === pages;
}

function openDetail(order) {
  const content = $('#transaction-detail');
  content.replaceChildren();
  content.append(element('span', order.status, `status-pill${order.status === 'Archived' ? ' archived' : ''}`));
  const list = element('dl', undefined, 'detail-list');
  const fields = [['Order ID', order.number], ['Customer', order.customer || 'Guest'],
    ['Date', new Date(order.savedAt).toLocaleString()], ['Order type', order.service]];
  if (order.service === 'Dine in') fields.push(['Table', order.table || '—']);
  fields.push(['Subtotal', money(order.subtotal)], ['Tax', money(order.tax)], ['Total', money(order.total)]);
  for (const [label, value] of fields) {
    const row = element('div');
    row.append(element('dt', label), element('dd', value));
    list.append(row);
  }
  content.append(list);
  for (const item of normalizeItems(order)) {
    const product = element('div', undefined, 'detail-product');
    const copy = element('div');
    copy.append(element('strong',item.name),element('p',`${item.quantity} ${item.unit}(s) · ${money(item.price * item.quantity)}`));
    product.append(picture(item,'detail-item-photo'),copy); content.append(product);
    if (item.note) content.append(element('p',`Note: ${item.note}`,'detail-note'));
  }
  content.append(element('p', 'Transaction recorded by your store.', 'detail-source'));
  $('#transaction-dialog').showModal();
}

function setRange(next, days = null) {
  range = next;
  page = 1;
  $('#date-from').value = range.from;
  $('#date-to').value = range.to;
  $('#range-error').hidden = true;
  document.querySelectorAll('[data-days]').forEach(button => {
    const active = Number(button.dataset.days) === days;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active);
  });
  loadOrders();
}

document.querySelectorAll('[data-days]').forEach(button => button.addEventListener('click', () => {
  const days = Number(button.dataset.days);
  setRange(presetRange(days), days);
}));
$('#date-filter').addEventListener('submit', event => {
  event.preventDefault();
  const from = $('#date-from').value;
  const to = $('#date-to').value;
  const start = parseDate(from);
  const end = parseDate(to);
  let error = '';
  if (!start || !end || start > end) error = 'Choose a valid date range with the start on or before the end.';
  else if ((end - start) / 86400000 > 365) error = 'Choose a date range of up to one year.';
  if (error) {
    $('#range-error').textContent = error;
    $('#range-error').hidden = false;
    return;
  }
  setRange({ from, to });
});
$('#data-source').addEventListener('change', () => {
  source = $('#data-source').value;
  page = 1;
  loadOrders();
});
$('#admin-search').addEventListener('input', () => { page = 1; renderTransactions(); });
$('#status-filter').addEventListener('change', () => { page = 1; renderTransactions(); });
$('#previous-page').addEventListener('click', () => { page--; renderTransactions(); });
$('#next-page').addEventListener('click', () => { page++; renderTransactions(); });
$('#close-transaction').addEventListener('click', () => $('#transaction-dialog').close());
$('#detail-done').addEventListener('click', () => $('#transaction-dialog').close());
window.addEventListener('focus',()=>{if(!document.querySelector('dialog[open]'))loadOrders();});
$('#data-source').value = source;
setRange(range, 7);

if ($('#export-report')) $('#export-report').addEventListener('click', () => {
  const rows = searchOrders(periodOrders, $('#admin-search').value, $('#status-filter').value);
  const url = URL.createObjectURL(new Blob([reportCSV(rows)], {type:'text/csv;charset=utf-8'}));
  const link = element('a'); link.href=url; link.download=`padipos-sales-${range.from}-${range.to}.csv`;
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
