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
    dynamic = re.compile(r'(?P<prefix>(?:(?:https?:)?//bslenamhung\.github\.io/)?(?:\.\/)?)(?:bai-viet\.html)\?id=(?P<id>[^"\'&<>#\s]+)', re.I)
    static_id = re.compile(r'(?P<prefix>(?:(?:https?:)?//bslenamhung\.github\.io/)?(?:\.\/)?)(?:bai-viet)/(?P<id>[^/?#"\'<>]+)\.html', re.I)

    for p in [x for x in Path('.').rglob('*.html') if '.git' not in x.parts]:
        text = p.read_text(encoding='utf-8')
        original = text
        base = '../' if p.parent.name == 'bai-viet' else ''

        def target(prefix, filename):
            if prefix.lower().startswith('http://') or prefix.lower().startswith('https://') or prefix.startswith('//'):
                return 'https://bslenamhung.github.io/bai-viet/' + filename
            return base + 'bai-viet/' + filename

        text = dynamic.sub(lambda m: target(m.group('prefix'), id_to_file[m.group('id')]) if m.group('id') in id_to_file else m.group(0), text)
        text = static_id.sub(lambda m: target(m.group('prefix'), id_to_file[m.group('id')]) if m.group('id') in id_to_file else m.group(0), text)

        if text != original:
            p.write_text(text, encoding='utf-8')
            changed += 1

    print(f'Fixed article links in {changed} file(s).')


if __name__ == '__main__':
    main()
