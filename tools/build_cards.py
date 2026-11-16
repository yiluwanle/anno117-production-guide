# -*- coding: utf-8 -*-
"""生成卡牌全库数据：合并 anno117.tools 物品数据 + vitablo 卡牌（中文名/生产力/建筑映射）。

输入（_research）：items_all.json、card_match.json、icons/
输出：data/cards.json、data.js 中 window.ANNO_CARDS、img/cards/g<guid>.webp
"""
import os, re, json, shutil, io
from PIL import Image
import sys

NAME_ZH = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                      'card_names_zh.json'), encoding='utf-8'))

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
RES = os.path.join(os.path.dirname(REPO), '_research')
sys.path.insert(0, HERE)
from i18n_cards import translate, effect_tag, translate_where, translate_cond

DATA = json.load(open(os.path.join(REPO, 'data', 'data.json'), encoding='utf-8'))
ITEMS = json.load(open(os.path.join(RES, 'items_all.json'), encoding='utf-8'))
GOODS = DATA['goods']
VIT = DATA['cards']                       # 卡牌 id -> {zh,de,base,prod,r,kind,img}

MATCH = {}
mp = os.path.join(RES, 'card_match.json')
if os.path.exists(mp):
    MATCH = json.load(open(mp, encoding='utf-8'))

CATS = [
    ('factory', '生产', '工厂 · 农场 · 矿场 · 工坊'),
    ('house', '住宅', '各级住宅'),
    ('ship', '航海', '商船 · 战舰 · 船坞'),
    ('military', '军事', '塔楼 · 城门 · 军营 · 治安'),
    ('civic', '市政', '市场 · 浴场 · 神庙 · 仓储'),
]

MIL = ['Tower', 'Gate', 'Armour', 'Vigiles', 'Custodes', 'Medici', 'Recruitment', 'Barrack', 'Wall',
       'Siege', 'Equitum', 'Watch', 'Garrison', 'Patrol']
CIV = ['Market', 'Granar', 'Bath', 'Theatre', 'Tavern', 'Forum', 'Hippodrome', 'Public Service', 'Aqueduct',
       'Firepit', 'Latrine', 'Warehouse', 'Depot', 'Trading Post', 'Monument', 'Marvel', 'Shrine',
       'Sanctuary', 'Sacred Grove', 'Observatory', 'Temple', 'Narcissium', 'Tabulus', 'Grammaticus',
       'Amenity', 'Latrunculi', 'Gambling', 'Fanum', 'Tomb', 'Alder Council', 'Repair Crane',
       'Encampment', 'Fibularium', 'Lythier', 'Salsicium', 'Wesekh', 'Scrib', 'Statuette']


def cat_of(targets):
    for t in targets:
        if 'Ship' in t:
            return 'ship'
    for t in targets:
        if 'Residence' in t:
            return 'house'
    for t in targets:
        if any(k in t for k in MIL):
            return 'military'
    for t in targets:
        if any(k in t for k in CIV):
            return 'civic'
    return 'factory'



