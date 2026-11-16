# -*- coding: utf-8 -*-
"""把抓取到的原始数据整理成网页数据集"""
import re, html, json, glob, os

# ---------- 中文词表 ----------
GOODS_ZH = {
 'Wheat':'小麦','Flour':'面粉','Bread':'面包','Timber':'木材','Wood':'原木','Tiles':'瓦','Clay':'黏土',
 'Bricks':'砖','Concrete':'混凝土','Limestone':'石灰岩','Silica':'硅砂','Marble':'大理石','Uncut Marble':'大理石原石',
 'Mosaics':'马赛克','Minerals':'矿物','Sails':'帆','Ropes':'绳索','Hemp':'大麻','Weapons':'武器','Armour':'盔甲',
 'Iron':'铁','Iron Ore':'铁矿石','Pigs':'猪','Salt':'盐','Leather':'皮革','Charcoal':'木炭','Coal':'煤',
 'Sardines':'沙丁鱼','Mackerel':'鲭鱼','Porridge':'燕麦粥','Oat':'燕麦','Tunics':'束腰外衣','Pileus':'毡帽','Sheep':'羊毛',
 'Garum':'鱼露','Soap':'肥皂','Lavender':'薰衣草','Sandals':'凉鞋','Amphorae':'双耳瓶','Resin':'树脂',
 'Olive Oil':'橄榄油','Olives':'橄榄','Horses':'马','Ponies':'矮马','Wine':'葡萄酒','Grapes':'葡萄','Honeycombs':'蜂巢',
 'Writing Tables':'书写板','Sandarac Wood':'沙针木','Statuettes':'雕像','Togas':'托加袍','Flax':'亚麻',
 'Murex Snails':'骨螺','Cloth':'布料','Fine Glass':'精细玻璃','Glass':'玻璃','Oysters with Caviar':'鱼子酱牡蛎',
 'Oysters':'牡蛎','Sturgeon':'鲟鱼','Caviar':'鱼子酱','Loungers':'躺椅','Cushions':'靠垫','Necklaces':'项链',
 'Gold':'黄金','Gold Ore':'金矿石','Silver':'银','Silver Ore':'银矿石','Latrunculi':'棋子','Lyres':'里拉琴','String':'琴弦',
 # Albion
 'Wattle & Daub':'编篱抹泥','Reeds':'芦苇','Mud':'泥浆','Granite':'花岗岩','Granite Block':'花岗岩块',
 'Eels':'鳗鱼','Cockles':'鸟蛤','Reed Shoes':'芦苇鞋','Cheese':'奶酪','Aurochs':'原牛','Sanga Cattle':'桑加牛',
 'Beer':'啤酒','Barley':'大麦','Malt':'麦芽','Trousers':'长裤','Dye Plants':'染料植物','Saltwort':'盐草',
 'Drinking Horns':'饮角','Torcs':'颈环','Copper Ore':'铜矿石','Bronze':'青铜','Tin Ore':'锡矿石',
 'Clan Shields':'氏族盾','Ceremonial Shields':'礼仪盾','Roast Beef':'烤牛肉','Cloaks':'斗篷',
 'Fur Hats':'毛皮帽','Beavers':'河狸','Chariots':'战车','Chassis':'车架','Sausages':'香肠','Herbs':'香草',
 'Brooches':'胸针','Bird Tongues':'鸟舌','Bird Tongues in Aspic':'鸟舌冻','Bord Tongues in Aspic':'鸟舌冻',
 'Lard':'猪油','Wigs':'假发','Handmirrors':'手镜','Seashells':'海贝','Small Birds':'小鸟',
 # Aegyptus
 'Mud Bricks':'泥砖','Limestone Bricks':'石灰岩砖','Dates':'椰枣','Wesekh Collars':'韦塞赫项圈',
 'Camels':'骆驼','Stuffed Goose':'烤鹅','Wild Geese':'野鹅','Kollurion':'科卢里昂','Shentis':'申蒂斯裙',
 'Apotropaic Talismans':'护身符','Oil Lamps':'油灯','Kayk':'凯克饼','Blue Lotus':'蓝莲花','Blue Lotus Tea':'莲花茶',
 'Perfumed Oils':'香水油','Sesame Oil':'芝麻油','Sesame Pods':'芝麻荚','Sistrums':'叉铃','Kalasiris':'卡拉西里斯长袍',
 'Scribing Sets':'书写套装','Papyrus':'纸莎草','Rare Meat Platters':'珍馐肉盘','Pomegranates':'石榴',
 'Milk of Poppea':'浴用乳','Ivory Caskets':'象牙匣','Hippopotami':'河马','Beads':'珠饰','Tyrian Purple':'泰尔紫',
 'Aegyptian Blue':'埃及蓝','Pigments':'颜料','Celtic Green':'凯尔特绿','Obsidian':'黑曜石','Saltwash':'盐碱草',
 'Ornate Wood':'装饰木材','Gold':'黄金','Bronze':'青铜','Head Piece':'头饰','Honeyed Milk':'蜜乳',
 'Kalasirises':'卡拉西里斯长袍','Kamele':'骆驼','Latrunculispiele':'棋子游戏','Coal':'煤',
}

