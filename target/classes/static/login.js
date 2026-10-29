import { login } from './api.mjs';
import { safeNext } from './pos-store.mjs';
const $=selector=>document.querySelector(selector);
$('#login-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=$('#login-form button[type=submit]');button.disabled=true;$('#login-error').textContent='';
  try{
    const profile=await login($('#login-email').value.trim(),$('#login-password').value);
    const next=safeNext(new URLSearchParams(location.search).get('next'));
    const allowed=profile.role==='Admin'||['/cashier','/profile','/settings','/reports'].includes(next);
    location.replace(next&&allowed?next:profile.role==='Admin'?'/admin':'/cashier');
  }catch(error){$('#login-error').textContent=error.message;}
  finally{button.disabled=false;}
});
