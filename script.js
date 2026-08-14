let allMatchData = [];
let aggregatedList = []; 
let chartInstance = null;

let currentSortCol = 'value';
let sortDesc = true;

const DEFAULT_LOGO_URL = 'https://cdn.steamstatic.com/apps/dota2/images/dota_react/global/dota2_logo_symbol.png';
const imageCache = {};

const teamsMap = {
  "HULIGANI": "https://cdn.steamstatic.com/apps/dota2/images/dota_react/international2026/teamlogos/10149530.png",
  "TEAM FALCONS": "https://cdn.steamstatic.com/apps/dota2/images/dota_react/international2026/teamlogos/9247354.png",
  "XTREME GAMING": "https://cdn.steamstatic.com/apps/dota2/images/dota_react/international2026/teamlogos/8261500.png",
  "TEAM RESILIENCE": "https://cdn.steamstatic.com/apps/dota2/images/dota_react/international2026/teamlogos/5017210.png",
  "TEAM LIQUID": "https://cdn.steamstatic.com/apps/dota2/images/dota_react/international2026/teamlogos/2163.png",
  "LGD GAMING": "https://cdn.steamstatic.com/apps/dota2/images/dota_react/international2026/teamlogos/10150538.png",
  "TEAM YANDEX": "https://cdn.steamstatic.com/apps/dota2/images/dota_react/international2026/teamlogos/9823272.png",
  "BOOMBOYS": "https://cdn.steamstatic.com/apps/dota2/images/dota_react/international2026/teamlogos/8255888.png",
  "TEAM SPIRIT": "https://cdn.steamstatic.com/apps/dota2/images/dota_react/international2026/teamlogos/7119388.png",
  "VICI GAMING": "https://cdn.steamstatic.com/apps/dota2/images/dota_react/international2026/teamlogos/726228.png",
  "TEAM VISION": "https://cdn.steamstatic.com/apps/dota2/images/dota_react/international2026/teamlogos/9572001.png",
  "GAMERLEGION": "https://cdn.steamstatic.com/apps/dota2/images/dota_react/international2026/teamlogos/9964962.png",
  "IRON WING": "https://cdn.steamstatic.com/apps/dota2/images/dota_react/international2026/teamlogos/10150413.png",
  "AURORA GAMING": "https://cdn.steamstatic.com/apps/dota2/images/dota_react/international2026/teamlogos/9467224.png",
  "OG": "https://cdn.steamstatic.com/apps/dota2/images/dota_react/international2026/teamlogos/2586976.png",
  "NIGMA GALAXY": "https://cdn.steamstatic.com/apps/dota2/images/dota_react/international2026/teamlogos/10136357.png"
};

function resolveTeamLogo(teamName) {
  if (!teamName) return DEFAULT_LOGO_URL;
  
  const normalized = teamName.toUpperCase().trim();
  if (teamsMap[normalized]) return teamsMap[normalized];
  
  for (const [officialName, logoUrl] of Object.entries(teamsMap)) {
    if (officialName.includes(normalized) || normalized.includes(officialName)) {
      return logoUrl;
    }
    if (normalized.includes("NIGMA") && officialName.includes("NIGMA")) return logoUrl;
    if (normalized.includes("LGD") && officialName.includes("LGD")) return logoUrl;
    if (normalized.includes("FALCON") && officialName.includes("FALCON")) return logoUrl;
    if (normalized.includes("LIQUID") && officialName.includes("LIQUID")) return logoUrl;
    if (normalized.includes("SPIRIT") && officialName.includes("SPIRIT")) return logoUrl;
    if (normalized.includes("XTREME") && officialName.includes("XTREME")) return logoUrl;
    if (normalized.includes("AURORA") && officialName.includes("AURORA")) return logoUrl;
    if (normalized.includes("VICI") && officialName.includes("VICI")) return logoUrl;
  }
  return DEFAULT_LOGO_URL;
}

