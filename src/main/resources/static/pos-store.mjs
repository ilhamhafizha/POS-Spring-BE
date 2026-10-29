export const KEYS = Object.freeze({ catalog: 'padipos-catalog-v1', settings: 'padipos-settings-v1',
  profile: 'padipos-profile-v1', session: 'padipos-session-v1', draft: 'padipos-draft-v2', archives: 'padipos-preview-archives-v1' });
export const CATEGORIES = ['Foods', 'Beverages', 'Dessert'];
export const DEFAULT_PRODUCT = Object.freeze({ id: 'gado-gado', name: 'Gado-gado Special', category: 'Foods',
  description: 'Vegetables, egg, tempe, tofu, ketupat, peanut sauce, and kerupuk.',
  price: 20000, unit: 'portion', image: 'assets/42-4552-imgImage5.png', active: true });
export const DEFAULT_SETTINGS = Object.freeze({ name: 'PadiPos', address: '', phone: '', taxMode: 'fixed', taxValue: 5000, tables: 10, receipt: 'Thank you for your order!' });
export const DEFAULT_PROFILE = Object.freeze({ name: 'John Doe', email: 'john@example.com', phone: '' });
export const roundMoney = value => Math.round((value + Number.EPSILON) * 100) / 100;
export const validMoney = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e12 && Math.abs(roundMoney(value) - value) < 1e-6;

