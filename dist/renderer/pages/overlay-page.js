// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
window.OverlayPage = (function(){
  var settings = {};
  function render(container){
    container.innerHTML = '';
    loadAndRender(container);
  }
  async function loadAndRender(container){
    settings = await zaiken.settings.get();
    container.innerHTML = [
      '<div class="sh"><span class="sh-title"> Overlay Settings</span><div class="sh-line"></div>',
      '<button class="btn btn-sm btn-primary" id="btn-toggle-overlay">'+(settings.overlayEnabled?'Hide Overlay':'Show Overlay')+'</button></div>',
      '<div style="padding:0 24px 24px">',
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px">',
          '<div class="card">',
            '<div class="card-title">📊 HUD Elements</div>',
            renderToggleRow('showCPUTemp','CPU Usage (live)',settings.showCPUTemp !== false),
            renderToggleRow('showGPU','GPU Usage (NVIDIA if available)',settings.showGPU !== false),
            renderToggleRow('showPing','Network Ping',settings.showPing !== false),
            renderToggleRow('showKD','K/D Ratio',settings.showKD !== false),
            renderToggleRow('showWinRate','Win Rate',settings.showWinRate !== false),
            renderToggleRow('showFPS','Legacy FPS slot (maps to RAM %)',settings.showFPS !== false),
            renderToggleRow('aiTipsEnabled','AI Real-Time Tips',settings.aiTipsEnabled),
          '</div>',
          '<div>',
            '<div class="card" style="margin-bottom:16px">',
              '<div class="card-title">🎨 Appearance</div>',
              '<div class="frow"><label class="fi">Opacity</label>',
                '<input type="range" id="ov-opacity" min="30" max="100" value="'+(settings.overlayOpacity||90)+'" style="width:100%;accent-color:var(--neon)">',
                '<span id="ov-opacity-val" style="font-family:var(--mono);color:var(--neon);font-size:12px;margin-top:4px;display:block">'+(settings.overlayOpacity||90)+'%</span></div>',
              '<div class="frow"><label class="fi">Position</label>',
                '<select class="sel" id="ov-pos">',
                  '<option value="top-right"'+(settings.overlayPosition==='top-right'?' selected':'')+'>Top Right</option>',
                  '<option value="top-left"'+(settings.overlayPosition==='top-left'?' selected':'')+'>Top Left</option>',
                  '<option value="top-center"'+(settings.overlayPosition==='top-center'?' selected':'')+'>Top Center</option>',
                  '<option value="bottom-right"'+(settings.overlayPosition==='bottom-right'?' selected':'')+'>Bottom Right</option>',
                '</select></div>',
              '<button class="btn btn-primary btn-full mt8" id="btn-save-overlay">Save Settings</button>',
            '</div>',
            '<div class="card">',
              '<div class="card-title">🎮 Live Preview</div>',
              '<div id="overlay-preview" style="background:#000;border-radius:4px;overflow:hidden">',
                renderPreviewBar(settings),
                '<div style="height:100px;background:repeating-linear-gradient(45deg,rgba(0,255,178,.02) 0,rgba(0,255,178,.02) 1px,transparent 0,transparent 50%);background-size:8px 8px;display:flex;align-items:center;justify-content:center;color:#1a2a20;font-size:22px;font-weight:700;letter-spacing:6px">IN-GAME</div>',
              '</div>',
              '<div style="font-size:11px;color:var(--text2);margin-top:10px;line-height:1.6">Shortcut: <span class="mono neon">Ctrl+Shift+O</span> to toggle overlay.<br>Live metrics: CPU &amp; RAM from the OS, ping via ICMP, GPU via nvidia-smi when available, K/D &amp; win rate from your profile. Transparent &amp; click-through.</div>',
            '</div>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
    container.querySelector('#btn-toggle-overlay').addEventListener('click', async function(){
      zaiken.window.toggleOverlay();
      settings.overlayEnabled = !settings.overlayEnabled;
      await zaiken.settings.save({overlayEnabled:settings.overlayEnabled});
      render(container);
    });
    container.querySelector('#btn-save-overlay').addEventListener('click', async function(){
      var opacity = parseInt(container.querySelector('#ov-opacity').value);
      var pos = container.querySelector('#ov-pos').value;
      await zaiken.settings.save({overlayOpacity:opacity, overlayPosition:pos});
      Toast.success('Overlay settings saved!');
    });
    var opacitySlider = container.querySelector('#ov-opacity');
    var opacityVal = container.querySelector('#ov-opacity-val');
    opacitySlider.addEventListener('input',function(){ opacityVal.textContent=this.value+'%'; });
    container.querySelectorAll('.tog-wrap').forEach(function(wrap){
      wrap.querySelector('input').addEventListener('change', async function(){
        var key = this.dataset.key;
        var val = this.checked;
        var update = {};
        update[key] = val;
        await zaiken.settings.save(update);
      });
    });
  }
  function renderToggleRow(key, label, value){
    return '<div class="frow-inline"><span style="font-size:13px">'+label+'</span>'+
      '<label class="tog tog-wrap"><input type="checkbox" data-key="'+key+'"'+(value?' checked':'')+'>'+
      '<span class="tog-sl"></span></label></div>';
  }
  function renderPreviewBar(s){
    return '<div style="background:#000;padding:8px 12px;display:flex;align-items:center;gap:12px;font-family:var(--mono);font-size:12px;border-bottom:1px solid #111">'+
      '<span><span style="color:var(--neon);font-weight:700">34%</span> <span style="color:#444;font-size:9px">CPU</span></span><span style="color:#1a1a2e">|</span>'+
      '<span><span style="color:var(--neon);font-weight:700">61%</span> <span style="color:#444;font-size:9px">RAM</span></span><span style="color:#1a1a2e">|</span>'+
      '<span><span style="color:var(--neon);font-weight:700">N/A</span> <span style="color:#444;font-size:9px">GPU</span></span><span style="color:#1a1a2e">|</span>'+
      '<span><span style="color:var(--neon);font-weight:700">18ms</span> <span style="color:#444;font-size:9px">PING</span></span><span style="color:#1a1a2e">|</span>'+
      '<span><span style="color:var(--neon);font-weight:700">1.40</span> <span style="color:#444;font-size:9px">K/D</span></span><span style="color:#1a1a2e">|</span>'+
      '<span><span style="color:var(--neon);font-weight:700">55%</span> <span style="color:#444;font-size:9px">WIN</span></span></div>';
  }
  return {render:render};
})();