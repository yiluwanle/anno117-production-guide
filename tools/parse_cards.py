# -*- coding: utf-8 -*-
"""从 vitablo 计算器页面提取每栋建筑可用的专家/物品卡（card id、名称、普通/传说加成、稀有度、图标）。"""
import re, json, html, collections

s = open('vitablo.html', encoding='utf-8', errors='ignore').read()
starts = [(m.start(), m.group(1)) for m in re.finditer(r'<div class="box" id="a117-warenkette-([a-z0-9-]+)"', s)]

BTN = re.compile(r'<button[^>]*class="([^"]*wr-spez[^"]*)"([^>]*)>(.*?)</button>', re.S)
SKILL = re.compile(r'<button[^>]*class="([^"]*wr-skill[^"]*)"([^>]*)>(.*?)</button>', re.S)


def attrs(seg):
    d = {}
    for m in re.finditer(r'data-([a-z-]+)="([^"]*)"', seg):
        d[m.group(1)] = m.group(2)
    return d


cards = {}          # card id -> card info
by_building = {}    # (region, building_de) -> {spez:[ids], skills:[...]}
seen = set()

for idx, (pos, cid) in enumerate(starts):
    end = starts[idx + 1][0] if idx + 1 < len(starts) else len(s)
    block = s[pos:end]
    if cid in seen:
        continue
    seen.add(cid)
    m = re.match(r'([a-z]+)-(.+)$', cid)
    region = m.group(1)
    ep = block.find('class="wr-complex')
    if ep == -1:
        continue
    complex_ = block[ep:]
    cpos = [(mm.start(), mm.group(1)) for mm in re.finditer(
        r'<div class="wr-item[^"]*" id="a117-warenkette-' + re.escape(cid) + r'-c(\d+)"', complex_)]
    for j, (ip, num) in enumerate(cpos):
        ie = cpos[j + 1][0] if j + 1 < len(cpos) else len(complex_)
        it = complex_[ip:ie]
        nm = re.search(r'data-name="([^"]+)"', it)
        bname = html.unescape(nm.group(1)) if nm else ''
        key = (region, bname)
        rec = by_building.setdefault(key, {'spez': [], 'skills': []})

        for mm in BTN.finditer(it):
            cls, at, inner = mm.group(1), mm.group(2), mm.group(3)
            a = attrs(at)
            card = a.get('card', '')
            if not card:
                continue
            alt = re.search(r'alt="([^"]*)"', inner)
            img = re.search(r'data-lazy-src="([^"]*)"', inner) or re.search(r'src="(/wp-content/[^"]*)"', inner)
            rar = re.search(r'rarity-(\d+)', cls)
            info = {
                'id': card,
                'name_de': html.unescape(alt.group(1)).replace(' Icon', '') if alt else '',
                'base': float(a.get('base', 0) or 0),
                'prod': float(a.get('prod', 0) or 0),
                'rarity': int(rar.group(1)) if rar else 0,
                'img': img.group(1) if img else '',
                'legend': a.get('prod') != a.get('base'),
            }
            cur = cards.get(card)
            if cur is None or info['prod'] > cur['prod']:
                cards[card] = info
            if card not in rec['spez']:
                rec['spez'].append(card)

        for mm in SKILL.finditer(it):
            cls, at, inner = mm.group(1), mm.group(2), mm.group(3)
            a = attrs(at)
            card = a.get('card', '')
            if not card:
                continue
            alt = re.search(r'alt="([^"]*)"', inner)
            img = re.search(r'data-lazy-src="([^"]*)"', inner) or re.search(r'src="(/wp-content/[^"]*)"', inner)
            info = {
                'id': card,
                'name_de': html.unescape(alt.group(1)).replace(' Icon', '') if alt else '',
                'base': float(a.get('base', 0) or a.get('prod', 0) or 0),
                'prod': float(a.get('prod', 0) or 0),
                'rarity': 0,
                'img': img.group(1) if img else '',
                'multi': 'data-multi' in at,
                'legend': False,
            }
            if card and info['name_de']:
                cards.setdefault(card, info)
            if card and card not in rec['skills']:
                rec['skills'].append(card)

print('cards', len(cards))
print('buildings with cards', len(by_building))
json.dump({'cards': cards,
           'buildings': {f'{r}|{b}': v for (r, b), v in by_building.items()}},
          open('cards_raw.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# 抽样检查
for k in list(by_building)[:3]:
    v = by_building[k]
    print('==', k, 'spez', len(v['spez']), 'skills', len(v['skills']))
    for i in v['spez'][:4]:
        c = cards[i]
        print('   ', c['name_de'], 'base', c['base'], 'prod', c['prod'], 'r', c['rarity'], c['img'][-40:])