BUILD_ZH = {
 'Holzfäller':'伐木场','Sägewerk':'锯木厂','Lehmgrube':'黏土坑','Ziegelei':'砖窑','Sandraffinerie':'砂精炼厂',
 'Kalksteinbruch':'石灰岩采石场','Betonmischer':'混凝土搅拌厂','Marmorsteinbruch':'大理石采石场',
 'Marmor-Steinmetz':'大理石石匠','Mineralsteinbruch':'矿物采石场','Mineralienmalmer':'矿物研磨厂',
 'Mosaikmacher':'马赛克作坊','Schafshof':'羊圈','Segelmacher':'制帆厂','Hanfhof':'大麻农场','Seilmacher':'制绳厂',
 'Eisenmine':'铁矿','Ofen':'熔炉','Waffenschmied':'武器匠','Schweinehof':'猪圈','Salzgärten':'盐田',
 'Gerberei':'制革厂','Rüstungsschmied':'盔甲匠','Sardinenhütte':'沙丁鱼屋','Haferhof':'燕麦农场','Breistand':'粥摊',
 'Spinnerei':'纺纱厂','Pileusfilzer':'毡帽匠','Weizenhof':'麦田','Kornmühle':'谷物磨坊','Bäckerei':'面包房',
 'Makrelenhütte':'鲭鱼屋','Garumsaucier':'鱼露作坊','Lavandulahof':'薰衣草农场','Sülzsieder':'盐煮工',
 'Seifensieder':'制皂师','Sandalenmacher':'凉鞋匠','Harzzapfer':'采脂工','Töpfer':'陶工','Olivenzüchter':'橄榄农',
 'Olivenpresse':'橄榄压榨厂','Pferdezüchter':'养马场','Weingut':'葡萄酒庄','Bienenstock':'蜂箱','Winzer':'酿酒师',
 'Sandarakbaumschule':'沙针木苗圃','Tabulus':'书写板作坊','Caelator':'雕刻匠','Flachshof':'亚麻农场',
 'Weber':'织工','Schneckenzucht':'蜗牛养殖场','Färberwerkstatt':'染坊','Webstuhl':'织机坊',
 'Glasschmelzer':'玻璃熔炉','Glasbläser':'玻璃吹制匠','Austernfarm':'牡蛎养殖场','Störzucht':'鲟鱼养殖场',
 'Fischweider':'鱼类处理场','Meeresgourmet':'海味大厨','Polsterer':'软垫匠','Liegenbauer':'躺椅木匠',
 'Goldwäscher':'淘金者','Goldmine':'金矿','Goldschmied':'金匠','Juwelier':'珠宝匠','Vergolder':'镀金匠',
 'Latrunculi-Werkstatt':'棋子工坊','Saitenmacher':'制弦匠','Lyramacher':'里拉琴匠',
 # Albion
 'Schilfschneider':'芦苇收割者','Schlammtrockner':'泥浆晾晒场','Lehmwerkhof':'泥浆工坊',
 'Granitsteinbruch':'花岗岩采石场','Granitschneider':'花岗岩切割匠','Aalfänger':'捕鳗人',
 'Herzmuschelfarm':'鸟蛤养殖场','Schuhweber':'鞋履编织匠','Käserei':'奶酪坊','Auerochsenhof':'原牛牧场',
 'Gerstenhof':'大麦农场','Mälzerei':'麦芽坊','Brauerei':'酿酒厂','Färberwaupflanze':'染料草农场',
 'Hosenmacher':'制裤匠','Zinnmine':'锡矿','Horner':'角器匠','Kupfermine':'铜矿','Drahtzwirbler':'金属丝扭制匠',
 'Bronzeschmelzer':'青铜熔炉','Schildschläger':'盾牌锻造匠','Salzkrautsammler':'盐草采集者','Erdofen':'土窑',
 'Grünhände':'绿染匠','Birrusnäher':'斗篷缝制匠','Biberfänger':'河狸捕手','Salzkrautbrenner':'盐草烧制坊',
 'Bieberhutmacher':'河狸帽匠','Pferdefänger':'捕马人','Gestellbauer':'底盘制作匠','Wagenbauer':'战车匠',
 'Eselsmühle':'驴磨坊','Kräutergarten':'草药园','Salsicium':'香肠作坊','Silbermine':'银矿',
 'Silberschmiede':'银匠铺','Fibularium':'胸针工坊','Vogelfänger':'捕鸟人','Zungenzieher':'取舌匠',
 'Delicium':'珍馐坊','Haarnetzweber':'发网编织匠','Perückenknüpfer':'假发编织匠',
 'Kammmuschelzüchter':'扇贝养殖者','Narcissium':'水仙工坊',
 # Aegyptus
 'Lehmziegelei':'泥砖坊','Kalksteinmetz':'石灰岩石匠','Dattelfarm':'椰枣农场','Perlenmacher':'珍珠匠',
 'Perlenfädler':'珍珠串制匠','Haus der Kamele':'骆驼厩','Wildgansjäger':'野鹅猎人','Gänsebräter':'烤鹅师',
 'Köhler':'炭窑','Kohlemine':'煤矿','Kollyrist':'科卢里昂作坊','Plissierer':'褶裥匠','Blaumischer':'蓝色颜料调配师',
 'Kunstglasierer':'艺术上釉匠','Sesamfarm':'芝麻农场','Sesampresse':'芝麻压榨厂','Lampenformer':'制灯匠',
 'Kaykerei':'凯克饼作坊','Lotusfarm':'莲花农场','Haus der Aufgüsse':'冲泡馆','Unguentarius':'香膏师',
 'Tympanist':'鼓乐匠','Näherin':'裁缝','Sangahof':'桑加牛牧场','Papyrusmacher':'纸莎草作坊',
 'Scriptorium':'缮写室','Großwildjäger':'大型猎物猎人','Granatapfelplantage':'石榴园','Feinkostmetzger':'精肉师',
 'Melikratonmischer':'蜜乳调配师','Kosmetiker':'美容师','Kästchenmacher':'匣盒匠',
}

