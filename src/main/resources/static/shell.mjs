import { getSession, getProfile, logout, loadSession, initialize } from './api.mjs';
export const $ = selector => document.querySelector(selector);
export const money = value => `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value)}`;
export function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
let toastTimer;
export function notify(message, error = false) {
  let box = $('#toast');
  if (!box) { box = el('div', undefined, 'toast'); box.id = 'toast'; box.setAttribute('role','status'); document.body.append(box); }
  box.textContent = message; box.hidden = false; box.classList.toggle('toast-error',error);
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { box.hidden = true; },4500);
}
export function picture(item, className) {
  if (item.image) { const img=el('img',undefined,className); img.src=item.image; img.alt=item.name; return img; }
  const placeholder=el('div',item.name.slice(0,1).toUpperCase(),`${className} photo-placeholder`); placeholder.setAttribute('aria-label','No product photo'); return placeholder;
}

const file = location.pathname === '/' ? '/cashier' : location.pathname;
let session;
try {
  session = await loadSession();
  if(session.role!=='Admin' && ['/admin','/catalog'].includes(file)) {
    document.body.hidden=true;location.replace('/cashier');throw Object.assign(new Error('Opening Cashier workspace'),{redirecting:true});
  }
  await initialize();
} catch(error) {
  if(error.redirecting){ /* Navigation is already in progress. */ }
  else if(error.status===401){document.body.hidden=true;location.replace(`/login?next=${encodeURIComponent(file)}`);}
  else {
    document.body.replaceChildren();const main=el('main',undefined,'admin-main');main.append(el('h1','Unable to open workspace'),el('p',error.message,'muted'));
    const retry=el('button','Try again','secondary');retry.addEventListener('click',()=>location.reload());main.append(retry);document.body.append(main);
  }
  throw error;
}
const cashier = file === '/cashier';
const profile = getProfile();
const cashierRole = session.role !== 'Admin';
if(cashierRole && $('.eyebrow')) $('.eyebrow').textContent='CASHIER';
const menu = [
  ['/admin','Dashboard','admin-171-17919-imgVuesaxLinearElement3.svg','nav-dashboard-idle.svg'],
  ['/catalog','Catalog','nav-catalog.svg','admin-171-17919-imgVuesaxLinearMenuBoard.svg'],
  ['/reports','Sales Report','nav-reports.svg','admin-171-17919-imgClipboardText.svg'],
  ['/settings','Settings','nav-settings.svg','admin-171-17919-imgVuesaxLinearSetting2.svg']
];
const sidebar = $('.sidebar');
sidebar.innerHTML = `<div class="brand-row"><a class="brand" href="${cashier||cashierRole?'/cashier':'/admin'}" aria-label="PadiPos home"><span class="brand-mark">P</span><span class="brand-name">PadiPos</span></a><button id="shell-collapse" class="icon-button collapse" aria-label="Collapse sidebar" aria-expanded="true"><img src="assets/sidebar-imgArrowLeft.svg" alt=""></button><span class="sidebar-rule"><img src="assets/admin-171-17919-imgLine10.svg" alt=""></span></div><nav></nav><a class="cashier-shortcut" href="${cashier?'/admin':'/cashier'}"><img src="assets/sidebar-imgVuesaxLinearShop.svg" alt=""><span>${cashier?'Back Office':'Open Cashier'}</span></a>`;
if(session.role!=='Admin'){const shortcut=sidebar.querySelector('.cashier-shortcut');shortcut.href='/cashier';shortcut.querySelector('span').textContent='Open Cashier';}
const nav = sidebar.querySelector('nav');
if (cashier || cashierRole) {
  const link = el('a',undefined,`nav-item${cashier?' selected':''}`); link.href='/cashier'; link.title='Cashier'; if(cashier)link.setAttribute('aria-current','page');
  const img=el('img'); img.src='assets/sidebar-imgVuesaxLinearShop.svg'; img.alt=''; link.append(img,el('span','Cashier'));nav.append(link);
}
for(const [href,label,active,idle] of menu) {
  if(session.role!=='Admin' && ['/admin','/catalog'].includes(href))continue;
  const selected=file===href;
  const link=el('a',undefined,`nav-item${selected?' selected':''}`);link.href=href;link.title=label;
  if(selected)link.setAttribute('aria-current','page');
  const img=el('img');img.src=`assets/${selected?active:idle}`;img.alt='';link.append(img,el('span',label));nav.append(link);
}
const searchId = cashier?'search':file==='/catalog'?'catalog-search':['/admin','/reports'].includes(file)?'admin-search':null;
$('.header').innerHTML = `${searchId?`<label class="search"><img src="assets/126-41246-imgVuesaxLinearSearchNormal.svg" alt=""><input id="${searchId}" type="search" placeholder="Enter the keyword here..." aria-label="${cashier||file==='/catalog'?'Search products':'Search transactions'}"></label>`:`<span class="header-store">PadiPos <small>${cashierRole?'Cashier':'Back Office'}</small></span>`}<div class="header-actions"><button id="mobile-menu" class="mobile-menu" aria-label="Open navigation" aria-expanded="false">Menu</button>${cashier?'<button id="archives" class="archive-button"><img src="assets/126-41246-imgVuesaxLinearArchiveAdd.svg" alt=""><span>Order Archive</span><span id="archive-count" hidden></span></button>':''}<div class="account-area"><button id="profile-toggle" class="profile profile-trigger" aria-expanded="false" aria-controls="profile-menu"><img class="avatar" src="assets/126-41246-imgFrame1000004552.png" alt=""><span><strong id="shell-name"></strong><small id="shell-role"></small></span></button><div id="profile-menu" class="profile-menu" hidden><a href="/profile">My Profile</a><a href="/settings">Settings</a><button id="menu-logout">Log out</button></div></div><button id="shell-logout" class="icon-button logout" aria-label="Log out" title="Log out"><img src="assets/126-41246-imgVuesaxLinearLogout.svg" alt=""></button></div>`;
$('#shell-name').textContent=profile.name;$('#shell-role').textContent=session.role;
$('#profile-toggle').addEventListener('click',()=>{
  const open=$('#profile-menu').hidden;$('#profile-menu').hidden=!open;$('#profile-toggle').setAttribute('aria-expanded',open);
});
function closeProfile(){ $('#profile-menu').hidden=true;$('#profile-toggle').setAttribute('aria-expanded','false'); }
document.addEventListener('click',event=>{if(!event.target.closest('.account-area'))closeProfile();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeProfile();document.body.classList.remove('nav-open');$('#mobile-menu').setAttribute('aria-expanded','false');}});
for(const id of ['#shell-logout','#menu-logout'])$(id).addEventListener('click',async()=>{try{await logout();}catch(error){notify(error.message,true);}});
$('#shell-collapse').addEventListener('click',()=>{const collapsed=document.body.classList.toggle('collapsed');$('#shell-collapse').setAttribute('aria-expanded',!collapsed);$('#shell-collapse').setAttribute('aria-label',collapsed?'Expand sidebar':'Collapse sidebar');});
$('#mobile-menu').addEventListener('click',()=>{const open=document.body.classList.toggle('nav-open');$('#mobile-menu').setAttribute('aria-expanded',open);});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
