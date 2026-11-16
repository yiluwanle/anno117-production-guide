# -*- coding: utf-8 -*-
import re, json, html, collections

s = open('vitablo.html', encoding='utf-8', errors='ignore').read()
starts = [(m.start(), m.group(1)) for m in re.finditer(r'<div class="box" id="a117-warenkette-([a-z0-9-]+)"', s)]

def to_sec(t):
    a, b = t.split(':')
    return int(a) * 60 + int(b)

out = []
seen = set()
for idx, (pos, cid) in enumerate(starts):
    end = starts[idx + 1][0] if idx + 1 < len(starts) else len(s)
    block = s[pos:end]
    m = re.match(r'([a-z]+)-(.+)$', cid)
    region, good = m.group(1), m.group(2)
    if cid in seen:
        continue
    seen.add(cid)

    intro = re.search(r'<div class="intro"><p>(.*?)</p>', block, re.S)
    gname = html.unescape(re.sub(r'<[^>]+>', '', intro.group(1))).strip() if intro else good

    # simple 区块：基础时间和建筑顺序
    sp, ep = block.find('class="wr-simple'), block.find('class="wr-complex')
    simple = block[sp:ep] if sp != -1 and ep != -1 else block
    basic = []
    ipos = [(mm.start(), mm.group(1)) for mm in re.finditer(r'<div class="wr-item" id="a117-warenkette-' + re.escape(cid) + r'-(\d+)"', simple)]
    for j, (ip, num) in enumerate(ipos):
        ie = ipos[j + 1][0] if j + 1 < len(ipos) else len(simple)
        it = simple[ip:ie]
        tm = re.search(r'data-time="([0-9:]+)"', it)
        nm = re.search(r'data-name="([^"]+)"', it)
        if not (tm and nm):
            continue
        flags = sorted(set(f.replace('wr-tip-', '') for f in re.findall(r'data-template="(wr-tip-[a-z-]+)"', it)))
        basic.append({'name': html.unescape(nm.group(1)), 'time': to_sec(tm.group(1)),
                      'raw': tm.group(1), 'flags': flags})

    # complex 区块：每栋建筑的可用加成
    complex_ = block[ep:] if ep != -1 else ''
    cpos = [(mm.start(), mm.group(1)) for mm in re.finditer(r'<div class="wr-item[^"]*" id="a117-warenkette-' + re.escape(cid) + r'-c(\d+)"', complex_)]
    bonuses = []
    for j, (ip, num) in enumerate(cpos):
        ie = cpos[j + 1][0] if j + 1 < len(cpos) else len(complex_)
        it = complex_[ip:ie]
        nm = re.search(r'data-name="([^"]+)"', it)
        name = html.unescape(nm.group(1)) if nm else ''
        skills = [float(x) for x in re.findall(r'class="wr-skill[^"]*"[^>]*data-prod="([\d.]+)"', it)]
        skills_multi = re.findall(r'class="wr-skill[^"]*"[^>]*data-multi[^>]*', it)
        spez = [float(x) for x in re.findall(r'class="wr-spez[^"]*"[^>]*data-prod="([\d.]+)"', it)]
        gods = re.findall(r'<div class="wr-gott"[^>]*data-steps="([\d,]+)"', it)
        godsteps = [int(x) for x in gods[0].split(',')] if gods else []
        bonuses.append({
            'name': name,
            'aqua': 'wr-aqua ' in it or 'class="wr-aqua' in it,
            'silo': 'class="wr-silo' in it,
            'taube': 'class="wr-taube' in it,
            'research': skills,
            'research_multi_cnt': len(skills_multi),
            'spez_max': max(spez) if spez else 0,
            'spez_all': sorted(spez, reverse=True)[:3],
            'religion_max': max(godsteps) if godsteps else 0,
        })
    out.append({'region': region, 'slug': good, 'name': gname, 'buildings': basic, 'bonuses': bonuses})

print('chains', len(out))
json.dump(out, open('data_raw.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# 汇总：每栋建筑可用的最大研究/设施
agg = {}
for c in out:
    for b, bo in zip(c['buildings'], c['bonuses']):
        k = (c['region'], b['name'])
        a = agg.setdefault(k, {'aqua': False, 'silo': False, 'taube': False, 'research': 0.0, 'religion': 0, 'spez': 0.0})
        a['aqua'] |= bo['aqua']; a['silo'] |= bo['silo']; a['taube'] |= bo['taube']
        a['research'] = max(a['research'], sum(bo['research']))
        a['religion'] = max(a['religion'], bo['religion_max'])
        a['spez'] = max(a['spez'], bo['spez_max'])
print('unique buildings', len(agg))
res = collections.Counter(v['research'] for v in agg.values())
print('research sums dist', res.most_common(10))
print('religion max dist', collections.Counter(v['religion'] for v in agg.values()).most_common(6))
for k, v in sorted(agg.items())[:15]:
    print(k, v)
