# -*- coding: utf-8 -*-
"""卡牌效果文本中文化：词表 + 模板规则。"""

# 直接对应的效果名
TERMS = {
    'Productivity': '生产力',
    'Upkeep Cost': '维护费',
    'Workforce Needed': '所需劳动力',
    'Hitpoints': '生命值',
    'Prestige': '威望',
    'Belief': '信仰',
    'Happiness': '幸福度',
    'Health': '健康',
    'Knowledge': '知识',
    'Income': '收入',
    'Fire Safety': '防火',
    'Population': '人口',
    'Movement Speed': '移动速度',
    'Available Patrols': '可用巡逻队',
    'Province Transfer Speed': '行省运输速度',
    'Cargo Slowdown': '载货减速',
    'Self-repair speed': '自修复速度',
    'Goods Transfer Speed': '货物转运速度',
    'Damage Slowdown': '受损减速',
    'Troop Recruitment Speed': '部队招募速度',
    'Troop Recruitment Cost': '部队招募花费',
    'Attack speed': '攻击速度',
    'Attack range': '攻击距离',
    'Accuracy': '命中',
    'Ranged Offence': '远程攻击力',
    'Trade Prices': '贸易价格',
    'Unfavourable Wind Impact': '逆风影响',
    'Favourable Wind Angle': '顺风角度',
    'Torching Speed': '纵火速度',
    'Water consumption': '耗水量',
    'Water supply': '供水',
    'Fuel efficiency': '燃料效率',
    'Required Area': '所需面积',
    'Discovery Radius': '探索半径',
    'Denarii for sinking ships': '击沉船只获得第纳里',
    'Response Time': '响应时间',
    'Bread Consumption': '面包消耗',
    'Consumption': '消耗',
    'Repair radius': '维修半径',
    'Loading Speed': '装载速度',
    'Channel Capacity': '航道容量',
    'Rebuild time': '重建时间',
    'Island Storage': '岛屿仓储',
    'Available Upgrades': '可用升级',
    'Healing while encamped': '驻营时治疗',
    'Ship repair speed': '船只维修速度',
    'Building repair speed': '建筑维修速度',
    'Simultaneous repairs': '同时维修数',
    'Ship Construction Cost': '造船花费',
    'Ship Construction Speed': '造船速度',
    'Scorpion Attack Arc': '蝎弩攻击扇区',
    'Catapult Attack Arc': '弩炮攻击扇区',
    'Gambling House Need Supplied': '满足赌场需求',
    'Negative Impact of River Current': '削弱河流水流影响',
    'Immune against Disease, and Plague': '免疫疾病与瘟疫',
    'Workforce from residents': '居民提供的劳动力',
}

# 船只武器前缀
SHIP_PREFIX = {
    'Ship Archers': '船载弓箭手',
    'Ship Scorpion': '船载蝎弩',
    'Ship Catapult': '船载弩炮',
}

# 住宅/公共建筑名（"X from Y, if supplied" 里的 Y）
BUILDINGS = {
    'Baths': '浴场',
    'Theatre': '剧院',
    'Tavern': '酒馆',
    'Library': '图书馆',
    'Temple': '神庙',
    'Fanum': '神庙',
    'Sacred Grove': '圣林',
    'Sanctuary': '圣所',
    'Recreation Ground': '休闲场',
    'Bardic Hearth': '吟游火塘',
    'Scribing Sets': '书写套装',
    'Rock Tomb': '岩墓',
    'Alder Council': '长老议事厅',
    'Hippodrome': '竞技场',
    'Aqueduct Cistern': '渡槽蓄水池',
    'Chariots': '战车',
    'Loungers': '躺椅',
    'Baths, and Reed Shoes': '浴场与芦苇鞋',
    'Theatre, and Renovated Pyramids': '剧院与修复金字塔',
    'Sandals, and Reed Shoes': '凉鞋与芦苇鞋',
}

