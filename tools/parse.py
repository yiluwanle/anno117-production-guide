# -*- coding: utf-8 -*-
import re, json, html, collections

s = open('vitablo.html', encoding='utf-8', errors='ignore').read()

# 1. 定位每个 chain 的 box 起止
starts = [(m.start(), m.group(1)) for m in re.finditer(r'<div class="box" id="a117-warenkette-([a-z0-9-]+)"', s)]
print('chains found:', len(starts))

def time_to_sec(t):
    if ':' in t:
        a, b = t.split(':')
        return int(a) * 60 + int(b)
    return None

chains = {}
for idx, (pos, cid) in enumerate(starts):
    end = starts[idx + 1][0] if idx + 1 < len(starts) else len(s)
    block = s[pos:end]
    m = re.match(r'([a-z]+)-(.+)$', cid)
    region, good = m.group(1), m.group(2)
    key = (region, good)
    if key in chains:
        continue
    # 只取 simple 区块
    sp = block.find('class="wr-simple')
    ep = block.find('class="wr-complex')
    seg = block[sp:ep] if sp != -1 and ep != -1 else block
    items = []
    # 每个 wr-item 块
    ipos = [(mm.start(), mm.group(1)) for mm in re.finditer(r'<div class="wr-item" id="a117-warenkette-' + re.escape(cid) + r'-(\d+)"', seg)]
    for j, (ip, num) in enumerate(ipos):
        ie = ipos[j + 1][0] if j + 1 < len(ipos) else len(seg)
        it = seg[ip:ie]
        tm = re.search(r'data-time="([0-9:]+)"', it)
        nm = re.search(r'data-name="([^"]+)"', it)
        if not tm or not nm:
            continue
        flags = re.findall(r'data-template="(wr-tip-[a-z-]+)"', it)
        bname = html.unescape(nm.group(1))
        items.append({
            'name': bname,
            'time': time_to_sec(tm.group(1)),
            'time_raw': tm.group(1),
            'flags': sorted(set(f.replace('wr-tip-', '') for f in flags)),
        })
    # 商品名：intro 里第一个 <p> 的文本
    gm = re.search(r'<div class="intro"><p>.*?</noscript>|<div class="intro"><p>(.*?)</p>', block, re.S)
    gname = None
    intro = re.search(r'<div class="intro"><p>(.*?)</p>', block, re.S)
    if intro:
        txt = re.sub(r'<[^>]+>', '', intro.group(1))
        gname = html.unescape(txt).strip()
    chains[key] = {'region': region, 'good_slug': good, 'good': gname, 'buildings': items}

print('unique chains:', len(chains))
by_region = collections.Counter(k[0] for k in chains)
print(by_region)
for k, v in chains.items():
    print(k[0], '|', v['good'], '|', ' -> '.join(f"{b['name']}({b['time_raw']}){'[' + ','.join(b['flags']) + ']' if b['flags'] else ''}" for b in v['buildings']))

json.dump([{'region': v['region'], 'good_slug': v['good_slug'], 'good': v['good'], 'buildings': v['buildings']} for v in chains.values()],
          open('chains.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
