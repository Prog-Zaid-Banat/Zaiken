'use strict';

var App = (function(){

  var pages = {
    launcher:     { module: 'LauncherPage' },
    overlay:      { module: 'OverlayPage' },
    ai: { module: 'AnalysisPage' },
    achievements: { module: 'AchievementsPage' },
    settings:     { module: 'SettingsPage' },
    profile:      { module: 'ProfilePage' }
  };

  var currentPage = 'launcher';

  function init(){
    bindNav();
    bindTitlebar();
    applyThemeFromSettings();
    refreshSidebar();
    navigateTo('launcher');
    try {
      zaiken.achievements.evaluate().then(function(list){
        if(list && list.length) list.forEach(function(a){ if(window.Toast) Toast.success((a.icon||'★')+' Unlocked: '+a.name); });
      }).catch(function(){});
    } catch(e) {}
    console.log('Zaiken ready');
  }

  async function applyThemeFromSettings(){
    try {
      var s = await zaiken.settings.get();
      if(s && s.accentColor){
        document.documentElement.style.setProperty('--neon', s.accentColor);
      }
    } catch(e) {}
  }

  function bindNav(){
    document.querySelectorAll('.nav-btn').forEach(function(btn){
      btn.addEventListener('click', function(){
        navigateTo(this.dataset.page);
      });
    });
    var profileMini = document.getElementById('profile-mini');
    if(window.zaiken && zaiken.onNavigate){
      zaiken.onNavigate(function(page){ navigateTo(page); });
    }
  }

  function bindTitlebar(){
    var min = document.getElementById('btn-min');
    var max = document.getElementById('btn-max');
    var cls = document.getElementById('btn-cls');
    if(min) min.addEventListener('click', function(){ zaiken.window.minimize(); });
    if(max) max.addEventListener('click', function(){ zaiken.window.maximize(); });
    if(cls) cls.addEventListener('click', function(){ zaiken.window.close(); });
  }

  function navigateTo(pageId){
    if(!pages[pageId]) return;

    var oldPage = document.getElementById('page-' + currentPage);
    if(oldPage) oldPage.classList.remove('active');
    document.querySelectorAll('.nav-btn').forEach(function(b){
      b.classList.remove('active');
    });

    var newPage = document.getElementById('page-' + pageId);
    if(newPage) newPage.classList.add('active');

    var navBtn = document.querySelector('.nav-btn[data-page="' + pageId + '"]');
    if(navBtn) navBtn.classList.add('active');

    currentPage = pageId;

    var moduleRef = window[pages[pageId].module];
    if(moduleRef && typeof moduleRef.render === 'function'){
      moduleRef.render(newPage);
    }
  }

  async function refreshSidebar(){
    try {
      var profile = await zaiken.profile.get();
      var nameEl = document.getElementById('profile-uname');
      var rankEl = document.getElementById('profile-rank-lbl');
      var xpFill = document.getElementById('xp-fill');
      var xpLbl  = document.getElementById('xp-lbl');
      if(nameEl) nameEl.textContent = profile.username || 'Player';
      if(rankEl) rankEl.textContent = profile.rank || 'Bronze';
      var xpPct = profile.xpMax > 0 ? Math.round((profile.xp / profile.xpMax) * 100) : 0;
      if(xpFill) xpFill.style.width = xpPct + '%';
      if(xpLbl)  xpLbl.textContent  = 'LVL ' + (profile.level || 1);
    } catch(e){
      console.error('Sidebar error:', e);
    }
  }

  return {
    init: init,
    navigateTo: navigateTo,
    refreshSidebar: refreshSidebar,
    applyThemeFromSettings: applyThemeFromSettings
  };

})();


// App.init() will be called by login.js after authentication