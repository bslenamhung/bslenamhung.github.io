#!/usr/bin/env python3
from pathlib import Path
import re


def main():
    id_to_file = {}
    for p in Path('bai-viet').glob('*.html'):
        text = p.read_text(encoding='utf-8')
        m = re.search(r'data-article-id=["\']([^"\']+)', text, re.I)
        if m:
            id_to_file[m.group(1)] = p.name

    changed = 0
    dynamic = re.compile(r'(?:(?:https?:)?//bslenamhung\.github\.io/)?(?:\.\/)?bai-viet\.html\?id=([^"\'&<>#\s]+)', re.I)
    static_id = re.compile(r'(?<![A-Za-z0-9_-])(?:\.\/)?bai-viet/([^/?#"\'<>]+)\.html', re.I)

    for p in [x for x in Path('.').rglob('*.html') if '.git' not in x.parts]:
        text = p.read_text(encoding='utf-8')
        original = text
        base = '../' if p.parent.name == 'bai-viet' else ''

        def dynamic_repl(m):
            filename = id_to_file.get(m.group(1))
            return base + 'bai-viet/' + filename if filename else m.group(0)

        text = dynamic.sub(dynamic_repl, text)

        def static_repl(m):
            aid = m.group(1)
            filename = id_to_file.get(aid)
            if not filename:
                return m.group(0)
            return base + 'bai-viet/' + filename

        text = static_id.sub(static_repl, text)
        if text != original:
            p.write_text(text, encoding='utf-8')
            changed += 1

    print(f'Fixed article links in {changed} file(s).')


if __name__ == '__main__':
    main()