const PARSED_STATS = {
  "kills": { name: "Kills", get: p => p.kills || 0 },
  "deaths": { name: "Deaths", get: p => p.deaths || 0 },
  "creep_score": { name: "Creep Score", get: p => (p.last_hits || 0) + (p.denies || 0) },
  "gpm": { name: "Gold Per Min", get: p => p.gold_per_min || 0 },
  "madstone_collected": { name: "Madstone Collected", get: p => (p.item_uses?.madstone_bundle || 0) + (p.purchase?.madstone_bundle || 0) + (p.item_uses?.madstone || 0) },
  "tower_kills": { name: "Tower Kills", get: p => p.tower_kills || 0 },
  "wards_placed": { name: "Wards Placed", get: p => (p.obs_placed || p.observers_placed || 0) + (p.sen_placed || 0) },
  "camps_stacked": { name: "Camps Stacked", get: p => p.camps_stacked || 0 },
  "runes_grabbed": { name: "Runes Grabbed", get: p => p.rune_pickups || 0 },
  "watchers_taken": { name: "Watchers Taken", get: p => p.ability_uses?.ability_capture || 0 },
  "smokes_used": { name: "Smokes Used", get: p => (p.item_uses?.smoke_of_deceit || 0) + (p.purchase?.smoke_of_deceit || 0) },
  "lotuses_grabbed": { name: "Lotuses Grabbed", get: p => (p.item_uses?.famango || 0) + (p.item_uses?.greater_famango || 0) },
  "roshan_kills": { name: "Roshan Kills", get: p => p.roshans_killed || 0 },
  "stuns": { name: "Stun Duration", get: p => parseFloat((p.stuns || 0).toFixed(2)) },
  "tormentor_involvement": { 
    name: "Tormentor Kills", 
    get: (p, match) => {
      const damagedTormentor = p.damage && p.damage.npc_dota_miniboss > 0;
      if (!damagedTormentor) return 0;
      const teamId = p.isRadiant ? 2 : 3;
      return (match.objectives || []).filter(o => o.type === "CHAT_MESSAGE_MINIBOSS_KILL" && o.team === teamId).length;
    } 
  },
  "teamfight_participation_ex_bosses": { 
    name: "Teamfight Participation", 
    get: (p, match) => {
      const bossTimes = (match.objectives || [])
        .filter(o => o.type === "CHAT_MESSAGE_ROSHAN_KILL" || o.type === "CHAT_MESSAGE_MINIBOSS_KILL")
        .map(o => o.time);

      const teamfights = match.teamfights || [];
      if (teamfights.length === 0) return 0;

      let validFightsCount = 0;
      let participatedFightsCount = 0;

      teamfights.forEach(tf => {
        const isBossFight = bossTimes.some(bt => tf.start <= (bt + 20) && tf.end >= (bt - 20));
        
        if (!isBossFight && tf.deaths > 0) {
          validFightsCount++;
          
          const pIndex = match.players.findIndex(mp => mp.player_slot === p.player_slot);
          if (pIndex !== -1 && tf.players && tf.players[pIndex]) {
            const pTf = tf.players[pIndex];
            
            const dmg = pTf.damage || 0;
            const heal = pTf.healing || 0;
            
            if (dmg >= 400 || heal >= 400) {
              participatedFightsCount++;
            }
          }
        }
      });

      if (validFightsCount === 0) return 0;
      const preciseRatio = (participatedFightsCount / validFightsCount) * 100;
      return parseFloat(preciseRatio.toFixed(1));
    }
  },
  "first_blood": { name: "First Blood", get: p => p.firstblood_claimed || 0 },
  "courier_kills": { name: "Courier Kills", get: p => p.courier_kills || 0 }
};

const teamLogoPlugin = {
  id: 'teamLogoPlugin',
  afterDraw(chart) {
    const ctx = chart.ctx;
    const yAxis = chart.scales.y;
    
    if (!chart.config.options.teamLogos) return; 
    const logos = chart.config.options.teamLogos;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    chart.getDatasetMeta(0).data.forEach((datapoint, index) => {
      const img = logos[index];
      if (img && img.complete && img.naturalWidth !== 0) {
        const y = Math.round(yAxis.getPixelForTick(index)) - 8;
        const x = Math.round(yAxis.right - 24);
        ctx.drawImage(img, x, y, 16, 16);
      }
    });
    
    ctx.restore();
  }
};
Chart.register(teamLogoPlugin);


window.addEventListener('DOMContentLoaded', async () => {
  await loadAllMatches();
  populateStatDropdown();
  populateTeamDropdown();
  setupTableSorting();
  runDisplay();
});

function getTeamLogoObj(teamName) {
  const url = resolveTeamLogo(teamName);
  if (!imageCache[url]) {
    const img = new Image();
    img.src = url;
    imageCache[url] = img;
  }
  return imageCache[url];
}

