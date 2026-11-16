# -*- coding: utf-8 -*-
"""生成知识库 Markdown（用于 ima 导入 / GitHub 文档）"""
import json, re

d = json.load(open('web/data.json', encoding='utf-8'))
chains = d['chains']
regions = d['regions']
G = d['goods']
MODE_ZH = {'none': '无加成', 'fac': '满设施', 'tech': '满科技'}


def prod(b, mode):
    add = 0
    if mode != 'none':
        add += 100 if b['silo'] else 0
        add += 50 if b['taube'] else 0
    if mode == 'tech':
        add += b.get('research', 0)
    aqua = 1.5 if (mode != 'none' and b['aqua']) else 1
    return (100 + add) * aqua


def solve(c, mode):
    rows = []
    for s in c['stages']:
        p = prod(s['bonus'], mode)
        rows.append({'s': s, 'p': p, 'eff': s['time'] / (p / 100)})
    ref = rows[-1]
    for r in reversed(rows):
        if r['s']['outputs']:
            ref = r
            break
    for r in rows:
        r['count'] = r['eff'] / ref['eff']
    return rows


def fmt(v):
    if abs(v - round(v)) < 0.005:
        return str(int(round(v)))
    return ('%.1f' % v) if v >= 10 else ('%.2f' % v).rstrip('0').rstrip('.')


def nice(cs):
    for k in range(1, 9):
        ok, out = True, []
        for v in cs:
            x = v * k
            r = round(x)
            if r < 1 or abs(x - r) > 0.06 * max(1, r):
                ok = False
                break
            out.append(r)
        if ok:
            return k, out
    return None


