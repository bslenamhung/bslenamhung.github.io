#!/usr/bin/env python3
"""Ensure every published Supabase article has a static pretty-URL page."""
from pathlib import Path
import os
import re
import sys

# Use the same public publishable key bundled with the frontend when the Actions secret is absent.
if not os.environ.get('SUPABASE_KEY'):
    cfg = Path(__file__).resolve().parents[1] / 'supabase-config.js'
    if cfg.exists():
        text = cfg.read_text(encoding='utf-8')
        m = re.search(r"SUPABASE_(?:ANON_KEY|PUBLISHABLE_KEY)\s*=\s*['\"]([^'\"]+)['\"]", text)
        if m:
            os.environ['SUPABASE_KEY'] = m.group(1)

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_article_pages import fetch_content, normalize_slug, render_article, OUT_DIR

def main():
    content = fetch_content()
    articles = [a for a in (content.get("articles") or [])
                if isinstance(a, dict) and a.get("published") is not False]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    created = 0
    for article in articles:
        slug = normalize_slug(article.get("slug") or article.get("title") or "",
                              str(article.get("id") or "article"))
        path = OUT_DIR / f"{slug}.html"
        if not path.exists():
            path.write_text(render_article(article, articles), encoding="utf-8")
            created += 1
    print(f"Da dam bao {len(articles)} bai viet; tao them {created} trang tinh.")

if __name__ == "__main__":
    main()
