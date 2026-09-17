#!/usr/bin/env python3
from pathlib import Path
import re


def main():
    # Build article-id -> current static filename from generated article pages.
    id_to_file = {}
    for p in Path('bai-viet').glob('*.html'):
        text = p.read_text(encoding='utf-8')
        m = re.search(r'data-article-id=["\']([^"\']+)', text, re.I)
        if m:
            id_to_file[m.group(1)] = p.name

    changed = 0
    dynamic = re.compile(
        r'(?:(?:https?:)?//bslenamhung\.github\.io/)?(?:\./)?bai-viet\.html\?id=([^"\'&<>#\s]+)',
        re.I,
    )

    paths = list(Path('.').glob('*.html')) + list(Path('.').glob('**/*.html'))
    seen = set()
    for p in paths:
        if p in seen or '.git' in p.parts:
            continue
        seen.add(p)
        text = p.read_text(encoding='utf-8')
        original = text
        base = '../' if p.parent.name == 'bai-viet' else ''

        def repl(m):
            filename = id_to_file.get(m.group(1))
            if not filename:
                return m.group(0)
            return base + 'bai-viet/' + filename

        text = dynamic.sub(repl, text)
        if text != original:
            p.write_text(text, encoding='utf-8')
            changed += 1

    print(f'Fixed dynamic article links in {changed} file(s).')


if __name__ == '__main__':
    main()