export function readJSON(storage, key, fallback) {
  try { const raw = storage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
  catch { return fallback; }
}
export function writeJSON(storage, key, value) {
  try { storage.setItem(key, JSON.stringify(value)); }
  catch { throw new Error('Browser storage is unavailable or full. Your changes were not saved.'); }
}
export function safeImage(value) {
  return typeof value === 'string' && (value === DEFAULT_PRODUCT.image || value === 'assets/148-33316-imgImage5.png'
    || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) ? value : '';
}
export function validateProduct(value) {
  if (!value || !value.name?.trim() || value.name.trim().length > 150) throw new Error('Enter a product name of up to 150 characters.');
  if (!validMoney(value.price)) throw new Error('Enter a valid price with up to two decimal places.');
  if (!CATEGORIES.includes(value.category)) throw new Error('Choose a valid category.');
  if (!['portion', 'cup', 'piece'].includes(value.unit)) throw new Error('Choose a valid unit.');
  if (typeof value.description !== 'string' || value.description.length > 300) throw new Error('Description must be 300 characters or fewer.');
  return { id: String(value.id || crypto.randomUUID()), name: value.name.trim(), category: value.category,
    price: roundMoney(value.price), unit: value.unit, description: value.description.trim(),
    image: safeImage(value.image), active: value.active !== false };
}
export function getCatalog() {
  let raw;
  try {const stored=localStorage.getItem(KEYS.catalog);raw=stored===null?null:JSON.parse(stored);}
  catch {throw new Error('The saved catalog could not be read. Existing data has not been overwritten.');}
  if (raw === null) return [{ ...DEFAULT_PRODUCT }];
  if (!Array.isArray(raw)) throw new Error('The saved catalog could not be read. Your existing data has not been overwritten.');
  return raw.map(validateProduct);
}
export function saveCatalog(products) {
  const valid = products.map(validateProduct);
  if (new Set(valid.map(product => product.id)).size !== valid.length) throw new Error('Duplicate product IDs.');
  writeJSON(localStorage, KEYS.catalog, valid);
}
export function validateSettings(value) {
  if (!value.name?.trim() || value.name.length > 80) throw new Error('Enter a store name of up to 80 characters.');
  if (!['fixed', 'percent', 'none'].includes(value.taxMode) || !validMoney(value.taxValue)
    || (value.taxMode === 'percent' && value.taxValue > 100)) throw new Error('Enter a valid tax amount or percentage between 0 and 100.');
  if (!Number.isInteger(value.tables) || value.tables < 1 || value.tables > 50) throw new Error('Number of tables must be 1–50.');
  return { name: value.name.trim(), address: String(value.address || '').slice(0, 300), phone: String(value.phone || '').slice(0, 30),
    taxMode: value.taxMode, taxValue: value.taxValue, tables: value.tables, receipt: String(value.receipt || '').slice(0, 200) };
}
export function getSettings() {
  try { return validateSettings(readJSON(localStorage, KEYS.settings, DEFAULT_SETTINGS)); }
  catch { return { ...DEFAULT_SETTINGS }; }
}
export function getProfile() {
  const raw = readJSON(localStorage, KEYS.profile, DEFAULT_PROFILE);
  return raw && typeof raw.name === 'string' && typeof raw.email === 'string' ? raw : { ...DEFAULT_PROFILE };
}
export function calculateTotals(items, settings) {
  const subtotal = roundMoney(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const tax = !items.length || settings.taxMode === 'none' ? 0
    : settings.taxMode === 'percent' ? roundMoney(subtotal * settings.taxValue / 100) : settings.taxValue;
  return { subtotal, tax, total: roundMoney(subtotal + tax) };
}
export function normalizeItems(order) {
  if (Array.isArray(order?.items)) {
    if (!order.items.length || order.items.length > 200) return [];
    const items = order.items.map(item => {
      if (!item || typeof item.name !== 'string' || !validMoney(item.price)
        || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) return null;
      return { productId: String(item.productId || ''), name: item.name.slice(0,150),
        category: CATEGORIES.includes(item.category) ? item.category : 'Foods', unit: String(item.unit || 'portion'),
        price: item.price, quantity: item.quantity, note: String(item.note || '').slice(0,200), image: safeImage(item.image) };
    });
    return items.every(Boolean) ? items : [];
  }
  if (!Number.isInteger(order?.quantity) || order.quantity < 1 || order.quantity > 999) return [];
  return [{ productId: DEFAULT_PRODUCT.id, name: DEFAULT_PRODUCT.name, category: 'Foods', unit: 'portion',
    price: DEFAULT_PRODUCT.price, quantity: order.quantity, note: String(order.note || '').slice(0,200), image: DEFAULT_PRODUCT.image }];
}
export function normalizeArchive(entry) {
  if (!entry || typeof entry.number !== 'string' || typeof entry.customer !== 'string'
    || !['Paid','Archived'].includes(entry.status) || !['Dine in','Take Away'].includes(entry.service)
    || typeof entry.savedAt !== 'string' || !Number.isFinite(new Date(entry.savedAt).getTime())) return null;
  const items = normalizeItems(entry);
  if (!items.length || ![entry.subtotal,entry.tax,entry.total].every(validMoney)
    || Math.abs(roundMoney(entry.subtotal + entry.tax) - entry.total) > 0.001) return null;
  const itemsSubtotal = roundMoney(items.reduce((sum,item) => sum + item.price * item.quantity,0));
  if (Math.abs(itemsSubtotal - entry.subtotal) > 0.001) return null;
  return { ...entry, number: entry.number.slice(0,80), customer: entry.customer.slice(0,80), table: String(entry.table || '').slice(0,10),
    savedAt: new Date(entry.savedAt).toISOString(), items, quantity: items.reduce((sum,item) => sum+item.quantity,0), note: String(entry.note || '').slice(0,200) };
}
export function readArchives() {
  let raw;
  try {const stored=localStorage.getItem(KEYS.archives);raw=stored===null?[]:JSON.parse(stored);}
  catch {throw new Error('Saved orders could not be read. Existing orders have not been overwritten.');}
  if (!Array.isArray(raw)) throw new Error('Saved orders could not be read.');
  const result = raw.map(normalizeArchive);
  if (result.some(entry => !entry)) throw new Error('Some saved orders are invalid. Existing orders have not been overwritten.');
  return result;
}
export function getSession() {
  const raw = readJSON(sessionStorage, KEYS.session, null);
  return raw && ['Admin','Cashier'].includes(raw.role) ? raw : null;
}
export function safeNext(value) {
  if(typeof value!=='string')return null;
  const legacy={'index.html':'/cashier','admin.html':'/admin','catalog.html':'/catalog','reports.html':'/reports','settings.html':'/settings','profile.html':'/profile'};
  const route=legacy[value]||value;
  return ['/cashier','/admin','/catalog','/reports','/settings','/profile'].includes(route) ? route : null;
}
export function logout() {
  sessionStorage.removeItem(KEYS.session);
  sessionStorage.removeItem(KEYS.draft);
  location.replace('/login');
}
