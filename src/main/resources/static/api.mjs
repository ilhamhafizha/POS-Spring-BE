import { normalizeArchive, KEYS } from './pos-store.mjs';
let csrfToken=null;
let profile=null;
let products=[];
let settings=null;
let orders=[];
export class ApiError extends Error {constructor(message,status){super(message);this.status=status;}}
export async function request(path,{method='GET',body,form=false,redirect=true,retryCsrf=true}={}){
  const headers={Accept:'application/json'};
  if(!['GET','HEAD'].includes(method)){
    if(!csrfToken)csrfToken=await request('/api/auth/csrf',{redirect:false});
    headers[csrfToken.headerName]=csrfToken.token;
  }
  if(body!==undefined)headers['Content-Type']=form?'application/x-www-form-urlencoded':'application/json';
  let response;
  try{response=await fetch(path,{method,headers,body:body===undefined?undefined:form?new URLSearchParams(body):JSON.stringify(body),credentials:'same-origin',cache:'no-store'});}
  catch{throw new ApiError('Backend is unavailable. Start Spring Boot and open this page on its server.',0);}
  const json=response.status===204?null:await response.json().catch(()=>null);
  if(!response.ok){
    if(response.status===403&&!['GET','HEAD'].includes(method)&&retryCsrf){
      csrfToken=await request('/api/auth/csrf',{redirect:false});
      return request(path,{method,body,form,redirect,retryCsrf:false});
    }
    if(response.status===401&&redirect)location.replace(`/login?next=${encodeURIComponent(location.pathname==='/'?'/cashier':location.pathname)}`);
    const details=json?.errors?.map(error=>`${error.field}: ${error.message}`).join('; ');
    throw new ApiError(details||json?.message||`Request failed (${response.status}). Start Spring Boot if you are using the old static preview.`,response.status);
  }
  return json;
}
export async function loadSession(){profile=await request('/api/auth/me',{redirect:false});return profile;}
export async function initialize(){
  const values=await Promise.all([request('/api/products'),request('/api/settings'),request('/api/orders')]);
  products=values[0].map(product=>({...product,id:String(product.id)}));settings=values[1];orders=values[2].map(normalizeArchive).filter(Boolean);
}
export function getSession(){return profile;}
export function getProfile(){return profile;}
export function getCatalog(){return products;}
export function getSettings(){return settings;}
export function readArchives(){return orders;}
export function draftKey(){return `${KEYS.draft}:server:${profile.id}`;}
export async function refresh(){await initialize();}
export async function login(email,password){await request('/api/auth/login',{method:'POST',body:{email,password},form:true,redirect:false});csrfToken=null;return loadSession();}
export async function logout(){
  await request('/api/auth/logout',{method:'POST'});try{sessionStorage.removeItem(draftKey());}catch{}csrfToken=null;profile=null;location.replace('/login');
}
export async function saveProduct(product,id){
  await request(id?`/api/products/${id}`:'/api/products',{method:id?'PUT':'POST',body:product});
  products=(await request('/api/products')).map(value=>({...value,id:String(value.id)}));
}
export async function deleteProduct(id){await request(`/api/products/${id}`,{method:'DELETE'});products=products.filter(product=>product.id!==id);}
export async function saveSettings(value){settings=await request('/api/settings',{method:'PUT',body:value});return settings;}
export async function saveProfile(value){profile=await request('/api/profile',{method:'PUT',body:value});return profile;}
export async function saveOrder(order,status,cash,requestId,expectedTotal){
  const body={requestId,expectedTotal,customer:order.customer,table:order.table,service:order.service,status,cash,
    version:order.version??null,items:order.items.map(item=>({productId:Number(item.productId),quantity:item.quantity,note:item.note}))};
  const saved=normalizeArchive(await request(order.id?`/api/orders/${order.id}`:'/api/orders',{method:order.id?'PUT':'POST',body}));
  orders=[saved,...orders.filter(value=>value.id!==saved.id)];return saved;
}
export async function fetchReport(range){
  const params=new URLSearchParams({...range,zone:Intl.DateTimeFormat().resolvedOptions().timeZone});
  return request(`/api/reports?${params}`);
}
export async function fetchOrder(id){return normalizeArchive(await request(`/api/orders/${id}`));}