TIER_ZH = {
 'Infrastruktur':'基础设施','Liberti':'自由民','Plebejer':'平民','Equites':'骑士','Patrizier':'元老',
 'Wanderer':'漫游者','Schmiede':'铁匠','Älteste':'长者','Mercatoren':'商贾','Edelmänner':'贵族',
 'Kornleser':'拾穗者','Töpfer':'陶工','Priester':'祭司','Schreiber':'书吏','Gymnasiarchen':'体育官',
}
REGION_ZH = {'latium':'拉丁姆','albion':'阿尔比恩','aegyptus':'埃及'}

# ---------- 解析建筑页（配方 + 英文名） ----------
def clean(s):
    t = re.sub(r'<script.*?</script>|<style.*?</style>', '', s, flags=re.S)
    t = re.sub(r'<[^>]+>', '|', t)
    return html.unescape(re.sub(r'\|{2,}', '|', t))

recipes = {}
for fn in glob.glob('bpages/*.html'):
    de = os.path.basename(fn)[:-5]
    t = clean(open(fn, encoding='utf-8', errors='ignore').read())
    en = ''
    m0 = re.search(r'Input goods of the building \|([^|]+)\|', t) or re.search(r'Output goods of the building \|([^|]+)\|', t)
    if m0:
        en = m0.group(1).strip()
    inputs = []
    m = re.search(r'requires the following goods? for production\s*([^.]*?)\.', t)
    if m:
        inputs = [x.strip() for x in re.findall(r'\|([^|]{2,40})\|', m.group(1))]
    else:
        m = re.search(r'requires the good\s*\|([^|]+)\|', t)
        if m:
            inputs = [m.group(1).strip()]
    om = re.search(r'produces the good\s*\|([^|]+)\|', t)
    outputs = [om.group(1).strip()] if om else []
    recipes[de] = {'en': en, 'inputs': [i for i in inputs if i.lower() != 'and'], 'outputs': outputs}

