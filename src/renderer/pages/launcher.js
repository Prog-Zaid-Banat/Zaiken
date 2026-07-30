// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
window.LauncherPage = (function(){
  var games = [];
  var selectedId = null;
  var sessionStart = null;
  var activeGameId = null;

  function render(container){
    container.innerHTML = [
      '<div class="sh"><span class="sh-title"> Game Library</span><div class="sh-line"></div>',
      '<button class="btn btn-sm" id="btn-scan-games"> Auto-Scan</button>&nbsp;',
      '<button class="btn btn-primary btn-sm" id="btn-add-game">+ Add Game</button></div>',
      '<div id="launcher-inner" style="padding:20px 24px;display:grid;grid-template-columns:1fr 340px;gap:20px"></div>'
    ].join('');
    container.querySelector('#btn-add-game').addEventListener('click', showAddGameModal);
    container.querySelector('#btn-scan-games').addEventListener('click', scanGames);
    loadAndRender();
  }

  async function loadAndRender(){
    games = await zaiken.games.getAll();
    var inner = document.getElementById('launcher-inner');
    if(!inner) return;
    if(games.length === 0){
      inner.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 0"><div style="font-size:48px;margin-bottom:16px">🎮</div><div style="color:var(--text2);font-size:16px;margin-bottom:20px">No games yet. Add your first game or auto-scan.</div><button class="btn btn-primary" id="btn-add-first">+ Add Your First Game</button></div>';
      inner.querySelector('#btn-add-first').addEventListener('click', showAddGameModal);
      return;
    }
    if(!selectedId) selectedId = games[0].id;
    var sel = games.find(function(g){return g.id===selectedId;}) || games[0];
    inner.innerHTML = [
      '<div>',
        renderHero(sel),
        '<div style="margin-top:16px"><div class="sh" style="padding:0 0 12px 0"><span class="sh-title">Library</span><div class="sh-line"></div><span class="sh-extra">'+games.length+' games</span></div>',
        '<div id="game-list">'+games.map(function(g){return renderGameItem(g, g.id===selectedId);}).join('')+'</div></div>',
      '</div>',
      '<div id="launcher-sidebar">'+renderSidebar(sel)+'</div>'
    ].join('');
    inner.querySelectorAll('.game-item').forEach(function(el){
      el.addEventListener('click', function(){
        selectedId = el.dataset.id;
        loadAndRender();
      });
    });
    inner.querySelector('#btn-launch').addEventListener('click', function(){ launchGame(sel); });
    var endBtn = inner.querySelector('#btn-end-session');
    if(endBtn) endBtn.addEventListener('click', function(){ endActiveSession(); });
    var logBtn = inner.querySelector('#btn-view-log');
    if(logBtn) logBtn.addEventListener('click', function(){ showLogHashes(sel); });
    var delBtn = inner.querySelector('#btn-del-game');
    if(delBtn) delBtn.addEventListener('click', function(){ deleteGame(sel); });
    var editBtn = inner.querySelector('#btn-edit-game');
    if(editBtn) editBtn.addEventListener('click', function(){ showEditGameModal(sel); });
  }

  function renderHero(g){
    var kd = g.deaths > 0 ? (g.kills/g.deaths).toFixed(1) : g.kills.toFixed(1);
    var wr = g.matches > 0 ? Math.round((g.wins/g.matches)*100) : 0;
    var hrs = (g.totalMinutes/60).toFixed(1);
    var imgHtml = g.coverImage ? '<img src="file://'+g.coverImage.replace(/\\/g,'/')+'" style="width:100%;height:100%;object-fit:cover;opacity:.25">' : '<span style="font-size:80px;opacity:.18">'+g.emoji+'</span>';
    return [
      '<div style="position:relative;background:var(--bg2);border:1px solid var(--border);overflow:hidden;border-radius:8px">',
        '<div style="position:absolute;right:0;top:0;bottom:0;width:280px;display:flex;align-items:center;justify-content:center;overflow:hidden">'+imgHtml+'</div>',
        '<div style="position:absolute;right:0;top:0;bottom:0;width:280px;background:linear-gradient(to right,var(--bg2) 0%,transparent 100%)"></div>',
        '<div style="position:relative;padding:28px 28px 24px">',
          '<div style="font-size:10px;letter-spacing:4px;color:var(--neon);font-family:var(--mono);margin-bottom:10px">// NOW PLAYING</div>',
          '<div style="font-size:36px;font-weight:700;letter-spacing:2px;color:#fff;line-height:1.1;margin-bottom:6px">'+esc(g.name)+'</div>',
          '<div style="font-size:12px;color:var(--text2);margin-bottom:20px">'+esc(g.genre)+' · '+esc(g.platform||'custom')+(g.lastPlayed?' · Last played '+_relTime(g.lastPlayed):'')+'</div>',
          '<div style="display:flex;gap:28px;margin-bottom:24px">',
            '<div><div style="font-size:26px;font-weight:700;color:#fff;font-family:var(--mono)">'+hrs+'h</div><div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:1px">Played</div></div>',
            '<div><div style="font-size:26px;font-weight:700;color:#fff;font-family:var(--mono)">'+kd+'</div><div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:1px">K/D</div></div>',
            '<div><div style="font-size:26px;font-weight:700;color:#fff;font-family:var(--mono)">'+wr+'%</div><div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:1px">Win Rate</div></div>',
            '<div><div style="font-size:26px;font-weight:700;color:#fff;font-family:var(--mono)">'+g.matches+'</div><div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:1px">Matches</div></div>',
          '</div>',
          '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">',
            '<button id="btn-launch" class="btn btn-play">▶ LAUNCH GAME</button>',
            (activeGameId===g.id && sessionStart ? '<button id="btn-end-session" class="btn btn-sm btn-danger">⏹ End Session</button>' : ''),
            '<button id="btn-edit-game" class="btn btn-sm btn-ghost">✏️ Edit</button>',
            '<button id="btn-del-game" class="btn btn-sm btn-danger">🗑 Remove</button>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
  }

  function renderGameItem(g, active){
    var hrs = (g.totalMinutes/60).toFixed(1)+'h';
    return '<div class="game-item'+(active?' sel':'')+'" data-id="'+g.id+'">'+
      '<div class="gi-cover">'+(g.coverImage?'<img src="file://'+g.coverImage.replace(/\\/g,'/')+'">':(g.emoji||'🎮'))+'</div>'+
      '<div class="f1"><div class="gi-name truncate">'+esc(g.name)+'</div><div class="gi-genre">'+esc(g.genre)+'</div></div>'+
      '<div class="gi-time">'+hrs+'</div></div>';
  }

  function renderSidebar(sel){
    return [
      '<div class="sh" style="padding:0 0 12px 0"><span class="sh-title">Today\'s Stats</span><div class="sh-line"></div></div>',
      '<div class="sg">',
        '<div class="sc"><div class="sv g">'+sel.wins+'</div><div class="sl">Wins</div></div>',
        '<div class="sc"><div class="sv r">'+sel.losses+'</div><div class="sl">Losses</div></div>',
        '<div class="sc"><div class="sv y">'+sel.kills+'</div><div class="sl">Kills</div></div>',
        '<div class="sc"><div class="sv">'+(sel.deaths > 0 ? (sel.kills/sel.deaths).toFixed(1) : sel.kills)+'</div><div class="sl">K/D</div></div>',
      '</div>',
      (activeGameId && sessionStart ? '<div class="card" style="margin-bottom:12px;border-color:rgba(0,255,178,.35)"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><div class="sdot on"></div><span style="font-size:13px;color:var(--neon);font-weight:700">SESSION LIVE</span></div><div style="font-size:12px;color:var(--text2)">Started '+_relTime(new Date(sessionStart).toISOString())+' · click End Session when done</div><button class="btn btn-sm btn-danger btn-full mt8" id="btn-end-session">⏹ End & Save Session</button></div>' : ''),
      '<div style="margin-top:16px" class="card">',
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">',
          '<div class="sdot on"></div><span style="font-size:13px;color:var(--neon);font-weight:700">ANTI-TAMPER ACTIVE</span>',
        '</div>',
        '<div style="font-size:12px;color:var(--text2);line-height:1.6">Stats sealed with HMAC-SHA256<br>',
        (sel.logPath ? 'Log file monitored · <span class="neon">Verified</span>' : 'Add log path in Edit to enable log monitoring'),
        '</div>',
        (sel.logPath ? '<button class="btn btn-sm btn-ghost btn-full mt8" id="btn-view-log">📋 View Log Hashes</button>' : ''),
      '</div>'
    ].join('');
  }

  async function launchGame(g){
    if(!g.exePath){ Toast.error('No executable path set. Edit the game to add one.'); return; }
    if(activeGameId && sessionStart){
      Toast.warn('A session is already running. End it first.');
      return;
    }
    var res = await zaiken.system.launchGame(g.exePath);
    if(res.ok){
      Toast.success('Launching '+g.name+'...');
      zaiken.system.powerSaveStart();
      sessionStart = Date.now();
      activeGameId = g.id;
      var exeName = (g.exePath || '').split(/[/\\]/).pop() || null;
      try { await zaiken.session.start({ gameId: g.id, exeName: exeName }); } catch(e) {}
      if(g.logPath){
        try { await zaiken.logs.startWatch(g.logPath, g.id); await zaiken.logs.hashFile(g.logPath, g.id); } catch(e) {}
      }
      loadAndRender();
    } else {
      Toast.error('Launch failed: '+res.error);
    }
  }

  async function endActiveSession(){
    if(!activeGameId || !sessionStart){
      Toast.info('No active play session.');
      return;
    }
    var gameId = activeGameId;
    var started = sessionStart;
    var minutes = Math.max(1, Math.round((Date.now() - started) / 60000));
    try {
      var res = await zaiken.session.end({ gameId: gameId, startedAt: started });
      if(res && res.ok){
        minutes = res.minutes || minutes;
        Toast.success('Session saved: '+minutes+' min');
        if(res.unlocked && res.unlocked.length){
          res.unlocked.forEach(function(a){ Toast.success((a.icon||'★')+' Unlocked: '+a.name); });
        }
      } else {
        await zaiken.games.addSession(gameId, minutes, {});
        Toast.success('Session saved: '+minutes+' min');
      }
    } catch(e){
      try { await zaiken.games.addSession(gameId, minutes, {}); Toast.success('Session saved: '+minutes+' min'); }
      catch(err){ Toast.error('Could not save session'); }
    }
    try { zaiken.system.powerSaveStop(); } catch(e) {}
    sessionStart = null;
    activeGameId = null;
    if(window.App && App.refreshSidebar) App.refreshSidebar();
    loadAndRender();
  }

  async function showLogHashes(g){
    if(!g.logPath){ Toast.info('No log path set for this game.'); return; }
    try {
      await zaiken.logs.hashFile(g.logPath, g.id);
      var hashes = await zaiken.logs.getHashes(g.id, 20);
      var rows = (hashes || []).slice().reverse().map(function(h){
        return '<div style="font-size:11px;font-family:var(--mono);padding:6px 0;border-bottom:1px solid var(--border)">'+
          '<div style="color:var(--neon)">'+(h.hash||'').substring(0,16)+'…</div>'+
          '<div style="color:var(--text2)">'+(h.size||0)+' bytes · '+new Date(h.timestamp||h.savedAt).toLocaleString()+'</div></div>';
      }).join('') || '<p style="color:var(--text2)">No hashes yet.</p>';
      Modal.open({
        titleText: 'Log integrity — '+g.name,
        bodyHTML: '<p style="font-size:12px;color:var(--text2);margin-bottom:10px">SHA-256 snapshots of <code style="color:var(--neon)">'+esc(g.logPath)+'</code></p>'+rows,
        buttons: [{label:'Close', cls:'btn-ghost'}]
      });
    } catch(e){
      Toast.error('Could not read log hashes');
    }
  }

  async function scanGames(){
    Toast.info('Scanning for installed games...');
    var found = await zaiken.system.scanGames();
    if(found.error){ Toast.error('Scan error: '+found.error); return; }
    if(!found.length){ Toast.info('No new games found on this system.'); return; }
    var list = found.map(function(g){
      var plat = (g.platform||g.source||'local').toUpperCase();
      return '<li style="padding:6px 0;font-size:13px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:8px">'+
        '<span>'+esc(g.emoji||'🎮')+' <strong>'+esc(g.name)+'</strong></span>'+
        '<span style="font-size:10px;color:var(--neon);font-family:var(--mono)">'+esc(plat)+'</span></li>';
    }).join('');
    Modal.open({
      titleText: 'Found '+found.length+' Game'+(found.length>1?'s':''),
      bodyHTML: '<p style="margin-bottom:12px;color:var(--text2)">Playnite-style scan: Epic manifests, Steam libraries, GOG folders. Import all?</p><ul style="max-height:240px;overflow-y:auto">'+list+'</ul>',
      buttons:[
        {label:'Cancel',cls:'btn-ghost'},
        {label:'Import All',cls:'btn-primary', action:async function(){
          for(var i=0;i<found.length;i++){
            var g = found[i];
            await zaiken.games.add({
              name: g.name,
              genre: g.genre || (g.platform || 'Unknown'),
              emoji: g.emoji || '🎮',
              exePath: g.exePath,
              platform: g.platform || 'custom',
              steamAppId: g.steamAppId || null
            });
          }
          Toast.success('Imported '+found.length+' game(s)!');
          loadAndRender();
        }}
      ]
    });
  }

  function showAddGameModal(){
    Modal.open({
      titleText: '+ Add New Game',
      bodyHTML: [
        '<div class="frow"><label class="fi">Game Name *</label><input class="inp" id="m-name" placeholder="e.g. Apex Legends"></div>',
        '<div class="frow"><label class="fi">Genre</label><input class="inp" id="m-genre" placeholder="e.g. Battle Royale"></div>',
        '<div class="frow"><label class="fi">Emoji Icon</label><input class="inp" id="m-emoji" placeholder="🎮" maxlength="2" style="width:80px"></div>',
        '<div class="frow"><label class="fi">Executable (.exe)</label>',
          '<div style="display:flex;gap:8px"><input class="inp f1" id="m-exe" placeholder="C:\\Games\\...\\game.exe" readonly>',
          '<button class="btn btn-sm" id="m-pick-exe">Browse</button></div></div>',
        '<div class="frow"><label class="fi">Cover Image (optional)</label>',
          '<div style="display:flex;gap:8px"><input class="inp f1" id="m-img" placeholder="Select image..." readonly>',
          '<button class="btn btn-sm" id="m-pick-img">Browse</button></div></div>',
        '<div class="frow"><label class="fi">Log File Path (optional)</label>',
          '<div style="display:flex;gap:8px"><input class="inp f1" id="m-log" placeholder="For AI log analysis..." readonly>',
          '<button class="btn btn-sm" id="m-pick-log">Browse</button></div></div>',
          '<div class="frow"><label class="fi">Riot ID / Game Username</label><input class="inp" id="m-riotid" placeholder="e.g. PlayerName#NA1"></div>',
      ].join(''),
      buttons:[
        {label:'Cancel',cls:'btn-ghost'},
        {label:'Add Game',cls:'btn-primary',action:async function(){
          var name = document.getElementById('m-name').value.trim();
          if(!name){Toast.error('Name is required'); return;}
          await zaiken.games.add({
            name:name,
            genre:document.getElementById('m-genre').value.trim()||'Unknown',
            emoji:document.getElementById('m-emoji').value.trim()||'🎮',
            exePath:document.getElementById('m-exe').value,
            coverImage:document.getElementById('m-img').value,
            riotId:document.getElementById('m-riotid').value.trim(),
            logPath:document.getElementById('m-log').value
          });
          Toast.success('Game added!');
          loadAndRender();
        }}
      ]
    });
    document.getElementById('m-pick-exe').addEventListener('click', async function(){
      var p = await zaiken.system.pickExe();
      if(p) document.getElementById('m-exe').value = p;
    });
    document.getElementById('m-pick-img').addEventListener('click', async function(){
      var p = await zaiken.system.pickImage();
      if(p) document.getElementById('m-img').value = p;
    });
    document.getElementById('m-pick-log').addEventListener('click', async function(){
      var p = await zaiken.system.pickLog();
      if(p) document.getElementById('m-log').value = p;
    });
  }

  function showEditGameModal(g){
    Modal.open({
      titleText: 'Edit: '+g.name,
      bodyHTML: [
        '<div class="frow"><label class="fi">Game Name</label><input class="inp" id="e-name" value="'+esc(g.name)+'"></div>',
        '<div class="frow"><label class="fi">Genre</label><input class="inp" id="e-genre" value="'+esc(g.genre)+'"></div>',
        '<div class="frow"><label class="fi">Emoji</label><input class="inp" id="e-emoji" value="'+esc(g.emoji||'🎮')+'" maxlength="2" style="width:80px"></div>',
        '<div class="frow"><label class="fi">Executable Path</label>',
          '<div style="display:flex;gap:8px"><input class="inp f1" id="e-exe" value="'+esc(g.exePath||'')+'">',
          '<button class="btn btn-sm" id="e-pick-exe">Browse</button></div></div>',
        '<div class="frow"><label class="fi">Log File Path</label>',
          '<div style="display:flex;gap:8px"><input class="inp f1" id="e-log" value="'+esc(g.logPath||'')+'">',
          '<button class="btn btn-sm" id="e-pick-log">Browse</button></div></div>',
        '<div class="frow"><label class="fi">Cover Image</label>',
          '<div style="display:flex;gap:8px"><input class="inp f1" id="e-img" value="'+esc(g.coverImage||'')+'">',
          '<button class="btn btn-sm" id="e-pick-img">Browse</button></div></div>',
        '<div style="border-top:1px solid var(--border);padding-top:14px;margin-top:4px">',
          '<div class="fi">Record Match Result (adds to stats)</div>',
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">',
            '<div><label class="fi">Kills</label><input class="inp" id="e-kills" type="number" min="0" value="0"></div>',
            '<div><label class="fi">Deaths</label><input class="inp" id="e-deaths" type="number" min="0" value="0"></div>',
            '<div><label class="fi">Result</label><select class="sel" id="e-result"><option value="win">Win</option><option value="loss">Loss</option><option value="draw">Draw</option></select></div>',
          '</div></div>'
      ].join(''),
      buttons:[
        {label:'Cancel',cls:'btn-ghost'},
        {label:'Save',cls:'btn-primary',action:async function(){
          var res = document.getElementById('e-result').value;
          var kills = parseInt(document.getElementById('e-kills').value)||0;
          var deaths = parseInt(document.getElementById('e-deaths').value)||0;
          await zaiken.games.update(g.id,{
            name:document.getElementById('e-name').value.trim()||g.name,
            genre:document.getElementById('e-genre').value.trim(),
            emoji:document.getElementById('e-emoji').value.trim()||g.emoji,
            exePath:document.getElementById('e-exe').value,
            logPath:document.getElementById('e-log').value,
            coverImage:document.getElementById('e-img').value,
            kills:(g.kills||0)+kills,deaths:(g.deaths||0)+deaths,
            wins:(g.wins||0)+(res==='win'?1:0),
            losses:(g.losses||0)+(res==='loss'?1:0),
            matches:(g.matches||0)+(kills>0||deaths>0||res!=='draw'?1:0)
          });
          if(kills>0||deaths>0||res!=='draw'){
            var matchRes = await zaiken.profile.recordMatch({kills:kills,deaths:deaths,wins:res==='win'?1:0,losses:res==='loss'?1:0,matches:1});
            if(matchRes && matchRes.unlocked && matchRes.unlocked.length){
              matchRes.unlocked.forEach(function(a){ Toast.success((a.icon||'★')+' Unlocked: '+a.name); });
            }
          }
          try {
            var unlocked = await zaiken.achievements.evaluate();
            if(unlocked && unlocked.length) unlocked.forEach(function(a){ Toast.success((a.icon||'★')+' Unlocked: '+a.name); });
          } catch(e){}
          Toast.success('Game updated!');
          if(window.App && App.refreshSidebar) App.refreshSidebar();
          loadAndRender();
        }}
      ]
    });
    document.getElementById('e-pick-exe').addEventListener('click',async function(){var p=await zaiken.system.pickExe();if(p) document.getElementById('e-exe').value=p;});
    document.getElementById('e-pick-log').addEventListener('click',async function(){var p=await zaiken.system.pickLog();if(p) document.getElementById('e-log').value=p;});
    document.getElementById('e-pick-img').addEventListener('click',async function(){var p=await zaiken.system.pickImage();if(p) document.getElementById('e-img').value=p;});
  }

  function deleteGame(g){
    Modal.confirm('Remove "'+g.name+'" from your library? Game files will NOT be deleted.',
      async function(){
        await zaiken.games.delete(g.id);
        selectedId = null;
        Toast.success(g.name+' removed.');
        loadAndRender();
      }
    );
  }

  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _relTime(iso){
    var d = (Date.now()-new Date(iso).getTime())/1000;
    if(d<60) return 'just now';
    if(d<3600) return Math.floor(d/60)+'m ago';
    if(d<86400) return Math.floor(d/3600)+'h ago';
    return Math.floor(d/86400)+'d ago';
  }

  return { render:render };
})();