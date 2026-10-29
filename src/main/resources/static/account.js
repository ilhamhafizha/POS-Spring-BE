import { $, money, notify } from './shell.mjs';
import { validateSettings, calculateTotals } from './pos-store.mjs';
import { getProfile, getSession, getSettings, saveSettings, saveProfile, logout } from './api.mjs';
if($('#settings-form')) {
  let settings=getSettings();
  function fill(){
    $('#store-name').value=settings.name;$('#store-phone').value=settings.phone;$('#store-address').value=settings.address;
    $('#store-receipt').value=settings.receipt;$('#tax-mode').value=settings.taxMode;$('#tax-value').value=settings.taxValue;$('#store-tables').value=settings.tables;
    $('#settings-error').textContent='';preview();
  }
  function preview(){
    const mode=$('#tax-mode').value;const value=Number($('#tax-value').value);
    $('#tax-value-label').textContent=mode==='percent'?'Tax percentage (%)':'Tax amount (IDR)';
    $('#tax-label').hidden=mode==='none';$('#tax-value').disabled=mode==='none';$('#tax-value').max=mode==='percent'?'100':'1000000000000';
    const total=calculateTotals([{price:100000,quantity:1}],{taxMode:mode,taxValue:Number.isFinite(value)&&value>=0?value:0}).total;
    $('#tax-example').textContent=`${money(total)} total`;
  }
  $('#tax-mode').addEventListener('change',preview);$('#tax-value').addEventListener('input',preview);
  $('#settings-form').addEventListener('submit',async event=>{
    event.preventDefault();
    try {const next=validateSettings({name:$('#store-name').value,phone:$('#store-phone').value,address:$('#store-address').value,receipt:$('#store-receipt').value,
      taxMode:$('#tax-mode').value,taxValue:$('#tax-mode').value==='none'?0:Number($('#tax-value').value),tables:Number($('#store-tables').value)});
      settings=await saveSettings({...next,version:settings.version});fill();notify('Settings saved. New checkouts will use these settings.');
    }catch(error){$('#settings-error').textContent=error.message;}
  });
  $('#settings-form').addEventListener('reset',event=>{event.preventDefault();fill();});fill();
  if(getSession().role!=='Admin'){
    $('#settings-form').querySelectorAll('input,textarea,select').forEach(control=>control.disabled=true);
    $('#settings-form').querySelectorAll('button').forEach(control=>control.hidden=true);
    $('.page-description').textContent='View store information and checkout settings.';
    $('.preview-notice p').textContent='Store settings are managed by your administrator.';
    const profileLink=document.createElement('a');profileLink.href='/profile';profileLink.className='secondary';profileLink.textContent='Edit My Profile';
    $('.settings-actions').append(profileLink);
  }
}
if($('#profile-form')) {
  let profile=getProfile();
  function fill(){
    $('#profile-name').value=profile.name;$('#profile-email').value=profile.email;$('#profile-phone').value=profile.phone||'';
    $('#profile-display-name').textContent=profile.name;$('#profile-display-email').textContent=profile.email;$('#profile-role').textContent=getSession().role;
    $('#shell-name').textContent=profile.name;$('#profile-error').textContent='';
  }
  $('#profile-form').addEventListener('submit',async event=>{
    event.preventDefault();
    try {
      const next={name:$('#profile-name').value.trim(),email:$('#profile-email').value.trim(),phone:$('#profile-phone').value.trim()};
      if(!next.name||next.name.length>80||!next.email)throw new Error('Enter your name and email address.');
      profile=await saveProfile(next);fill();notify('Profile updated.');
    }catch(error){$('#profile-error').textContent=error.message;}
  });
  $('#profile-form').addEventListener('reset',event=>{event.preventDefault();fill();});$('#profile-logout').addEventListener('click',async()=>{try{await logout();}catch(error){notify(error.message,true);}});fill();
}
