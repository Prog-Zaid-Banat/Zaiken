// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
window.Modal = (function(){
  var bg = document.getElementById('modal-bg');
  var title = document.getElementById('modal-title');
  var body = document.getElementById('modal-body');
  var feet = document.getElementById('modal-feet');
  bg.addEventListener('click', function(e){ if(e.target===bg) close(); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && !bg.hidden) close(); });
  function close(){ bg.hidden=true; title.textContent=''; body.innerHTML=''; feet.innerHTML=''; }
  function open(opts){
    title.textContent = opts.titleText||'';
    body.innerHTML = opts.bodyHTML||'';
    feet.innerHTML = '';
    var buttons = opts.buttons||[];
    for(var i=0;i<buttons.length;i++){
      (function(btn){
        var el=document.createElement('button');
        el.className='btn '+(btn.cls||'');
        el.textContent=btn.label;
        el.addEventListener('click',function(){ if(btn.action) btn.action(); close(); });
        feet.appendChild(el);
      })(buttons[i]);
    }
    bg.hidden=false;
  }
  function confirm(msg,onYes,onNo){
    open({titleText:'Confirm',bodyHTML:'<p>'+msg+'</p>',buttons:[
      {label:'Cancel',cls:'btn-ghost',action:onNo},
      {label:'Confirm',cls:'btn-primary',action:onYes}
    ]});
  }
  return {open:open,close:close,confirm:confirm};
})();