#!/usr/bin/env python3
from pathlib import Path

CSS_LINK = '<link rel="stylesheet" href="../article-layout-fix.css?v=1">'


def fix_file(path: Path):
    text = path.read_text(encoding='utf-8')
    original = text
    if CSS_LINK not in text:
        text = text.replace('<link rel="stylesheet" href="../style.css?v=68">', '<link rel="stylesheet" href="../style.css?v=68">\n' + CSS_LINK, 1)
    start = text.find('<div class="article-full">')
    if start >= 0:
        end = text.find('</div>', start + len('<div class="article-full">'))
        if end >= 0:
            body = text[start:end]
            body = body.replace('<h1>', '<div class="article-subheading">').replace('</h1>', '</div>')
            text = text[:start] + body + text[end:]
    if text != original:
        path.write_text(text, encoding='utf-8')
        return True
    return False


changed = 0
for p in Path('bai-viet').glob('*.html'):
    if fix_file(p):
        changed += 1
print(f'Article layout fixed: {changed} file(s)')
