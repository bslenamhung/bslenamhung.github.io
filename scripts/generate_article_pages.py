#!/usr/bin/env python3
"""Generate static, crawlable HTML pages for published articles from Supabase.

The existing bai-viet.html?id=... URLs remain functional. New/static pages are
published at /bai-viet/<id>.html and are used as canonical URLs and sitemap URLs.
"""
import html
import json
import os
import re
import shutil
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path

def normalize_slug(value, fallback_id):
    import unicodedata
    value = (value or "").strip().lower()
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.replace("đ", "d")
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:120] or fallback_id

SUPABASE_URL = os.environ.get('SUPABASE_URL', '').rstrip('/')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')
BASE_URL = 'https://bslenamhung.github.io'
OUT_DIR = Path('bai-viet')


def esc(value):
    return html.escape(str(value or ''), quote=True)


def article_id(article):
    if article.get('id'):
        return str(article['id'])
    title = str(article.get('title') or '').strip()
    utf16 = title.encode('utf-16-le', 'surrogatepass')
    h = 2166136261
    for i in range(0, len(utf16), 2):
        code_unit = utf16[i] | (utf16[i + 1] << 8)
        h ^= code_unit
        h = (h * 16777619) & 0xffffffff
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


def safe_id(value):
    value = str(value)
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,120}', value):
        raise ValueError(f'Article ID không an toàn cho đường dẫn: {value!r}')
    return value


def fetch_content():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError('Thiếu SUPABASE_URL hoặc SUPABASE_KEY.')
    query = urllib.parse.urlencode({'id': 'eq.1', 'select': 'content'})
    url = f'{SUPABASE_URL}/rest/v1/site_content_public?{query}'
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


def date_text(article):
    raw = article.get('publishedAt') or article.get('createdAt') or article.get('created_at') or article.get('date') or ''
    if not raw:
        return '', ''
    try:
        s = str(raw).replace('Z', '+00:00')
        d = datetime.fromisoformat(s)
        return d.strftime('%d/%m/%Y'), str(raw)
    except Exception:
        return str(raw), str(raw)


def youtube_id(url):
    raw = str(url or '').strip()
    if not raw:
        return ''
    try:
        u = urllib.parse.urlparse(raw)
        host = (u.hostname or '').lower().removeprefix('www.')
        if host == 'youtu.be':
            return (u.path.strip('/').split('/')[0] if u.path.strip('/') else '')[:20]
        if host in {'youtube.com', 'm.youtube.com', 'youtube-nocookie.com'}:
            if u.path == '/watch':
                return urllib.parse.parse_qs(u.query).get('v', [''])[0][:20]
            parts = [p for p in u.path.split('/') if p]
            if parts and parts[0] in {'shorts', 'embed', 'live'}:
                return (parts[1] if len(parts) > 1 else '')[:20]
    except Exception:
        pass
    return ''


def normalize_article_text(value):
    value = re.sub(r'<[^>]*>', ' ', str(value or ''))
    value = re.sub(r'&nbsp;|&#160;', ' ', value, flags=re.I)
    value = re.sub(r'&amp;', '&', value, flags=re.I)
    return re.sub(r'\s+', ' ', value).strip().lower()


def strip_duplicate_leading_title(content, title, seo_title=''):
    """Remove an editor-inserted copy of the article title at the start of body content.

    The page template already renders the article title as its H1. Only leading blocks
    whose text exactly equals the title are removed; normal headings later in the article
    are untouched.
    """
    out = str(content or '')
    targets = {normalize_article_text(title), normalize_article_text(seo_title)} - {''}
    for _ in range(3):
        m = re.match(r'^\s*<(h[1-6]|p|div|section|article|strong|b)\b[^>]*>(.*?)</\1>\s*', out, flags=re.I | re.S)
        if not m:
            break
        if normalize_article_text(m.group(2)) in targets:
            out = out[m.end():]
        else:
            break
    return out