# ---------- 解析层级 ----------
page = open('vitablo.html', encoding='utf-8', errors='ignore').read()
stages = [(m.start(), m.group(1)) for m in re.finditer(r'<h2 class="wr-stage-title[^>]*id="stufe-[a-z0-9-]+"[^>]*>(.*?)</h2>', page, re.S)]

tiers = []
for pos, blk in stages:
    txt = html.unescape(re.sub(r'<[^>]+>', '', blk)).strip()
    tiers.append((pos, txt))

def tier_of(pos):
    cur = 'Infrastruktur'
    for p, t in tiers:
        if p <= pos:
            cur = t
    return cur

raw = json.load(open('data_raw.json', encoding='utf-8'))
starts = [(m.start(), m.group(1)) for m in re.finditer(r'<div class="box" id="a117-warenkette-([a-z0-9-]+)"', page)]

# ---------- 组装 ----------
def canon_good(name_en):
    return name_en

buildings = {}
chains = []
for idx, ch in enumerate(raw):
    cid = f"{ch['region']}-{ch['slug']}"
    pos = next((p for p, c in starts if c == cid), 0)
    stage = [b for b in ch['buildings']]
    bonuses = ch['bonuses']
    stages_out = []
    for i, b in enumerate(stage):
        r = recipes.get(b['name'], {'en': b['name'], 'inputs': [], 'outputs': []})
        bo = bonuses[i] if i < len(bonuses) else {}
        stages_out.append({
            'de': b['name'], 'zh': BUILD_ZH.get(b['name'], b['name']), 'en': r['en'] or b['name'],
            'time': b['time'], 'flags': b['flags'],
            'inputs': [canon_good(x) for x in r['inputs']],
            'outputs': [canon_good(x) for x in r['outputs']],
            'bonus': {'aqua': bo.get('aqua', False), 'silo': bo.get('silo', False),
                      'taube': bo.get('taube', False), 'research': round(sum(bo.get('research') or []), 1),
                      'religion': bo.get('religion_max', 0), 'spez': bo.get('spez_max', 0)},
        })
        buildings.setdefault(b['name'], {'de': b['name'], 'zh': BUILD_ZH.get(b['name'], b['name']),
                                         'en': r['en'] or b['name'], 'inputs': [canon_good(x) for x in r['inputs']],
                                         'outputs': [canon_good(x) for x in r['outputs']]})
    final = []
    for s in reversed(stages_out):
        if s['outputs']:
            final = s['outputs']
            break
    good_en = final[0] if final else ch['name']
    good_zh = GOODS_ZH.get(good_en, good_en)
    chains.append({
        'id': cid, 'region': ch['region'], 'region_zh': REGION_ZH[ch['region']],
        'tier': tier_of(pos), 'tier_zh': TIER_ZH.get(tier_of(pos), tier_of(pos)),
        'good_de': ch['name'], 'good_en': good_en, 'good_zh': good_zh,
        'stages': stages_out,
    })

order = {'latium': 0, 'albion': 1, 'aegyptus': 2}
torder = {}
for c in chains:
    torder.setdefault(c['region'], [])
    if c['tier'] not in torder[c['region']]:
        torder[c['region']].append(c['tier'])
chains.sort(key=lambda c: (order[c['region']], torder[c['region']].index(c['tier'])))

data = {'meta': {'source': 'https://db.vitablo.de/en/guide/anno-117-warenrechner/', 'patch': '3.0 (Erwachen des Deltas)',
                 'note': '基础周期取自 vitablo 生产线计算器；配方输入输出取自同站建筑数据库'},
        'regions': [{'id': k, 'name': v, 'tiers': [{'id': t, 'name': TIER_ZH.get(t, t)} for t in torder[k]]} for k, v in
                    sorted(REGION_ZH.items(), key=lambda x: order[x[0]])],
        'buildings': buildings, 'goods': GOODS_ZH, 'chains': chains}

os.makedirs('web', exist_ok=True)
json.dump(data, open('web/data.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('chains', len(chains), 'buildings', len(buildings))
missing = sorted({c['good_en'] for c in chains if GOODS_ZH.get(c['good_en']) is None} |
                 {g for c in chains for s in c['stages'] for g in s['inputs'] + s['outputs'] if GOODS_ZH.get(g) is None})
print('untranslated goods:', missing)
bt = [b for b, v in buildings.items() if v['zh'] == b]
print('untranslated buildings:', bt)

