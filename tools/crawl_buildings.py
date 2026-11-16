# -*- coding: utf-8 -*-
import json, re, html, os, urllib.request, concurrent.futures

urls = json.load(open('building_urls.json', encoding='utf-8'))
os.makedirs('bpages', exist_ok=True)
BASE = 'https://db.vitablo.de'

def fetch(item):
    name, path = item
    fn = 'bpages/' + re.sub(r'[^\w\-]', '_', name) + '.html'
    if os.path.exists(fn) and os.path.getsize(fn) > 10000:
        return name, fn
    try:
        req = urllib.request.Request(BASE + path, headers={'User-Agent': 'Mozilla/5.0'})
        data = urllib.request.urlopen(req, timeout=45).read()
        open(fn, 'wb').write(data)
        return name, fn
    except Exception as e:
        return name, 'ERR ' + str(e)

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
    res = list(ex.map(fetch, urls.items()))
bad = [r for r in res if r[1].startswith('ERR')]
print('done', len(res), 'errors', len(bad), bad[:5])

def clean(s):
    t = re.sub(r'<script.*?</script>|<style.*?</style>', '', s, flags=re.S)
    t = re.sub(r'<[^>]+>', '|', t)
    t = html.unescape(re.sub(r'\|{2,}', '|', t))
    return t

out = {}
for name, fn in res:
    if fn.startswith('ERR'):
        continue
    s = clean(open(fn, encoding='utf-8', errors='ignore').read())
    inputs, outputs, rec = [], [], None
    m = re.search(r'Input goods of the building[^|]*\|([^|]*)\|(?:[^|]*\|){0,2}\s*The building\s*\|?([^|.]*?)\|?\s*requires the goods?\s*(.{0,400}?)(?:, which belongs)', s, re.S)
    if m:
        seg = m.group(3)
        inputs = [x.strip() for x in re.findall(r'\|([^|]{2,40})\|?', seg) if x.strip() and not x.strip().lower().startswith('which')]
        inputs = [x for x in inputs if x not in ('and', 'the', 'good', 'goods', '.')]
    m2 = re.search(r'Output goods of the building[^|]*\|([^|]*)\|(?:[^|]*\|){0,4}\s*The building\s*\|?([^|.]*?)\|?\s*produces the goods?\s*\|?([^|]{2,40})', s, re.S)
    if m2:
        outputs = [m2.group(3).strip()]
    m3 = re.search(r'every\s*\|?(\d+:\d\d)', s)
    if m3:
        rec = m3.group(1)
    out[name] = {'inputs': inputs, 'outputs': outputs, 'time': rec}

json.dump(out, open('building_recipes.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for k in ['Bäckerei', 'Rüstungsschmied', 'Kornmühle', 'Gerberei', 'Weizenhof', 'Sülzsieder']:
    print(k, out.get(k))
