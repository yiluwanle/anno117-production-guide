# -*- coding: utf-8 -*-
"""生成《纪元117岛屿建设指南.md》：公式、总督府、住宅换算、实例配比。

输入：data/data.json（含 buildings 的 workers/size/denari、residences、governor、cards）
输出：docs/纪元117岛屿建设指南.md
"""
import os, json, math

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
D = json.load(open(os.path.join(REPO, 'data', 'data.json'), encoding='utf-8'))
BU = D['buildings']
CARDS = D['cards']
CB = D['cards_by_building']
RES = D['residences']
GOV = D['governor']

CH = {c['id']: c for c in D['chains']}
MODE = 'tech'
GLOBAL = 0


def prod(bonus, mode, g, card):
    add = 0
    if mode != 'none':
        if bonus.get('silo'):
            add += 100
        if bonus.get('taube'):
            add += 50
    if mode == 'tech':
        add += bonus.get('research', 0) or 0
    if mode != 'none':
        add += g
    add += card
    return (100 + add) * (1.5 if (mode != 'none' and bonus.get('aqua')) else 1)


def card_bonus(region, de, quality=False):
    ids = CB.get(region + '|' + de, [])
    vals = []
    for i in ids:
        c = CARDS.get(i, {})
        v = c.get('prod', 0) if quality else c.get('base', 0)
        if v and v > 0:
            vals.append((v, c.get('zh', i)))
    vals.sort(reverse=True)
    return sum(v for v, _ in vals[:3]), [n for _, n in vals[:3]]


def plan(targets, quality=False):
    rows = {}
    out = []
    for cid, rate in targets:
        c = CH[cid]
        st = []
        for s in c['stages']:
            cb, names = card_bonus(c['region'], s['de'], quality)
            p = prod(s.get('bonus', {}), MODE, GLOBAL, cb)
            eff = s['time'] / (p / 100)
            st.append({'s': s, 'p': p, 'eff': eff, 'rpb': 60 / eff, 'cards': names})
        fin = [x for x in st if x['s']['outputs']][-1]
        scale = rate / fin['rpb']
        cap = 1e9
        for x in st:
            exact = scale * (x['eff'] / fin['eff'])
            n = max(1, math.ceil(exact - 1e-9))
            x['n'] = n
            cap = min(cap, n * x['rpb'])
            k = c['region'] + '|' + x['s']['de']
            if k not in rows:
                rows[k] = {'de': x['s']['de'], 'zh': x['s']['zh'], 'n': 0, 'eff': x['eff'],
                           'rpb': x['rpb'], 'p': x['p'], 'cards': x['cards'], 'goods': []}
            rows[k]['n'] += n
            if c['good_zh'] not in rows[k]['goods']:
                rows[k]['goods'].append(c['good_zh'])
        out.append({'chain': c, 'rate': rate, 'actual': cap, 'stages': st})
    return rows, out