# 物资（部分，其余用 goods 表）
GOODS = {
    'Coal': '煤', 'Flax': '亚麻', 'Herbs': '草药', 'Marble': '大理石', 'Mosaics': '马赛克',
    'Concrete': '混凝土', 'Gold': '黄金', 'Gold Ore': '金矿石', 'Minerals': '矿物',
    'Obsidian': '黑曜石', 'Cheese': '奶酪', 'Horses': '马匹', 'Silver': '白银',
    'Pigments': '颜料', 'Beer': '啤酒', 'Tiles': '瓦片', 'Wine': '葡萄酒',
    'Honeycombs': '蜂巢', 'Cloth': '布匹',
    'Lavender Fertility': '薰衣草肥沃度', 'Sandarac Fertility': '山达脂肥沃度',
    'Sea Shell Population': '海贝种群', 'Gold Ore Deposit': '金矿脉', 'Resin Fertility': '树脂肥沃度',
    'Silver Deposit': '银矿脉', 'Barley Fertility': '大麦肥沃度', 'Dye Plant Fertility': '染料植物肥沃度',
    'Pony Population': '矮马种群', 'Sturgeon Population': '鲟鱼种群', 'Mackerel Population': '鲭鱼种群',
    'Flax Fertility': '亚麻肥沃度', 'Grape Fertility': '葡萄肥沃度', 'Herbs Fertility': '草药肥沃度',
    'Murex Snail Population': '骨螺种群', 'Saltwort Fertility': '盐蓬肥沃度', 'Olive Fertility': '橄榄肥沃度',
    'Granite Deposit': '花岗岩矿脉', 'Iron Deposit': '铁矿脉', 'Marble Deposit': '大理石矿脉',
    'Beaver Population': '河狸种群', 'Copper Deposit': '铜矿脉', 'Pomegranate Fertility': '石榴肥沃度',
    'Sesame Fertility': '芝麻肥沃度', 'Small Bird Population': '小鸟种群', 'Oyster Population': '牡蛎种群',
    'Mineral Deposit': '矿脉', 'Tin Deposit': '锡矿脉', 'Blue Lotus Fertility': '蓝莲肥沃度',
}

WORKFORCE = {
    'Plebeian': '平民', 'Libertus': '自由民', 'Equites': '骑士', 'Smith': '铁匠',
    'Wader': '涉水者', 'Mercators': '商人', 'Nobles': '贵族', 'Alderman': '元老',
}

STATS = {
    'Happiness': '幸福度', 'Health': '健康', 'Fire Safety': '防火', 'Prestige': '威望',
    'Belief': '信仰', 'Knowledge': '知识', 'Income': '收入', 'Population': '人口',
}


def goods_zh(name, goods_map):
    if name in GOODS:
        return GOODS[name]
    if name in goods_map:
        return goods_map[name]
    return name


def translate(name, goods_map):
    """返回中文效果名；无法识别时返回 None。"""
    import re
    n = name.strip()
    if not n:
        return None
    if n in TERMS:
        return TERMS[n]
    # X Area Effect
    m = re.match(r'^(.+) Area Effect$', n)
    if m:
        base = translate(m.group(1), goods_map)
        return (base or m.group(1)) + '范围效果'
    # 船只武器
    for pre, zh in SHIP_PREFIX.items():
        if n.startswith(pre + ' '):
            rest = n[len(pre) + 1:]
            r = translate(rest, goods_map) or rest
            return zh + r
    # 额外肥沃度
    m = re.match(r'^Additional fertility: (.+)$', n)
    if m:
        return '额外肥沃度：' + goods_zh(m.group(1), goods_map)
    # 额外产出
    m = re.match(r'^Additional 1t(?: (.*?))? every (\d+) cycles?$', n)
    if m:
        g = (m.group(1) or '').strip()
        gz = '产物' if not g else goods_zh(g, goods_map)
        return '每%s周期额外 +1 吨%s' % (m.group(2), gz)
    m = re.match(r'^Additional 1t(?: (.*?))? every cycle$', n)
    if m:
        g = (m.group(1) or '').strip()
        return '每周期额外 +1 吨' + ('产物' if not g else goods_zh(g, goods_map))
    # 供给某建筑时
    m = re.match(r'^(.+?) from (.+?), if supplied$', n)
    if m:
        stat = STATS.get(m.group(1)) or translate(m.group(1), goods_map) or m.group(1)
        bd = BUILDINGS.get(m.group(2), m.group(2))
        return '供给%s时 %s' % (bd, stat)
    # 劳动力
    m = re.match(r'^Also provides equal amounts of (\w+) Workforce$', n)
    if m:
        return '同时提供等量%s劳动力' % WORKFORCE.get(m.group(1), m.group(1))
    m = re.match(r'^Run by (\w+) Workforce, instead of (\w+) Workforce$', n)
    if m:
        return '由%s劳动力代替%s劳动力运转' % (WORKFORCE.get(m.group(1), m.group(1)),
                                     WORKFORCE.get(m.group(2), m.group(2)))
    # 住宅需求
    m = re.match(r'^Supply Residence Need: (.+)$', n)
    if m:
        return '供应住宅需求：' + goods_zh(m.group(1), goods_map)
    # 替代材料
    m = re.match(r'^(.+?) replaces (.+)$', n)
    if m:
        return '%s 替代 %s' % (goods_zh(m.group(1), goods_map), goods_zh(m.group(2), goods_map))
    m = re.match(r'^Self-supply (.+)$', n)
    if m:
        return '自给' + goods_zh(m.group(1), goods_map)
    m = re.match(r'^(Happiness|Health|Belief|Knowledge|Income|Prestige) from , if supplied$', n)
    if m:
        return '供给时 ' + STATS.get(m.group(1), m.group(1))
    if n == 'Reduces the risk of rats.':
        return '降低鼠患风险'
    return None


