#!/usr/bin/env python3
"""Rename generated article pages to human-readable Vietnamese slugs."""
import json, os, re, unicodedata, urllib.parse, urllib.request
from pathlib import Path
BASE_URL='https://bslenamhung.github.io'
SUPABASE_URL=os.environ.get('SUPABASE_URL','').rstrip('/')
SUPABASE_KEY=os.environ.get('SUPABASE_KEY','')
def slugify(value):
    s=unicodedata.normalize('NFKD',str(value or '').strip().lower())
    s=''.join(ch for ch in s if not unicodedata.combining(ch)).replace('đ','d')
    return re.sub(r'[^a-z0-9]+','-',s).strip('-')[:120]
def article_id_from(text):
    m=re.search(r'data-article-id=["\']([^"\']+)',text,re.I); return m.group(1) if m else ''
def title_from(text):
    m=re.search(r'<h1[^>]*>(.*?)</h1>',text,re.I|re.S)
    return re.sub(r'<[^>]+>',' ',m.group(1)).strip() if m else ''
def fetch_articles():
    if not SUPABASE_URL or not SUPABASE_KEY: return {}
    q=urllib.parse.urlencode({'id':'eq.1','select':'content'})
    req=urllib.request.Request(f'{SUPABASE_URL}/rest/v1/site_content_public?{q}',headers={'apikey':SUPABASE_KEY,'Authorization':f'Bearer {SUPABASE_KEY}','Accept':'application/json'})
    with urllib.request.urlopen(req,timeout=30) as resp: data=json.loads(resp.read().decode())
    content=(data[0].get('content') or {}) if data else {}
    return {str(a.get('id')):a for a in content.get('articles',[]) if a.get('id')}
def main():
    articles=fetch_articles(); used={}; renames=[]
    for p in Path('bai-viet').glob('*.html'):
        text=p.read_text(encoding='utf-8'); aid=article_id_from(text)
        if not aid: continue
        a=articles.get(aid,{})
        slug=slugify(a.get('slug') or title_from(text)) or aid
        if slug in used and used[slug]!=aid: slug=f'{slug}-{slugify(aid)[-12:]}'
        used[slug]=aid; target=Path('bai-viet')/f'{slug}.html'
        if p!=target: renames.append((p,target))
    moving={src for src,_ in renames}
    for src,dst in renames:
        if dst.exists() and dst not in moving: raise RuntimeError(f'Cannot rename {src} -> {dst}: destination exists')
    temps=[]
    for i,(src,dst) in enumerate(renames):
        tmp=src.with_name(f'.__article_tmp_{i}.html'); src.rename(tmp); temps.append((tmp,dst))
    for tmp,dst in temps: tmp.rename(dst)
    print(f'Pretty URL: {len(renames)} file(s) renamed.')
if __name__=='__main__': main()
