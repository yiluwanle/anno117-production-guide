/* 岛屿建设规划器（依赖 window.ANNO_DATA / window.ANNO_CARDS，由 app.js 调用 Planner.render()） */
(function () {
  const D = window.ANNO_DATA;
  if (!D) return;
  const CH = D.chains || [];
  const BY_ID = {};
  CH.forEach((c) => { BY_ID[c.id] = c; });
  const BU = D.buildings || {};
  const RES = D.residences || [];
  const GOV = D.governor || { zh: '总督府', size: [9, 11], radius: 36, street: 40 };
  const CB = D.cards_by_building || {};
  const CARD = D.cards || {};
  const REGIONS = D.regions || [];
  const REGION_ZH = {};
  REGIONS.forEach((r) => { REGION_ZH[r.id] = r.name; });

  const state = {
    name: '新岛 I',
    region: 'latium',
    mode: 'tech',
    global: 0,
    autoCards: true,
    quality: false,
    areaLimit: 0,
    targets: [{ id: 'latium-brot', rate: 30 }, { id: 'latium-seife', rate: 15 }],
  };

  /* ---------------- 工具 ---------------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (v, d) => {
    if (!isFinite(v)) return '—';
    const n = d == null ? 1 : d;
    return (Math.round(v * Math.pow(10, n)) / Math.pow(10, n)).toString();
  };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function productivity(bonus, mode, global, cardAdd) {
    let add = 0;
    if (mode !== 'none') {
      if (bonus.silo) add += 100;
      if (bonus.taube) add += 50;
    }
    if (mode === 'tech') add += (bonus.research || 0);
    if (mode !== 'none') add += global;
    add += cardAdd || 0;
    return (100 + add) * ((mode !== 'none' && bonus.aqua) ? 1.5 : 1);
  }

  function cardPick(region, de) {
    if (!state.autoCards) return { sum: 0, ids: [] };
    const ids = CB[region + '|' + de] || [];
    const scored = ids.map((id) => {
      const c = CARD[id] || {};
      return { id: id, v: state.quality ? (c.prod || 0) : (c.base || 0) };
    }).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).slice(0, 3);
    return { sum: scored.reduce((s, x) => s + x.v, 0), ids: scored.map((x) => x.id) };
  }

  /* ---------------- 计算 ---------------- */
  function compute() {
    const map = new Map();
    const targets = [];
    state.targets.forEach((t) => {
      const chain = BY_ID[t.id];
      const rate = Number(t.rate) || 0;
      if (!chain || rate <= 0) return;
      const stages = chain.stages.map((s) => {
        const cb = cardPick(chain.region, s.de);
        const p = productivity(s.bonus || {}, state.mode, state.global, cb.sum);
        const eff = s.time / (p / 100);
        return { s: s, p: p, eff: eff, rpb: 60 / eff, cb: cb };
      });
      const fin = stages.slice().reverse().find((x) => x.s.outputs && x.s.outputs.length) || stages[stages.length - 1];
      const scale = rate / fin.rpb;
      let cap = Infinity;
      stages.forEach((x) => {
        const exact = scale * (x.eff / fin.eff);
        const n = Math.max(1, Math.ceil(exact - 1e-9));
        x.exact = exact;
        x.n = n;
        cap = Math.min(cap, n * x.rpb);
        const key = chain.region + '|' + x.s.de;
        let row = map.get(key);
        if (!row) {
          row = { key: key, region: chain.region, de: x.s.de, s: x.s, n: 0, p: x.p, eff: x.eff, rpb: x.rpb, cb: x.cb, goods: [] };
          map.set(key, row);
        }
        row.n += n;
        if (row.goods.indexOf(chain.good_zh) < 0) row.goods.push(chain.good_zh);
      });
      targets.push({ chain: chain, rate: rate, actual: cap, fin: fin.n * fin.rpb, stages: stages, alt: altOf(stages, cap) });
    });

    // 瓶颈段少建 1 座时的产能，用于「凑整参考」
    function altOf(stages, cap) {
      const bn = stages.filter((x) => Math.abs(x.n * x.rpb - cap) < 1e-9)[0];
      if (!bn || bn.n <= 1) return null;
      const c2 = Math.min.apply(null, stages.map((x) => (x === bn ? x.n - 1 : x.n) * x.rpb));
      return { n: bn.n - 1, cap: c2 };
    }

    const rows = [...map.values()].map((r) => {
      const b = BU[r.de] || {};
      const size = b.size || [4, 4];
      return Object.assign(r, {
        b: b,
        w: size[0], h: size[1],
        area: size[0] * size[1] * r.n,
        workers: (b.workers || 0) * r.n,
        wclass: b.wclass_zh || '—',
        denari: (b.denari || 0) * r.n,
      });
    });
    rows.sort((a, b) => (a.s.inputs.length - b.s.inputs.length) || (b.area - a.area));

    const wf = {};
    rows.forEach((r) => { wf[r.wclass] = (wf[r.wclass] || 0) + r.workers; });

    const houses = [];
    Object.keys(wf).forEach((cls) => {
      const res = RES.filter((x) => x.wclass_zh === cls && x.region === state.region)[0] ||
        RES.filter((x) => x.wclass_zh === cls)[0];
      if (!res) return;
      const n = Math.ceil(wf[cls] / res.wf - 1e-9);
      houses.push({ cls: cls, workers: wf[cls], res: res, n: n, pop: n * res.pop, area: n * 9 });
    });

    const totals = {
      buildings: rows.reduce((s, r) => s + r.n, 0),
      area: rows.reduce((s, r) => s + r.area, 0),
      workers: rows.reduce((s, r) => s + r.workers, 0),
      denari: rows.reduce((s, r) => s + r.denari, 0),
      houses: houses.reduce((s, h) => s + h.n, 0),
      pop: houses.reduce((s, h) => s + h.pop, 0),
      houseArea: houses.reduce((s, h) => s + h.area, 0),
    };
    totals.govArea = GOV.size[0] * GOV.size[1];
    totals.whArea = 36;
    totals.planArea = Math.round(totals.area * 1.35) + totals.houseArea + totals.govArea + totals.whArea;
    return { rows: rows, targets: targets, houses: houses, wf: wf, totals: totals };
  }

  /* ---------------- 布局示意图 ---------------- */
  function layout(plan) {
    const rows = plan.rows;
    const raw = rows.filter((r) => !r.s.inputs.length);
    const make = rows.filter((r) => r.s.inputs.length);
    const W = clamp(Math.round(Math.sqrt(plan.totals.planArea * 1.45)), 34, 58);
    const items = [];
    const roads = [];
    const bands = [];
    let y = 2;

    function zone(list, kind, title) {
      const top = y;
      const band = { x: 2, y: top, w: 20, h: 0, label: title, kind: kind };
      bands.push(band);
      y = top + 5;
      let x = 3, rowH = 0, maxR = 12;
      list.forEach((it) => {
        if (x + it.w + 2 > W - 1) {
          roads.push({ x: 2, y: y + rowH, w: W - 4, h: 1 });
          y += rowH + 1;
          x = 3;
          rowH = 0;
        }
        items.push({ x: x, y: y, w: it.w, h: it.h, kind: kind, label: it.label, count: it.count });
        maxR = Math.max(maxR, x + it.w);
        x += it.w + 1;
        rowH = Math.max(rowH, it.h);
      });
      y += rowH + 3;
      band.h = y - top - 2;
      band.w = W - 4;
      return band;
    }

    const rawItems = raw.map((r) => ({ w: r.w, h: r.h, label: r.s.zh, count: r.n }));
    const makeItems = make.map((r) => ({ w: r.w, h: r.h, label: r.s.zh, count: r.n }));
    zone(rawItems, 'raw', '原料区 · 农场 / 矿场 / 采集');
    zone(makeItems, 'make', '加工区 · 作坊 / 工厂');

    // 仓储 / 码头
    const whTop = y;
    const whBand = { x: 2, y: whTop, w: 20, h: 9, label: '仓储 / 码头区', kind: 'wh' };
    bands.push(whBand);
    items.push({ x: 3, y: whTop + 5, w: 6, h: 6, kind: 'wh', label: '仓库', count: 1 });
    items.push({ x: 10, y: whTop + 5, w: 5, h: 4, kind: 'wh', label: '码头', count: 1 });
    whBand.w = W - 4;
    y = whTop + 5 + 6 + 4;

    // 市政 / 居住
    const cvTop = y;
    const cvBand = { x: 2, y: cvTop, w: 30, h: 0, label: '居住 / 市政区 · 总督府 + 住宅', kind: 'civic' };
    bands.push(cvBand);
    const gov = { x: 3, y: cvTop + 5, w: GOV.size[0], h: GOV.size[1] };
    items.push({ x: gov.x, y: gov.y, w: gov.w, h: gov.h, kind: 'gov', label: '总督府', count: 1 });
    let hx = gov.x + gov.w + 2, hy = cvTop + 5, rowH = gov.h, maxR = gov.x + gov.w;
    plan.houses.forEach((hs) => {
      for (let i = 0; i < hs.n; i++) {
        if (hx + 3 + 2 > W - 1) {
          roads.push({ x: 2, y: hy + rowH, w: W - 4, h: 1 });
          hy += rowH + 1;
          hx = 3;
          rowH = 0;
        }
        items.push({ x: hx, y: hy, w: 3, h: 3, kind: 'house', label: hs.res.zh, count: 1 });
        maxR = Math.max(maxR, hx + 3);
        hx += 4;
        rowH = Math.max(rowH, 3);
      }
    });
    y = Math.max(hy + rowH, gov.y + gov.h) + 3;
    cvBand.h = y - cvTop;
    cvBand.w = W - 4;

    return { W: W, H: y + 1, items: items, roads: roads, bands: bands, gov: gov };
  }

  const ZCOL = { raw: '#cfe0c3', make: '#f0dbc0', wh: '#e6ddc9', house: '#dbe3f2', gov: '#e9d6cf' };
  const ZEDGE = { raw: '#8fae7c', make: '#c49a63', wh: '#b1a389', house: '#93a6c9', gov: '#c08a78' };

  function svgPlan(plan, L) {
    const s = [];
    const cut = (t, w, fs) => {
      const max = Math.max(1, Math.floor((w - 1) / (fs * 0.98)));
      return t.length > max ? t.slice(0, max) : t;
    };
    s.push('<svg class="plan-svg" viewBox="0 0 ' + L.W + ' ' + Math.round(L.H) + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="岛屿布局示意图">');
    s.push('<rect x="0" y="0" width="' + L.W + '" height="' + Math.round(L.H) + '" fill="#f8f4ea"/>');

    // 分区底色 + 标签
    L.bands.forEach((b) => {
      s.push('<rect x="' + b.x + '" y="' + b.y + '" width="' + b.w + '" height="' + b.h + '" rx="1.2" fill="#fff" opacity="0.55" stroke="#e2d9c8" stroke-width="0.25" stroke-dasharray="2 2"/>');
      s.push('<text x="' + (b.x + 1) + '" y="' + (b.y + 3) + '" font-size="1.85" fill="#8a7c66" letter-spacing="0.3" font-weight="600">' + esc(b.label) + '</text>');
    });

    // 道路
    L.roads.forEach((r) => {
      s.push('<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" fill="#e0d7c5"/>');
    });

    // 总督府影响半径
    const gx = L.gov.x + L.gov.w / 2, gy = L.gov.y + L.gov.h / 2;
    s.push('<circle cx="' + gx + '" cy="' + gy + '" r="' + GOV.radius + '" fill="#a9432a" opacity="0.05"/>');
    s.push('<circle cx="' + gx + '" cy="' + gy + '" r="' + GOV.radius + '" fill="none" stroke="#a9432a" stroke-width="0.45" stroke-dasharray="2.4 2.4" opacity="0.5"/>');

    // 建筑
    L.items.forEach((it) => {
      const fill = ZCOL[it.kind] || '#eee', edge = ZEDGE[it.kind] || '#999';
      s.push('<g><title>' + esc(it.label) + (it.count > 1 ? ' ×' + it.count : '') + '</title>');
      s.push('<rect x="' + it.x + '" y="' + it.y + '" width="' + it.w + '" height="' + it.h + '" rx="0.5" fill="' + fill + '" stroke="' + edge + '" stroke-width="0.3"/>');
      if (it.kind === 'gov') {
        s.push('<text x="' + (it.x + it.w / 2) + '" y="' + (it.y + it.h / 2 - 0.8) + '" font-size="1.9" fill="#7d4030" text-anchor="middle" font-weight="700">总督府</text>');
        s.push('<text x="' + (it.x + it.w / 2) + '" y="' + (it.y + it.h / 2 + 1.6) + '" font-size="1.3" fill="#9a6a58" text-anchor="middle">9×11</text>');
      } else if (it.kind === 'house') {
        s.push('<text x="' + (it.x + it.w / 2) + '" y="' + (it.y + it.h / 2 + 0.7) + '" font-size="1.5" fill="#6d7f9c" text-anchor="middle">宅</text>');
      } else if (it.w >= 4 && it.h >= 4) {
        const fs = 1.22;
        const per = Math.max(2, Math.floor((it.w - 0.7) / fs));
        const lines = [];
        for (let i = 0; i < it.label.length && lines.length < 2; i += per) lines.push(it.label.slice(i, i + per));
        lines.forEach((ln, k) => {
          s.push('<text x="' + (it.x + it.w / 2) + '" y="' + (it.y + 1.6 + k * 1.45) + '" font-size="' + fs + '" fill="#4a4034" text-anchor="middle">' + esc(ln) + '</text>');
        });
        if (it.count > 1) {
          s.push('<text x="' + (it.x + it.w / 2) + '" y="' + (it.y + it.h - 0.65) + '" font-size="1.2" fill="#a9432a" text-anchor="middle" font-weight="700">×' + it.count + '</text>');
        }
      } else if (it.count > 1) {
        s.push('<text x="' + (it.x + it.w / 2) + '" y="' + (it.y + it.h / 2 + 0.6) + '" font-size="1.3" fill="#8a5a2a" text-anchor="middle" font-weight="700">×' + it.count + '</text>');
      }
      s.push('</g>');
    });
    s.push('</svg>');
    return s.join('');
  }

  /* ---------------- 渲染 ---------------- */
  const el = {};
  let inited = false;

  function init() {
    if (inited) return;
    inited = true;
    el.root = document.getElementById('viewPlan');
    el.name = document.getElementById('plName');
    el.region = document.getElementById('plRegion');
    el.mode = document.getElementById('plMode');
    el.global = document.getElementById('plGlobal');
    el.globalOut = document.getElementById('plGlobalOut');
    el.goods = document.getElementById('plGoods');
    el.add = document.getElementById('plAdd');
    el.cards = document.getElementById('plCards');
    el.quality = document.getElementById('plQuality');
    el.area = document.getElementById('plArea');
    el.out = document.getElementById('plOut');

    el.region.innerHTML = REGIONS.map((r) => '<button data-r="' + r.id + '"' + (r.id === state.region ? ' class="active"' : '') + '>' + esc(r.name) + '</button>').join('');
    el.region.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-r]');
      if (!b) return;
      state.region = b.dataset.r;
      [...el.region.children].forEach((x) => x.classList.toggle('active', x === b));
      const list = CH.filter((c) => c.region === state.region);
      const byGood = {};
      list.forEach((c) => { if (!byGood[c.good_zh]) byGood[c.good_zh] = c; });
      const kept = state.targets.map((t) => {
        const old = BY_ID[t.id];
        const same = old && byGood[old.good_zh];
        return same ? { id: same.id, rate: t.rate } : null;
      }).filter(Boolean);
      const used = kept.map((t) => t.id);
      const fill = list.filter((c) => used.indexOf(c.id) < 0).slice(0, Math.max(0, 2 - kept.length))
        .map((c, i) => ({ id: c.id, rate: i ? 15 : 30 }));
      state.targets = kept.concat(fill);
      renderTargets();
      render();
    });
    el.mode.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-mode]');
      if (!b) return;
      state.mode = b.dataset.mode;
      [...el.mode.children].forEach((x) => x.classList.toggle('active', x === b));
      render();
    });
    el.global.addEventListener('input', () => {
      state.global = Number(el.global.value);
      el.globalOut.textContent = state.global + '%';
      render();
    });
    el.cards.addEventListener('change', () => { state.autoCards = el.cards.checked; render(); });
    el.quality.addEventListener('change', () => { state.quality = el.quality.checked; render(); });
    el.name.addEventListener('input', () => { state.name = el.name.value; });
    el.area.addEventListener('input', () => {
      state.areaLimit = Number(el.area.value) || 0;
      render();
    });

    el.add.addEventListener('click', () => {
      const list = CH.filter((c) => c.region === state.region);
      const used = state.targets.map((t) => t.id);
      const next = list.filter((c) => used.indexOf(c.id) < 0)[0] || list[0];
      state.targets.push({ id: next.id, rate: 30 });
      renderTargets();
      render();
    });
    el.goods.addEventListener('input', (e) => {
      const inp = e.target.closest('[data-i]');
      if (!inp) return;
      const i = Number(inp.dataset.i);
      if (inp.tagName === 'SELECT') state.targets[i].id = inp.value;
      else state.targets[i].rate = Number(inp.value) || 0;
      render();
    });
    el.goods.addEventListener('click', (e) => {
      const x = e.target.closest('[data-del]');
      if (!x) return;
      state.targets.splice(Number(x.dataset.del), 1);
      renderTargets();
      render();
    });

    renderTargets();
  }

  function renderTargets() {
    const list = CH.filter((c) => c.region === state.region);
    el.goods.innerHTML = state.targets.map((t, i) => {
      return '<div class="pg-row">' +
        '<select data-i="' + i + '">' + list.map((c) =>
          '<option value="' + c.id + '"' + (c.id === t.id ? ' selected' : '') + '>' + esc(c.good_zh) + '（' + esc(c.tier_zh) + '）</option>').join('') + '</select>' +
        '<input type="number" data-i="' + i + '" min="1" step="5" value="' + t.rate + '"><span class="unit">/分</span>' +
        '<button class="pg-del" data-del="' + i + '" title="移除">×</button>' +
        '</div>';
    }).join('');
  }

  function render() {
    init();
    const plan = compute();
    const t = plan.totals;
    let h = '';

    if (!plan.rows.length) {
      el.out.innerHTML = '<div class="wish-empty"><b>还没有目标产品</b>在左侧添加要生产的产品与每分钟产量</div>';
      return;
    }

    /* 概览 */
    h += '<div class="plan-head"><h2>' + esc(state.name || '未命名岛屿') + ' · ' + esc(REGION_ZH[state.region] || '') + '</h2>' +
      '<p>目标：' + plan.targets.map((x) => esc(x.chain.good_zh) + ' <b>' + fmt(x.rate, 0) + '</b>/分').join(' · ') +
      ' <span class="pill">' + (state.mode === 'tech' ? '满科技' : state.mode === 'fac' ? '满设施' : '无加成') + (state.global ? ' +' + state.global + '%' : '') + '</span></p></div>';

    h += '<div class="plan-sum">' + [
      ['建筑总数', t.buildings + ' 座'],
      ['生产占地', Math.round(t.area) + ' 格'],
      ['所需人力', fmt(t.workers, 0) + ' 人'],
      ['住宅', t.houses + ' 栋 · ' + fmt(t.pop, 0) + ' 人'],
      ['维护费', fmt(t.denari, 0) + ' 第纳里/分'],
      ['规划总占地', Math.round(t.planArea) + ' 格'],
    ].map((x) => '<div class="psum"><b>' + x[1] + '</b><span>' + x[0] + '</span></div>').join('') + '</div>';

    h += '<p class="plan-note plan-summary"><b>大概这么建</b>：' + t.buildings + ' 座生产建筑' +
      (t.houses ? '、' + t.houses + ' 栋住宅（' + fmt(t.pop, 0) + ' 人）' : '') +
      '，共占 ' + Math.round(t.planArea) + ' 格；每分钟约产出 ' +
      plan.targets.map((x) => esc(x.chain.good_zh) + ' <b>' + Math.round(x.actual) + '</b>').join(' + ') +
      '，维护费约 ' + fmt(t.denari, 0) + ' 第纳里/分。</p>';

    if (state.areaLimit > 0) {
      const over = t.planArea / state.areaLimit;
      h += over > 1
        ? '<div class="plan-warn">规划总占地 <b>' + Math.round(t.planArea) + '</b> 格，是你填的 ' + state.areaLimit + ' 格的 <b>' + fmt(over, 1) + ' 倍</b> —— 建议降低单岛产量、拆成两岛，或把原料（农场/矿场）放到邻岛再运过来。</div>'
        : '<div class="plan-ok">规划总占地 ' + Math.round(t.planArea) + ' 格，占可建面积 <b>' + Math.round(over * 100) + '%</b>，还有余量。</div>';
    }

    /* 产品明细 */
    h += '<section class="plan-sec"><h3>一、产品与产能</h3><table class="ptab"><thead><tr>' +
      '<th>产品</th><th class="r">目标/分</th><th class="r">实际/分</th><th class="r">相差</th><th class="r">建筑数</th><th>说明</th></tr></thead><tbody>';
    const refs = [];
    plan.targets.forEach((x) => {
      const nb = x.stages.reduce((s, st) => s + st.n, 0);
      const act = Math.round(x.actual);
      const actTxt = Math.abs(x.actual - act) < 0.05 ? String(act) : '≈' + act;
      const diff = act - x.rate;
      // 凑整参考：少建 1 座瓶颈段后的产量
      const altTxt = x.alt ? '；瓶颈段少 1 座约 ' + Math.round(x.alt.cap) + '/分' : '';
      refs.push('<b>' + esc(x.chain.good_zh) + '</b> ' + nb + ' 座 ≈ <b>' + act + '</b>/分' +
        '（精确 ' + fmt(x.actual, 1) + altTxt + '）');
      h += '<tr><td><b>' + esc(x.chain.good_zh) + '</b> <em>' + esc(x.chain.tier_zh) + '</em></td>' +
        '<td class="r">' + fmt(x.rate, 0) + '</td>' +
        '<td class="r"><b class="ok" title="精确 ' + fmt(x.actual, 2) + '/分">' + actTxt + '</b></td>' +
        '<td class="r">' + (diff >= 0 ? '+' : '') + diff + '</td>' +
        '<td class="r">' + nb + '</td>' +
        '<td class="muted">' + x.stages.length + ' 段</td></tr>';
    });
    h += '</tbody></table>' +
      '<p class="plan-note">产量按整数显示，方便心算。<b>凑整参考</b>：' + refs.join(' · ') + '。取整时上游会略有过剩，实际/分 为瓶颈段产能。</p></section>';

    /* 建筑清单 */
    h += '<section class="plan-sec"><h3>二、要建多少 · 每栋产出与人力</h3><div class="ptab-wrap"><table class="ptab ptab-b"><thead><tr>' +
      '<th>建筑 · 推荐卡牌</th><th class="r">数量</th><th class="r">周期</th><th class="r">每栋/分</th>' +
      '<th class="r">人力/栋</th><th class="r">占地</th><th class="r">维护</th></tr></thead><tbody>';
    plan.rows.forEach((r) => {
      const cards = r.cb.ids.map((id) => {
        const c = CARD[id] || {};
        const v = state.quality ? c.prod : c.base;
        return '<span class="cchip" title="' + esc(c.de || '') + '">' + esc(c.zh || id) + ' <b>+' + fmt(v, 0) + '%</b></span>';
      }).join('');
      h += '<tr><td><span class="pname">' +
        (r.b.img ? '<img src="' + esc(r.b.img) + '" alt="" loading="lazy">' : '') +
        '<b>' + esc(r.s.zh) + '</b><em>' + esc(r.goods.join(' / ')) + ' · 合计 ' + fmt(r.rpb * r.n, 1) + '/分</em></span>' +
        '<div class="pcard">' + (cards || '<span class="muted">无可用卡</span>') + '</div></td>' +
        '<td class="r"><b>' + r.n + '</b></td>' +
        '<td class="r">' + fmt(r.eff, 1) + 's</td>' +
        '<td class="r">' + fmt(r.rpb, 1) + '</td>' +
        '<td class="r nowrap">' + (r.b.workers || 0) + ' ' + esc(r.wclass) + '</td>' +
        '<td class="r">' + r.w + '×' + r.h + '</td>' +
        '<td class="r">' + fmt(r.b.denari || 0, 0) + '</td></tr>';
    });
    h += '</tbody></table></div>' +
      '<p class="plan-note">周期 = 基础周期 ÷ 生产力；每栋/分 = 60 ÷ 周期。卡牌按生产力加成从高到低自动取 3 张（每栋 3 槽、不可重复），勾掉左侧「自动配卡」即为不带卡。</p></section>';

    /* 人力与住宅 */
    h += '<section class="plan-sec"><h3>三、人力与住宅</h3><div class="ptab-wrap"><table class="ptab"><thead><tr>' +
      '<th>阶层</th><th class="r">所需工人</th><th>住宅</th><th class="r">每栋提供</th><th class="r">需要栋数</th><th class="r">人口</th></tr></thead><tbody>';
    plan.houses.forEach((hs) => {
      h += '<tr><td><b>' + esc(hs.cls) + '</b></td><td class="r">' + fmt(hs.workers, 0) + '</td>' +
        '<td>' + esc(hs.res.zh) + '<em>' + hs.area + ' 格</em></td><td class="r">' + fmt(hs.res.wf, 1) + '</td>' +
        '<td class="r"><b>' + hs.n + '</b></td><td class="r">' + fmt(hs.pop, 0) + '</td></tr>';
    });
    h += '</tbody></table></div>' +
      '<p class="plan-note">住宅按「工人数 ÷ 每栋提供的劳动力」向上取整。住宅本身还有 ' +
      (plan.houses[0] ? plan.houses[0].res.needs : '多') + ' 项需求要供给，这些需求会额外拉高产线规模，本表未计入。</p></section>';

    /* 布局 */
    const L = layout(plan);
    h += '<section class="plan-sec"><h3>四、布局图纸（1 格 = 1 单位，按实际占地绘制）</h3>';
    h += '<div class="plan-svg-wrap">' + svgPlan(plan, L) + '</div>';
    h += '<div class="plan-legend">' +
      '<span><i style="background:#cfe0c3"></i>原料区</span>' +
      '<span><i style="background:#f0dbc0"></i>加工区</span>' +
      '<span><i style="background:#e6ddc9"></i>仓储/码头</span>' +
      '<span><i style="background:#e9d6cf"></i>总督府</span>' +
      '<span><i style="background:#dbe3f2"></i>住宅</span>' +
      '<span><i style="background:#ddd3c1"></i>道路</span>' +
      '<span><i class="dash"></i>总督府影响半径 ' + GOV.radius + ' 格</span></div>';
    h += '<p class="plan-note">画布约 ' + L.W + ' × ' + Math.round(L.H) + ' 格，主路 + 支路按每排 1 格估算，含约 35% 道路与空隙余量。实际摆放时以这张图为骨架，按地形（海岸线、山体、河流）微调。</p></section>';

    /* 建议 */
    const raw = plan.rows.filter((r) => !r.s.inputs.length);
    const dirty = plan.rows.filter((r) => /Health \(-|Fire Safety \(-|Happiness \(-/.test(r.b.fx || ''));
    h += '<section class="plan-sec"><h3>五、总督府与布局要点</h3><ul class="plan-tips">' +
      '<li><b>总督府</b>：' + GOV.size[0] + '×' + GOV.size[1] + ' 格，影响半径 ' + GOV.radius + ' 格、街道连接范围 ' + GOV.street +
        ' 格。放在<b>住宅区几何中心</b>的主路交汇处——半径 ' + GOV.radius + ' 格几乎覆盖全岛，真正要卡的是「贴着住宅 + 门口有路」，不要塞进工业区。</li>' +
      '<li><b>住宅环</b>：以总督府为圆心，第一圈放市场/广场/浴场，第二圈住宅，往外再放仓库。住宅 3×3，' + (plan.totals.houses) + ' 栋共 ' + (plan.totals.houses * 9) + ' 格。</li>' +
      '<li><b>仓储与码头</b>：仓库放在原料区与加工区的接缝处（本图放在两区之间），码头朝外海一侧。原料从码头/农场直接进仓库，加工品从仓库分发。</li>' +
      '<li><b>原料区</b>：' + (raw.length ? raw.map((r) => esc(r.s.zh) + ' ×' + r.n).join('、') : '本方案无采集类建筑') +
        '。农场/矿场占地大，优先占平地与资源点，尽量连成片。</li>' +
      '<li><b>污染与火灾</b>：' + (dirty.length ? dirty.map((r) => esc(r.s.zh) + '（' + esc(r.b.fx) + '）').join('、') + ' —— 这些建筑的负面效果只作用于影响范围，务必与住宅区隔开一条主路以上。' : '本方案的建筑没有健康/火灾/幸福负面效果。') + '</li>' +
      '<li><b>燃煤建筑</b>：面包房等带煤炭需求的建筑，按 1 座炭窑供养 4 栋配比；炭窑与煤堆放在加工区边缘，别贴着住宅。</li>' +
      '<li><b>岛屿尺寸</b>：本方案生产 + 住宅 + 仓储 + 道路约需 <b>' + Math.round(plan.totals.planArea) + ' 格</b>，建议选可建面积 ≥ ' +
        Math.round(plan.totals.planArea * 1.3) + ' 格的岛（约 ' + Math.round(Math.sqrt(plan.totals.planArea * 1.3)) + '×' + Math.round(Math.sqrt(plan.totals.planArea * 1.3)) + ' 的方块地）。</li>' +
      '</ul></section>';

    el.out.innerHTML = h;
  }

  window.Planner = {
    render: function () { init(); render(); },
    state: state,
  };

  // 直接用 ?view=plan 打开时，app.js 已切好视图，这里补一次渲染
  const vp = document.getElementById('viewPlan');
  if (vp && !vp.hidden) { init(); render(); }
})();
