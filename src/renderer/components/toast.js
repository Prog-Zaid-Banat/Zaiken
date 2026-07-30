window.Toast = (function(){
  const c = document.getElementById('toast-container');
  function show(msg, type, dur){
    type = type||'info'; dur = dur||3500;
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(function(){ el.style.opacity='0'; el.style.transform='translateY(8px)'; el.style.transition='all .25s ease'; setTimeout(function(){ el.remove(); }, 260); }, dur);
  }
  return { show:show, success:function(m,d){show(m,'success',d);}, error:function(m,d){show(m,'error',d||5000);}, info:function(m,d){show(m,'info',d);}, warn:function(m,d){show(m,'warn',d);} };
})();