# 效果分类标签（用于前端筛选）
def effect_tag(name):
    if name == 'Productivity':
        return 'prod'
    if name in ('Upkeep Cost', 'Workforce Needed', 'Fuel efficiency', 'Water consumption', 'Required Area'):
        return 'cost'
    if name in ('Happiness', 'Health', 'Fire Safety', 'Prestige', 'Belief', 'Knowledge', 'Income', 'Population') \
            or name.endswith('Area Effect'):
        return 'stat'
    if name.startswith('Additional'):
        return 'extra'
    return 'other'


# ---------------- 获取方式 / 强化条件 ----------------
import re as _re

_TRADERS = {'1': '1 名商人', '2': '2 名商人', '3': '3 名商人', '4': '4 名商人', '5': '5 名商人',
            '6': '6 名商人', '7': '7 名商人', '8': '8 名商人', '9': '9 名商人', '10': '10 名商人',
            '17': '17 名商人'}


def _traders(x):
    x = x.strip()
    if x.endswith('traders'):
        n = x[:-len('traders')].strip()
        return _TRADERS.get(n, n + ' 名商人')
    return x


def translate_where(s):
    """把 'It is sold by X; a quest reward; ...' 转成中文短语，用 · 连接。"""
    if not s:
        return ''
    s = s.strip().rstrip('.')
    out = []
    for part in s.split(';'):
        p = part.strip()
        if not p:
            continue
        if p in ('It is a quest reward', 'a quest reward'):
            out.append('任务奖励')
            continue
        m = _re.match(r'^It is sold by (.+)$', p)
        if m:
            out.append('商人出售：' + _traders(m.group(1)))
            continue
        m = _re.match(r'^a reward of (\d+) festivals?$', p)
        if m:
            out.append('%s 个节庆奖励' % m.group(1))
            continue
        m = _re.match(r'^(?:It is )?brought by (.+)$', p)
        if m:
            out.append('赠送来源：' + m.group(1))
            continue
        m = _re.match(r'^a contract reward from (.+)$', p)
        if m:
            out.append('合约奖励：' + _traders(m.group(1)))
            continue
        m = _re.match(r'^flotsam from (.+)$', p)
        if m:
            out.append('漂流物：' + _traders(m.group(1)))
            continue
        m = _re.match(r'^It is left by defeating (.+)$', p)
        if m:
            out.append('击败 Boss：' + m.group(1))
            continue
        m = _re.match(r'^It is from (\d+)$', p)
        if m:
            out.append('来源条目 #' + m.group(1))
            continue
        out.append(p)
    return ' · '.join(out)


def translate_cond(s):
    if not s:
        return ''
    s = s.strip()
    t = s
    t = t.replace('its conditions are met', '满足自身条件时')
    t = _re.sub(r'^Patron: (.+)$', r'主守护神：\1', t)
    t = _re.sub(r'^Dominant patron: (.+)$', r'主守护神：\1', t)
    t = _re.sub(r'^Alliance with (.+)$', r'与 \1 结盟', t)
    t = t.replace('Emperor reputation', '皇帝声望').replace('Knowledge', '知识') \
         .replace('Denarii', '第纳里').replace('Happiness', '幸福度').replace('Health', '健康')
    t = t.replace('Trade routes', '贸易路线').replace('Ships', '船只').replace('Population', '人口')
    return t
