// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
window.AchievementsPage = (function(){
  function render(container){ loadAndRender(container); }
  async function loadAndRender(container){
    var achs = await zaiken.achievements.getAll();
    var unlocked = achs.filter(function(a){return a.unlocked;}).length;
    container.innerHTML = [
      '<div class="sh"><span class="sh-title"> Achievements & Discounts</span><div class="sh-line"></div>',
      '<span class="sh-extra">'+unlocked+'/'+achs.length+' Unlocked</span></div>',
      '<div style="padding:0 24px 24px;margin-top:16px">',
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">',
      achs.map(function(a){ return renderAch(a); }).join(''),
      '</div></div>'
    ].join('');
    container.querySelectorAll('.ach-card.un').forEach(function(card){
      card.addEventListener('click', function(){
        var id = this.dataset.id;
        var a = achs.find(function(x){return x.id===id;});
        if(!a) return;
        Modal.open({
          titleText: a.icon+' '+a.name,
          bodyHTML: '<p style="margin-bottom:12px">'+esc(a.desc)+'</p>'+
            '<p style="color:var(--neon3)">Reward: <strong>'+esc(a.discount)+'</strong></p>'+
            (a.unlockedAt?'<p style="margin-top:10px;font-size:12px;color:var(--text2)">Unlocked: '+new Date(a.unlockedAt).toLocaleDateString()+'</p>':''),
          buttons:[{label:'Close',cls:'btn-ghost'}]
        });
      });
    });
  }
  function renderAch(a){
    var pct = a.goal>0?Math.min(100,Math.round((a.progress/a.goal)*100)):0;
    return '<div class="ach-card '+(a.unlocked?'un':'lk')+'" data-id="'+a.id+'">'+
      '<div class="ach-icon">'+a.icon+'</div>'+
      '<div class="ach-name">'+esc(a.name)+'</div>'+
      '<div class="ach-desc">'+esc(a.desc)+'</div>'+
      '<div class="ach-disc">'+esc(a.discount)+'</div>'+
      (a.unlocked?'<div style="margin-top:8px;font-size:10px;color:var(--neon);font-family:var(--mono)">✓ UNLOCKED</div>':
        '<div class="ach-pb"><div class="ach-pbf" style="width:'+pct+'%"></div></div>'+
        '<div style="font-size:10px;color:var(--text2);margin-top:4px;font-family:var(--mono)">'+a.progress+'/'+a.goal+'</div>')+
    '</div>';
  }
  function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  return {render:render};
})();