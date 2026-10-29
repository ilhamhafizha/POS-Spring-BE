import { $, el, picture, money, notify } from './shell.mjs';
import { calculateTotals, normalizeItems, readJSON, writeJSON, validMoney } from './pos-store.mjs';
import { getCatalog, getSettings, readArchives, refresh, saveOrder as persistOrder, fetchOrder, draftKey } from './api.mjs';
const DRAFT_KEY=draftKey();
let products=[];
let settings=getSettings();
let category='All Menu';
let order=freshOrder();
let detailProduct=null;
let noteIndex=null;
let storageError=false;
let saving=false;
let paidOrder=null;
try { products=getCatalog(); } catch(error){notify(error.message,true);}
const draft=readJSON(sessionStorage,DRAFT_KEY,null);
if(draft&&typeof draft.number==='string'&&['Dine in','Take Away'].includes(draft.service)) {
  const items=normalizeItems(draft);
  order={id:draft.id,version:draft.version,requestId:draft.requestId||crypto.randomUUID(),number:draft.number,customer:String(draft.customer||''),table:String(draft.table||''),service:draft.service,items};
}
function freshOrder(){return {requestId:crypto.randomUUID(),number:'New order',customer:'',table:'',service:'Dine in',items:[]};}
function readFields(){order.customer=$('#customer').value.trim();order.table=$('#table').value;}
function remember(){try{writeJSON(sessionStorage,DRAFT_KEY,order);}catch{/* Draft caching is optional; saved orders still report write failures. */}}
function totals(){return calculateTotals(order.items,settings);}
async function catalogRefresh(){try{await refresh();products=getCatalog();settings=getSettings();renderCatalog();renderOrder();}catch(error){notify(error.message,true);}}
function renderCatalog(){
  const query=$('#search').value.trim().toLowerCase();
  const filtered=products.filter(product=>product.active&&(category==='All Menu'||product.category===category)&&`${product.name} ${product.description}`.toLowerCase().includes(query));
  $('#products').replaceChildren();$('#products').hidden=!filtered.length;$('#no-results').hidden=!!filtered.length;
  for(const product of filtered){
    const card=el('article',undefined,'product');const add=el('button',undefined,'product-add');add.setAttribute('aria-label',`Add ${product.name} to order`);
    add.append(picture(product,'product-photo'),el('span',product.category==='Foods'?'Food':product.category,'food-label'),el('h2',product.name),el('p',product.description,'product-description'));
    const price=el('span',money(product.price),'price');price.append(el('small',`/${product.unit}`));add.append(price);add.addEventListener('click',()=>addProduct(product));
    const detail=el('button',undefined,'product-detail');detail.setAttribute('aria-label',`View ${product.name} details`);const icon=el('img');icon.src='assets/42-4552-imgVuesaxLinearMaximize.svg';icon.alt='';detail.append(icon);detail.addEventListener('click',()=>openProduct(product));
    card.append(add,detail);$('#products').append(card);
  }
  document.querySelectorAll('[data-category]').forEach(button=>{const active=button.dataset.category===category;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);});
}
function itemButton(icon,label,action,className=''){
  const button=el('button',undefined,className);button.setAttribute('aria-label',label);const img=el('img');img.src=`assets/${icon}`;img.alt='';button.append(img);button.addEventListener('click',action);return button;
}
function commitItems(items){
  const total=calculateTotals(items,settings).total;
  if(!validMoney(total)){notify('This order exceeds the supported total. Reduce quantities or prices.',true);return false;}
  order.items=items;renderOrder();return true;
}
function renderOrder(){
  $('#order-number').textContent=order.number;$('#customer').value=order.customer;
  $('#table').replaceChildren();const placeholder=el('option','Select No.Table');placeholder.value='';$('#table').append(placeholder);
  for(let i=1;i<=settings.tables;i++){const number=String(i).padStart(2,'0');const option=el('option',number);option.value=number;$('#table').append(option);}
  $('#table').value=order.table;if(!$('#table').value)order.table='';
  $('#table-field').hidden=order.service==='Take Away';$('.customer-fields').classList.toggle('take-away',order.service==='Take Away');
  document.querySelectorAll('[data-service]').forEach(button=>{const active=button.dataset.service===order.service;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);});
  $('#order-items').replaceChildren();
  if(!order.items.length)$('#order-items').append(el('div','No Menu Selected','empty-order'));
  order.items.forEach((item,index)=>{
    const row=el('article',undefined,'order-item');row.append(picture(item,'order-photo'));
    const copy=el('div',undefined,'item-copy');copy.append(el('h2',item.name),el('p',money(item.price*item.quantity),'item-price'));
    const note=itemButton('148-33316-imgVuesaxLinearEdit2.svg',`Edit note for ${item.name}`,()=>{readFields();noteIndex=index;$('#note').value=item.note;$('#note-dialog label').firstChild.textContent=`${item.name} `;$('#note-dialog').showModal();},'note-button');
    if(item.note)note.append(el('span',item.note));copy.append(note);row.append(copy);
    const remove=itemButton('148-33316-imgTrashLight.svg',`Remove ${item.name}`,()=>{readFields();commitItems(order.items.filter((_,i)=>i!==index));},'remove');
    const quantity=el('div',undefined,'quantity');
    const decrease=itemButton('148-33316-imgVuesaxLinearMinusCirlce.svg',`Decrease ${item.name}`,()=>changeQuantity(index,-1));
    const increase=itemButton('148-33316-imgVuesaxLinearAddCircle.svg',`Increase ${item.name}`,()=>changeQuantity(index,1));increase.disabled=item.quantity>=999;
    quantity.append(decrease,el('span',String(item.quantity)),increase);row.append(remove,quantity);$('#order-items').append(row);
  });
  const {subtotal,tax,total}=totals();$('#subtotal').textContent=money(subtotal);$('#tax').textContent=money(tax);$('#total').textContent=money(total);
  $('#pay').disabled=!order.items.length;$('#save-order').disabled=!order.items.length;
  try{const archives=readArchives();$('#archive-count').hidden=!archives.length;$('#archive-count').textContent=archives.length;storageError=false;}
  catch(error){if(!storageError)notify(error.message,true);storageError=true;}
  document.title=`${settings.name} — Cashier`;remember();
}
function changeQuantity(index,delta){readFields();const next=order.items.map((item,i)=>i===index?{...item,quantity:item.quantity+delta}:item).filter(item=>item.quantity>0);commitItems(next);}
function addProduct(product){
  readFields();const index=order.items.findIndex(item=>item.productId===product.id);
  if(index>=0){if(order.items[index].quantity>=999){notify('Maximum 999 units per product.');return;}changeQuantity(index,1);return;}
  if(order.items.length>=200){notify('Maximum 200 distinct products per order.');return;}
  const item={productId:product.id,name:product.name,category:product.category,price:product.price,unit:product.unit,quantity:1,note:'',image:product.image};
  commitItems([...order.items,item]);
}
function openProduct(product){
  detailProduct=product;const dialog=$('#detail-dialog');dialog.replaceChildren();
  const heading=el('div',undefined,'dialog-heading');heading.append(el('h2','Menu Details'));const close=el('button','×','close-dialog');close.setAttribute('aria-label','Close');close.addEventListener('click',()=>dialog.close());heading.append(close);
  dialog.append(heading,picture(product,'detail-photo'),el('span',product.category,'detail-category'),el('h2',product.name),el('p',product.description,'muted'),el('p',`${money(product.price)} /${product.unit}`,'detail-price'));
  const add=el('button','Add to Order','primary');add.addEventListener('click',()=>{addProduct(detailProduct);dialog.close();});dialog.append(add);dialog.showModal();
}
async function saveOrder(status,cash=null){
  readFields();if(saving||!order.items.length)return false;
  saving=true;
  const pay=$('#payment-form button[type=submit]');pay.disabled=true;$('#save-order').disabled=true;
  try {
    const saved=await persistOrder(order,status,cash,order.requestId,totals().total);
    order=freshOrder();renderOrder();
    if(status==='Paid')paidOrder=saved;else notify('Order archived.');return saved;
  }catch(error){notify(error.message,true);return false;}
  finally{saving=false;pay.disabled=false;$('#save-order').disabled=!order.items.length;}
}
function renderArchives(){
  const list=$('#archive-list');list.replaceChildren();
  try {
    const archives=readArchives();if(!archives.length)list.append(el('p','No archived orders yet.','muted'));
    for(const entry of archives){
      const row=el('article',undefined,'archive-entry');const heading=el('div');heading.append(el('strong',entry.number),el('span',entry.status,'archive-status'));
      row.append(heading,el('p',`${entry.customer||'Guest'} · ${entry.service} · ${entry.quantity} units · ${money(entry.total)}`));
      if(entry.status==='Archived'){
        const restore=el('button','Restore order');restore.addEventListener('click',async()=>{
          if(order.items.length){notify('Archive or finish the current order first.');return;}
          restore.disabled=true;
          try {
            const current=await fetchOrder(entry.id);if(current.status!=='Archived')throw new Error('This order has already been paid.');
            order={id:current.id,version:current.version,requestId:crypto.randomUUID(),number:current.number,customer:current.customer,table:current.table,service:current.service,items:current.items};
            renderOrder();$('#archive-dialog').close();notify('Order restored. Checkout uses your current tax settings.');
          }catch(error){notify(error.message,true);}finally{restore.disabled=false;}
        });row.append(restore);
      }list.append(row);
    }
  }catch(error){list.append(el('p',error.message,'error'));}
}
$('#search').addEventListener('input',renderCatalog);
$('#customer').addEventListener('input',()=>{readFields();remember();});$('#table').addEventListener('change',()=>{readFields();remember();});
for(const button of document.querySelectorAll('[data-category]'))button.addEventListener('click',()=>{category=button.dataset.category;renderCatalog();});
$('#reset-filter').addEventListener('click',()=>{category='All Menu';$('#search').value='';renderCatalog();});
for(const button of document.querySelectorAll('[data-service]'))button.addEventListener('click',()=>{readFields();order.service=button.dataset.service;renderOrder();});
$('#note-form').addEventListener('submit',event=>{event.preventDefault();if(order.items[noteIndex])order.items[noteIndex].note=$('#note').value.trim();$('#note-dialog').close();renderOrder();});
$('#save-order').addEventListener('click',()=>saveOrder('Archived'));
$('#archives').addEventListener('click',()=>{renderArchives();$('#archive-dialog').showModal();});
$('#pay').addEventListener('click',async()=>{
  readFields();
  try{await refresh();products=getCatalog();settings=getSettings();
    if(!order.id)order.items=order.items.map(item=>{const product=products.find(value=>value.id===item.productId);return product?{...item,price:product.price,name:product.name,category:product.category,unit:product.unit,image:product.image}:item;});
    renderOrder();
  }catch(error){notify(error.message,true);return;}
  if(order.service==='Dine in'&&!order.table){notify('Select a table for this dine-in order.');$('#table').focus();return;}
  $('#payment-items').replaceChildren();
  appendReceiptItems($('#payment-items'),order.items);
  for(const [label,value] of [['Subtotal',totals().subtotal],['Tax',totals().tax]])appendReceiptRow($('#payment-items'),label,money(value));
  $('#payment-total').textContent=money(totals().total);$('#cash').value='';$('#cash').step='0.01';$('#cash').min=totals().total;
  $('#payment-error').textContent='';$('#change').textContent=money(0);$('#payment-dialog').showModal();
});
function updateChange(){$('#change').textContent=money(Math.max(0,Number($('#cash').value)-totals().total));$('#payment-error').textContent='';}
for(const button of document.querySelectorAll('[data-nominal]'))button.addEventListener('click',()=>{$('#cash').value=button.dataset.nominal;updateChange();});
$('#cash').addEventListener('input',updateChange);
$('#payment-form').addEventListener('submit',async event=>{event.preventDefault();const cash=Number($('#cash').value);if(!validMoney(cash)||cash<totals().total){$('#payment-error').textContent='Cash received must cover the total.';return;}const saved=await saveOrder('Paid',cash);if(saved){$('#payment-dialog').close();showReceipt(saved);}});
function appendReceiptRow(container,label,value){
  const row=el('div',undefined,'receipt-row');row.append(el('span',label),el('strong',value));container.append(row);
}
function appendReceiptItems(container,items){
  for(const item of items){
    appendReceiptRow(container,`${item.quantity} × ${item.name}`,money(item.price*item.quantity));
    if(item.note)container.append(el('p',item.note,'muted receipt-note'));
  }
}
function showReceipt(saved){
  const content=$('#receipt-content');content.replaceChildren();
  content.append(el('h3',settings.name),el('p',settings.address,'muted'));
  appendReceiptRow(content,'Order',saved.number);
  appendReceiptRow(content,'Customer',saved.customer||'Guest');
  appendReceiptRow(content,'Service',`${saved.service}${saved.table?' · Table '+saved.table:''}`);
  appendReceiptRow(content,'Date',new Date(saved.savedAt).toLocaleString('id-ID'));
  const items=el('div',undefined,'checkout-receipt-items');appendReceiptItems(items,saved.items);content.append(items);
  for(const [label,value] of [['Subtotal',saved.subtotal],['Tax',saved.tax],['Total',saved.total],['Cash received',saved.cash],['Change',saved.change]])appendReceiptRow(content,label,money(value));
  content.append(el('p',settings.receipt,'receipt-message'));$('#receipt-dialog').showModal();
}
function acceptOrder(){
  if(!paidOrder)return;
  $('#receipt-dialog').close();$('#accepted-order').textContent=`${paidOrder.number} has been received. You can now start a new order.`;
  $('#order-success-dialog').showModal();
}
$('#receipt-done').addEventListener('click',acceptOrder);
$('#receipt-dialog').addEventListener('cancel',event=>{event.preventDefault();acceptOrder();});
function finishOrder(){paidOrder=null;$('#order-success-dialog').close();$('#search').focus();}
$('#new-order').addEventListener('click',finishOrder);
$('#order-success-dialog').addEventListener('cancel',event=>{event.preventDefault();finishOrder();});
for(const button of document.querySelectorAll('.close-dialog'))button.addEventListener('click',()=>button.closest('dialog').close());
window.addEventListener('focus',()=>{if(!document.querySelector('dialog[open]'))catalogRefresh();});
renderCatalog();renderOrder();
