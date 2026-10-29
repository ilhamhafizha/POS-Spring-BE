import test from 'node:test';
import assert from 'node:assert/strict';
import { KEYS, DEFAULT_PRODUCT, DEFAULT_SETTINGS, validateProduct, validateSettings, calculateTotals,
  normalizeArchive, normalizeItems, safeImage, safeNext, getCatalog, saveCatalog, readArchives, writeJSON } from '../../main/resources/static/pos-store.mjs';
import { reportCSV, summarize, normalizeOrders } from '../../main/resources/static/admin-data.mjs';

const storage=()=>{const map=new Map();return {getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key)};};
const item={productId:'tea',name:'Tea',category:'Beverages',unit:'cup',price:12500.5,quantity:2,note:'Less sugar',image:''};
const makeOrder=()=>({number:'ORDR#test',customer:'Anisa',service:'Take Away',table:'',items:[item],status:'Paid',savedAt:new Date().toISOString(),...calculateTotals([item],DEFAULT_SETTINGS)});

test('catalog CRUD persists empty catalog without reintroducing the seed product',()=>{
  globalThis.localStorage=storage();assert.equal(getCatalog()[0].name,DEFAULT_PRODUCT.name);
  const product=validateProduct({...DEFAULT_PRODUCT,id:'tea',name:' Tea ',category:'Beverages',price:12500.5});
  saveCatalog([product]);assert.equal(getCatalog()[0].name,'Tea');
  saveCatalog([{...product,active:false}]);assert.equal(getCatalog()[0].active,false);
  saveCatalog([]);assert.deepEqual(getCatalog(),[]);
});
test('catalog validation rejects invalid prices and category',()=>{
  for(const price of [-1,NaN,Infinity,1.234])assert.throws(()=>validateProduct({...DEFAULT_PRODUCT,price}));
  assert.throws(()=>validateProduct({...DEFAULT_PRODUCT,name:' '}));
  assert.throws(()=>validateProduct({...DEFAULT_PRODUCT,category:'Unknown'}));
  assert.throws(()=>validateProduct({...DEFAULT_PRODUCT,unit:'Unknown'}));
});
test('unsafe images and SVG data URLs cannot become image sources',()=>{
  assert.equal(safeImage('javascript:alert(1)'), '');
  assert.equal(safeImage('data:image/svg+xml;base64,PHN2Zz4='),'');
  assert.equal(safeImage('data:image/png;base64,aGVsbG8='),'data:image/png;base64,aGVsbG8=');
});
test('checkout supports multiple items and preserves currency rounding',()=>{
  assert.deepEqual(calculateTotals([item,{...item,price:20000,quantity:1}],DEFAULT_SETTINGS),{subtotal:45001,tax:5000,total:50001});
  assert.deepEqual(calculateTotals([{...item,price:0.1,quantity:3}],{taxMode:'percent',taxValue:10}),{subtotal:0.3,tax:0.03,total:0.33});
  assert.deepEqual(calculateTotals([],DEFAULT_SETTINGS),{subtotal:0,tax:0,total:0});
});
test('settings validate table count and percentage limits',()=>{
  assert.throws(()=>validateSettings({...DEFAULT_SETTINGS,tables:0}));
  assert.throws(()=>validateSettings({...DEFAULT_SETTINGS,tables:51}));
  assert.throws(()=>validateSettings({...DEFAULT_SETTINGS,taxMode:'percent',taxValue:101}));
  assert.equal(validateSettings({...DEFAULT_SETTINGS,name:' My store '}).name,'My store');
  assert.equal(calculateTotals([item],{taxMode:'none',taxValue:5000}).tax,0);
});
test('new transaction snapshots keep original prices and product names',()=>{
  const order=makeOrder();const normalized=normalizeArchive(order);
  assert.equal(normalized.items[0].name,'Tea');assert.equal(normalized.quantity,2);
  assert.equal(normalized.total,30001);
  assert.equal(summarize(normalizeOrders([order])).revenue,25001);
  assert.equal(normalizeArchive({...order,subtotal:100,total:5100}),null);
});
test('legacy single-product archives remain compatible',()=>{
  const legacy={number:'old',customer:'Anisa',service:'Dine in',quantity:2,note:'Without egg',subtotal:40000,tax:5000,total:45000,status:'Archived',savedAt:new Date().toISOString()};
  assert.equal(normalizeItems(legacy)[0].note,'Without egg');
  assert.equal(normalizeArchive(legacy).items[0].name,DEFAULT_PRODUCT.name);
});
test('corrupt saved JSON never silently becomes an empty writable catalog or archive',()=>{
  globalThis.localStorage=storage();localStorage.setItem(KEYS.catalog,'{broken');localStorage.setItem(KEYS.archives,'{broken');
  assert.throws(getCatalog,/not been overwritten/);assert.throws(readArchives,/not been overwritten/);
  assert.equal(localStorage.getItem(KEYS.catalog),'{broken');
});
test('storage failures surface to callers',()=>{
  assert.throws(()=>writeJSON({setItem(){throw Error('quota')}},'test',[]),/not saved/);
});
test('login destination only allows known local pages',()=>{
  assert.equal(safeNext('catalog.html'),'/catalog');assert.equal(safeNext('https://example.com'),null);
  assert.equal(safeNext('/reports'),'/reports');assert.equal(safeNext('/'),null);assert.equal(safeNext('/unknown'),null);assert.equal(safeNext('//example.com'),null);assert.equal(safeNext('javascript:alert(1)'),null);
});
test('CSV export escapes quoted text and blocks spreadsheet formulas',()=>{
  const csv=reportCSV([{...makeOrder(),customer:'=HYPERLINK("evil")',quantity:2}]);
  assert.ok(csv.includes('"\'=HYPERLINK(""evil"")"'));
  assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"Paid"'));
});
test('dashboard monetary averages and totals retain two decimal precision',()=>{
  const rows=[{status:'Paid',subtotal:12.34,tax:0.1,quantity:1,service:'Dine in'},
    {status:'Paid',subtotal:12.35,tax:0.2,quantity:1,service:'Take Away'}];
  const summary=summarize(rows);assert.equal(summary.average,12.35);assert.equal(summary.tax,0.3);assert.equal(summary.revenue,24.69);
});
