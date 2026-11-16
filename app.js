/* 纪元117 生产线配比百科 —— 计算与渲染 */
(function () {
  const D = window.ANNO_DATA;
  if (!D) { document.body.innerHTML = '<p style="padding:40px">数据加载失败：data.js 缺失。</p>'; return; }

  const REGIONS = D.regions;
  const CHAINS = D.chains;
  const G = D.goods || {};
  const GI = D.goods_img || {};
  const CARDS = D.cards || {};
  const CB = D.cards_by_building || {};
  const CARD_MAX = 3;

  const state = {
    region: 'all', mode: 'tech', q: '', n: 1, global: 0, tiers: new Set(),
    cards: {},          // "region|建筑德文名" → [cardId, ...]（最多 3 张）
    cardQ: 'base',      // 卡牌品质：base 普通 / prod 传说
  };

  /* ---------------- 卡牌 ---------------- */
  const ckey = (region, de) => region + '|' + de;
  const cardsOf = (region, de) => CB[ckey(region, de)] || [];
  const selCards = (region, de) => state.cards[ckey(region, de)] || [];
  const cardVal = (id) => {
    const c = CARDS[id];
    if (!c) return 0;
    return state.cardQ === 'prod' ? c.prod : c.base;
  };
  function cardAdd(region, de) {
    let add = 0;
    selCards(region, de).forEach((id) => { add += cardVal(id); });
    return add;
  }

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
  // 生产力% = (100 + 筒仓100 + 鸽舍50 + 研究 + 卡牌 + 全局) × 输水道系数
  function productivity(b, mode, global, cards) {
    let add = 0;
    if (mode !== 'none') {
      if (b.silo) add += 100;
      if (b.taube) add += 50;
    }
    if (mode === 'tech') add += (b.research || 0);
    if (mode !== 'none') add += global;
    add += cards || 0;
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

  function solve(chain, mode, n, global, withCards) {
    const rows = chain.stages.map((s) => {
      const ca = withCards ? cardAdd(chain.region, s.de) : 0;
      const p = productivity(s.bonus, mode, global, ca);
      const eff = s.time / (p / 100);
      return { s, p, eff, out: 60 / eff, cards: ca };
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

  /* ---------------- 图片 ---------------- */
  const goodImg = (en) => GI[en] || '';
  const imgTag = (src, cls, alt) => (src
    ? '<img class="' + cls + '" src="' + esc(src) + '" alt="' + esc(alt || '') + '" loading="lazy" decoding="async" onerror="this.style.display=\'none\';this.parentNode.classList.add(\'noimg\')">'
    : '');

  /* ---------------- 顶部统计 ---------------- */
  const totalBuildings = Object.keys(D.buildings).length;
  document.getElementById('heroStats').innerHTML = [
    ['<b>' + CHAINS.length + '</b><span>条生产线</span>'],
    ['<b>' + REGIONS.length + '</b><span>个行省</span>'],
    ['<b>' + totalBuildings + '</b><span>栋建筑</span>'],
    ['<b>' + ((window.ANNO_CARDS && window.ANNO_CARDS.meta.count) || 0) + '</b><span>张卡牌</span>'],
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
      missing.forEach((g) => tokens.push({ t: 'g', en: g, v: gname(g) }));
      tokens.push({ t: 'b', zh: s.zh, en: s.en, n: r.count, coal: (s.flags || []).includes('coal') });
      (s.outputs || []).forEach((g) => { made.add(g); tokens.push({ t: 'g', en: g, v: gname(g), out: true }); });
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
        ? '<span class="node good" title="' + esc(tk.en) + '">' + imgTag(goodImg(tk.en), 'ic', tk.v) + esc(tk.v) + '</span>'
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
    const chip = (g) => '<span class="gchip">' + imgTag(goodImg(g), 'gi', gname(g)) + esc(gname(g)) + '</span>';
    const items = rows.map((r, i) => {
      const s = r.s;
      const ins = (s.inputs || []).length ? s.inputs.map(chip).join('<i class="plus">+</i>') : '<span class="gchip raw">野外采集</span>';
      const outs = (s.outputs || []).length ? s.outputs.map(chip).join('<i class="plus">+</i>') : '—';
      const bonusParts = [];
      if (s.bonus.aqua) bonusParts.push('水源×1.5');
      if (s.bonus.silo) bonusParts.push('筒仓+100');
      if (s.bonus.taube) bonusParts.push('鸽舍+50');
      if (s.bonus.research) bonusParts.push('研究+' + s.bonus.research);
      if (s.bonus.religion) bonusParts.push('宗教最高+' + s.bonus.religion + '（守护神，可选）');
      const picked = selCards(chain.region, s.de);
      const cardLine = picked.length
        ? ' · <b class="cb-hi">卡牌 +' + fmt(r.cards) + '%（' +
          picked.map((id) => esc(CARDS[id].zh)).join('、') + '）</b>'
        : '';
      return '<li>' + imgTag(s.img, 'rthumb', s.zh) +
        '<span class="rmain"><span class="rname"><b>' + esc(s.zh) + '</b><em> ' + esc(s.en) + '</em></span>' +
        '<span class="rio">' + ins + '<i class="arr">→</i>' + outs + '</span></span>' +
        '<span class="rl-time">' + mmss(s.time) + ' · 生产力 ' + Math.round(r.p) + '% · 产出 ' + r.out.toFixed(2) + '/分</span>' +
        '<span class="bonus-line">可用加成：' + (bonusParts.length ? bonusParts.join(' · ') : '无') + cardLine + '</span>' +
        cardBtn(chain, i) + '</li>';
    }).join('');
    return '<details class="recipe"><summary>逐栋配方与加成明细</summary><ul class="recipe-list">' + items + '</ul></details>';
  }

  function cardBtn(chain, i) {
    const s = chain.stages[i];
    if (!s) return '';
    const avail = cardsOf(chain.region, s.de);
    if (!avail.length) return '';
    const n = selCards(chain.region, s.de).length;
    return '<button class="cbtn' + (n ? ' on' : '') + '" data-card-open="' + chain.id + ':' + i +
      '" title="勾选该建筑的专家 / 物品卡（' + avail.length + ' 张可选）">' + (n ? '卡 ' + n + '/' + CARD_MAX : '＋卡') + '</button>';
  }

  function chainHTML(chain) {
    const rows = solve(chain, state.mode, state.n, state.global, true);
    const rowsNone = solve(chain, 'none', state.n, 0, false);
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
        '<td><span class="bname">' + imgTag(r.s.img, 'bthumb', r.s.zh) +
          '<span class="btext">' + esc(r.s.zh) + '<em>' + esc(r.s.en) + '</em></span>' + facilityIcons(r.s.bonus) +
          cardBtn(chain, i) + '</span></td>' +
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
        '<div class="glyph">' + (chain.icon ? imgTag(chain.icon, 'gimg', chain.good_zh) : esc(chain.good_zh.slice(0, 1))) + '</div>' +
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

  let lastList = [];
  function updateCount() {
    countEl.innerHTML = '共 <b style="color:#241f19">' + lastList.length + '</b> 条产线 · 基准：每 <b style="color:#241f19">' + state.n +
      '</b> 座成品建筑 · 情景：<b style="color:#a9432a">' + MODE_ZH[state.mode] +
      (state.global && state.mode !== 'none' ? '（额外 +' + state.global + '%）' : '') + '</b>' +
      (Object.keys(state.cards).length ? ' · 已插卡 <b style="color:#a9432a">' +
        Object.values(state.cards).reduce((a, v) => a + v.length, 0) + '</b> 张' : '');
  }

  function render() {
    const list = visibleChains();
    lastList = list;
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
    updateCount();
    syncURL();
  }

  function rerenderChain(id) {
    const chain = CHAINS.find((c) => c.id === id);
    const el = grid.querySelector('article.chain[data-id="' + id + '"]');
    if (!chain || !el) return;
    const d0 = el.querySelector('details.recipe');
    const wasOpen = d0 ? d0.open : false;
    const scrollY = window.scrollY;
    const tmp = document.createElement('div');
    tmp.innerHTML = chainHTML(chain);
    const next = tmp.firstElementChild;
    if (!next) return;
    if (wasOpen) { const d = next.querySelector('details.recipe'); if (d) d.open = true; }
    el.replaceWith(next);
    window.scrollTo(0, scrollY);
    updateCount();
  }

  /* ================= 卡牌全库 ================= */
  const CA = window.ANNO_CARDS || null;
  const CI = (CA && CA.items) || {};          // guid -> [en,zh,rar,niche,cat,img,eff,cond,tgt,where,vit,de]
  const CATS = (CA && CA.cats) || [];
  const CGMAP = (CA && CA.card_guid) || {};   // vitablo 卡牌 id -> guid
  const CAT_ZH = {};
  CATS.forEach((c) => { CAT_ZH[c.id] = c.zh; });
  const RANK = { Unique: 6, Heroic: 5, Legendary: 4, Epic: 3, Rare: 2, Common: 1 };
  const GUID_KEYS = Object.keys(CI);

  const cardName = (g) => (CI[g] ? (CI[g][1] || CI[g][0]) : g);
  const isCheck = (v) => v === '✓' || v === '–' || v === '';

  function effText(e) {
    const v = e[1], p = e[2];
    if (v === '✓' && (p === '✓' || !p)) return '';
    if (v === '–' && p === '✓') return '（强化档）';
    if (isCheck(v)) return '';
    if (p && p !== v && !isCheck(p) && p !== '–') return v + '（强化 ' + p + '）';
    return v;
  }

  // 效果摘要（用于列表/弹层）
  function effLine(g, full) {
    const r = CI[g];
    if (!r) return '';
    const eff = r[6] || [];
    const parts = [];
    const prod = eff.filter((e) => e[4] === 'Productivity')[0];
    if (prod) {
      const b = prod[1];
      const p = prod[2] && prod[2] !== b && !isCheck(prod[2]) ? '（强化 ' + prod[2] + '）' : '';
      parts.push('生产力 <b>' + b + '</b>' + p);
    }
    eff.filter((e) => e[4] !== 'Productivity').slice(0, full ? 99 : 1).forEach((e) => {
      const t = effText(e);
      parts.push(t ? e[0] + ' <b>' + t + '</b>' : e[0]);
    });
    return parts.join(' · ');
  }

  function prodOf(g) {
    const r = CI[g];
    if (!r) return null;
    const p = (r[6] || []).filter((e) => e[4] === 'Productivity')[0];
    if (!p) return null;
    const n = (s) => {
      const m = String(s).match(/-?\d+(?:[.,]\d+)?/);
      return m ? parseFloat(m[0].replace(',', '.')) : 0;
    };
    return { base: n(p[1]), prod: n(p[2]), row: p };
  }

  /* ---------------- 我的清单（localStorage） ---------------- */
  const WKEY = 'anno117.wishlist.v1';
  let wish = {};
  try { wish = JSON.parse(localStorage.getItem(WKEY) || '{}') || {}; } catch (e) { wish = {}; }
  Object.keys(wish).forEach((g) => {
    if (!CI[g]) { delete wish[g]; return; }
    const o = wish[g] || {};
    wish[g] = { n: Math.max(1, parseInt(o.n, 10) || 1), h: Math.max(0, parseInt(o.h, 10) || 0) };
  });

  function saveWish() {
    try { localStorage.setItem(WKEY, JSON.stringify(wish)); } catch (e) { /* 忽略隐私模式 */ }
    updateWishBadge();
  }
  function wishAdd(g) {
    if (!CI[g]) return;
    if (!wish[g]) wish[g] = { n: 1, h: 0 };
    saveWish();
  }
  function wishCount() { return Object.keys(wish).length; }
  function wishTodo() { return Object.keys(wish).filter((g) => wish[g].h < wish[g].n).length; }

  function updateWishBadge() {
    const el = document.getElementById('vtWish');
    if (el) el.textContent = wishCount() ? (wishTodo() + ' 张待收集 · 共 ' + wishCount() + ' 张') : '还没添加卡牌';
    const vc = document.getElementById('vtCards');
    if (vc && CA) vc.textContent = CA.meta.count + ' 张卡牌 · 效果明细';
  }
  const cm = document.getElementById('cardModal');
  const cmTitle = document.getElementById('cmTitle');
  const cmSub = document.getElementById('cmSub');
  const cmList = document.getElementById('cmList');
  const cmSum = document.getElementById('cmSum');
  const cmQuality = document.getElementById('cmQuality');
  let cmCtx = null;

  const fmtVal = (c) => (c >= 0 ? '+' : '') + (Math.round(c * 10) / 10) + '%';

  function cardMark(c) {
    return '<span class="cm-ico rar-' + (c.r || 0) + '">' + imgTag(c.img, 'cimg', c.zh) +
      '<i class="cm-fb">' + esc(c.zh.slice(0, 1)) + '</i></span>';
  }

  function renderCardList() {
    if (!cmCtx) return;
    const { chain, idx } = cmCtx;
    const s = chain.stages[idx];
    const ids = cardsOf(chain.region, s.de);
    const sel = selCards(chain.region, s.de);
    cmTitle.textContent = s.zh;
    cmSub.innerHTML = '<em>' + esc(s.en) + '</em> · 可选 <b>' + ids.length + '</b> 张，已选 <b>' + sel.length + '/' + CARD_MAX +
      '</b> · 加成与设施相加，最后统一乘水源系数';
    cmList.innerHTML = ids.map((id) => {
      const c = CARDS[id];
      const on = sel.includes(id);
      const dis = !on && sel.length >= CARD_MAX;
      const g = CGMAP[id];
      const eff = g ? effLine(g, false) : (c.kind === 'research' ? '<span class="cm-eff">研究解锁项目 · 不可插入建筑</span>' : '');
      return '<button class="cm-row' + (on ? ' sel' : '') + (dis ? ' dis' : '') + '" data-pick="' + id + '">' +
        cardMark(c) +
        '<span class="cm-name"><b>' + esc(c.zh) + '</b><em>' + esc(c.de) + '</em>' +
        (eff ? '<span class="cm-eff">' + eff + '</span>' : '') + '</span>' +
        '<span class="cm-val"><b class="' + (state.cardQ === 'base' ? 'cur' : '') + '">' + fmtVal(c.base) + '</b>' +
        '<i class="' + (state.cardQ === 'prod' ? 'cur' : '') + '">' + fmtVal(c.prod) + '</i></span>' +
        '<span class="cm-chk">' + (on ? '✓' : '') + '</span>' +
        '</button>';
    }).join('');
    const p = productivity(s.bonus, state.mode, state.global, cardAdd(chain.region, s.de));
    const p0 = productivity(s.bonus, state.mode, state.global, 0);
    cmSum.innerHTML = '本栋生产力：' + MODE_ZH[state.mode] + '基础 <b>' + Math.round(p0) + '%</b>' +
      (Math.abs(p - p0) > 0.01 ? ' → <b class="cb-hi">' + Math.round(p) + '%</b>' : '') +
      (Math.abs(p - p0) > 0.01 ? '，周期 ' + mmss(s.time) + ' → ' + mmss(s.time / (p / 100)) : '');
  }

  function openCardModal(chainId, idx) {
    const chain = CHAINS.find((c) => c.id === chainId);
    if (!chain || !chain.stages[idx]) return;
    cmCtx = { chain, idx };
    renderCardList();
    cm.hidden = false;
    document.body.classList.add('cm-open');
    const panel = cm.querySelector('.cm-panel');
    if (panel) panel.scrollTop = 0;
  }

  function closeCardModal() {
    if (!cmCtx) return;
    const id = cmCtx.chain.id;
    cmCtx = null;
    cm.hidden = true;
    document.body.classList.remove('cm-open');
    rerenderChain(id);
  }

  cm.addEventListener('click', (e) => {
    if (e.target.closest('[data-cm-close]')) { closeCardModal(); return; }
    const q = e.target.closest('#cmQuality button');
    if (q) {
      state.cardQ = q.dataset.q;
      [...cmQuality.children].forEach((x) => x.classList.toggle('active', x === q));
      renderCardList();
      return;
    }
    if (e.target.closest('#cmClear')) {
      if (cmCtx) {
        delete state.cards[ckey(cmCtx.chain.region, cmCtx.chain.stages[cmCtx.idx].de)];
        renderCardList();
      }
      return;
    }
    const row = e.target.closest('[data-pick]');
    if (row && cmCtx) {
      const key = ckey(cmCtx.chain.region, cmCtx.chain.stages[cmCtx.idx].de);
      const id = row.dataset.pick;
      const cur = (state.cards[key] || []).slice();
      const at = cur.indexOf(id);
      if (at >= 0) cur.splice(at, 1);
      else if (cur.length < CARD_MAX) cur.push(id);
      else { row.classList.add('shake'); setTimeout(() => row.classList.remove('shake'), 420); return; }
      if (cur.length) state.cards[key] = cur; else delete state.cards[key];
      renderCardList();
    }
  });

  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-card-open]');
    if (!b) return;
    const parts = b.dataset.cardOpen.split(':');
    openCardModal(parts[0], Number(parts[1]));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !cm.hidden) closeCardModal();
  });

  /* ================= 视图切换 ================= */
  const viewChains = document.getElementById('viewChains');
  const viewCards = document.getElementById('viewCards');
  const viewWish = document.getElementById('viewWish');
  const viewTabs = document.getElementById('viewTabs');
  let curView = 'chains';

  function setView(v) {
    if (!['chains', 'cards', 'wish'].includes(v)) v = 'chains';
    curView = v;
    viewChains.hidden = v !== 'chains';
    viewCards.hidden = v !== 'cards';
    viewWish.hidden = v !== 'wish';
    [...viewTabs.children].forEach((b) => b.classList.toggle('active', b.dataset.v === v));
    if (v === 'cards') renderCatalog();
    if (v === 'wish') renderWish();
    const p = new URLSearchParams(location.search);
    if (v === 'chains') p.delete('view'); else p.set('view', v);
    const qs = p.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }
  viewTabs.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (b) setView(b.dataset.v);
  });

  /* ================= 卡牌图鉴 ================= */
  const catCats = document.getElementById('catCats');
  const catSearch = document.getElementById('catSearch');
  const catProdOnly = document.getElementById('catProdOnly');
  const catMeta = document.getElementById('catMeta');
  const cgrid = document.getElementById('cgrid');
  const catMore = document.getElementById('catMore');
  const catState = { cat: 'all', q: '', prodOnly: false, limit: 72 };

  function catCounts() {
    const m = {};
    GUID_KEYS.forEach((g) => { const c = CI[g][4]; m[c] = (m[c] || 0) + 1; });
    return m;
  }
  function buildCatTabs() {
    const n = catCounts();
    catCats.innerHTML = '<button data-c="all" class="' + (catState.cat === 'all' ? 'active' : '') + '">全部 ' +
      GUID_KEYS.length + '</button>' +
      CATS.map((c) => '<button data-c="' + c.id + '" class="' + (catState.cat === c.id ? 'active' : '') + '">' +
        esc(c.zh) + ' ' + (n[c.id] || 0) + '</button>').join('');
  }

  function catFiltered() {
    const q = catState.q;
    return GUID_KEYS.filter((g) => {
      const r = CI[g];
      if (catState.cat !== 'all' && r[4] !== catState.cat) return false;
      if (catState.prodOnly && !prodOf(g)) return false;
      if (!q) return true;
      const hay = [r[0], r[1], r[11], CAT_ZH[r[4]] || '', r[8].join(' ')]
        .concat((r[6] || []).map((e) => e[0] + ' ' + e[4] + ' ' + e[1])).join(' ').toLowerCase();
      return hay.includes(q);
    }).sort((a, b) => {
      const ra = CI[a], rb = CI[b];
      const ca = CATS.findIndex((c) => c.id === ra[4]);
      const cb = CATS.findIndex((c) => c.id === rb[4]);
      if (ca !== cb) return ca - cb;
      const dr = (RANK[rb[2]] || 0) - (RANK[ra[2]] || 0);
      if (dr) return dr;
      return cardName(a).localeCompare(cardName(b), 'zh');
    });
  }

  function tileHTML(g) {
    const r = CI[g];
    const inList = !!wish[g];
    const prod = prodOf(g);
    const head = prod ? '生产力 <b>' + prod.row[1] + '</b>' + (prod.row[2] && prod.row[2] !== prod.row[1] && !isCheck(prod.row[2]) ? ' / ' + prod.row[2] : '') : effLine(g, false);
    return '<div class="ctile' + (inList ? ' in-list' : '') + '" data-cd="' + g + '" role="button" tabindex="0">' +
      '<span class="cico">' + imgTag(r[5], '', cardName(g)) + '<i>' + esc((cardName(g) || '?').slice(0, 1)) + '</i></span>' +
      '<span class="ctxt">' +
        '<span class="cname">' + esc(cardName(g)) + '</span>' +
        '<span class="csub"><i class="rar-chip r-' + esc(r[2] || 'Common') + '">' + esc(r[2] || '—') + '</i> ' +
          esc(CAT_ZH[r[4]] || '') + ' · ' + esc(r[8][0] || '—') + '</span>' +
        '<span class="ceff">' + (head || '—') + '</span>' +
      '</span>' +
      (inList
        ? '<span class="added" title="已在清单，需要 ' + wish[g].n + ' 张">清单 ' + wish[g].n + '</span>'
        : '<button class="cadd" data-add="' + g + '" title="加入我的清单">＋</button>') +
      '</div>';
  }

  function renderCatalog() {
    buildCatTabs();
    const list = catFiltered();
    const show = list.slice(0, catState.limit);
    cgrid.innerHTML = show.map(tileHTML).join('');
    catMore.hidden = list.length <= show.length;
    if (!list.length) {
      cgrid.innerHTML = '<div class="wish-empty" style="grid-column:1/-1"><b>没有匹配的卡牌</b>换个关键词，或切换分类看看</div>';
    }
    const prodN = list.filter((g) => prodOf(g)).length;
    catMeta.innerHTML = '共 <b>' + list.length + '</b> 张' +
      (catState.cat !== 'all' ? '（' + esc(CAT_ZH[catState.cat]) + '：' + esc((CATS.find((c) => c.id === catState.cat) || {}).sub || '') + '）' : '') +
      ' · 其中带生产力加成 <em>' + prodN + '</em> 张 · 已加入清单 <b>' + list.filter((g) => wish[g]).length + '</b> 张' +
      (list.length > show.length ? ' · 已显示前 ' + show.length + ' 张' : '');
  }

  catCats.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-c]');
    if (!b) return;
    catState.cat = b.dataset.c;
    catState.limit = 72;
    renderCatalog();
  });
  let catTimer = null;
  catSearch.addEventListener('input', () => {
    clearTimeout(catTimer);
    catTimer = setTimeout(() => {
      catState.q = catSearch.value.trim().toLowerCase();
      catState.limit = 72;
      renderCatalog();
    }, 140);
  });
  catProdOnly.addEventListener('change', () => {
    catState.prodOnly = catProdOnly.checked;
    catState.limit = 72;
    renderCatalog();
  });
  catMore.addEventListener('click', () => { catState.limit += 96; renderCatalog(); });

  /* ---------------- 卡牌详情弹层 ---------------- */
  const cd = document.getElementById('cardDetail');
  const cdIco = document.getElementById('cdIco');
  const cdName = document.getElementById('cdName');
  const cdMeta = document.getElementById('cdMeta');
  const cdBody = document.getElementById('cdBody');
  const cdSum = document.getElementById('cdSum');
  const cdAdd = document.getElementById('cdAdd');
  let cdGuid = null;

  function renderDetail() {
    const g = cdGuid, r = CI[g];
    if (!r) return;
    cdIco.innerHTML = imgTag(r[5], '', cardName(g)) + '<i style="font-size:18px;color:#867a6a">' + esc((cardName(g) || '?').slice(0, 1)) + '</i>';
    cdName.textContent = cardName(g);
    cdMeta.innerHTML = '<i class="rar-chip r-' + esc(r[2] || 'Common') + '">' + esc(r[2] || '—') + '</i> ' +
      (r[1] ? '<em>' + esc(r[0]) + '</em>' : '') + (r[3] ? ' · ' + esc(r[3]) : '') + ' · ' + esc(CAT_ZH[r[4]] || '');

    let html = '';
    const eff = r[6] || [];
    if (eff.length) {
      html += '<div class="cd-sec"><h4>效果</h4><table class="cd-eff"><thead><tr><th>效果</th><th>普通</th><th>强化</th></tr></thead><tbody>' +
        eff.map((e) => {
          const hl = e[4] === 'Productivity' ? ' class="hl"' : '';
          const same = isCheck(e[1]) || e[2] === e[1] || e[2] === '–' || !e[2];
          return '<tr' + hl + '><td>' + esc(e[0]) + '</td><td class="v">' + esc(e[1] || '—') + '</td>' +
            '<td class="v">' + (same ? '—' : esc(e[2])) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    if (r[7]) html += '<div class="cd-sec"><h4>强化条件</h4><p class="cd-note">' + esc(r[7]) + '</p></div>';
    if (r[8] && r[8].length) {
      html += '<div class="cd-sec"><h4>作用对象</h4><div class="cd-tags">' +
        r[8].map((t) => '<span class="cd-tag">' + esc(t) + '</span>').join('') + '</div></div>';
    }
    if (r[9]) html += '<div class="cd-sec"><h4>获取方式</h4><p class="cd-note">' + esc(r[9]) + '</p></div>';
    const vit = r[10];
    if (vit && CARDS[vit]) {
      const bn = Object.keys(CB).filter((k) => CB[k].includes(vit))
        .map((k) => {
          const de = k.split('|')[1];
          return (D.buildings[de] && D.buildings[de].zh) || de;
        }).slice(0, 8);
      if (bn.length) {
        html += '<div class="cd-sec"><h4>生产线可用建筑</h4><div class="cd-tags">' +
          bn.map((x) => '<span class="cd-tag">' + esc(x) + '</span>').join('') + '</div></div>';
      }
    }
    cdBody.innerHTML = html;
    const prod = prodOf(g);
    cdSum.innerHTML = prod
      ? '生产力加成：<b>' + prod.row[1] + '</b>' + (prod.row[2] && prod.row[2] !== prod.row[1] && !isCheck(prod.row[2]) ? ' → <b>' + prod.row[2] + '</b>（强化）' : '')
      : '这张卡不提供生产力加成';
    cdAdd.textContent = wish[g] ? '已在清单 · 点击移除' : '加入我的清单';
    cdAdd.classList.toggle('on', !!wish[g]);
  }

  function openDetail(g) {
    if (!CI[g]) return;
    cdGuid = g;
    renderDetail();
    cd.hidden = false;
    document.body.classList.add('cm-open');
  }
  function closeDetail() {
    cdGuid = null;
    cd.hidden = true;
    document.body.classList.remove('cm-open');
  }

  cgrid.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      e.stopPropagation();
      wishAdd(add.dataset.add);
      saveWish();
      renderCatalog();
      return;
    }
    const b = e.target.closest('[data-cd]');
    if (b) openDetail(b.dataset.cd);
  });
  cgrid.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const b = e.target.closest('[data-cd]');
    if (b) { e.preventDefault(); openDetail(b.dataset.cd); }
  });
  cd.addEventListener('click', (e) => {
    if (e.target.closest('[data-cd-close]')) { closeDetail(); return; }
    if (e.target.closest('#cdAdd') && cdGuid) {
      if (wish[cdGuid]) delete wish[cdGuid]; else wishAdd(cdGuid);
      saveWish();
      renderDetail();
      renderCatalog();
      if (curView === 'wish') renderWish();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !cd.hidden) closeDetail();
  });

  /* ================= 我的卡牌清单 ================= */
  const wishStats = document.getElementById('wishStats');
  const wishBody = document.getElementById('wishBody');

  function renderWish() {
    const gs = Object.keys(wish);
    const totalNeed = gs.reduce((a, g) => a + wish[g].n, 0);
    const totalHave = gs.reduce((a, g) => a + Math.min(wish[g].h, wish[g].n), 0);
    const done = gs.filter((g) => wish[g].h >= wish[g].n).length;
    const pct = gs.length ? Math.round(done / gs.length * 100) : 0;
    wishStats.innerHTML = [
      ['<b>' + gs.length + '</b><span>张卡牌在清单</span>'],
      ['<b>' + totalHave + ' / ' + totalNeed + '</b><span>已收集 / 需要</span>', totalNeed && totalHave >= totalNeed ? 'ok' : ''],
      ['<b>' + done + '</b><span>已集齐</span>', done ? 'ok' : ''],
      ['<b>' + pct + '%</b><span>完成度</span>']
    ].map((x) => '<div class="wstat ' + (x[1] || '') + '">' + x[0] + '</div>').join('');

    if (!gs.length) {
      wishBody.innerHTML = '<div class="wish-empty"><b>清单还是空的</b>' +
        '去「卡牌图鉴」点开任意一张卡，选择「加入我的清单」，这里就会按建筑类型分组显示，并记录需要数量与收集进度。</div>';
      return;
    }
    const groups = {};
    gs.forEach((g) => {
      const c = CI[g][4];
      (groups[c] = groups[c] || []).push(g);
    });
    wishBody.innerHTML = CATS.filter((c) => groups[c.id]).map((c) => {
      const list = groups[c.id].sort((a, b) => {
        const dr = (RANK[CI[b][2]] || 0) - (RANK[CI[a][2]] || 0);
        return dr || cardName(a).localeCompare(cardName(b), 'zh');
      });
      const doneN = list.filter((g) => wish[g].h >= wish[g].n).length;
      const needN = list.reduce((a, g) => a + wish[g].n, 0);
      return '<div class="wgroup"><div class="wgroup-head"><h3>' + esc(c.zh) + '</h3>' +
        '<span>' + esc(c.sub) + '</span>' +
        '<span class="pg">' + list.length + ' 张 · 共需 ' + needN + ' · 已集齐 ' + doneN + '/' + list.length + '</span></div>' +
        list.map(wishRow).join('') + '</div>';
    }).join('');
  }

  function wishRow(g) {
    const r = CI[g], w = wish[g];
    const done = w.h >= w.n;
    const eff = effLine(g, false);
    return '<div class="wrow" data-g="' + g + '">' +
      '<span class="wico">' + imgTag(r[5], '', cardName(g)) + '</span>' +
      '<span class="wname"><b>' + esc(cardName(g)) + '</b><em>' + esc(r[0]) + ' · ' + esc(r[8][0] || '') + '</em></span>' +
      '<span class="weff">' + (eff || '—') + '</span>' +
      '<span class="wneed">' +
        '<span class="stepper" data-role="need"><span class="lab">需要</span>' +
          '<button data-step="-1">−</button><span class="num">' + w.n + '</span><button data-step="1">＋</button></span>' +
        '<span class="stepper" data-role="have"><span class="lab">已有</span>' +
          '<button data-step="-1">−</button><span class="num">' + w.h + '</span><button data-step="1">＋</button></span>' +
      '</span>' +
      '<span class="wstate ' + (done ? 'done' : 'todo') + '">' + (done ? '已完成' : '缺 ' + (w.n - w.h) + ' 张') + '</span>' +
      '<button class="wdel" title="从清单移除">×</button>' +
      '</div>';
  }

  wishBody.addEventListener('click', (e) => {
    const row = e.target.closest('.wrow');
    if (!row) return;
    const g = row.dataset.g;
    if (!wish[g]) return;
    if (e.target.closest('.wdel')) {
      delete wish[g];
      saveWish();
      renderWish();
      renderCatalog();
      return;
    }
    const st = e.target.closest('[data-step]');
    if (!st) return;
    const role = st.closest('[data-role]').dataset.role;
    const d = Number(st.dataset.step);
    const cur = wish[g];
    if (role === 'need') cur.n = Math.max(1, Math.min(99, cur.n + d));
    else cur.h = Math.max(0, Math.min(cur.n, cur.h + d));
    if (cur.h > cur.n) cur.n = cur.h;
    saveWish();
    renderWish();
  });

  document.getElementById('wishClear').addEventListener('click', () => {
    if (!Object.keys(wish).length) return;
    if (!confirm('确定清空整份卡牌清单吗？此操作不可撤销。')) return;
    wish = {};
    saveWish();
    renderWish();
    renderCatalog();
  });

  document.getElementById('wishExport').addEventListener('click', () => {
    const gs = Object.keys(wish);
    if (!gs.length) return;
    const rows = [['分类', '卡牌', '英文名', '稀有度', '作用对象', '需要', '已有', '状态']];
    CATS.forEach((c) => {
      gs.filter((g) => CI[g][4] === c.id).forEach((g) => {
        const r = CI[g], w = wish[g];
        rows.push([c.zh, cardName(g), r[0], r[2] || '', r[8][0] || '', w.n, w.h, w.h >= w.n ? '已完成' : '未完成']);
      });
    });
    const csv = '\ufeff' + rows.map((r) => r.map((x) => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = '纪元117-卡牌清单.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  });

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
  updateWishBadge();
  if (params.get('view')) setView(params.get('view'));
  if (params.get('card') && CI[params.get('card')]) {
    if (!params.get('view')) setView('cards');
    openDetail(params.get('card'));
  }
})();
