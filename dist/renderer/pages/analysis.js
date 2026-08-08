// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
'use strict';

window.AnalysisPage = (function () {
  var conversationHistory = [];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function render(container) {
    container.innerHTML = '<div class="card"><p style="color:var(--text2)">Loading coach…</p></div>';
    var profile = await zaiken.profile.get();
    var games = await zaiken.games.getAll();
    var activeGame = (games && games.length) ? games[games.length - 1].name : 'Valorant';
    var status = { configured: false };
    try { status = await zaiken.ai.status(); } catch (e) {}
    var reports = [];
    try { reports = await zaiken.ai.getReports(); } catch (e) {}
    renderUI(container, {
      totalKills: profile.totalKills || 0,
      totalDeaths: profile.totalDeaths || 0,
      totalWins: profile.totalWins || 0,
      totalMatches: profile.totalMatches || 0,
      level: profile.level || 1,
      rank: profile.rank || 'Bronze',
      activeGame: activeGame,
      games: games || [],
      status: status,
      recentReports: (reports || []).slice(0, 8)
    });
  }

  function renderUI(container, ctx) {
    var kd = ctx.totalDeaths > 0 ? (ctx.totalKills / ctx.totalDeaths).toFixed(2) : String(ctx.totalKills || 0);
    var setupBanner = ctx.status.configured
      ? '<div style="font-size:11px;color:var(--neon);margin-bottom:8px">Cloud coach · ' + esc(ctx.status.provider) + ' · ' + esc(ctx.status.model) + (ctx.status.webSearch ? ' · web research on' : '') + '</div>'
      : '<div class="card" style="border-color:var(--warn,#f5a);margin-bottom:12px;padding:12px 14px">' +
          '<div style="font-weight:700;margin-bottom:6px">AI Coach not configured</div>' +
          '<div style="font-size:13px;color:var(--text2);line-height:1.5">Add an API key in <strong>Settings → AI Coach</strong> (OpenAI, OpenRouter, Anthropic, or Groq). Without a key the coach will not invent local answers.</div>' +
        '</div>';

    var gameOpts = (ctx.games.length ? ctx.games : [{ name: ctx.activeGame }]).map(function (g) {
      return '<option value="' + esc(g.name) + '"' + (g.name === ctx.activeGame ? ' selected' : '') + '>' + esc(g.name) + '</option>';
    }).join('');

    var reportList = (ctx.recentReports || []).map(function (r) {
      return '<div style="padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">' +
        '<div style="color:var(--neon)">' + esc(r.title || r.game || 'Report') + '</div>' +
        '<div style="color:var(--text2)">' + esc((r.createdAt || '').slice(0, 16)) + '</div></div>';
    }).join('') || '<div style="color:var(--text2);font-size:12px">No daily reports yet.</div>';

    container.innerHTML =
      '<div class="sh"><span class="sh-title">AI Performance Coach</span><div class="sh-line"></div>' +
        '<span class="sh-extra">' + esc(ctx.rank) + ' · K/D ' + kd + '</span></div>' +
      '<div style="padding:16px 24px 24px;display:grid;grid-template-columns:1fr 300px;gap:16px">' +
        '<div class="card" style="display:flex;flex-direction:column;min-height:460px">' +
          '<div class="card-title">Cloud coach chat</div>' +
          setupBanner +
          '<div style="margin-bottom:10px;display:flex;gap:8px;align-items:center">' +
            '<label style="font-size:12px;color:var(--text2)">Game</label>' +
            '<select id="coach-game" class="finp" style="flex:1">' + gameOpts + '</select>' +
          '</div>' +
          '<div id="chat-history" style="flex:1;overflow-y:auto;max-height:360px;padding:8px;background:rgba(0,0,0,.25);border-radius:8px;margin-bottom:12px"></div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px" id="coach-qs"></div>' +
          '<div style="display:flex;gap:8px">' +
            '<input id="coach-input" class="finp" style="flex:1" placeholder="Ask for a drill, VOD plan, aim routine, meta tip…" />' +
            '<button class="btn btn-primary" id="coach-send">Send</button>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:12px">' +
          '<div class="card">' +
            '<div class="card-title">Daily esport report</div>' +
            '<p style="font-size:12px;color:var(--text2);line-height:1.5;margin-bottom:10px">Fresh training plan for one title (uses live research when enabled).</p>' +
            '<select id="daily-game" class="finp" style="width:100%;margin-bottom:8px">' + gameOpts + '</select>' +
            '<button class="btn btn-primary btn-full" id="btn-daily">Generate today\'s report</button>' +
            '<button class="btn btn-ghost btn-full" id="btn-daily-batch" style="margin-top:8px">Batch: top library games</button>' +
          '</div>' +
          '<div class="card">' +
            '<div class="card-title">Context</div>' +
            '<div style="font-size:13px;line-height:1.7;color:var(--text2)">Rank: <span class="neon">' + esc(ctx.rank) + '</span><br>' +
            'Level: ' + ctx.level + '<br>Kills/Deaths: ' + ctx.totalKills + '/' + ctx.totalDeaths + '</div>' +
          '</div>' +
          '<div class="card"><div class="card-title">Recent reports</div>' + reportList + '</div>' +
        '</div>' +
      '</div>';

    var qs = [
      'Build me a 20-minute aim routine',
      'How should I review my last losses?',
      'What should I practice before ranked today?',
      'خطة تدريب يومية'
    ];
    var qsEl = container.querySelector('#coach-qs');
    qs.forEach(function (q) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-sm btn-ghost coach-q';
      b.textContent = q;
      b.addEventListener('click', function () {
        container.querySelector('#coach-input').value = q;
        send();
      });
      qsEl.appendChild(b);
    });

    function appendBubble(role, text, meta) {
      var hist = container.querySelector('#chat-history');
      var div = document.createElement('div');
      div.style.cssText = 'margin:8px 0;padding:10px 12px;border-radius:8px;font-size:13px;line-height:1.55;white-space:pre-wrap;' +
        (role === 'user'
          ? 'background:rgba(0,255,178,.08);border:1px solid rgba(0,255,178,.25)'
          : 'background:rgba(255,255,255,.04);border:1px solid var(--border)');
      div.innerHTML = '<div style="font-size:10px;color:var(--text2);margin-bottom:4px">' +
        (role === 'user' ? 'YOU' : 'COACH') +
        (meta ? ' · ' + esc(meta) : '') + '</div>' + esc(text);
      hist.appendChild(div);
      hist.scrollTop = hist.scrollHeight;
    }

    async function send() {
      var input = container.querySelector('#coach-input');
      var msg = (input.value || '').trim();
      if (!msg) return;
      var game = container.querySelector('#coach-game').value || ctx.activeGame;
      input.value = '';
      appendBubble('user', msg);
      appendBubble('assistant', 'Thinking… researching & writing…');
      var hist = container.querySelector('#chat-history');
      var thinking = hist.lastChild;

      var res = await zaiken.ai.ask({
        message: msg,
        gameName: game,
        stats: {
          totalKills: ctx.totalKills,
          totalDeaths: ctx.totalDeaths,
          totalWins: ctx.totalWins,
          totalMatches: ctx.totalMatches,
          rank: ctx.rank,
          level: ctx.level,
          gameName: game
        },
        history: conversationHistory.slice(-6)
      });

      if (thinking && thinking.parentNode) thinking.parentNode.removeChild(thinking);

      if (!res || !res.ok) {
        appendBubble('assistant', (res && res.error) || 'Request failed');
        if (res && res.needsSetup) {
          Toast.error('Configure AI API key in Settings');
        } else {
          Toast.error((res && res.error) || 'AI error');
        }
        return;
      }
      conversationHistory.push({ role: 'user', content: msg });
      conversationHistory.push({ role: 'assistant', content: res.reply });
      var meta = (res.provider || '') + (res.usedWebSearch ? ' · web' : '');
      appendBubble('assistant', res.reply, meta);
    }

    container.querySelector('#coach-send').addEventListener('click', send);
    container.querySelector('#coach-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') send();
    });

    container.querySelector('#btn-daily').addEventListener('click', async function () {
      var g = container.querySelector('#daily-game').value || ctx.activeGame;
      Toast.info('Generating daily report for ' + g + '…');
      var res = await zaiken.ai.dailyReport(g);
      if (!res || !res.ok) {
        Toast.error((res && res.error) || 'Failed');
        return;
      }
      Toast.success('Daily report ready');
      appendBubble('assistant', res.report.body, 'daily · ' + g);
      render(container);
    });

    container.querySelector('#btn-daily-batch').addEventListener('click', async function () {
      var names = (ctx.games || []).map(function (g) { return g.name; }).filter(Boolean).slice(0, 3);
      if (!names.length) names = [ctx.activeGame];
      Toast.info('Batch reports (rate-limited)…');
      var res = await zaiken.ai.dailyReportsBatch(names);
      if (!res || !res.ok) {
        Toast.error((res && res.error) || 'Batch failed');
        return;
      }
      Toast.success('Batch complete');
      render(container);
    });
  }

  return { render: render };
})();