def mmss(sec):
    sec = round(sec)
    return '%d:%02d' % (sec // 60, sec % 60)


def ratio_text(rows, label):
    k = nice([r['count'] for r in rows])
    if k:
        base, ints = k
        return '**%s**：每 %d 座成品 → %s' % (label, base, ' · '.join(
            '%s %d' % (r['s']['zh'], ints[i]) for i, r in enumerate(rows)))
    return '**%s**：%s（含小数，施工向上取整）' % (label, ' · '.join(
        '%s %s' % (r['s']['zh'], fmt(r['count'])) for r in rows))


L = []
A = L.append
A('# 纪元117：罗马和平 —— 三大行省生产线配方与配比手册')
A('')
A('> 适用版本：**补丁 3.0「三角洲的觉醒」**（含「火山的应许」「三角洲的觉醒」DLC 内容）')
A('> 覆盖：拉丁姆 30 条、阿尔比恩 32 条、埃及 39 条，共 **101 条生产线 / 145 栋生产建筑**')
A('> 数据来源：vitablo Anno 117 Warenrechner（基础加工周期）+ 同站建筑数据库（配方输入输出）；配方经 anno117.tools 交叉校验')
A('')
A('---')
A('')
A('## 一、计算模型（所有配比的来源）')
A('')
A('### 1. 生产力公式')
A('')
A('```')
A('生产力 P = ( 100 + 筒仓100 + 鸽舍50 + 研究加成 + 额外加成 ) × 输水道系数')
A('(接通蓄水池/输水道时系数 = 1.5，否则 = 1)')
A('```')
A('')
A('- **输水道是乘法**：基础生产变为 150%，因此会把其他加成一并放大。')
A('- **筒仓 / 鸽舍 / 研究 / 专家 / 宗教是加法**：直接叠加在百分比上。')
A('- 例：麦田在「研究+10」且接通输水道时，P = (100+10)×1.5 = 165%，周期 60 秒 → 36 秒。')
A('')
A('### 2. 配比公式')
A('')
A('```')
A('有效周期 t_eff = 基础加工时间 ÷ (P / 100)')
A('建筑数量 n_i = t_eff_i ÷ t_eff(成品建筑) × 目标数量')
A('```')
A('')
A('因为每栋建筑**每个周期消耗 1 吨输入、产出 1 吨产品**，所以建筑数量正比于有效周期——这就是所有「1:2」「4:3」配比的数学来源。')
A('')
A('### 3. 燃料（煤）')
A('')
A('```')
A('每栋燃煤建筑 = 1 吨煤 / 2 分钟 = 0.5 吨/分（与自身周期无关）')
A('1 座煤矿 / 炭窑（0:30，2 吨/分）→ 供养 4 栋燃煤建筑')
A('```')
A('')
A('拉丁姆本身没有煤矿，需从埃及（煤矿）或阿尔比恩用贸易线输入，或在本岛建炭窑。')
A('')
A('### 4. 三种情景定义')
A('')
A('| 情景 | 含义 | 适合 |')
A('| --- | --- | --- |')
A('| 无加成 | 全部 100%，不接任何设施 | 开局规划、对照攻略 |')
A('| 满设施 | 该建筑可用时接满输水道/筒仓/鸽舍 | 中期 |')
A('| 满科技 | 满设施 + 该建筑关联的全部研究加成 | 后期 |')
A('')
A('> 宗教（守护神）与专家物品不计入「满科技」：单一守护神只能覆盖部分建筑，无法全产线同时拉满。需要时按该建筑宗教上限（多为 +150%）自行叠加。')
A('')
A('---')
A('')
A('## 二、按行省的全部配方与配比')
A('')

for reg in regions:
    rc = [c for c in chains if c['region'] == reg['id']]
    A('## %s（%d 条产线）' % (reg['name'], len(rc)))
    A('')
    for tier in reg['tiers']:
        tc = [c for c in rc if c['tier'] == tier['id']]
        if not tc:
            continue
        A('### %s · %s' % (reg['name'], tier['name']))
        A('')
        for c in tc:
            r0 = solve(c, 'none')
            rf = solve(c, 'fac')
            rt = solve(c, 'tech')
            A('#### %s（%s / %s）' % (c['good_zh'], c['good_de'], c['good_en']))
            A('')
            A('- **建筑**：' + ' → '.join(
                '%s〔%s%s〕' % (s['zh'], mmss(s['time']),
                               ('，需煤' if 'coal' in s['flags'] else '')) for s in c['stages']))
            A('- **配方流程**：' + '；'.join(
                '%s：%s → %s' % (s['zh'], ' + '.join(G.get(g, g) for g in s['inputs']) or '原料',
                                 ' + '.join(G.get(g, g) for g in s['outputs']) or '无') for s in c['stages']))
            A('- ' + ratio_text(r0, '无加成'))
            if any(x != y for x, y in zip([r['p'] for r in rf], [100] * len(rf))):
                A('- ' + ratio_text(rf, '满设施'))
            A('- ' + ratio_text(rt, '满科技'))
            coal = sum(r['count'] for r in rt if 'coal' in r['s']['flags'])
            if coal:
                A('- **燃料**：%.2f 栋燃煤 → 需煤 %.2f 吨/分 → 约 %.2f 座煤矿/炭窑' % (coal, coal * 0.5, coal / 4))
            # 该链在满科技下可用设施
            facs = []
            for s in c['stages']:
                b = s['bonus']
                av = []
                if b['aqua']: av.append('输水道')
                if b['silo']: av.append('筒仓')
                if b['taube']: av.append('鸽舍')
                if av: facs.append('%s(%s)' % (s['zh'], '/'.join(av)))
            if facs:
                A('- **可用设施**：' + '；'.join(facs))
            A('')

A('---')
A('')
A('## 三、常见问题')
A('')
A('**Q：为什么面包链是 3:1:3，而有些攻略写 2:1:2？**')
A('A：3.0 版谷物磨坊周期为 0:20（3 吨/分），麦田与面包房均为 1:00（1 吨/分），所以精确配比是 3 麦田 : 1 磨坊 : 3 面包房。旧攻略的 2:1:2 对应磨坊 0:30 的旧数据。')
A('')
A('**Q：为什么满科技下配比会出现小数？**')
A('A：各建筑吃到的加成不同（只有部分建筑能接水源/筒仓，研究加成也各不相同），有效周期不再成简单整数比。按小数向上取整建造即可，多余的上游产能可以关停部分建筑或外销。')
A('')
A('**Q：水源（输水道）到底给多少？**')
A('A：不是 +50%，而是把**基础生产提升到 150%**，且是乘法。所以它同时放大了筒仓、研究、专家等所有加成，是收益最高的一环，优先给「能接水源且数量最多」的上游农场。')
A('')
A('**Q：煤要单独算吗？**')
A('A：要。燃煤建筑的煤耗固定为 0.5 吨/分，与周期无关。建议单独规划煤产区（煤矿 0:30 = 2 吨/分），一条贸易线覆盖整座岛。')
A('')
A('---')
A('')
A('网页版（含交互计算器、筛选与情景对比）：见仓库根目录 `index.html`。')
A('')

open('../docs/纪元117生产线配比手册.md', 'w', encoding='utf-8').write('\n'.join(L))
print('lines', len(L))
