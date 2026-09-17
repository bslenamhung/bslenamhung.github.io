#!/usr/bin/env python3
"""Rename generated article pages to human-readable Vietnamese slugs.

Explicit article.slug values are preserved. When slug is blank, the title is
converted to a stable ASCII slug. This runs after the normal static generator.
"""
import json
import os
import re
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

BASE_URL = 'https://bslenamhung.github.io'
SUPABASE_URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')


def slugify(value):
    s = unicodedata.normalize('NFKD', str(value or '').strip().lower())
    s = ''.join(ch for ch in s if not unicodedata.combining(ch))
    s = s.replace('đ', 'd')
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:120]


def article_id_from(text):
    m = re.search(r'data-article-id=["\']([^"\']+)', text, re.I)
    return m.group(1) if m else ''


def title_from(text):
    m = re.search(r'<h1[^>]*>(.*?)</h1>', text, re.I | re.S)
    if not m:
        return ''
    return re.sub(r'<[^>]+>', ' ', m.group(1)).strip()


def fetch_articles():
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {}
    query = urllib.parse.urlencode({'id': 'eq.1', 'select': 'content'})
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/site_content_public?{query}',
        headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Accept': 'application/json'},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode('utf-8'))
    content = (data[0].get('content') or {}) if data else {}
    return {str(a.get('id')): a for a in (content.get('articles') or []) if a.get('id')}


def main():
    articles = fetch_articles()
    used = {}
    renames = []

    for p in Path('bai-viet').glob('*.html'):
        text = p.read_text(encoding='utf-8')
        aid = article_id_from(text)
        if not aid:
            continue
        a = articles.get(aid, {})
        explicit = str(a.get('slug') or '').strip()
        slug = slugify(explicit) if explicit else slugify(title_from(text))
        if not slug:
            slug = aid
        owner = used.get(slug)
        if owner and owner != aid:
            slug = f'{slug}-{slugify(aid)[-12:]}'
        used[slug] = aid
        target = Path('bai-viet') / f'{slug}.html'
        if p != target:
            renames.append((p, target))

    # Rename in two phases so collisions never overwrite an article.
    for src, dst in renames:
        if dst.exists() and dst not in [x[0] for x in renames]:
            raise RuntimeError(f'Khong the doi ten {src} -> {dst}: file da ton tai.')
    temp = []
    for i, (src, dst) in enumerate(renames):
        tmp = src.with_name(f'.__article_tmp_{i}.html')
        src.rename(tmp)
        temp.append((tmp, dst))
    for tmp, dst in temp:
        tmp.rename(dst)

    print(f'Pretty URL: {len(renames)} file(s) renamed.')


if __name__ == '__main__':
    main()
