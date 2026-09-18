#!/usr/bin/env python3
"""Create fallback static pages for published articles missing from /bai-viet."""
from pathlib import Path
import html, json, os, re, unicodedata, urllib.parse, urllib.request

BASE_URL = "https://bslenamhung.github.io"
ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "bai-viet"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")

def key_from_config():
    if os.environ.get("SUPABASE_KEY"):
        return os.environ["SUPABASE_KEY"]
    cfg = ROOT / "supabase-config.js"
    text = cfg.read_text(encoding="utf-8") if cfg.exists() else ""
    m = re.search(r"SUPABASE_(?:ANON_KEY|PUBLISHABLE_KEY)\s*=\s*['\"]([^'\"]+)['\"]", text)
    return m.group(1) if m else ""

def slugify(value, fallback):
    value = unicodedata.normalize("NFKD", str(value or "").strip().lower())
    value = "".join(ch for ch in value if not unicodedata.combining(ch)).replace("đ","d")
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:120] or fallback

def esc(v):
    return html.escape(str(v or ""), quote=True)

def fetch_articles():
    key = key_from_config()
    if not SUPABASE_URL or not key:
        raise RuntimeError("Khong co SUPABASE_URL/SUPABASE_KEY.")
    query = urllib.parse.urlencode({"id":"eq.1","select":"content"})
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/site_content_public?{query}",
        headers={"apikey":key,"Authorization":f"Bearer {key}","Accept":"application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        rows = json.loads(resp.read().decode("utf-8"))
    return (rows[0].get("content") or {}).get("articles") or []

def render(a, all_articles):
    title = a.get("title") or "Bài viết"
    desc = a.get("seoDescription") or a.get("desc") or ""
    image = a.get("seoImage") or a.get("image") or ""
    slug = slugify(a.get("slug") or title, str(a.get("id") or "article"))
    url = f"{BASE_URL}/bai-viet/{urllib.parse.quote(slug, safe='-_.')}.html"
    keywords = a.get("keywords") or ""
    content = a.get("content") or f"<p>{esc(desc)}</p>"
    schema = {
        "@context":"https://schema.org","@type":"Article","headline":title,
        "description":desc,"url":url,"mainEntityOfPage":{"@type":"WebPage","@id":url},
        "author":{"@type":"Person","name":"Ths.BSNT Lê Nam Hùng"},
        "publisher":{"@type":"Organization","name":"Phòng khám chuyên khoa Phụ sản BS Hùng"}
    }
    if image: schema["image"]=[image]
    return f"""<!doctype html>
<html lang="vi"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(a.get("seoTitle") or title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{esc(url)}">
<link rel="stylesheet" href="../style.css">
{f'<meta property="og:image" content="{esc(image)}">' if image else ''}
<script type="application/ld+json">{json.dumps(schema,ensure_ascii=False)}</script>
</head><body>
<main class="article-page" style="max-width:900px;margin:0 auto;padding:24px 18px">
<nav><a href="../">← Trang chủ</a></nav>
<article>
<div class="article-breadcrumb"><a href="../">Trang chủ</a> / Bài viết</div>
<h1>{esc(title)}</h1>
{f'<img src="{esc(image)}" alt="{esc(title)}" loading="eager" style="width:100%;max-height:520px;object-fit:cover;border-radius:14px">' if image else ''}
<div class="article-content">{content}</div>
</article>
</main>
</body></html>"""

def main():
    articles = [a for a in fetch_articles() if isinstance(a,dict) and a.get("published") is not False]
    OUT_DIR.mkdir(parents=True,exist_ok=True)
    created=0
    for a in articles:
        slug=slugify(a.get("slug") or a.get("title"),str(a.get("id") or "article"))
        path=OUT_DIR/f"{slug}.html"
        if not path.exists():
            path.write_text(render(a,articles),encoding="utf-8")
            created+=1
    print(f"Da kiem tra {len(articles)} bai; tao {created} trang fallback.")

if __name__=="__main__":
    main()
