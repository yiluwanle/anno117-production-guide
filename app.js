/* 纪元117 生产线配比百科 —— 计算与渲染 */
(function () {
  const D = window.ANNO_DATA;
  if (!D) { document.body.innerHTML = '<p style="padding:40px">数据加载失败：data.js 缺失。</p>'; return; }

  const REGIONS = D.regions;
  const CHAINS = D.chains;
  const G = D.goods || {};

  const state = { region: 'all', mode: 'tech', q: '', n: 1, global: 0, tiers: new Set() };

  // URL 参数（便于分享具体查询）
  const params = new URLSearchParams(location.search);
  if (params.get('region')) state.region = params.get('region');
  if (['none', 'fac', 'tech'].includes(params.get('mode'))) state.mode = params.get('mode');
  if (params.get('q')) state.q = params.get('q');
  if (params.get('n')) state.n = Number(params.get('n')) || 1;
  if (params.get('bonus')) state.global = Math.max(0, Math.min(200, Number(params.get('bonus')) || 0));
  function syncURL() {
    const p = new URLSearchParams();
    if (state.region !== 'all') p.set('region', state.region);
    if (state.mode !== 'tech') p.set('mode', state.mode);
    if (state.q) p.set('q', state.q);
    if (state.n !== 1) p.set('n', state.n);
    if (state.global) p.set('bonus', state.global);
    const qs = p.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  /* ---------------- 计算 ---------------- */
  // 生产力% = (100 + 筒仓100 + 鸽舍50 + 研究 + 全局) × 输水道系数
  function productivity(b, mode, global) {
    let add = 0;
    if (mode !== 'none') {
      if (b.silo) add += 100;
      if (b.taube) add += 50;
    }
    if (mode === 'tech') add += (b.research || 0);
    if (mode !== 'none') add += global;
    const base = 100 + add;
    const aqua = (mode !== 'none' && b.aqua) ? 1.5 : 1;
    return base * aqua;
  }

  // 寻找最小整数配比：返回 {k, ints} 或 null
  function niceScale(counts) {
    for (let k = 1; k <= 8; k++) {
      let ok = true, ints = [];
      for (const v of counts) {
        const x = v * k;
        const r = Math.round(x);
        if (r < 1 || Math.abs(x - r) > 0.06 * Math.max(1, r)) { ok = false; break; }
        ints.push(r);
      }
      if (ok) return { k, ints };
    }
    return null;
  }

  function solve(chain, mode, n, global) {
    const rows = chain.stages.map((s) => {
      const p = productivity(s.bonus, mode, global);
      const eff = s.time / (p / 100);
      return { s, p, eff, out: 60 / eff };
    });
    let ref = rows[rows.length - 1];
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].s.outputs && rows[i].s.outputs.length) { ref = rows[i]; break; }
    }
    rows.forEach((r) => { r.count = (r.eff / ref.eff) * n; });
    return rows;
  }

  /* ---------------- 工具 ---------------- */
  const gname = (en) => G[en] || en;
  const fmt = (v) => {
    if (!isFinite(v)) return '—';
    if (Math.abs(v - Math.round(v)) < 0.005) return String(Math.round(v));
    return v >= 10 ? v.toFixed(1) : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  };
  const mmss = (sec) => {
    const s = Math.round(sec);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const MODE_ZH = { none: '无加成', fac: '满设施', tech: '满科技' };

  /* ---------------- 顶部统计 ---------------- */
  const totalBuildings = Object.keys(D.buildings).length;
  document.getElementById('heroStats').innerHTML = [
    ['<b>' + CHAINS.length + '</b><span>条生产线</span>'],
    ['<b>' + REGIONS.length + '</b><span>个行省</span>'],
    ['<b>' + totalBuildings + '</b><span>栋建筑</span>'],
    ['<b>3.0</b><span>数据版本</span>']
  ].map((x) => '<div class="stat">' + x[0] + '</div>').join('');

  /* ---------------- 控件 ---------------- */
  const regionTabs = document.getElementById('regionTabs');
  regionTabs.innerHTML = ['<button data-r="all">全部行省</button>']
    .concat(REGIONS.map((r) => '<button data-r="' + r.id + '">' + r.name + '</button>')).join('');
  [...regionTabs.children].forEach((x) => x.classList.toggle('active', x.dataset.r === state.region));
  regionTabs.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.region = b.dataset.r; state.tiers.clear();
    [...regionTabs.children].forEach((x) => x.classList.toggle('active', x === b));
    buildTierChips(); render();
  });

  const modeSeg = document.getElementById('modeSeg');
  modeSeg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.mode = b.dataset.mode;
    [...modeSeg.children].forEach((x) => x.classList.toggle('active', x === b));
    render();
  });

  const search = document.getElementById('search');
  search.addEventListener('input', () => { state.q = search.value.trim().toLowerCase(); render(); });

  const targetN = document.getElementById('targetN');
  targetN.addEventListener('change', () => { state.n = Number(targetN.value); render(); });

  const gb = document.getElementById('globalBonus');
  const gOut = document.getElementById('globalOut');
  gb.addEventListener('input', () => {
    state.global = Number(gb.value);
    gOut.textContent = state.global + '%';
    gb.style.setProperty('--p', (state.global / 200 * 100) + '%');
    render();
  });

  const tierFilter = document.getElementById('tierFilter');
  function buildTierChips() {
    const pool = state.region === 'all' ? REGIONS : REGIONS.filter((r) => r.id === state.region);
    const seen = new Map();
    pool.forEach((r) => r.tiers.forEach((t) => seen.set(t.name, t.name)));
    tierFilter.innerHTML = [...seen.values()].map((t) =>
      '<button class="tier-chip' + (state.tiers.has(t) ? ' active' : '') + '" data-t="' + esc(t) + '">' + esc(t) + '</button>').join('');
  }
  tierFilter.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const t = b.dataset.t;
    if (state.tiers.has(t)) state.tiers.delete(t); else state.tiers.add(t);
    b.classList.toggle('active');
    render();
  });

  document.getElementById('explainerToggle').addEventListener('click', function () {
    const body = document.getElementById('explainerBody');
    const open = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', String(!open));
    body.hidden = open;
  });

  /* ---------------- 卡片 ---------------- */
  function facilityIcons(b) {
    const out = [];
    if (b.aqua) out.push('<i title="可接输水道：基础生产 150%">水</i>');
    if (b.silo) out.push('<i class="silo" title="可接筒仓：+100%">仓</i>');
    if (b.taube) out.push('<i class="taube" title="可接鸽舍：+50%">鸽</i>');
    return out.length ? '<span class="fac">' + out.join('') + '</span>' : '';
  }

  function flowHTML(chain, rows) {
    const tokens = [];
    const made = new Set();
    rows.forEach((r) => {
      const s = r.s;
      const missing = (s.inputs || []).filter((g) => !made.has(g));
      missing.forEach((g) => tokens.push({ t: 'g', v: gname(g) }));
      tokens.push({ t: 'b', zh: s.zh, en: s.en, n: r.count, coal: (s.flags || []).includes('coal') });
      (s.outputs || []).forEach((g) => { made.add(g); tokens.push({ t: 'g', v: gname(g), out: true }); });
    });
    // 去掉紧邻重复的商品
    const clean = [];
    tokens.forEach((tk) => {
      const prev = clean[clean.length - 1];
      if (tk.t === 'g' && prev && prev.t === 'g' && prev.v === tk.v) return;
      clean.push(tk);
    });
    return '<div class="flow">' + clean.map((tk, i) => {
      const piece = tk.t === 'g'
        ? '<span class="node good">' + esc(tk.v) + '</span>'
        : '<span class="node bld" title="' + esc(tk.en) + '">' + esc(tk.zh) + ' <b>×' + fmt(tk.n) + '</b></span>';
      return (i ? '<span class="arrow">›</span>' : '') + piece;
    }).join('') + '</div>';
  }

  function notesHTML(chain, rows, rowsNone) {
    const notes = [];
    // 整数配比：无加成 / 当前情景
    const ratioNote = (rws, label, cls) => {
      const ns = niceScale(rws.map((r) => r.count));
      if (ns) {
        notes.push({
          cls: cls, ico: '配',
          html: label + '：每 <b>' + ns.k + '</b> 座 <b>' + esc(chain.good_zh) + '</b> → ' +
            rws.map((r, i) => esc(r.s.zh) + ' <b>' + ns.ints[i] + '</b>').join(' · ')
        });
      } else {
        notes.push({
          cls: cls, ico: '配',
          html: label + '：' + rws.map((r) => esc(r.s.zh) + ' <b>' + fmt(r.count) + '</b>').join(' · ') +
            '（含小数，施工向上取整即可，多出的上游产能可关停或外销）'
        });
      }
    };
    ratioNote(rowsNone, '无加成配比', '');
    if (state.mode !== 'none') ratioNote(rows, MODE_ZH[state.mode] + '配比', 'warn');
    // 水源
    rows.forEach((r) => {
      if (r.s.bonus.aqua && state.mode !== 'none') {
        const n0 = rowsNone.find((x) => x.s === r.s);
        notes.push({
          cls: 'warn', ico: '水',
          html: '<b>' + esc(r.s.zh) + '</b> 接通输水道：基础周期 <b>' + mmss(r.s.time) + '</b> → <b>' + mmss(r.eff) + '</b>，生产力 <b>' + Math.round(r.p) + '%</b>' +
            (n0 && r.count < n0.count - 0.005 ? '，数量从 <b>' + fmt(n0.count) + '</b> 降到 <b>' + fmt(r.count) + '</b>' : '')
        });
      }
    });
    // 燃料
    const coalRows = rows.filter((r) => (r.s.flags || []).includes('coal'));
    if (coalRows.length) {
      const total = coalRows.reduce((a, r) => a + r.count, 0);
      notes.push({
        cls: 'fuel', ico: '煤',
        html: '燃煤建筑共 <b>' + fmt(total) + '</b> 栋，需煤 <b>' + fmt(total * 0.5) + '</b> 吨/分，约 <b>' + fmt(total / 4) + '</b> 座煤矿或炭窑（1 座供养 4 栋）'
      });
    }
    // 总建筑数对比
    const sumNow = rows.reduce((a, r) => a + r.count, 0);
    const sumNone = rowsNone.reduce((a, r) => a + r.count, 0);
    if (sumNone > 0 && Math.abs(sumNow - sumNone) / sumNone > 0.02) {
      const pct = Math.round((sumNow - sumNone) / sumNone * 100);
      notes.push({
        cls: '', ico: '差',
        html: '整条链建筑数：无加成 <b>' + fmt(sumNone) + '</b> 座 → 当前 <b>' + fmt(sumNow) + '</b> 座（' +
          (pct < 0 ? '少 ' : '多 ') + Math.abs(pct) + '%）'
      });
    }
    return '<div class="notes">' + notes.map((x) =>
      '<div class="note-row ' + x.cls + '"><span class="ico">' + x.ico + '</span><span>' + x.html + '</span></div>').join('') + '</div>';
  }

  function recipeHTML(chain, rows) {
    const items = rows.map((r) => {
      const s = r.s;
      const ins = (s.inputs || []).map(gname).join(' + ') || '无（原料）';
      const outs = (s.outputs || []).map(gname).join(' + ') || '—';
      const bonusParts = [];
      if (s.bonus.aqua) bonusParts.push('水源×1.5');
      if (s.bonus.silo) bonusParts.push('筒仓+100');
      if (s.bonus.taube) bonusParts.push('鸽舍+50');
      if (s.bonus.research) bonusParts.push('研究+' + s.bonus.research);
      if (s.bonus.religion) bonusParts.push('宗教最高+' + s.bonus.religion + '（守护神，可选）');
      return '<li><span><b>' + esc(s.zh) + '</b><em style="font-style:normal;color:#867a6a;font-size:11px"> ' + esc(s.en) + '</em> ' +
        esc(ins) + ' → ' + esc(outs) + '</span>' +
        '<span class="rl-time">' + mmss(s.time) + ' · 生产力 ' + Math.round(r.p) + '% · 产出 ' + r.out.toFixed(2) + '/分</span>' +
        '<span class="bonus-line">可用加成：' + (bonusParts.length ? bonusParts.join(' · ') : '无') + '</span></li>';
    }).join('');
    return '<details class="recipe"><summary>逐栋配方与加成明细</summary><ul class="recipe-list">' + items + '</ul></details>';
  }

  function chainHTML(chain) {
    const rows = solve(chain, state.mode, state.n, state.global);
    const rowsNone = solve(chain, 'none', state.n, 0);
    const finalRow = rows[rows.length - 1] || rows[0];
    const lastRef = [...rows].reverse().find((r) => r.s.outputs && r.s.outputs.length) || finalRow;
    const lastRefNone = [...rowsNone].reverse().find((r) => r.s.outputs && r.s.outputs.length) || rowsNone[rowsNone.length - 1];
    const uplift = Math.round((lastRef.p / 100 - 1) * 100);
    const sumNowH = rows.reduce((a, r) => a + r.count, 0);
    const sumNoneH = rowsNone.reduce((a, r) => a + r.count, 0);
    const chainPct = sumNoneH > 0 ? Math.round((sumNowH - sumNoneH) / sumNoneH * 100) : 0;

    const trs = rows.map((r, i) => {
      const n0 = rowsNone[i].count;
      const d = n0 > 0 ? (r.count - n0) / n0 * 100 : 0;
      const delta = Math.abs(d) < 0.5
        ? '<span class="delta flat">—</span>'
        : '<span class="delta ' + (d < 0 ? 'down' : 'flat') + '">' + (d > 0 ? '+' : '') + Math.round(d) + '%</span>';
      return '<tr>' +
        '<td><span class="bname">' + esc(r.s.zh) + '<em>' + esc(r.s.en) + '</em></span>' + facilityIcons(r.s.bonus) + '</td>' +
        '<td>' + mmss(r.s.time) + '</td>' +
        '<td class="c-yield">' + r.out.toFixed(2) + '</td>' +
        '<td class="c-none">' + fmt(n0) + '</td>' +
        '<td class="c-tech">' + fmt(r.count) + '</td>' +
        '<td>' + delta + '</td>' +
        '</tr>';
    }).join('');

    const hasCoal = chain.stages.some((s) => (s.flags || []).includes('coal'));

    return '<article class="chain" data-id="' + chain.id + '">' +
      '<div class="chain-head">' +
        '<div class="glyph">' + esc(chain.good_zh.slice(0, 1)) + '</div>' +
        '<div>' +
          '<h3>' + esc(chain.good_zh) + '<span class="latin">' + esc(chain.good_de) + ' · ' + esc(chain.good_en) + '</span></h3>' +
          '<div class="tags">' +
            '<span class="tag region-' + chain.region + '">' + esc(chain.region_zh) + '</span>' +
            '<span class="tag">' + esc(chain.tier_zh) + '</span>' +
            '<span class="tag">' + chain.stages.length + ' 段</span>' +
            (hasCoal ? '<span class="tag coal">需煤</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="head-right"><div class="big">' + (chainPct > 0 ? '+' : '') + chainPct + '%</div><small>整链建筑 · 成品 ' + Math.round(lastRef.p) + '%</small></div>' +
      '</div>' +
      flowHTML(chain, rows) +
      '<table><thead><tr>' +
        '<th>建筑</th><th>基础周期</th><th>产出/分</th><th>无加成</th><th>' + MODE_ZH[state.mode] + '</th><th>变化</th>' +
      '</tr></thead><tbody>' + trs + '</tbody></table>' +
      notesHTML(chain, rows, rowsNone) +
      recipeHTML(chain, rows) +
      '</article>';
  }

  /* ---------------- 筛选与渲染 ---------------- */
  function visibleChains() {
    return CHAINS.filter((c) => {
      if (state.region !== 'all' && c.region !== state.region) return false;
      if (state.tiers.size && !state.tiers.has(c.tier_zh)) return false;
      if (!state.q) return true;
      const hay = [c.good_zh, c.good_de, c.good_en, c.tier_zh, c.region_zh]
        .concat(c.stages.map((s) => s.zh + ' ' + s.de + ' ' + s.en))
        .join(' ').toLowerCase();
      return hay.includes(state.q);
    });
  }

  const grid = document.getElementById('grid');
  const emptyEl = document.getElementById('empty');
  const countEl = document.getElementById('resultCount');

  function render() {
    const list = visibleChains();
    // 按地区 → 层级 分组（保持行省顺序）
    const groups = new Map();
    REGIONS.forEach((r) => r.tiers.forEach((t) => groups.set(r.id + '|' + t.name, { region: r, tier: t.name, items: [] })));
    list.forEach((c) => {
      const g = groups.get(c.region + '|' + c.tier_zh);
      if (g) g.items.push(c);
      else groups.set(c.region + '|' + c.tier_zh, { region: { id: c.region, name: c.region_zh }, tier: c.tier_zh, items: [c] });
    });
    let html = '';
    for (const g of groups.values()) {
      if (!g.items.length) continue;
      html += '<div class="group-head"><span class="gh-region r-' + g.region.id + '">' + esc(g.region.name) + '</span>' +
        '<span class="gh-tier">' + esc(g.tier) + '</span><span class="gh-n">' + g.items.length + ' 条产线</span></div>';
      html += g.items.map(chainHTML).join('');
    }
    grid.innerHTML = html;
    emptyEl.hidden = list.length > 0;
    countEl.innerHTML = '共 <b style="color:#241f19">' + list.length + '</b> 条产线 · 基准：每 <b style="color:#241f19">' + state.n +
      '</b> 座成品建筑 · 情景：<b style="color:#a9432a">' + MODE_ZH[state.mode] +
      (state.global && state.mode !== 'none' ? '（额外 +' + state.global + '%）' : '') + '</b>';
    syncURL();
  }

  // 初次同步 URL 状态到控件
  [...modeSeg.children].forEach((x) => x.classList.toggle('active', x.dataset.mode === state.mode));
  search.value = state.q;
  if (![...targetN.options].some((o) => Number(o.value) === state.n)) {
    const o = document.createElement('option'); o.value = String(state.n); o.textContent = state.n + ' 座'; targetN.appendChild(o);
  }
  targetN.value = String(state.n);
  gb.value = String(state.global); gOut.textContent = state.global + '%';
  gb.style.setProperty('--p', (state.global / 200 * 100) + '%');

  buildTierChips();
  render();
})();