# 作用对象（建筑组）中文对照
GROUPS = {
    'Production Buildings': '生产建筑', 'Residences': '各级住宅', 'Ships': '所有船只', 'All Ships': '所有船只',
    'All River Ships': '所有内河船只', 'Markets': '市场', 'Granaries': '粮仓', 'All Granaries': '所有粮仓',
    'Public Services': '公共服务', 'Mines': '矿场', 'Quarries': '采石场', 'Plantations': '种植园',
    'Arable Farms': '耕地农场', 'Towers': '塔楼', 'Gates': '城门', 'Armouries': '军械库', 'Vigiles': '夜巡队',
    'Medici': '医官', 'Custodes': '近卫', 'Recruitment Building': '招募建筑', 'City Watches': '城防哨所',
    'Hippodrome on Island': '岛屿竞技场', 'Marvels': '奇观', 'All Buildings': '所有建筑', 'Warehouses': '仓库',
    'Trading Posts': '贸易站', 'Barracks': '兵营', 'All Monuments on Island': '岛屿全部纪念建筑',
    'Military Goods Production': '军需生产', 'Coastal Factories': '沿海工厂', 'Workshops': '工坊',
    'Extractors': '采集建筑', 'Gatherers': '采集者', 'Artisanal Studios': '手工工场', 'Encampments': '营地',
    'Forums': '广场', 'Baths': '浴场', 'Theatres': '剧院', 'Tavern': '酒馆', 'Shrines': '神龛',
    'Sanctuary': '圣所', 'Observatory': '观星台', 'Firepit': '火塘', 'Latrines': '公厕', 'Depot': '货站',
    'Amenity': '便民设施', 'Walls': '城墙', 'Towers in Latium': '拉丁姆塔楼', 'Towers in Albion': '阿尔比恩塔楼',
    'City Watches in Latium': '拉丁姆城防哨所', 'City Watches in Albion': '阿尔比恩城防哨所',
    'All Reed Farms': '所有芦苇农场', 'Sacred Grove on Island': '岛屿圣林', 'Shipyards': '船坞',
    'Nile Boat Shipyard': '尼罗河船坞', 'Libenti and Wader Residences': '自由民与涉水者住宅',
    'Eques Residence': '骑士住宅', 'Patrician Residence': '贵族住宅', 'Plebeian Residence': '平民住宅',
    'Mercator Residence': '商人住宅', 'Smith Residence': '铁匠住宅', 'Libertus Residence': '自由民住宅',
    'Wader Residence': '涉水者住宅', 'Alderman Residence': '元老住宅', 'Noble Residence': '贵族住宅',
    'Liberti and Wader Residences': '自由民与涉水者住宅', 'Forums': '广场', 'Jeweller': '珠宝匠',
    'Lavender Grower': '薰衣草种植园', 'Smelters': '冶炼厂', 'Kitchens': '厨房', 'Fisheries': '渔场',
    'Aqueduct Cisterns': '渡槽蓄水池', 'Clothiers': '制衣匠', 'Resin Tapper': '树脂采集者',
    'Refineries': '精炼厂', 'Grammaticus': '文法教师', 'Equitum Campus': '骑士训练场',
    'Repair Crane': '维修吊车', 'Gambling House': '赌场', 'Livestock Farms': '畜牧农场',
    'Watchtowers': '瞭望塔', 'Apothecary': '药剂师', 'Forest Camps': '林间营地', 'Upholsterers': '软装匠',
    'Victuallers': '伙食商', 'Siege Workshop': '攻城工坊', 'Rock Tomb': '岩墓', 'Fanum': '神庙',
    'Statuettes': '雕像工坊', 'Latrunculi Sets': '棋盘套装工坊', 'Blue Lotus Tea': '蓝莲茶',
    'Shrine of Vulcan': '伏尔甘神龛', 'Shrine of Cernunnos': '刻尔努诺斯神龛',
    'Writing Tablets Chain': '书写板产线', 'Mirrors Chain': '镜具产线', 'Mudbrick Chain': '泥砖产线',
    'Warehouses in Latium': '拉丁姆仓库', 'Warehouses in Albion': '阿尔比恩仓库',
    'All Aegyptus Province Residences': '埃及行省各级住宅', 'Hunting Cabins': '狩猎小屋',
    'Water Basin': '蓄水池',
}

_EN2ZH = {}
for _de, _v in DATA['buildings'].items():
    if _v.get('en'):
        _EN2ZH.setdefault(_v['en'].lower(), _v['zh'])


def target_zh(t):
    if not t:
        return ''
    base = re.sub(r' and \d+ more$', '', t).strip()
    if base in GROUPS:
        return GROUPS[base]
    low = base.lower()
    if low in _EN2ZH:
        return _EN2ZH[low]
    if low.endswith('ies') and low[:-3] + 'y' in _EN2ZH:
        return _EN2ZH[low[:-3] + 'y']
    if low.endswith('s') and low[:-1] in _EN2ZH:
        return _EN2ZH[low[:-1]]
    if low.endswith('es') and low[:-2] in _EN2ZH:
        return _EN2ZH[low[:-2]]
    if low.endswith(' chain'):
        stem = base[:-len(' Chain')].strip()
        g = GOODS.get(stem) or GOODS.get(stem.rstrip('s')) or GOODS.get(stem + 's')
        if g:
            return g + '产线'
        ch = _EN2ZH.get(stem.lower()) or _EN2ZH.get(stem.lower().rstrip('s'))
        return (ch + '产线') if ch else ''
    return ''


