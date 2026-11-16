# -*- coding: utf-8 -*-
"""从 vitablo 计算器页面提取每条产线的商品图标 + 每栋建筑的图标 URL"""
import re, json

page = open('vitablo.html', encoding='utf-8', errors='ignore').read()

# 每个产线 box 的起止
boxes = [(m.start(), m.group(1)) for m in re.finditer(r'<div class="box" id="a117-warenkette-([a-z0-9-]+)"', page)]
boxes.append((len(page), None))

out = {}
for i in range(len(boxes) - 1):
    start, cid = boxes[i]
    end = boxes[i + 1][0]
    seg = page[start:end]

    # 商品图标：intro 里 alt=商品名 的 img
    good_img = None
    m = re.search(r'<div class="intro">.*?<img[^>]*alt="([^"]*)"[^>]*data-lazy-src="([^"]+)"', seg, re.S)
    if m:
        good_img = m.group(2)

    # 建筑：按 wr-item 顺序取 data-name + 建筑图
    items = []
    marks = [(m.start(), m.group(1)) for m in
             re.finditer(r'<div class="wr-item[^"]*" id="a117-warenkette-' + re.escape(cid) + r'-c(\d+)"', seg)]
    for j, (pos, _num) in enumerate(marks):
        nxt = marks[j + 1][0] if j + 1 < len(marks) else pos + 6000
        blk = seg[pos:nxt]
        name = re.search(r'data-name="([^"]+)"', blk)
        img = re.search(r'data-lazy-src="(/wp-content/uploads/a117-bauwerk-[^"]+)"', blk)
        items.append({'de': name.group(1) if name else '', 'img': img.group(1) if img else ''})

    out[cid] = {'good_img': good_img, 'buildings': items}

json.dump(out, open('images_raw.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('chains', len(out), 'with good img', sum(1 for v in out.values() if v['good_img']))
print('buildings total', sum(len(v['buildings']) for v in out.values()))
nophoto = [(k, b['de']) for k, v in out.items() for b in v['buildings'] if not b['img']]
print('buildings without img', len(nophoto), nophoto[:5])

for k in ['latium-brot', 'latium-ruestung', 'aegyptus-kamele']:
    if k in out:
        print(k, out[k]['good_img'])
        for b in out[k]['buildings']:
            print('   ', b['de'], b['img'])
