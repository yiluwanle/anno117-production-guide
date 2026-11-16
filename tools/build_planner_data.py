# -*- coding: utf-8 -*-
"""把建筑劳动力 / 占地 / 维护费、住宅、总督府等数据并入 data.json 与 data.js。

输入：data/data.json、_research/buildings_meta.json、_research/residences.json
输出：data/data.json、data.js（window.ANNO_DATA）
"""
import os, json

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
RES = os.path.join(os.path.dirname(REPO), '_research')

WCLASS = {
    'Plebeians': '平民', 'Liberti': '自由民', 'Eques': '骑士', 'Equites': '骑士',
    'Patricians': '元老', 'Waders': '涉水者', 'Smiths': '铁匠', 'Aldermen': '长者',
    'Mercators': '商贾', 'Nobles': '贵族', 'Threshers': '拾穗者', 'Potter': '陶工',
    'Chanters': '祭司', 'Scribes': '书吏', 'Gymnasiarchs': '体育官',
    # 住宅页用的是单数形式
    'Plebeian': '平民', 'Libertus': '自由民', 'Patrician': '元老', 'Wader': '涉水者',
    'Smith': '铁匠', 'Alderman': '长者', 'Mercator': '商贾', 'Noble': '贵族',
    'Thresher': '拾穗者', 'Potter': '陶工', 'Chanter': '祭司', 'Scribe': '书吏',
    'Gymnasiarch': '体育官',
}

RES_ZH = [
    ('plebeian-residence', '平民住宅', 'Plebeian Residence', 'latium'),
    ('libertus-residence', '自由民住宅', 'Libertus Residence', 'latium'),
    ('eques-residence', '骑士住宅', 'Eques Residence', 'latium'),
    ('patrician-residence', '元老住宅', 'Patrician Residence', 'latium'),
    ('wader-residence', '涉水者住宅', 'Wader Residence', 'albion'),
    ('smith-residence', '铁匠住宅', 'Smith Residence', 'albion'),
    ('alderman-residence', '长者住宅', 'Alderman Residence', 'albion'),
    ('mercator-residence', '商贾住宅', 'Mercator Residence', 'albion'),
    ('noble-residence', '贵族住宅', 'Noble Residence', 'albion'),
    ('thresher-residence', '拾穗者住宅', 'Thresher Residence', 'aegyptus'),
    ('potter-residence', '陶工住宅', 'Potter Residence', 'aegyptus'),
    ('chanter-residence', '祭司住宅', 'Chanter Residence', 'aegyptus'),
    ('scribe-residence', '书吏住宅', 'Scribe Residence', 'aegyptus'),
    ('gymnasiarch-residence', '体育官住宅', 'Gymnasiarch Residence', 'aegyptus'),
]


def main():
    d = json.load(open(os.path.join(REPO, 'data', 'data.json'), encoding='utf-8'))
    meta = json.load(open(os.path.join(RES, 'buildings_meta.json'), encoding='utf-8'))
    res = json.load(open(os.path.join(RES, 'residences.json'), encoding='utf-8'))

    hit = 0
    for de, b in d['buildings'].items():
        m = meta.get(de)
        if not m:
            continue
        hit += 1
        b['workers'] = m['workers']
        b['wclass'] = m['wclass']
        b['wclass_zh'] = WCLASS.get(m['wclass'], m['wclass'])
        b['size'] = m['size']
        b['denari'] = m['denarii']
        b['cost'] = m['cost']
        b['fx'] = m['effects']
        b['tier'] = m['tier']
    print('merged buildings', hit, '/', len(d['buildings']))

    out = []
    for slug, zh, en, region in RES_ZH:
        r = res.get(slug, {})
        out.append({
            'id': slug, 'zh': zh, 'en': en, 'region': region,
            'pop': r.get('pop', 0), 'wf': r.get('wforce', 0),
            'wclass': r.get('wclass', ''), 'wclass_zh': WCLASS.get(r.get('wclass', ''), r.get('wclass', '')),
            'size': [3, 3], 'needs': r.get('needs', 0),
        })
    d['residences'] = out
    d['wclass_zh'] = WCLASS
    d['governor'] = {
        'zh': '总督府', 'en': 'Governor Villa', 'size': [9, 11],
        'radius': 36, 'street': 40, 'denari': -50, 'hp': 6500,
        'cost': '1,000 第纳里 + 25 木材 + 5 瓦片（各地材料略有差异）',
        'note': '总督居所与全岛声望、防务中心，可接待专家并享用其加成；影响所有建筑',
    }

    json.dump(d, open(os.path.join(REPO, 'data', 'data.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    js = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(REPO, 'data.js'), 'w', encoding='utf-8').write('window.ANNO_DATA=' + js + ';\n')
    print('data.js', len(js), 'bytes')


if __name__ == '__main__':
    main()