def fmt_val(v):
    return (v or '').strip()


def build():
    # 反向：guid -> vitablo 卡牌 id
    by_guid = {}
    for cid, m in MATCH.items():
        if cid in VIT:
            by_guid[m['guid']] = cid

    out = {}
    img_dir = os.path.join(REPO, 'img', 'cards')
    os.makedirs(img_dir, exist_ok=True)
    local_img = 0
    for guid, it in ITEMS.items():
        targets = [b['target'] for b in it['blocks']] or ['—']
        cat = cat_of(targets if targets != ['—'] else [])
        eff = []
        for b in it['blocks']:
            for r in b['rows']:
                zh = translate(r['name'], GOODS) or r['name']
                eff.append([zh, fmt_val(r['base']), fmt_val(r['boost']), effect_tag(r['name']), r['name']])
        vit = by_guid.get(guid)
        vc = VIT.get(vit, {}) if vit else {}
        # 站点缺 Productivity 行时，用 vitablo 的生产力数值补齐（该行的数值以 vitablo 为准）
        if vc and vc.get('base', 0) > 0 and not any(e[4] == 'Productivity' for e in eff):
            eff.insert(0, ['生产力', '+%g%%' % vc['base'], '+%g%%' % vc['prod'],
                           'prod', 'Productivity'])

        # 图标：优先本地
        img = ''
        src = os.path.join(RES, 'icons', guid + '.webp')
        dst = os.path.join(img_dir, 'g%s.webp' % guid)
        if os.path.exists(src):
            if not os.path.exists(dst):
                try:
                    im = Image.open(src).convert('RGBA')
                    if im.size[0] > 96:
                        im = im.resize((96, 96), Image.LANCZOS)
                    im.save(dst, 'WEBP', quality=88, method=6)
                except Exception:
                    shutil.copy(src, dst)
            img = 'img/cards/g%s.webp' % guid
            local_img += 1
        elif vc.get('img'):
            img = vc['img']
        else:
            img = 'https://cdn.anno117.tools/icons/%s.webp' % guid

        out[guid] = [
            it['name'],                       # 0 英文名
            NAME_ZH.get(guid) or vc.get('zh', ''),  # 1 中文名（人工译名优先）
            it['rarity'] or it['kind'].replace(' Specialist', ''),  # 2 稀有度
            it['niche'],                      # 3 流派
            cat,                              # 4 分类
            img,                              # 5 图标
            eff,                              # 6 效果
            translate_cond(it['cond'] or ''),  # 7 强化条件
            [target_zh(t) or t for t in targets],  # 8 作用对象
            translate_where(it['where'] or ''),  # 9 来源
            vit or '',                        # 10 vitablo 卡牌 id
            vc.get('de', ''),                 # 11 德文名
        ]

    payload = {
        'meta': {
            'count': len(out),
            'local_img': local_img,
            'matched': len(by_guid),
            'source': 'anno117.tools（补丁 3.0）+ vitablo 生产线计算器',
        },
        'cats': [{'id': c, 'zh': z, 'sub': s} for c, z, s in CATS],
        'items': out,
        'card_guid': {cid: m['guid'] for cid, m in MATCH.items()},
    }
    js = json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(REPO, 'data', 'cards.json'), 'w', encoding='utf-8').write(js)
    open(os.path.join(REPO, 'cardsdata.js'), 'w', encoding='utf-8').write(
        '/* 纪元117 卡牌全库（自动生成，勿手改）：tools/build_cards.py */\n'
        'window.ANNO_CARDS=' + js + ';\n')
    return payload


if __name__ == '__main__':
    p = build()
    print('items', p['meta'])
    from collections import Counter
    print('cats', Counter(v[4] for v in p['items'].values()))
    print('with zh', sum(1 for v in p['items'].values() if v[1]))
    print('with prod eff', sum(1 for v in p['items'].values() if any(e[4] == 'Productivity' for e in v[6])))
    # 抽样
    for g, v in list(p['items'].items())[:3]:
        print(g, v[:5], v[6][:2])
