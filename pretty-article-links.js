(() => {
  const slugify = value => {
    let s = String(value || '').trim().toLowerCase().normalize('NFKD');
    s = [...s].filter(ch => !/\p{M}/u.test(ch)).join('').replace(/đ/g, 'd');
    return s.replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
  };
  const load = async () => {
    try {
      if (!window.supabase || !window.SUPABASE_URL) return null;
      const c = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY || window.SUPABASE_ANON_KEY);
      const r = await c.from('site_content_public').select('content').eq('id', 1).maybeSingle();
      return r.error ? null : (r.data?.content || null);
    } catch (_) { return null; }
  };
  const map = async () => {
    const data = await load();
    const out = new Map();
    for (const a of (data?.articles || [])) {
      if (!a?.id) continue;
      out.set(String(a.id), slugify(a.slug || a.title) || String(a.id));
    }
    return out;
  };
  const redirectOldPage = async () => {
    if (location.pathname.endsWith('/bai-viet.html') && location.search) {
      const id = new URLSearchParams(location.search).get('id');
      if (!id) return;
      const ids = await map();
      const slug = ids.get(id);
      if (slug) location.replace(`bai-viet/${encodeURIComponent(slug)}.html`);
    }
  };
  const rewrite = async () => {
    const links = [...document.querySelectorAll('a[href]')];
    if (!links.length) return;
    const ids = await map();
    for (const a of links) {
      const h = String(a.getAttribute('href') || '');
      const m = h.match(/^(?:\.\/)?bai-viet\/([^/?#]+)\.html$/i);
      if (m) {
        const slug = ids.get(decodeURIComponent(m[1]));
        if (slug) a.href = `bai-viet/${encodeURIComponent(slug)}.html`;
      }
    }
  };
  document.addEventListener('click', async event => {
    const a = event.target.closest?.('a[href]');
    if (!a) return;
    const m = String(a.getAttribute('href') || '').match(/^(?:\.\/)?bai-viet\.html\?id=([^&#]+)$/i);
    if (!m) return;
    event.preventDefault();
    const ids = await map();
    const slug = ids.get(decodeURIComponent(m[1]));
    location.href = slug ? `bai-viet/${encodeURIComponent(slug)}.html` : a.href;
  });
  redirectOldPage();
  rewrite();
  new MutationObserver(() => rewrite()).observe(document.documentElement, {childList: true, subtree: true});
})();
