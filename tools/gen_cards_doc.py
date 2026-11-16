# -*- coding: utf-8 -*-
"""生成卡牌图鉴 Markdown（给玩家查阅 / 导入知识库用）。"""
import os, json, re

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
cards = json.load(open(os.path.join(REPO, 'data', 'cards.json'), encoding='utf-8'))
data = json.load(open(os.path.join(REPO, 'data', 'data.json'), encoding='utf-8'))
CB = data['cards_by_building']
BU = data['buildings']

items = cards['items']
cats = {c['id']: c for c in cards['cats']}
RAR_ZH = {'Common': '普通', 'Rare': '稀有', 'Epic': '史诗', 'Legendary': '传奇', 'Heroic': '英雄', 'Unique': '独特'}
RANK = {'Unique': 6, 'Heroic': 5, 'Legendary': 4, 'Epic': 3, 'Rare': 2, 'Common': 1}


def bld_zh(vit):
    out = []
    for k, ids in CB.items():
        if vit in ids:
            de = k.split('|', 1)[1]
            zh = BU.get(de, {}).get('zh') or de
            if zh not in out:
                out.append(zh)
    return out


def line(g):
    r = items[g]
    en, zh, rar, niche, cat, img, eff, cond, tgt, where, vit, de = r
    name = zh or en
    rows = []
    for e in eff:
        n, b, p = e[0], e[1], e[2]
        if b in ('✓', '') and p in ('✓', ''):
            rows.append(n)
        elif b == '–' and p == '✓':
            rows.append(n + '（仅强化档）')
        elif p and p != b and p not in ('–', '✓'):
            rows.append('%s %s（强化 %s）' % (n, b, p))
        else:
            rows.append('%s %s' % (n, b))
    md = []
    md.append('### %s%s' % (name, '' if not en or en == name else ' · ' + en))
    meta = ['稀有度：%s' % (RAR_ZH.get(rar, rar) or '—'), '作用：%s' % (tgt[0] if tgt else '—'),
            '分类：%s' % cats.get(cat, {}).get('zh', '')]
    if vit:
        bs = bld_zh(vit)
        if bs:
            meta.append('生产线可用建筑：' + '、'.join(bs[:8]) + ('等' if len(bs) > 8 else ''))
    md.append('- ' + ' · '.join(meta))
    md.append('- 效果：' + '；'.join(rows) if rows else '- 效果：—')
    if cond:
        md.append('- 强化条件：%s' % cond)
    if where:
        md.append('- 获取方式：%s' % where)
    return '\n'.join(md) + '\n'


out = ['# 纪元117 · 卡牌图鉴',
       '',
       '> 数据：anno117.tools（补丁 3.0）物品页 + vitablo 生产线计算器；共 **%d** 张。' % len(items),
       '> 效果均为「普通档（强化档）」两列数值：强化档需要满足卡牌自身条件后生效。',
       '',
       '---',
       '',
       '## 一、怎么用这份图鉴',
       '',
       '1. **按建筑类型找卡**：`生产` 指所有工厂 / 农场 / 矿场 / 工坊，`住宅` 指各级住宅，`航海` 指商船与战舰，`军事` 指塔楼 / 城门 / 驻军，`市政` 指市场 / 浴场 / 神庙 / 仓储。',
       '2. **看生产力那一行**：产线配平只吃「生产力」这一条，其余（维护费、所需劳动力、额外产出、幸福度范围效果…）属于附加收益。',
       '3. **收集清单**：网页版「我的卡牌清单」可按建筑类型分组记录「需要几张 / 已有几张」，并统计完成度。',
       '',
       '## 二、卡槽与生效规则',
       '',
       '- 每栋建筑 **3 个槽位**，同一张卡不能重复插。',
       '- 卡牌的加成与筒仓（+100%）、鸽舍（+50%）、研究加成一样是**加法**，先相加再乘输水道系数 1.5。',
       '- 传说品质 = 同名卡的强化档数值；普通档与强化档的差值通常 10–30 个百分点。',
       '- 「强化条件」是另一回事：指卡牌自带的触发条件（如 `主守护神：Mars`、`幸福度 ≥ 1000`），满足后才会用强化档数值。',
       '',
       '---',
       '',
       '## 三、生产线可用卡（%d 张，可在配比计算器里直接勾选）' % sum(1 for v in items.values() if v[10]),
       '']

prod = [g for g, v in items.items() if v[10]]
prod.sort(key=lambda g: (-(RANK.get(items[g][2], 0)), items[g][1] or items[g][0]))
out.append('\n'.join(line(g) for g in prod))

out += ['', '---', '', '## 四、按分类浏览（全部 %d 张）' % len(items), '']
for cid, c in cats.items():
    gs = [g for g, v in items.items() if v[4] == cid]
    out.append('### %s（%d 张）' % (c['zh'], len(gs)))
    out.append('')
    out.append('、'.join((items[g][1] or items[g][0]) for g in gs[:40]) + ('…' if len(gs) > 40 else ''))
    out.append('')

path = os.path.join(REPO, 'docs', '纪元117卡牌图鉴.md')
open(path, 'w', encoding='utf-8').write('\n'.join(out))
print('wrote', path, os.path.getsize(path), 'bytes')
