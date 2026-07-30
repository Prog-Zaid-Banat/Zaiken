// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
window.ProfilePage = (function(){
  function render(container){ loadAndRender(container); }
  async function loadAndRender(container){
    var profile = await zaiken.profile.get();
    var daily = await zaiken.stats.getDaily(30);
    var totalHours = (daily.reduce(function(a,d){return a+(d.minutes||0);},0)/60).toFixed(1);
    var kd = profile.totalDeaths>0?(profile.totalKills/profile.totalDeaths).toFixed(2):profile.totalKills||'—';
    var wr = profile.totalMatches>0?Math.round((profile.totalWins/profile.totalMatches)*100)+'%':'—';
    container.innerHTML = [
      '<div class="sh"><span class="sh-title"> Player Profile</span><div class="sh-line"></div>',
      '<button class="btn btn-sm btn-primary" id="btn-edit-profile">✏️ Edit Profile</button></div>',
      '<div style="padding:0 24px 24px">',
        '<div style="display:grid;grid-template-columns:280px 1fr;gap:20px;margin-top:20px">',
          '<div style="display:flex;flex-direction:column;gap:16px">',
            '<div class="card" style="text-align:center;padding:24px 20px">',
              '<div style="width:72px;height:72px;border-radius:50%;background:rgba(0,255,178,.13);border:2px solid rgba(0,255,178,.4);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:var(--neon);margin:0 auto 14px;overflow:hidden" id="prf-ava">'+
                (profile.avatar?'<img src="file://'+profile.avatar.replace(/\\/g,'/')+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':esc(profile.username||'P').charAt(0).toUpperCase())+
              '</div>',
              '<div style="font-size:22px;font-weight:700;color:#fff;margin-bottom:4px">'+esc(profile.username||'Player')+'</div>',
              '<div style="font-size:12px;color:var(--neon3);font-family:var(--mono);letter-spacing:2px;margin-bottom:8px">'+esc(profile.rank||'Bronze')+'</div>',
              (profile.bio?'<div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:12px">'+esc(profile.bio)+'</div>':''),
              (profile.country?'<div style="font-size:12px;color:var(--text2)">'+esc(profile.country)+'</div>':''),
              '<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border)">',
                '<div style="font-size:11px;color:var(--text2);margin-bottom:8px">LVL '+profile.level+' — '+profile.xp+' / '+profile.xpMax+' XP</div>',
                '<div style="height:5px;background:var(--border);border-radius:2px;overflow:hidden">',
                  '<div style="height:100%;width:'+Math.round((profile.xp/profile.xpMax)*100)+'%;background:var(--neon);border-radius:2px"></div>',
                '</div>',
              '</div>',
            '</div>',
          '</div>',
          '<div style="display:flex;flex-direction:column;gap:16px">',
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">',
              statCard(profile.totalKills,'Total Kills','y'),
              statCard(profile.totalDeaths,'Deaths','r'),
              statCard(kd,'K/D Ratio','g'),
              statCard(wr,'Win Rate','g'),
              statCard(profile.totalMatches,'Matches',''),
              statCard(profile.totalWins,'Wins','g'),
              statCard(profile.bestWinStreak,'Best Streak','y'),
              statCard(totalHours+'h','Hours Played',''),
            '</div>',
            '<div class="card">',
              '<div class="card-title">Performance Trend (30 Days)</div>',
              renderMiniTrend(daily),
            '</div>',
            '<div class="card">',
              '<div class="card-title">Member Since</div>',
              '<div style="font-size:18px;font-weight:700;color:#fff">'+new Date(profile.joinDate||Date.now()).toLocaleDateString('en',{year:'numeric',month:'long',day:'numeric'})+'</div>',
              '<div style="font-size:12px;color:var(--text2);margin-top:6px">Anti-Tamper ID: <span style="font-family:var(--mono);color:var(--neon)">'+esc((profile.id||'').substring(0,16))+'...</span></div>',
            '</div>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
    container.querySelector('#btn-edit-profile').addEventListener('click', function(){ showEditModal(profile, container); });
  }
  function statCard(val,label,color){
    return '<div class="sc"><div class="sv '+(color||'')+'">'+val+'</div><div class="sl">'+label+'</div></div>';
  }
  function renderMiniTrend(daily){
    var max = Math.max.apply(null,daily.map(function(d){return d.minutes||0;}))||1;
    return '<div style="display:flex;gap:2px;height:60px;align-items:flex-end">'+
      daily.map(function(d){
        var pct=Math.round(((d.minutes||0)/max)*100);
        return '<div style="flex:1;background:rgba(0,255,178,'+(d.minutes>0?'0.7':'0.1')+');border-radius:1px 1px 0 0;height:'+Math.max(pct,2)+'%;min-height:2px" title="'+d.date+': '+(d.minutes/60).toFixed(1)+'h"></div>';
      }).join('')+
    '</div><div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text2);margin-top:6px"><span>30d ago</span><span>Today</span></div>';
  }
  function showEditModal(profile, container){
    Modal.open({
      titleText:'Edit Profile',
      bodyHTML:[
        '<div class="frow"><label class="fi">Username</label><input class="inp" id="ep-name" value="'+esc(profile.username||'')+'"></div>',
        '<div class="frow"><label class="fi">Bio</label><textarea class="inp" id="ep-bio" rows="3" style="resize:vertical">'+esc(profile.bio||'')+'</textarea></div>',
        '<div class="frow"><label class="fi">Country / Region</label><input class="inp" id="ep-country" value="'+esc(profile.country||'')+'"></div>',
      ].join(''),
      buttons:[
        {label:'Cancel',cls:'btn-ghost'},
        {label:'Save',cls:'btn-primary',action:async function(){
          var name = document.getElementById('ep-name').value.trim();
          if(!name){Toast.error('Username cannot be empty');return;}
          await zaiken.profile.save({
            username:name,
            bio:document.getElementById('ep-bio').value.trim(),
            country:document.getElementById('ep-country').value.trim()
          });
          Toast.success('Profile updated!');
          loadAndRender(container);
          App.refreshSidebar();
        }}
      ]
    });
  }
  function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  return {render:render};
})();