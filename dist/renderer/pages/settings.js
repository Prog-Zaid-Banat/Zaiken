window.SettingsPage = (function(){
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
  function render(container){ loadAndRender(container); }
  async function loadAndRender(container){
    var s = await zaiken.settings.get();
    var ver = await zaiken.system.getVersion();
    var user = await zaiken.auth.getCurrentUser();
    container.innerHTML = [
      '<div class="sh"><span class="sh-title"> Settings</span><div class="sh-line"></div><span class="sh-extra">v'+ver+'</span></div>',
      '<div style="padding:0 24px 24px">',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px">',
      '<div style="display:flex;flex-direction:column;gap:16px">',
      renderSection('🎨 Appearance',[
        inlineRow('Accent Color','<input type="color" id="s-color" value="'+(s.accentColor||'#00FFB2')+'" style="width:48px;height:30px;border:none;background:none;cursor:pointer">'),
        toggleRow('minimizeToTray','Minimize to Tray on Close',s.minimizeToTray),
        toggleRow('notifications','Desktop Notifications',s.notifications),
      ]),
      renderSection('🎮 Overlay',[
        toggleRow('overlayEnabled','Enable Smart Overlay',s.overlayEnabled),
        toggleRow('showFPS','Show FPS',s.showFPS),
        toggleRow('showPing','Show Ping',s.showPing),
        toggleRow('showCPUTemp','Show CPU Temperature',s.showCPUTemp),
        toggleRow('showGPU','Show GPU Usage',s.showGPU),
        toggleRow('showKD','Show K/D Ratio',s.showKD),
        toggleRow('showWinRate','Show Win Rate',s.showWinRate),
        toggleRow('aiTipsEnabled','AI Real-Time Tips',s.aiTipsEnabled),
      ]),
      '</div>',
      '<div style="display:flex;flex-direction:column;gap:16px">',
      renderSection('🤖 AI & Performance',[
        toggleRow('logMonitorEnabled','Enable Log File Monitoring',s.logMonitorEnabled),
        toggleRow('anticheatEnabled','Anti-Tamper Protection',s.anticheatEnabled),
        toggleRow('powerSaveBlock','Block Sleep During Gaming',s.powerSaveBlock),
      ]),
      renderSection('⌨️ Global Shortcuts',[
        inlineRow('Toggle Overlay','<code style="font-family:var(--mono);font-size:12px;color:var(--neon);background:var(--bg);padding:4px 8px;border-radius:3px">Ctrl+Shift+O</code>'),
        inlineRow('Open zaiken','<code style="font-family:var(--mono);font-size:12px;color:var(--neon);background:var(--bg);padding:4px 8px;border-radius:3px">Ctrl+Shift+N</code>'),
      ]),
      renderSection('👤 Account',[
        '<div class="frow-inline"><span style="font-size:13px;color:var(--text2)">Logged in as</span>'+
          '<span style="font-size:13px;font-weight:600">'+(user ? user.email : 'Unknown')+'</span></div>',
        '<div style="padding:8px 0 0"><button class="btn btn-danger btn-full" id="btn-logout">Log Out</button></div>',
      ]),
      renderSection('⚠️ Danger Zone',[
        '<div style="padding:4px 0"><button class="btn btn-danger btn-full" id="btn-reset-data">Reset All Data</button></div>',
        '<div style="font-size:11px;color:var(--text2);margin-top:8px;line-height:1.5">This will delete all your games, stats, and settings permanently.</div>',
      ]),
      '<div class="card" style="padding:14px 16px">',
        '<div style="font-size:11px;color:var(--text2);letter-spacing:2px;text-transform:uppercase;font-weight:700;margin-bottom:8px">About</div>',
        '<div style="font-size:13px;color:var(--text);line-height:1.8">',
          'zaiken'+ver+'<br>',
          '<span style="color:var(--text2)">Built with Electron + Node.js<br>',
          'Anti-Tamper: HMAC-SHA256<br>',
          'Database: JSON + Signed Envelopes</span>',
        '</div>',
      '</div>',
      '</div>',
      '</div>',
      '<div style="padding:0 24px 16px">',
      '<div class="card">',
        '<div class="card-title">AI Coach (cloud)</div>',
        '<p style="font-size:12px;color:var(--text2);line-height:1.5;margin-bottom:12px">Real LLM answers + optional web research. Without a key, coach refuses local fake replies.</p>',
        '<div class="frow"><label>Provider</label><select id="s-ai-provider" class="finp">'+
          '<option value="openai"'+(s.aiProvider==='openai'?' selected':'')+'>OpenAI</option>'+
          '<option value="openrouter"'+(s.aiProvider==='openrouter'?' selected':'')+'>OpenRouter</option>'+
          '<option value="anthropic"'+(s.aiProvider==='anthropic'?' selected':'')+'>Anthropic</option>'+
          '<option value="groq"'+(s.aiProvider==='groq'?' selected':'')+'>Groq</option>'+
          '<option value="custom"'+(s.aiProvider==='custom'?' selected':'')+'>Custom OpenAI-compatible</option>'+
        '</select></div>',
        '<div class="frow"><label>API Key</label><input id="s-ai-key" class="finp" type="password" placeholder="'+(s.aiApiKey?'•••• configured':'sk-...')+'" autocomplete="off"/></div>',
        '<div class="frow"><label>Model (optional)</label><input id="s-ai-model" class="finp" value="'+esc(s.aiModel||'')+'" placeholder="gpt-4o-mini"/></div>',
        '<div class="frow"><label>Base URL (custom)</label><input id="s-ai-base" class="finp" value="'+esc(s.aiBaseUrl||'')+'" placeholder="https://api.openai.com/v1"/></div>',
        '<div class="frow-inline"><span style="font-size:13px">Web research before answering</span>'+
          '<label class="tog"><input type="checkbox" id="s-ai-web"'+(s.aiWebSearch!==false?' checked':'')+'>'+
          '<span class="tog-sl"></span></label></div>',
      '</div>',
      '</div>',
'<div style="padding:0 24px 24px"><button class="btn btn-primary" id="btn-save-settings" style="min-width:160px">Save All Settings</button></div>',
      '</div>'
    ].join('');
    container.querySelector('#btn-save-settings').addEventListener('click', async function(){
      var update = {};
      container.querySelectorAll('.stog').forEach(function(inp){
        update[inp.dataset.key] = inp.checked;
      });
      var col = container.querySelector('#s-color');
      if(col) update.accentColor = col.value;
      var aiProv = container.querySelector('#s-ai-provider');
      var aiKey = container.querySelector('#s-ai-key');
      var aiModel = container.querySelector('#s-ai-model');
      var aiBase = container.querySelector('#s-ai-base');
      var aiWeb = container.querySelector('#s-ai-web');
      if(aiProv) update.aiProvider = aiProv.value;
      if(aiKey && aiKey.value.trim()) update.aiApiKey = aiKey.value.trim();
      if(aiModel) update.aiModel = aiModel.value.trim();
      if(aiBase) update.aiBaseUrl = aiBase.value.trim();
      if(aiWeb) update.aiWebSearch = aiWeb.checked;
      await zaiken.settings.save(update);
      if(update.accentColor){
        document.documentElement.style.setProperty('--neon', update.accentColor);
      }
      if(window.App && App.applyThemeFromSettings) App.applyThemeFromSettings();
      Toast.success('Settings saved!');
    });
    container.querySelector('#btn-logout').addEventListener('click', function(){
      Modal.confirm('Log out of your Zaiken account?', async function(){
        await zaiken.auth.logout();
        location.reload();
      });
    });
    container.querySelector('#btn-reset-data').addEventListener('click', function(){
      Modal.confirm('This will permanently delete ALL your data including games, stats, achievements, and settings. Are you sure?',
        async function(){
          await zaiken.settings.resetAllData();
          Toast.success('All data has been reset.');
          location.reload();
        }
      );
    });
  }
  function renderSection(title, rows){
    return '<div class="card"><div class="card-title">'+title+'</div>'+rows.join('')+'</div>';
  }
  function toggleRow(key, label, value){
    return '<div class="frow-inline"><span style="font-size:13px">'+label+'</span>'+
      '<label class="tog"><input type="checkbox" class="stog" data-key="'+key+'"'+(value?' checked':'')+'>'+
      '<span class="tog-sl"></span></label></div>';
  }
  function inlineRow(label, control){
    return '<div class="frow-inline"><span style="font-size:13px;color:var(--text2)">'+label+'</span>'+control+'</div>';
  }
  return {render:render};
})();