# -*- coding: utf-8 -*-
"""并下载商品/建筑图标，压缩后存入仓库 img/ 目录"""
import json, os, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

BASE = 'https://db.vitablo.de'
OUT = '../anno117-production-guide/img'
im = json.load(open('images_raw.json', encoding='utf-8'))

goods_urls, build_urls = {}, {}
for cid, v in im.items():
    if v['good_img']:
        goods_urls[v['good_img']] = v['good_img'].rsplit('/a117-ware-', 1)[-1][:-5]
    for b in v['buildings']:
        build_urls[b['img']] = b['img'].rsplit('/a117-bauwerk-', 1)[-1][:-5]

os.makedirs(OUT + '/goods', exist_ok=True)
os.makedirs(OUT + '/buildings', exist_ok=True)


def fetch(job):
    url, dst, size = job
    if os.path.exists(dst) and os.path.getsize(dst) > 500:
        return 0
    for attempt in range(3):
        try:
            req = urllib.request.Request(BASE + url, headers={'User-Agent': 'Mozilla/5.0'})
            raw = urllib.request.urlopen(req, timeout=30).read()
            tmp = dst + '.tmp'
            open(tmp, 'wb').write(raw)
            img = Image.open(tmp).convert('RGBA')
            img.thumbnail((size, size), Image.LANCZOS)
            img.save(dst, 'WEBP', quality=86, method=6)
            os.remove(tmp)
            return os.path.getsize(dst)
        except Exception as e:
            if attempt == 2:
                print('FAIL', url, type(e).__name__, e, flush=True)
                return 0
    return 0


jobs = [(u, f'{OUT}/goods/{s}.webp', 128) for u, s in goods_urls.items()]
jobs += [(u, f'{OUT}/buildings/{s}.webp', 160) for u, s in build_urls.items()]
print('jobs', len(jobs), flush=True)

total = 0
with ThreadPoolExecutor(max_workers=16) as ex:
    for i, n in enumerate(ex.map(fetch, jobs), 1):
        total += n
        if i % 100 == 0:
            print('done', i, '/', len(jobs), flush=True)

print('total', round(total / 1048576, 2), 'MB')
print('files goods', len(os.listdir(OUT + '/goods')), 'buildings', len(os.listdir(OUT + '/buildings')))