def linkify_article_content(value):
    """Convert bare http(s) URLs in article text to clickable links.
    Existing HTML tags/links are preserved and URLs inside code/pre/script/style
    blocks are intentionally left untouched.
    """
    text = str(value or '')
    token_re = re.compile(r'(<(?:a|script|style|code|pre|textarea)\b[^>]*>.*?</(?:a|script|style|code|pre|textarea)>|<!--.*?-->|<[^>]+>)', re.I | re.S)
    url_re = re.compile(r'https?://[^\s<>"\']+', re.I)
    trailing = '.,!?;:)]}'
    out = []
    pos = 0
    for m in token_re.finditer(text):
        if m.start() > pos:
            segment = text[pos:m.start()]
            def repl(u):
                raw = u.group(0)
                clean = raw
                suffix = ''
                while clean and clean[-1] in trailing:
                    suffix = clean[-1] + suffix
                    clean = clean[:-1]
                if not clean:
                    return raw
                href = html.escape(clean, quote=True)
                label = html.escape(clean, quote=False)
                return f'<a class="article-inline-link" href="{href}">{label}</a>{suffix}'
            segment = url_re.sub(repl, segment)
            out.append(segment)
        out.append(m.group(0))
        pos = m.end()
    if pos < len(text):
        segment = text[pos:]
        def repl(u):
            raw=u.group(0); clean=raw; suffix=''
            while clean and clean[-1] in trailing:
                suffix=clean[-1]+suffix; clean=clean[:-1]
            if not clean:return raw
            return f'<a class="article-inline-link" href="{html.escape(clean, quote=True)}">{html.escape(clean, quote=False)}</a>{suffix}'
        out.append(url_re.sub(repl,segment))
    return ''.join(out)

def clean_desc(article):
    raw = str(article.get('seoDescription') or article.get('desc') or article.get('content') or '')
    raw = re.sub(r'<[^>]+>', ' ', raw)
    raw = re.sub(r'\s+', ' ', raw).strip()
    return raw[:160]


def canonical_for(article):
    aid = safe_id(article_id(article))
    slug = normalize_slug(article.get('slug', ''), aid)
    return BASE_URL + '/bai-viet/' + urllib.parse.quote(slug, safe='_-.') + '.html'











def article_link(article):
    return canonical_for(article)


def related_articles(current, published):
    cur_spec = str(current.get('specialty') or '').strip().lower()
    others = []
    for a in published:
        if article_id(a) == article_id(current):
            continue
        score = 0
        if cur_spec and str(a.get('specialty') or '').strip().lower() == cur_spec:
            score += 100
        score += 1 if a.get('keywords') else 0
        others.append((score, str(a.get('title') or ''), a))
    others.sort(key=lambda x: (-x[0], x[1]))
    return [x[2] for x in others[:4]]


