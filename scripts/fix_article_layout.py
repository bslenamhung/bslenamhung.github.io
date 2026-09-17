#!/usr/bin/env python3
import re
from pathlib import Path
CSS_LINK = '<link rel="stylesheet" href="../article-layout-fix.css?v=73-final">'

def fix_file(path: Path):
    text = path.read_text(encoding='utf-8')
    original = text
    if 'article-layout-fix.css' not in text:
        if '</head>' in text:
            text = text.replace('</head>', CSS_LINK + '</head>', 1)
        else:
            text = CSS_LINK + text
    elif CSS_LINK not in text:
        text = re.sub(r'<link[^>]+href=["\'][^"\']*article-layout-fix\.css[^"\']*["\'][^>]*>', CSS_LINK, text, count=1, flags=re.I)
    marker = '<div class="article-full">'
    start = text.find(marker)
    if start >= 0:
        ends = [text.find(m, start + len(marker)) for m in ['<div class="article-published-date">', '<p style="margin-top:32px">']]
        ends = [e for e in ends if e >= 0]
        if ends:
            end = min(ends)
            body = text[start + len(marker):end]
            body = re.sub(r'<h1\b([^>]*)>', r'<div class="article-subheading"\1>', body, flags=re.I)
            body = re.sub(r'</h1>', '</div>', body, flags=re.I)
            text = text[:start + len(marker)] + body + text[end:]
    if text != original:
        path.write_text(text, encoding='utf-8')
        return True
    return False

changed = sum(fix_file(p) for p in Path('bai-viet').glob('*.html'))
print(f'Article layout fixed: {changed} file(s)')