def main():
    rows, targets = plan([('latium-brot', 30), ('latium-seife', 15)])
    L = []
    A = L.append

    A('# 纪元117 · 岛屿建设指南')
    A('')
    A('> 本文回答“这座岛要建多少、要多少人、总督府放哪、怎么排”四个问题。')
    A('> 数据：vitablo 生产线计算器（补丁 3.0）+ anno117.tools 建筑／卡牌库；')
    A('> 建筑占地、劳动力、维护费取自建筑详情页，住宅容量取自住宅页。')
    A('')
    A('---')
    A('')
    A('## 一、从「每分钟产量」倒推建筑数')
    A('')
    A('1. 定目标：每种成品每分钟要出多少（例：面包 30/分）。')
    A('2. 算生产力：`P = (100 + 筒仓100 + 鸽舍50 + 研究 + 卡牌 + 全局) × 输水道系数(1.5)`。')
    A('3. 算单栋产能：`有效周期 t = 基础周期 ÷ (P/100)`，`单栋每分钟 = 60 ÷ t`。')
    A('4. 算数量：`所需栋数 = 目标产量 ÷ 单栋每分钟`，**每段产线分别向上取整**。')
    A('5. 汇总：劳动力、占地、维护费按「单栋数值 × 栋数」累加。')
    A('')
    A('> 因为各段产线吃到的加成不同，比例很少是整数。取整后上游会略有过剩，')
    A('> 可以关掉一两栋，或把余量外销——本指南统一按“全部开工”计算。')
    A('')
    A('---')
    A('')
    A('## 二、总督府怎么放')
    A('')
    A('| 项目 | 数值 |')
    A('|---|---|')
    A('| 占地 | %d × %d 格 |' % (GOV['size'][0], GOV['size'][1]))
    A('| 影响半径 | %d 格 |' % GOV['radius'])
    A('| 街道连接范围 | %d 格 |' % GOV['street'])
    A('| 维护费 | %d 第纳里/分（负值＝净收入） |' % GOV['denari'])
    A('| 解锁 | 首个平民 / 首个商贾 / 75 陶工 |')
    A('')
    A('放置原则：')
    A('')
    A('1. **放住宅区的几何中心**，不要贴在工业区。半径 36 格几乎覆盖整岛，真正要卡的是“紧邻住宅 + 门口接主路”。')
    A('2. **主路直连**：总督府门前必须是主干道，街道连接范围 40 格意味着它离路网不能太远。')
    A('3. **别挨着负面效果建筑**：猪圈（健康 −2）、面包房／盐工（防火 −2）、制皂师（健康 −1）这类建筑的影响范围要和住宅隔开一条主路。')
    A('4. **留出扩建位**：总督府周围预留 3–4 格空位，后期放广场、市场、浴场、神庙。')
    A('')
    A('---')
    A('')
    A('## 三、劳动力与住宅换算')
    A('')
    A('每个生产建筑都有固定的劳动力需求（见文末实例表）。住宅提供劳动力：')
    A('')
    A('| 住宅 | 行省 | 每栋人口 | 每栋劳动力 | 住宅需求项 |')
    A('|---|---|---|---|---|')
    for r in RES:
        A('| %s | %s | %g | %g | %d |' % (r['zh'], r['region_zh'] if 'region_zh' in r else
                                          {'latium': '拉丁姆', 'albion': '阿尔比恩', 'aegyptus': '埃及'}[r['region']],
                                          r['pop'], r['wf'], r['needs']))
    A('')
    A('`需要住宅数 = 该阶层工人总数 ÷ 每栋劳动力`（向上取整）。')
    A('住宅本身还有 6–50 项需求，会额外拉高产线规模，规划时要给住宅区留出配套产线。')
    A('')
    A('---')
    A('')
    A('## 四、实例：拉丁姆一座岛，面包 30/分 + 肥皂 15/分')
    A('')
    A('前提：满科技（研究全点）+ 每栋自动插 3 张生产力最高的卡（普通档）。')
    A('')
    A('### 4.1 产能与建筑数')
    A('')
    A('| 产品 | 目标/分 | 实际/分 | 段数 |')
    A('|---|---|---|---|')
    for t in targets:
        nb = sum(x['n'] for x in t['stages'])
        A('| %s | %d | %.1f | %d（%d 座） |' % (t['chain']['good_zh'], t['rate'], t['actual'],
                                            len(t['stages']), nb))
    A('')
    A('### 4.2 建筑清单')
    A('')
    A('| 建筑 | 数量 | 周期 | 每栋/分 | 人力/栋 | 占地 | 维护/分 | 推荐卡牌 |')
    A('|---|---|---|---|---|---|---|---|')
    tot_w = tot_a = tot_d = tot_n = 0
    order = sorted(rows.values(), key=lambda r: (0 if BU[r['de']]['inputs'] else 1, -r['n']))
    for r in order:
        b = BU[r['de']]
        w, h = b['size']
        A('| %s | %d | %.1fs | %.1f | %d %s | %d×%d | %d | %s |' % (
            r['zh'], r['n'], r['eff'], r['rpb'], b['workers'], b['wclass_zh'], w, h,
            b['denari'], '、'.join(r['cards'][:3]) or '—'))
        tot_n += r['n']
        tot_w += b['workers'] * r['n']
        tot_a += w * h * r['n']
        tot_d += b['denari'] * r['n']
    A('')
    A('合计：**%d 座建筑**，生产占地 **%d 格**，**%d 名工人**，维护费 **%d 第纳里/分**。'
      % (tot_n, tot_a, tot_w, tot_d))
    A('')

    # 住宅
    wf = {}
    for r in rows.values():
        b = BU[r['de']]
        wf[b['wclass_zh']] = wf.get(b['wclass_zh'], 0) + b['workers'] * r['n']
    A('### 4.3 住宅与人口')
    A('')
    A('| 阶层 | 所需工人 | 住宅 | 每栋提供 | 需要栋数 | 人口 |')
    A('|---|---|---|---|---|---|')
    hn = hp = 0
    for cls, n in sorted(wf.items(), key=lambda x: -x[1]):
        res = next((x for x in RES if x['wclass_zh'] == cls and x['region'] == 'latium'), None) \
            or next((x for x in RES if x['wclass_zh'] == cls), None)
        if not res:
            continue
        hn_ = math.ceil(n / res['wf'] - 1e-9)
        A('| %s | %d | %s | %g | %d | %g |' % (cls, n, res['zh'], res['wf'], hn_, hn_ * res['pop']))
        hn += hn_
        hp += hn_ * res['pop']
    A('')
    total_area = int(tot_a * 1.35) + hn * 9 + GOV['size'][0] * GOV['size'][1] + 36
    A('住宅合计 **%d 栋 / %g 人**，占 **%d 格**。' % (hn, hp, hn * 9))
    A('')
    A('### 4.4 占地与岛屿选择')
    A('')
    A('| 项目 | 格数 |')
    A('|---|---|')
    A('| 生产建筑 | %d |' % tot_a)
    A('| 道路与空隙（约 +35%%） | %d |' % int(tot_a * 0.35))
    A('| 住宅 | %d |' % (hn * 9))
    A('| 总督府 | %d |' % (GOV['size'][0] * GOV['size'][1]))
    A('| 仓库 + 码头 | 36 |')
    A('| **合计** | **%d** |' % total_area)
    A('')
    side = int(math.ceil(math.sqrt(total_area * 1.3)))
    A('建议选可建面积 ≥ **%d 格** 的岛（约 %d×%d 的连续平地）。放不下时按顺序砍：' % (int(total_area * 1.3), side, side))
    A('先减产量 → 把原料农场外包到邻岛 → 拆成“加工岛 + 农业岛”。')
    A('')
    A('### 4.5 分区布局')
    A('')
    A('1. **原料区**（农场／矿场／采集）：占比最大，优先占平地与资源点，连成片；')
    A('2. **加工区**（作坊／工厂）：紧贴仓库，尽量沿一条主路排开，方便卡牌加成覆盖；')
    A('3. **仓储 / 码头区**：卡在原料区与加工区之间，码头朝外海；')
    A('4. **居住 / 市政区**：总督府居中心，第一圈广场／市场／浴场，第二圈住宅，外围仓库。')
    A('')
    A('道路：主路 2 格宽贯穿全岛，支路每两排建筑一条，避免死胡同（运输车会绕路）。')
    A('')
    A('---')
    A('')
    A('## 五、常见坑')
    A('')
    A('- **别按整数比硬套**：满科技下每段产线的加成不同，比例会跑偏，按“每分钟产量”算才准。')
    A('- **劳动力是硬约束**：先算工人再定住宅，住宅又带来新的需求，形成循环；建议先建生产、再补住宅、最后补住宅需求产线。')
    A('- **燃煤建筑单独配**：煤耗固定 0.5 吨/分，1 座炭窑养 4 栋，与周期无关。')
    A('- **不要把所有建筑塞进总督府半径**：半径 36 格基本覆盖全岛，真正影响体验的是道路连通与污染隔离。')
    A('- **卡牌不是越多越好**：每栋 3 槽，优先给“栋数最多”的建筑（通常是上游农场），收益最大。')
    A('')
    A('---')
    A('')
    A('网页版「岛屿规划」可以改产量、行省、加成与卡牌品质，实时出表与布局图：`index.html?view=plan`。')
    A('')

    p = os.path.join(REPO, 'docs', '纪元117岛屿建设指南.md')
    open(p, 'w', encoding='utf-8').write('\n'.join(L))
    print('wrote', p, len('\n'.join(L)), 'chars', 'total_area', total_area, 'buildings', tot_n)


if __name__ == '__main__':
    main()
