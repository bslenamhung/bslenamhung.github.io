from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

HELPER = '''def normalize_slug(value, fallback_id):
    import unicodedata
    value = (value or "").strip().lower()
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.replace("đ", "d")
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:120] or fallback_id

'''


def patch_generator():
    p = ROOT / "scripts/generate_article_pages.py"
    s = p.read_text(encoding="utf-8")
    if "def normalize_slug(" not in s:
        m = re.search(r"(?m)^[A-Z_]+\s*=", s)
        s = s[:m.start()] + HELPER + s[m.start():] if m else HELPER + s
    s = re.sub(
        r"def canonical_for\(article\):\n(?:    .*\n){1,4}",
        "def canonical_for(article):\n    aid = safe_id(article_id(article))\n    slug = normalize_slug(article.get('slug', ''), aid)\n    return BASE_URL + '/bai-viet/' + urllib.parse.quote(slug, safe='_-.') + '.html'\n\n",
        s,
        count=1,
    )
    s = s.replace(
        "aid = safe_id(article_id(article))\n        (OUT_DIR / f'{aid}.html').write_text",
        "aid = safe_id(article_id(article))\n        slug = normalize_slug(article.get('slug', ''), aid)\n        (OUT_DIR / f'{slug}.html').write_text",
    )
    p.write_text(s, encoding="utf-8")


def patch_sitemap():
    p = ROOT / "scripts/update_sitemap.py"
    s = p.read_text(encoding="utf-8")
    if "def normalize_slug(" not in s:
        m = re.search(r"(?m)^[A-Z_]+\s*=", s)
        s = s[:m.start()] + HELPER + s[m.start():] if m else HELPER + s
    s = re.sub(
        r"^([ \t]*)loc = .*article_id.*$",
        r"\1slug = normalize_slug(article.get('slug', ''), article_id)\n\1loc = BASE_URL + '/bai-viet/' + urllib.parse.quote(slug, safe='_-.') + '.html'",
        s,
        count=1,
        flags=re.M,
    )
    p.write_text(s, encoding="utf-8")


def patch_admin_html():
    p = ROOT / "admin.html"
    s = p.read_text(encoding="utf-8")
    if 'id="editSlug"' not in s:
        needle = '<label class="field"><span>Tiêu đề</span><input id="editTitle"></label>'
        field = needle + '<label class="field"><span>Đường dẫn bài viết (Slug)</span><input id="editSlug" placeholder="do-ctg-trong-thai-ky" autocomplete="off"><small>Ví dụ: do-ctg-trong-thai-ky — chữ không dấu, số và dấu gạch ngang.</small></label>'
        if needle not in s:
            raise RuntimeError("Không tìm thấy ô Tiêu đề trong admin.html")
        s = s.replace(needle, field, 1)
    p.write_text(s, encoding="utf-8")


def patch_admin_js():
    p = ROOT / "admin.js"
    s = p.read_text(encoding="utf-8")
    s = s.replace('slug: (document.getElementById("article-slug")?.value || "").trim(),', '')
    s = s.replace('const a=index>=0?D.articles[index]:{title:"",', 'const a=index>=0?D.articles[index]:{title:"",slug:"",', 1)
    if 'slug:x.slug||' not in s:
        s = s.replace("seoImage:x.seoImage||''}));", "seoImage:x.seoImage||'',slug:x.slug||''}));", 1)
    if '$("editSlug").value=a.slug||""' not in s:
        s = s.replace('$("editTitle").value=a.title||"";', '$("editTitle").value=a.title||""; $("editSlug").value=a.slug||"";', 1)
    if 'const slug=($("editSlug")?.value||"").trim();' not in s:
        s = s.replace('const obj={id:current?.id||', 'const slug=($("editSlug")?.value||"").trim();\n   const obj={id:current?.id||', 1)
    s = s.replace('title,specialty:', 'title,slug,specialty:', 1)
    p.write_text(s, encoding="utf-8")


if __name__ == "__main__":
    patch_generator()
    patch_sitemap()
    patch_admin_html()
    patch_admin_js()
    print("V71 slug patch: OK")
