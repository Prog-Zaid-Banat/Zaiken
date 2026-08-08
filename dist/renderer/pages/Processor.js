// Copyright © 2026 [Zaid Bilal Banat]. All rights reserved. Zaiken
'use strict';

window.Processor = (function () {

  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, ' ').trim();
  }

  var GAME_KB = {
    warframe: {
      aliases: ['warframe', 'wf', 'ورفريم', 'وارفريم'],
      label: 'Warframe',
      overview:
        'Warframe progression is mastery rank + resources + mods. Focus one goal at a time: a frame, a weapon, or a farm route — not all three in one session.',
      topics: {
        item: [
          'Most rare items come from: Relics (Void), Bounties (open worlds), Invasions, Nightwave, Syndicates, or specific nodes on the Star Chart.',
          'For a Prime part: open Relics of the right era (Lith/Meso/Neo/Axi). Run endless missions (Survival/Defense/Disruption) and refine relics with Void Traces for better rare chances.',
          'Check the in-game Codex and Market blueprint pages — many items show exact drop sources on their description.',
          'If you need a specific resource (Argon, Oxium, Cryotic, etc.), farm the planet/node type that lists it; Argon decays — farm it when you are ready to craft.'
        ],
        farm: [
          'Efficient loop: (1) set a goal item (2) confirm drop source in Codex (3) run 3–5 focused missions (4) extract — don’t endless-farm without a target.',
          'Open worlds (Plains, Orb Vallis, Cambion Drift): do bounties for standing + rare rewards; fish/mine only when the bounty needs it.',
          'Steel Path / higher tiers = better rewards but need proper mods. Don’t force SP until your main weapons are forma’d and modded.',
          'Join a clan for research labs (energy, chem, etc.) — some weapons/frames require clan research blueprints.'
        ],
        mods: [
          'Priority mods early: Serration / Point Blank / Hornet Strike, elemental mods, multishot, then crit if the weapon scales on crit.',
          'Use the Arsenal → Mods → sorting by polarity. Rank mods with Endo + credits from Rathuum, Arbitration, or Inheritance.',
          'One strong loadout > five half-built ones. Forma slots that match your strongest mod polarities.'
        ],
        frame: [
          'New players: clear Star Chart junctions, unlock planets, do quests in order — quests unlock systems (Helminth later, Railjack, etc.).',
          'Mastery Rank gates weapons and quests. Level new gear in low-risk missions then move up.',
          'For a specific Warframe blueprint: many drop from bosses (assassination nodes). Check the boss node on each planet.'
        ],
        platinum: [
          'Trade Chat and warframe.market (external site) are the legitimate ways to trade Prime parts for Platinum.',
          'Never share account login. Never buy platinum from third-party “cheap plat” sellers — account bans are common.',
          'Duplicate Prime parts → sell sets. Keep one set for yourself if you still need the frame/weapon.'
        ],
        beginner: [
          'Order of operations: Vor’s Prize → clear Earth/Venus/Mercury → unlock Foundry crafting → build starter weapons → keep doing junctions.',
          'Always claim Foundry items when ready; craft times are real-time.',
          'Join public squads for harder nodes; revive teammates — affinity is shared.'
        ]
      },
      // Named item-style hints (public, high-level — still tell user to verify in Codex)
      items: {
        'argon crystal': 'Argon Crystal drops on Void missions and decays over real time. Farm when you are about to craft (e.g. some Warframe parts).',
        'orokin cell': 'Orokin Cells drop on Saturn/Ceres bosses and some high-level nodes. Boss runs are the classic farm.',
        'neurodes': 'Neurodes are common on Earth/Deimos/other listed nodes — check resource details in the map.',
        'morphics': 'Morphics drop on Mercury/Mars/Europa among others — assassination and resource nodes.',
        'tellurium': 'Tellurium is associated with Archwing / Sealab-style tiles — run those mission types on the listed planets.',
        'kuva': 'Kuva comes from Kuva Siphons/Floods and later content. Bring a strong loadout; siphon missions are timed objectives.',
        'void traces': 'Void Traces come from opening relics (especially with squad refinement). Use them to refine relics toward rare rewards.',
        'forma': 'Forma blueprints often come from relics. Build Forma in Foundry (24h). Use to repolarize weapon/frame slots.',
        'nitain': 'Nitain Extract is commonly from Nightwave / alerts-style rewards — check Nightwave offerings.',
        'prime': 'Primes = Relic farming. Match relic tier to the drop table of the part you need, refine, run fissures, trade extras.'
      }
    },

    valorant: {
      aliases: ['valorant', 'val', 'فالورانت'],
      label: 'Valorant',
      overview: 'Valorant ranks move on wins + combat performance. Crosshair placement and utility usage beat raw aim alone.',
      topics: {
        aim: ['Deathmatch 10–15 min before ranked. Crosshair at head height. Stop spraying full mags past close range — burst and counter-strafe.'],
        agent: ['Learn 2 agents deeply (one controller/sentinel, one duelist/initiator) before expanding the pool.'],
        eco: ['Track enemy economy. Force rounds need a plan; don’t buy randomly after a loss bonus.'],
        beginner: ['Clear angles with utility, not your body. One duel at a time. Watch one VOD of your deaths per session.']
      },
      items: {}
    },

    fortnite: {
      aliases: ['fortnite', 'فورتنايت'],
      label: 'Fortnite',
      overview: 'Placement + survival matter as much as eliminations. Land consistent POIs and practice loadout discipline.',
      topics: {
        farm: ['Land mid-tier POIs, grab mats + shield first, rotate early before zone spam.'],
        aim: ['Aim courses in Creative daily. Practice piece control in real fights, not only 1v1 maps.'],
        beginner: ['Do not hot drop every game while learning. W-key when you have mats and height.']
      },
      items: {}
    },

    cs2: {
      aliases: ['cs2', 'counter strike', 'counter-strike', 'كس', 'كاونتر'],
      label: 'Counter-Strike 2',
      overview: 'Utility, timing, and trades win rounds. Aim alone is not enough above mid ranks.',
      topics: {
        aim: ['Deathmatch + aim maps. Counter-strafe before every shot. Crosshair pre-aim common angles.'],
        utility: ['Learn 5 lineups per side on your main maps before expanding.'],
        beginner: ['Play deathmatch warm-up, then only 2–3 competitive maps you know.']
      },
      items: {}
    },

    rocketleague: {
      aliases: ['rocket league', 'rl', 'روكت'],
      label: 'Rocket League',
      overview: 'Mechanics + rotation. Ball cam most of the time; don’t double commit.',
      topics: {
        beginner: ['Free play 10 min, then casual. Focus rotation: if teammate challenges, you back post.'],
        farm: ['Training packs for saves and aerials beat random freestyling while ranking.']
      },
      items: {}
    },

    gta: {
      aliases: ['gta', 'gta v', 'gta5', 'grand theft auto'],
      label: 'GTA Online',
      overview: 'Legitimate money comes from businesses, pay-outs, and weekly events — not money drops from random players.',
      topics: {
        farm: ['Run your own businesses (e.g. VIP/CEO work, auto shop, agency) during 2x weeks when available.'],
        beginner: ['Register as CEO/VIP, unlock a simple high-payout activity, avoid lock-on grief loops — change session if needed.']
      },
      items: {}
    },

    minecraft: {
      aliases: ['minecraft', 'ماينكرافت'],
      label: 'Minecraft',
      overview: 'Progression is tools → iron → diamond → nether → end. Food and shelter first on new worlds.',
      topics: {
        farm: ['Automated farms (iron, food, XP) free you for exploration. Build safe paths before deep mining.'],
        item: ['Diamonds: strip mine around deepslate levels per current world generation; bring water + food.']
      },
      items: {
        'elytra': 'Elytra is found in End ships after defeating the dragon. Bring blocks, food, and slow falling if possible.',
        'netherite': 'Ancient debris in the Nether — branch mine carefully; blast resistance helps.'
      }
    },

    lol: {
      aliases: ['league of legends', 'lol', 'league', 'ليج'],
      label: 'League of Legends',
      overview: 'CS + wave management decide more games than highlight outplays.',
      topics: {
        beginner: ['Main 2 champions in 1–2 roles. Mute all if chat tilts you. Focus CS to 7+/min in norms first.']
      },
      items: {}
    },

    apex: {
      aliases: ['apex', 'apex legends'],
      label: 'Apex Legends',
      overview: 'Movement, third-parties, and legend utility. Don’t open every fight.',
      topics: {
        beginner: ['Play with a consistent legend. Loot fast, rotate on zone pull, fight when you have cover and numbers.']
      },
      items: {}
    }
  };

  function resolveGame(gameName, query) {
    var blob = norm(gameName) + ' ' + norm(query);
    var keys = Object.keys(GAME_KB);
    for (var i = 0; i < keys.length; i++) {
      var kb = GAME_KB[keys[i]];
      for (var a = 0; a < kb.aliases.length; a++) {
        if (blob.indexOf(norm(kb.aliases[a])) !== -1) return keys[i];
      }
    }
    // fuzzy: if gameName contains key
    for (var j = 0; j < keys.length; j++) {
      if (norm(gameName).indexOf(keys[j]) !== -1) return keys[j];
    }
    return null;
  }

  function detectTopic(q) {
    if (/mod|build|بولار|فورما|forma/.test(q)) return 'mods';
    if (/farm|مزرع|فلاعة|grind|farming|كيف اجيب|how (do|can) i (get|farm)|where.*drop|drop rate/.test(q)) return 'farm';
    if (/item|part|blueprint|مورد|resource|relic|ريلك|prime|بلات|platinum|plat/.test(q)) return 'item';
    if (/frame|warframe|شترة|فريم/.test(q)) return 'frame';
    if (/begin|start|جديد|مبتد|new player|starter/.test(q)) return 'beginner';
    if (/aim|crosshair|تصويب|ايم/.test(q)) return 'aim';
    if (/agent|legend|champ|بطل|عميل/.test(q)) return 'agent';
    if (/util|smoke|grenade|خط/.test(q)) return 'utility';
    if (/eco|economy|econ|فلوس|مال|money|credit/.test(q)) return 'eco';
    if (/plat|premium|trade|تبادل/.test(q)) return 'platinum';
    if (/tilt|ment|ضغط|تيلت/.test(q)) return 'tilt';
    if (/analyze|how am i|rate|تحليل|مستواي/.test(q)) return 'analyze';
    if (/plan|routine|خطة|يومي/.test(q)) return 'plan';
    return null;
  }

  function findItemTip(kb, q) {
    if (!kb || !kb.items) return null;
    var keys = Object.keys(kb.items);
    for (var i = 0; i < keys.length; i++) {
      if (q.indexOf(keys[i]) !== -1) return kb.items[keys[i]];
    }
    // partial word match for multi-word
    for (var j = 0; j < keys.length; j++) {
      var parts = keys[j].split(' ');
      var hit = parts.every(function (p) { return q.indexOf(p) !== -1; });
      if (hit) return kb.items[keys[j]];
    }
    return null;
  }

  function pick(arr) {
    if (!arr || !arr.length) return null;
    return arr[Math.floor(Math.random() * arr.length)] || arr[0];
  }

  function statsLine(stats) {
    var kills = Number(stats.kills) || 0;
    var deaths = Number(stats.deaths) || 0;
    var kd = deaths > 0 ? (kills / deaths).toFixed(2) : String(kills);
    var wins = Number(stats.wins) || 0;
    var matches = Number(stats.matches) || 0;
    var wr = matches > 0 ? Math.round((wins / matches) * 100) : 0;
    return {
      kd: kd,
      wr: wr,
      kills: kills,
      deaths: deaths,
      wins: wins,
      matches: matches,
      level: stats.level || 1,
      rank: stats.rank || 'Bronze'
    };
  }

  function getCoachResponse(query, stats) {
    stats = stats || {};
    var q = String(query || '').toLowerCase().trim();
    var raw = String(query || '').trim();
    var gameName = stats.gameName || 'your game';
    var history = stats.history || [];
    var S = statsLine(stats);
    var isAr = /[\u0600-\u06FF]/.test(raw);

    if (history.length >= 3) {
      var prevQ = history[history.length - 3];
      if (prevQ && String(prevQ).toLowerCase() === q) {
        return isAr
          ? 'سألت نفس السؤال — طبّق نصيحة واحدة لثلاث مباريات ثم ارجع للتقييم.'
          : 'You asked this already — apply one tip for 3 matches, then reassess.';
      }
    }

    if (/^(hi|hello|hey|مرحبا|اهلا|السلام)/.test(q)) {
      return isAr
        ? ('أهلاً! مدربك على «' + gameName + '». اسأل عن مزرعة، آيتم، بناء، أو تحليل أداءك.')
        : ('Welcome. Coaching «' + gameName + '». Ask about farms, items, builds, or a performance analysis.');
    }

    var gameKey = resolveGame(gameName, q);
    var kb = gameKey ? GAME_KB[gameKey] : null;
    var topic = detectTopic(q);

    // Named item tip
    if (kb) {
      var itemTip = findItemTip(kb, q);
      if (itemTip) {
        return '[' + kb.label + '] ' + itemTip + ' Always double-check the current drop table in the Codex / patch notes — tables change.';
      }
    }

    // Game overview + topic
    if (kb && topic && kb.topics[topic]) {
      var tip = pick(kb.topics[topic]);
      return '[' + kb.label + '] ' + tip;
    }

    if (kb && (topic === 'item' || topic === 'farm')) {
      var pool = (kb.topics.farm || []).concat(kb.topics.item || []);
      return '[' + kb.label + '] ' + (pick(pool) || kb.overview);
    }

    if (kb && !topic) {
      // Generic game-aware answer
      if (/how|كيف|وين|where|get|اجيب|farm|مزرع/.test(q)) {
        var farmish = (kb.topics.farm || kb.topics.item || [kb.overview]);
        return '[' + kb.label + '] ' + pick(farmish) +
          ' Tip: name the exact item (e.g. "how do I get Argon Crystal in Warframe") for a tighter answer.';
      }
      return '[' + kb.label + '] ' + kb.overview +
        ' Ask about: farm routes, specific items, builds/mods, or beginner path.';
    }

    // Stats analysis (any game)
    if (topic === 'analyze') {
      var band = Number(S.kd) >= 2 ? 'elite' : Number(S.kd) >= 1.2 ? 'solid' : Number(S.kd) >= 0.8 ? 'developing' : 'rebuilding';
      return 'On ' + gameName + ': K/D ' + S.kd + ', win rate ' + S.wr + '% (' + S.matches + ' matches), rank ' + S.rank +
        '. Band: ' + band + '. Next focus: die less on first contact and review one repeated mistake per session.';
    }

    if (topic === 'plan') {
      return 'Daily plan for ' + gameName + ': (1) 10–15 min warm-up (2) focused goal (item/farm/aim) (3) 3–5 ranked/main sessions (4) one note on your worst death/mistake. Level ' + S.level + '.';
    }

    if (topic === 'aim') {
      return 'Aim for ' + gameName + ': short daily routine beats marathon once a week. Crosshair placement first, then tracking/flicks. Stop when accuracy drops — fatigue creates bad habits.';
    }

    if (topic === 'tilt') {
      return 'Mental: after two hard losses, 5-minute break offline. Cap the session. One death = one lesson, not a revenge peek.';
    }

    // No KB match — still useful
    if (/how|كيف|اجيب|get|farm|item|وين/.test(q)) {
      return 'I do not have a specific drop table for «' + gameName + '» yet. ' +
        'Tell me the game + item name (example: "Warframe Argon Crystal" or "Warframe how to farm Prime parts"). ' +
        'I already have deeper guides for Warframe, Valorant, CS2, Fortnite, Rocket League, GTA, Minecraft, LoL, Apex.';
    }

    return 'Coach online for «' + gameName + '». Try: "analyze my performance", "daily plan", or game-specific asks like "Warframe how to farm relics" / "how do I get Forma".';
  }

  return {
    getCoachResponse: getCoachResponse,
    listSupportedGames: function () {
      return Object.keys(GAME_KB).map(function (k) { return GAME_KB[k].label; });
    }
  };
})();