async function loadAllMatches() {
  const timestamp = document.getElementById('cacheTimestamp');
  try {
    const manifestRes = await fetch('./matches/manifest.json');
    if (!manifestRes.ok) throw new Error("Manifest not found.");
    const matchIds = await manifestRes.json();
    
    timestamp.textContent = `Loading ${matchIds.length} match JSONs...`;
    
    const fetchPromises = matchIds.map(async id => {
      try {
        const res = await fetch(`./matches/${id}.json`);
        if (res.ok) return await res.json();
      } catch(e) {
        console.error(`Failed to load match ${id}`, e);
      }
      return null;
    });

    const results = await Promise.all(fetchPromises);
    allMatchData = results.filter(m => m !== null);
    timestamp.textContent = `Loaded ${allMatchData.length} cached matches`;
  } catch (err) {
    console.error("Error loading local match JSONs:", err);
    timestamp.textContent = "Error: Run worker.py first!";
  }
}

function populateStatDropdown() {
  const sel = document.getElementById('statSelector');
  sel.innerHTML = '';
  Object.keys(PARSED_STATS).forEach(key => {
    sel.appendChild(new Option(PARSED_STATS[key].name, key));
  });
}

function populateTeamDropdown() {
  const teamSet = new Set();
  allMatchData.forEach(match => {
    if (match.players) {
      match.players.forEach(p => {
        let tName = p.team_name;
        if (!tName) {
            if (p.isRadiant && match.radiant_team && match.radiant_team.name) {
                tName = match.radiant_team.name;
            } else if (!p.isRadiant && match.dire_team && match.dire_team.name) {
                tName = match.dire_team.name;
            }
        }
        if (tName) teamSet.add(tName.trim().toUpperCase());
      });
    }
  });

  const teamSelector = document.getElementById('teamSelector');
  teamSelector.innerHTML = '<option value="ALL" selected>All Teams</option>';
  Array.from(teamSet).sort().forEach(team => {
    teamSelector.appendChild(new Option(team, team));
  });
}

function runDisplay() {
  const statKey = document.getElementById('statSelector').value;
  const mode = document.getElementById('modeSelector').value;
  const teamFilter = document.getElementById('teamSelector').value;
  const limit = parseInt(document.getElementById('limitSelector').value, 10);
  
  if (!statKey || !PARSED_STATS[statKey]) return;

  const statConfig = PARSED_STATS[statKey];
  const playerMap = {};

  allMatchData.forEach(match => {
    if (!match.players) return;
    match.players.forEach(p => {
      
      let teamName = p.team_name;
      if (!teamName) {
          if (p.isRadiant && match.radiant_team && match.radiant_team.name) {
              teamName = match.radiant_team.name;
          } else if (!p.isRadiant && match.dire_team && match.dire_team.name) {
              teamName = match.dire_team.name;
          } else {
              teamName = p.isRadiant ? "Radiant" : "Dire";
          }
      }
      
      teamName = teamName.trim().toUpperCase();

      if (teamFilter !== "ALL" && teamName !== teamFilter) return;

      const pName = p.name || p.personaname || `ID_${p.account_id}`;
      const val = statConfig.get(p, match);

      if (isNaN(val)) return;

      if (!playerMap[pName]) {
        playerMap[pName] = {
          playerName: pName,
          teamName: teamName,
          accountId: p.account_id,
          records: []
        };
      }

      playerMap[pName].records.push({
        value: val,
        matchId: match.match_id
      });
    });
  });

  aggregatedList = [];
  Object.values(playerMap).forEach(p => {
    const values = p.records.map(r => r.value);
    let finalVal = 0;
    let refMatchId = null;

    if (mode === "average") {
      finalVal = values.reduce((a, b) => a + b, 0) / values.length;
    } else if (mode === "highest") {
      const peak = p.records.reduce((prev, curr) => curr.value > prev.value ? curr : prev);
      finalVal = peak.value;
      refMatchId = peak.matchId;
    } else if (mode === "lowest") {
      const trough = p.records.reduce((prev, curr) => curr.value < prev.value ? curr : prev);
      finalVal = trough.value;
      refMatchId = trough.matchId;
    }

    aggregatedList.push({
      playerName: p.playerName,
      accountId: p.accountId,
      teamName: p.teamName,
      matchesPlayed: values.length,
      value: parseFloat(finalVal.toFixed(2)),
      matchId: refMatchId
    });
  });

  const isDescending = (mode === "average" || mode === "highest");
  aggregatedList.sort((a, b) => isDescending ? b.value - a.value : a.value - b.value);
  
  aggregatedList.forEach((item, index) => { item.rank = index + 1; });

  const dataSlice = aggregatedList.slice(0, limit);
  renderChart(dataSlice, statConfig.name, mode);
  
  sortAggregatedList(); 
  renderTable();
}

