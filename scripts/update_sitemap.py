#!/usr/bin/env python3
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

SUPABASE_URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')
BASE_URL = 'https://bslenamhung.github.io'


def js_article_id(article):
    if article.get('id'):
        return str(article['id'])
    title = str(article.get('title') or '').strip()
    # Match the browser's JS articleId() FNV-1a over UTF-16 code units.
    utf16 = title.encode('utf-16-le', 'surrogatepass')
    h = 2166136261
    for i in range(0, len(utf16), 2):
        code_unit = utf16[i] | (utf16[i + 1] << 8)
        h ^= code_unit
        h = ((h * 16777619) & 0xffffffff)
    return 'legacy-' + base36(h)


def base36(n):
    chars = '0123456789abcdefghijklmnopqrstuvwxyz'
    if n == 0:
        return '0'
    out = []
    while n:
        n, r = divmod(n, 36)
        out.append(chars[r])
    return ''.join(reversed(out))


def fetch_content():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError('Thiếu SUPABASE_URL hoặc SUPABASE_KEY.')
    query = urllib.parse.urlencode({'id': 'eq.1', 'select': 'content'})
    url = f'{SUPABASE_URL}/rest/v1/site_content?{query}'
    req = urllib.request.Request(
        url,
        headers={
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Accept': 'application/json',
        },
        method='GET',
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        if resp.status != 200:
            raise RuntimeError(f'Supabase trả về HTTP {resp.status}.')
        data = json.loads(resp.read().decode('utf-8'))
    if not data:
        raise RuntimeError('Không tìm thấy site_content id=1.')
    content = data[0].get('content') or {}
    if not isinstance(content, dict):
        raise RuntimeError('Trường content không phải JSON object.')
    return content


def build_sitemap(content):
    articles = content.get('articles') or []
    if not isinstance(articles, list):
        raise RuntimeError('Danh sách articles không hợp lệ.')

    urls = [
        (BASE_URL + '/', 'weekly', '1.0'),
        (BASE_URL + '/phong-kham-san-phu-khoa.html', 'monthly', '0.9'),
    ]
    seen = set()
    for article in articles:
        if not isinstance(article, dict) or article.get('published') is False:
            continue
        article_id = js_article_id(article)
        if article_id in seen:
            continue
        seen.add(article_id)
        loc = f'{BASE_URL}/bai-viet.html?id={urllib.parse.quote(article_id, safe="")}'
        urls.append((loc, 'monthly', '0.8'))

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for loc, freq, priority in urls:
        lines.append(f'  <url><loc>{loc}</loc><changefreq>{freq}</changefreq><priority>{priority}</priority></url>')
    lines.append('</urlset>')
    return '\n'.join(lines) + '\n'


def main():
    content = fetch_content()
    xml = build_sitemap(content)
    path = Path('sitemap.xml')
    old = path.read_text(encoding='utf-8') if path.exists() else ''
    if old != xml:
        path.write_text(xml, encoding='utf-8')
        print(f'Đã cập nhật sitemap: {xml.count("<url>")} URL.')
    else:
        print('Sitemap không thay đổi.')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(f'LỖI: {exc}', file=sys.stderr)
        sys.exit(1)
