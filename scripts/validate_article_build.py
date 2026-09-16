#!/usr/bin/env python3
"""Fail the deployment if generated article pages or sitemap are inconsistent."""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

BASE = "https://bslenamhung.github.io"
ROOT = Path(__file__).resolve().parents[1]
ARTICLE_DIR = ROOT / "bai-viet"
SITEMAP = ROOT / "sitemap.xml"


def fail(message: str) -> None:
    print(f"LỖI KIỂM TRA: {message}", file=sys.stderr)
    raise SystemExit(1)


def canonical(html: str) -> str:
    m = re.search(r'<link\s+[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)', html, re.I)
    if not m:
        m = re.search(r'<link\s+[^>]*href=["\']([^"\']+)["\'][^>]*rel=["\']canonical["\']', html, re.I)
    return m.group(1).strip() if m else ""


def main() -> None:
    pages = sorted(ARTICLE_DIR.glob("*.html")) if ARTICLE_DIR.exists() else []
    if not SITEMAP.exists():
        fail("Không tìm thấy sitemap.xml.")

    try:
        tree = ET.parse(SITEMAP)
    except Exception as exc:
        fail(f"sitemap.xml không phải XML hợp lệ: {exc}")

    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    sitemap_urls = [x.text.strip() for x in tree.findall("sm:url/sm:loc", ns) if x.text]
    sitemap_set = set(sitemap_urls)

    article_urls = set()
    legacy_pages = set()
    for page in pages:
        html = page.read_text(encoding="utf-8")
        expected = f"{BASE}/bai-viet/{page.name}"
        can = canonical(html)
        if can != expected:
            fail(f"Canonical sai ở {page}: {can!r} != {expected!r}")
        if re.search(r'<meta\s+name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', html, re.I):
            fail(f"Trang bài viết bị noindex: {page}")
        if not re.search(r'<title>[^<]+</title>', html, re.I):
            fail(f"Thiếu <title>: {page}")
        if not re.search(r'<meta\s+name=["\']description["\']', html, re.I):
            fail(f"Thiếu meta description: {page}")
        if not re.search(r'<h1\b[^>]*>.*?</h1>', html, re.I | re.S):
            fail(f"Thiếu H1: {page}")
        if '"@type":"BlogPosting"' not in html:
            fail(f"Thiếu BlogPosting structured data: {page}")
        if "bai-viet.html?id=" in html:
            fail(f"Còn URL bài viết cũ trong HTML tĩnh: {page}")
        if page.stem.startswith('legacy-'):
            legacy_pages.add(expected)
        else:
            article_urls.add(expected)

    sitemap_article_urls = {u for u in sitemap_urls if "/bai-viet/" in u}
    sitemap_stable_urls = {u for u in sitemap_article_urls if "/bai-viet/legacy-" not in u}
    legacy = [u for u in sitemap_urls if "/bai-viet/legacy-" in u]
    old_dynamic = [u for u in sitemap_urls if "bai-viet.html?id=" in u]
    if legacy:
        fail("Sitemap không được chứa URL legacy: " + ", ".join(legacy))
    if old_dynamic:
        fail("Sitemap còn URL bài viết động cũ: " + ", ".join(old_dynamic))
    if sitemap_article_urls != sitemap_stable_urls:
        fail("Sitemap có URL bài viết không phải URL stable.")
    if sitemap_stable_urls != article_urls:
        missing = sorted(article_urls - sitemap_article_urls)
        extra = sorted(sitemap_article_urls - article_urls)
        if missing:
            fail("Bài viết chưa có trong sitemap: " + ", ".join(missing))
        if extra:
            fail("Sitemap chứa bài viết chưa có file tĩnh: " + ", ".join(extra))

    # Every stable sitemap article URL must map to an existing local HTML file.
    for url in sorted(sitemap_stable_urls):
        name = url.rsplit('/bai-viet/', 1)[1]
        local = ARTICLE_DIR / name
        if not local.is_file():
            fail(f"Sitemap trỏ tới file không tồn tại: {url}")

    # Public sitemap must not contain dynamic admin/search URLs.
    for url in sitemap_urls:
        p = urlparse(url)
        if p.netloc != "bslenamhung.github.io" or p.scheme != "https":
            fail(f"URL ngoài domain hoặc không HTTPS trong sitemap: {url}")
        if p.query:
            fail(f"Sitemap không được chứa query string: {url}")


    script = (ROOT / "script.js").read_text(encoding="utf-8")
    if "recordArticleView(a)" in script:
        fail("script.js còn gọi recordArticleView(a) không tồn tại.")

    legacy_template = (ROOT / "bai-viet.html").read_text(encoding="utf-8")
    if not re.search(r'<meta\s+name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', legacy_template, re.I):
        fail("bai-viet.html chưa được đánh noindex.")

    print(f"KIỂM TRA ĐẠT: {len(pages)} trang bài viết tĩnh, {len(sitemap_urls)} URL sitemap.")


if __name__ == "__main__":
    main()
