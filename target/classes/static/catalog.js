import { $, el, picture, money, notify } from './shell.mjs';
import { validateProduct } from './pos-store.mjs';
import { getCatalog, saveProduct, deleteProduct } from './api.mjs';
let products = [];
let editing = null;
let image = '';
let deleting = null;
let loadFailed = false;
let photoVersion = 0;
try { products = getCatalog(); } catch(error) { loadFailed=true;notify(error.message,true); }
const controls=['#catalog-search','#catalog-category','#catalog-status'];

function render() {
  const query=$('#catalog-search').value.trim().toLowerCase();
  const category=$('#catalog-category').value;
  const status=$('#catalog-status').value;
  const filtered=products.filter(product=>(category==='All'||product.category===category)
    && (status==='All'||product.active===(status==='active'))
    && `${product.name} ${product.description}`.toLowerCase().includes(query));
  $('#catalog-count').textContent=`${products.length} products · ${products.filter(product=>product.active).length} active`;
  $('#catalog-body').replaceChildren();$('#catalog-empty').hidden=filtered.length>0;
  $('#add-product').disabled=loadFailed;
  for(const product of filtered) {
    const row=el('tr');const cell=el('td');const info=el('div',undefined,'catalog-product');
    const copy=el('div');copy.append(el('strong',product.name),el('p',product.description));
    info.append(picture(product,'catalog-photo'),copy);cell.append(info);
    const price=el('td',`${money(product.price)} /${product.unit}`);
    const availability=el('td');availability.append(el('span',product.active?'Active':'Inactive',`status-pill${product.active?'':' archived'}`));
    const actions=el('td');const buttons=el('div',undefined,'row-actions');
    const edit=el('button','Edit');edit.setAttribute('aria-label',`Edit ${product.name}`);edit.addEventListener('click',()=>openEditor(product));
    const remove=el('button','Delete','delete-product');remove.setAttribute('aria-label',`Delete ${product.name}`);
    remove.addEventListener('click',()=>{deleting=product.id;$('#delete-message').textContent=`Delete “${product.name}” from your catalog?`;$('#delete-dialog').showModal();});
    buttons.append(edit,remove);actions.append(buttons);row.append(cell,el('td',product.category),price,availability,actions);$('#catalog-body').append(row);
  }
}
function previewPhoto(){
  $('#photo-preview').replaceChildren();$('#remove-photo').hidden=!image;
  if(image){const photo=el('img');photo.src=image;photo.alt='Product photo preview';$('#photo-preview').append(photo);}
}
function openEditor(product=null) {
  photoVersion++;
  $('#product-form button[type=submit]').disabled=false;
  editing=product?.id||null;image=product?.image||'';
  $('#product-form').reset();$('#product-dialog-title').textContent=product?'Edit Product':'Add Product';
  $('#product-name').value=product?.name||'';$('#product-category').value=product?.category||'Foods';
  $('#product-unit').value=product?.unit||'portion';$('#product-price').value=product?.price??'';
  $('#product-description').value=product?.description||'';$('#product-active').checked=product?.active??true;
  $('#product-error').textContent='';previewPhoto();$('#product-dialog').showModal();
}
$('#add-product').addEventListener('click',()=>openEditor());
for(const selector of controls)$(selector).addEventListener(selector.includes('search')?'input':'change',render);
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
$('#product-photo').addEventListener('change',async()=>{
  const file=$('#product-photo').files[0];if(!file)return;
  const version=++photoVersion;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>1024*1024){$('#product-error').textContent='Choose a PNG, JPEG or WebP image up to 1 MB.';$('#product-photo').value='';$('#product-form button[type=submit]').disabled=false;return;}
  $('#product-form button[type=submit]').disabled=true;
  try {
    const result=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('The photo could not be read.'));reader.readAsDataURL(file);});
    const photo=new Image();photo.src=result;await photo.decode();if(version!==photoVersion)return;image=result;$('#product-error').textContent='';previewPhoto();
  }catch {if(version===photoVersion)$('#product-error').textContent='This image could not be opened. Choose another file.';}
  finally {if(version===photoVersion)$('#product-form button[type=submit]').disabled=false;}
});
$('#remove-photo').addEventListener('click',()=>{photoVersion++;image='';$('#product-photo').value='';$('#product-form button[type=submit]').disabled=false;previewPhoto();});
$('#product-form').addEventListener('submit',async event=>{
  event.preventDefault();
  try {
    const product=validateProduct({id:editing,name:$('#product-name').value,category:$('#product-category').value,unit:$('#product-unit').value,
      price:Number($('#product-price').value),description:$('#product-description').value,image,active:$('#product-active').checked});
    $('#product-form button[type=submit]').disabled=true;
    await saveProduct(product,editing);products=getCatalog();$('#product-dialog').close();render();notify(editing?'Product updated.':'Product added to catalog.');
  }catch(error){$('#product-error').textContent=error.message;}
  finally{$('#product-form button[type=submit]').disabled=false;}
});
$('#confirm-delete').addEventListener('click',async()=>{
  try {$('#confirm-delete').disabled=true;await deleteProduct(deleting);products=getCatalog();$('#delete-dialog').close();render();notify('Product deleted.');}
  catch(error){$('#delete-dialog').close();notify(error.message,true);}
  finally{$('#confirm-delete').disabled=false;}
});
render();