function renderChart(dataSlice, statName, mode) {
  const wrapper = document.getElementById('chartWrapper');
  const ctx = document.getElementById('statsChart').getContext('2d');
  
  if (chartInstance) chartInstance.destroy();

  document.getElementById('chartTitle').textContent = `Top ${dataSlice.length} — ${statName} (${mode.toUpperCase()})`;

  const calcHeight = Math.max(300, dataSlice.length * 20);
  wrapper.style.height = `${calcHeight}px`;

  const gradient = ctx.createLinearGradient(0, 0, 800, 0);
  gradient.addColorStop(0, '#EA6953');
  gradient.addColorStop(1, '#952E46');

  const logosToDraw = dataSlice.map(d => getTeamLogoObj(d.teamName));

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dataSlice.map(d => d.playerName), 
      datasets: [{
        data: dataSlice.map(d => d.value),
        backgroundColor: gradient,
        borderColor: '#ffa192',
        borderWidth: { right: 2, top: 2, bottom: 2, left: 0 },
        borderRadius: 2
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      teamLogos: logosToDraw, 
      plugins: { 
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1b1b1b',
          titleFont: { family: 'Radiance', size: 14 },
          bodyFont: { family: 'Radiance', size: 13, weight: 'bold' },
          borderColor: '#4f3612',
          borderWidth: 2,
          displayColors: false,
          callbacks: {
            title: function(context) {
              return context[0].label; 
            },
            label: function(context) {
              const item = dataSlice[context.dataIndex];
              return [
                `Team: ${item.teamName}`,
                `${statName}: ${item.value.toLocaleString()}`,
                `Match ID: ${item.matchId || '—'}`
              ];
            }
          }
        }
      },
      scales: {
        x: { 
            grid: { color: 'rgba(255,255,255,0.05)' }, 
            ticks: { color: '#9fa2a3' } 
        },
        y: { 
            grid: { display: false }, 
            ticks: { 
                color: '#ebeaeb', 
                font: { weight: 'bold' },
                padding: 28
            } 
        }
      }
    }
  });
}

function setupTableSorting() {
  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (currentSortCol === col) {
        sortDesc = !sortDesc; 
      } else {
        currentSortCol = col;
        sortDesc = (col === 'playerName' || col === 'teamName') ? false : true; 
      }
      
      document.querySelectorAll('th span.sort-icon').forEach(span => span.textContent = '');
      th.querySelector('span.sort-icon').textContent = sortDesc ? ' ▼' : ' ▲';

      sortAggregatedList();
      renderTable();
    });
  });
}

function sortAggregatedList() {
  aggregatedList.sort((a, b) => {
    let valA = a[currentSortCol];
    let valB = b[currentSortCol];

    if (valA === undefined) valA = '';
    if (valB === undefined) valB = '';

    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
      if (valA < valB) return sortDesc ? 1 : -1;
      if (valA > valB) return sortDesc ? -1 : 1;
      return 0;
    } else {
      return sortDesc ? valB - valA : valA - valB;
    }
  });
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  if (aggregatedList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500 font-mono">No matching records found.</td></tr>`;
    return;
  }

  aggregatedList.forEach((item) => {
    const row = document.createElement('tr');
    row.className = "hover:bg-black/40 transition";

    const matchLink = item.matchId 
      ? `<a href="https://www.opendota.com/matches/${item.matchId}" target="_blank" class="text-[#ebcf87] hover:underline font-mono">${item.matchId}</a>` 
      : '—';
      
    const playerLink = item.accountId 
      ? `<a href="https://www.opendota.com/players/${item.accountId}" target="_blank" class="text-white hover:text-[#ebcf87] hover:underline transition">${item.playerName}</a>`
      : item.playerName;

    const logoUrl = resolveTeamLogo(item.teamName);

    row.innerHTML = `
      <td class="py-3 px-4 text-center font-mono text-xs text-[#c79123]">${item.rank}</td>
      <td class="py-3 px-4 font-semibold">${playerLink}</td>
      <td class="py-3 px-4 text-slate-400 whitespace-nowrap flex items-center gap-2">
         <img src="${logoUrl}" alt="logo" class="w-5 h-5 object-contain" />
         ${item.teamName}
      </td>
      <td class="py-3 px-4 text-center font-mono">${item.matchesPlayed}</td>
      <td class="py-3 px-4 text-right font-mono font-bold text-[#ebcf87]">${item.value.toLocaleString()}</td>
      <td class="py-3 px-4 text-center">${matchLink}</td>
    `;
    tbody.appendChild(row);
  });
}

document.getElementById('displayBtn').addEventListener('click', runDisplay);
document.getElementById('teamSelector').addEventListener('change', runDisplay);
document.getElementById('refreshCacheBtn').addEventListener('click', async () => {
  await loadAllMatches();
  populateTeamDropdown();
  runDisplay();
});