def render_article(article, published):
    aid = safe_id(article_id(article))
    title = str(article.get('seoTitle') or article.get('title') or 'Bài viết Sản Phụ khoa').strip()
    desc = clean_desc(article) or 'Kiến thức Sản Phụ khoa của ThS.BS Lê Nam Hùng tại Đông Hà, Quảng Trị.'
    canonical = canonical_for(article)
    image = str(article.get('seoImage') or article.get('image') or '').strip()
    specialty = str(article.get('specialty') or '').strip()
    content = linkify_article_content(strip_duplicate_leading_title(article.get('content') or '', article.get('title') or '', article.get('seoTitle') or ''))
    short_desc = str(article.get('desc') or '').strip()
    published_text, raw_date = date_text(article)
    video = youtube_id(article.get('videoUrl') or article.get('video') or '')

    schema = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        'headline': str(article.get('title') or title).strip(),
        'description': desc,
        'author': {'@type': 'Person', 'name': 'ThS.BS Lê Nam Hùng', 'url': f'{BASE_URL}/#about'},
        'publisher': {'@type': 'Organization', 'name': 'Phòng Khám Sản Phụ Khoa BS Hùng', 'url': BASE_URL},
        'mainEntityOfPage': {'@type': 'WebPage', '@id': canonical},
        'url': canonical,
    }
    if image:
        schema['image'] = [image]
    if specialty:
        schema['articleSection'] = specialty
    if article.get('keywords'):
        schema['keywords'] = str(article['keywords'])
    if raw_date:
        schema['datePublished'] = raw_date
    if article.get('updatedAt'):
        schema['dateModified'] = article['updatedAt']
    if video:
        schema['video'] = {
            '@type': 'VideoObject',
            'name': str(article.get('title') or 'Video bài viết'),
            'embedUrl': f'https://www.youtube-nocookie.com/embed/{video}',
        }
        if image:
            schema['video']['thumbnailUrl'] = image
        if raw_date:
            schema['video']['uploadDate'] = raw_date

    rel = related_articles(article, published)
    rel_html = ''
    if rel:
        cards = []
        for r in rel:
            cards.append(
                f'<a class="related-card" href="{esc(article_link(r))}">'
                f'<div class="related-tag">{esc(r.get("specialty") or "")}</div>'
                f'<h3>{esc(r.get("title") or "")}</h3>'
                f'<p>{esc(re.sub(r"<[^>]+>", " ", str(r.get("desc") or "")).strip()[:150])}</p>'
                f'<span>Đọc bài viết →</span></a>'
            )
        rel_html = (
            '<section class="related-articles" aria-labelledby="relatedTitle">'
            '<div class="related-head"><div><p class="article-tag">GỢI Ý ĐỌC THÊM</p>'
            '<h2 id="relatedTitle">Bài viết liên quan</h2></div>'
            f'<a class="text-link" href="{BASE_URL}/index.html#articles">Xem tất cả bài viết →</a></div>'
            f'<div class="related-grid">{"".join(cards)}</div></section>'
        )

    video_html = ''
    if video:
        video_html = (
            '<div class="article-video-wrap"><iframe '
            f'src="https://www.youtube-nocookie.com/embed/{esc(video)}" '
            f'title="{esc(title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>'
        )

    image_html = f'<img class="article-page-cover" src="{esc(image)}" alt="{esc(title)}" loading="eager">' if image else ''
    desc_html = f'<p class="article-page-desc">{esc(short_desc)}</p>' if short_desc else ''
    date_html = f'<div class="article-published-date">📅 Ngày xuất bản: <strong>{esc(published_text)}</strong></div>' if published_text else ''

    jsonld = json.dumps(schema, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    return f'''<!doctype html>
<html lang="vi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="{esc(canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{esc(canonical)}">
{f'<meta property="og:image" content="{esc(image)}">' if image else ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title)}">
<meta name="twitter:description" content="{esc(desc)}">
{f'<meta name="twitter:image" content="{esc(image)}">' if image else ''}
<script type="application/ld+json">{jsonld}</script>
<link rel="stylesheet" href="../style.css?v=68">
</head><body>
<header class="site-header"><div class="container nav-wrap">
<a class="brand" href="../index.html"><strong>BS<br>Lê Nam Hùng</strong><span>Sản Phụ khoa</span></a>
<button class="nav-toggle" id="navToggle" type="button" aria-label="Mở menu" aria-expanded="false">☰</button>
<nav id="mainNav"><a href="../index.html">Trang chủ</a><a href="../index.html#about">Về BS Lê Nam Hùng</a><a href="../index.html#specialties">Chuyên môn</a><a href="../index.html#clinic">Phòng khám</a><a href="../index.html#contact">Liên hệ</a></nav>
</div></header>
<main><section class="section"><div class="container"><article class="article-page" id="articleLiveRoot" data-article-id="{esc(aid)}">
<div class="article-tag">{esc(specialty)}</div>
<h1>{esc(str(article.get('title') or title))}</h1>
{image_html}{video_html}{desc_html}
<div class="article-full">{content}</div>
{date_html}
<p style="margin-top:32px"><a class="btn secondary" href="../index.html#articles">← Xem các bài viết khác</a></p>
{rel_html}
</article></div></section></main>
<footer class="site-footer"><div class="container"><div>© <span id="year"></span> ThS.BS Lê Nam Hùng – Sản Phụ khoa</div><div><a href="../index.html">Về trang chủ</a></div></div></footer>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../supabase-config.js?v=66"></script>
<script>
document.getElementById('year').textContent=new Date().getFullYear();
const nav=document.getElementById('mainNav'),btn=document.getElementById('navToggle');
btn?.addEventListener('click',()=>{{const open=nav?.classList.toggle('open');btn?.setAttribute('aria-expanded',String(!!open));}});
document.querySelectorAll('#mainNav a').forEach(a=>a.addEventListener('click',()=>{{nav?.classList.remove('open');btn?.setAttribute('aria-expanded','false')}}));
</script>
<script src="../site-visit.js?v=66"></script>
<script src="../static-article-live.js?v=66"></script>
</body></html>'''


def main():
    content = fetch_content()
    articles = content.get('articles') or []
    if not isinstance(articles, list):
        raise RuntimeError('Danh sách articles không hợp lệ.')
    published = [a for a in articles if isinstance(a, dict) and a.get('published') is not False]

    ids = [safe_id(article_id(a)) for a in published]
    duplicates = sorted({x for x in ids if ids.count(x) > 1})
    if duplicates:
        raise RuntimeError('Phát hiện ID bài viết trùng nhau: ' + ', '.join(duplicates))

    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for article in published:
        aid = safe_id(article_id(article))
        slug = normalize_slug(article.get('slug', ''), aid)
        (OUT_DIR / f'{slug}.html').write_text(render_article(article, published), encoding='utf-8')

    print(f'Đã tạo {len(published)} trang bài viết tĩnh trong {OUT_DIR}/.')


if __name__ == '__main__':
    main()
