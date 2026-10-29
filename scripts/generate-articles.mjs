import fs from "node:fs/promises";
const BASE = "https://bslenamhung.github.io";
const DEFAULT_SHARE_IMAGE = BASE + "/theo-doi-thai-ky/clinic-logo-bs-hung.jpg";
function absoluteImage(v){const raw=String(v??"").trim();if(!raw)return DEFAULT_SHARE_IMAGE;try{return new URL(raw,BASE+"/").href;}catch{return DEFAULT_SHARE_IMAGE;}}
function esc(v=""){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function txt(v=""){return String(v??"").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim();}
function slugify(a){const raw=String(a?.slug||a?.title||"").trim();const s=raw.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,120);return s||String(a?.id||"article").toLowerCase().replace(/[^a-z0-9-]+/g,"-");}
function date(v){if(!v)return "";const d=new Date(v);return Number.isNaN(d.getTime())?"":d.toISOString();}
function jsonHtml(v){return JSON.stringify(v).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026");}
function render(a,all){
 const slug=slugify(a),url=BASE+"/bai-viet/"+encodeURIComponent(slug)+".html";
 const title=txt(a.seoTitle||a.title||"Bài viết Sản Phụ khoa");
 const desc=txt(a.seoDescription||a.desc||a.content||"Kiến thức Sản Phụ khoa từ BS Lê Nam Hùng.").slice(0,160);
 const image=absoluteImage(a.seoImage||a.image),spec=txt(a.specialty||"Sản Phụ khoa");
 const published=date(a.publishedAt||a.createdAt||a.created_at),modified=date(a.updatedAt||a.updated_at||published);
 const schema={"@context":"https://schema.org","@type":"BlogPosting",headline:txt(a.title||title),description:desc,author:{"@type":"Person",name:"ThS.BSNT Lê Nam Hùng",url:BASE+"/bac-si-san-phu-khoa-quang-tri.html"},publisher:{"@type":"Organization",name:"Phòng khám chuyên khoa Phụ sản BS Hùng",url:BASE+"/"},mainEntityOfPage:{"@type":"WebPage","@id":url},url:url,inLanguage:"vi-VN",articleSection:spec};
 if(image)schema.image=[image];if(a.keywords)schema.keywords=String(a.keywords);if(published)schema.datePublished=published;if(modified)schema.dateModified=modified;
 const related=all.filter(x=>x!==a).sort((x,y)=>(String(y.specialty||"")===spec?1:0)-(String(x.specialty||"")===spec?1:0)).slice(0,4).map(x=>{
  const href="./"+encodeURIComponent(slugify(x))+".html",im=String(x.image||x.seoImage||"").trim();
  return '<a class="related-card" href="'+href+'">'+(im?'<img class="related-card-image" src="'+esc(im)+'" alt="'+esc(x.title||"")+'" loading="lazy" decoding="async">':"")+'<div class="related-tag">'+esc(x.specialty||"")+'</div><h3>'+esc(x.title||"")+'</h3><p>'+esc(txt(x.desc||"").slice(0,150))+'</p><span>Đọc bài viết →</span></a>';
 }).join("");
 const cover=image?'<img class="article-page-cover" src="'+esc(image)+'" alt="'+esc(a.title||title)+'" loading="eager" decoding="async">':"";
 const body=String(a.content||"").trim()||"<p>Nội dung bài viết đang được cập nhật.</p>";
 const dateHtml=published?'<div class="article-published-date">📅 Ngày xuất bản: <strong>'+new Intl.DateTimeFormat("vi-VN",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(published))+"</strong></div>":"";
 return '<!doctype html>\n<!-- Generated from published Supabase content. Do not edit manually. -->\n<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>'+esc(title)+'</title><meta name="description" content="'+esc(desc)+'"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="'+url+'">'+
 '<meta property="og:type" content="article"><meta property="og:locale" content="vi_VN"><meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(desc)+'"><meta property="og:url" content="'+url+'">'+'<meta property="og:image" content="'+esc(image)+'"><meta property="og:image:secure_url" content="'+esc(image)+'"><meta property="og:image:alt" content="'+esc(title)+'"><meta property="og:site_name" content="BS Lê Nam Hùng | Sản Phụ khoa">'+
 '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="'+esc(title)+'"><meta name="twitter:description" content="'+esc(desc)+'"><meta name="twitter:image" content="'+esc(image)+'">'+
 '<script type="application/ld+json">'+jsonHtml(schema)+'</script><link rel="stylesheet" href="../style.css?v=78"><link rel="stylesheet" href="../seo-local.css?v=3"></head><body>'+
 '<header class="site-header"><div class="container nav-wrap"><a class="brand" href="../index.html"><strong>BS<br>Lê Nam Hùng</strong><span>Sản Phụ khoa</span></a><button class="nav-toggle" id="navToggle" type="button" aria-label="Mở menu" aria-expanded="false">☰</button><nav id="mainNav"><a href="../index.html">Trang chủ</a><a href="../index.html#about">Về BS Lê Nam Hùng</a><a href="../index.html#specialties">Chuyên môn</a><a href="../index.html#clinic">Phòng khám</a><a href="../index.html#contact">Liên hệ</a></nav></div></header>'+
 '<main><section class="section"><div class="container"><nav class="article-breadcrumb" aria-label="Breadcrumb"><a href="../index.html">Trang chủ</a><span aria-hidden="true">›</span><a href="../index.html#articles">Bài viết</a><span aria-hidden="true">›</span><span>'+esc(spec)+'</span></nav>'+
 '<article class="article-page"><div class="article-tag">'+esc(spec)+'</div><h1>'+esc(a.title||title)+'</h1>'+cover+'<p class="article-page-desc">'+esc(txt(a.desc||""))+'</p><div class="article-full">'+body+'</div>'+dateHtml+
 '<p style="margin-top:32px"><a class="btn secondary" href="../index.html#articles">← Xem các bài viết khác</a></p>'+
 (related?'<section class="related-articles" aria-labelledby="relatedTitle"><div class="related-head"><div><p class="article-tag">GỢI Ý ĐỌC THÊM</p><h2 id="relatedTitle">Bài viết liên quan</h2></div><a class="text-link" href="../index.html#articles">Xem tất cả bài viết →</a></div><div class="related-grid">'+related+'</div></section>':"")+
 '</article></div></section></main><footer><div class="container"><a href="../index.html">Phòng khám chuyên khoa Phụ sản BS Hùng</a></div></footer><script>document.getElementById("navToggle")?.addEventListener("click",()=>{const n=document.getElementById("mainNav"),b=document.getElementById("navToggle");const o=n?.classList.toggle("open");b?.setAttribute("aria-expanded",String(!!o));});</script></body></html>';
}
function xmlEsc(v){return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");}
const config=await fs.readFile("supabase-config.js","utf8");
const url=config.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/)?.[1];
const key=config.match(/SUPABASE_(?:PUBLISHABLE_KEY|ANON_KEY)\s*=\s*['"]([^'"]+)['"]/)?.[1];
if(!url||!key)throw new Error("Cannot read public Supabase URL/key from supabase-config.js");
const response=await fetch(url.replace(/\/$/,"")+"/rest/v1/site_content_public?select=content&id=eq.1",{headers:{apikey:key,Authorization:"Bearer "+key,Accept:"application/json"}});
if(!response.ok)throw new Error("Supabase public content fetch failed: HTTP "+response.status);
const rows=await response.json(),content=Array.isArray(rows)?rows[0]?.content:rows?.content;
if(!content||!Array.isArray(content.articles))throw new Error("No public article list; refusing to overwrite sitemap/pages");
const articles=content.articles.filter(a=>a&&a.published!==false&&String(a.title||"").trim());
const slugs=new Set();
for(const a of articles){const s=slugify(a);if(slugs.has(s))throw new Error('Duplicate article slug "'+s+'"; refusing to overwrite pages');slugs.add(s);}
if(!articles.length)throw new Error("No published articles returned; refusing to overwrite sitemap/pages");
await fs.mkdir("bai-viet",{recursive:true});
for(const a of articles)await fs.writeFile("bai-viet/"+slugify(a)+".html",render(a,articles),"utf8");
const old=await fs.readFile("sitemap.xml","utf8").catch(()=> "");
const statics=[...old.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1].replace(/&amp;/g,"&")).filter(u=>!u.startsWith(BASE+"/bai-viet/"));
const unique=[...new Set(statics)],articleUrls=articles.map(a=>({url:BASE+"/bai-viet/"+encodeURIComponent(slugify(a))+".html",modified:date(a.updatedAt||a.updated_at||a.publishedAt||a.createdAt)}));
const entries=[...unique.map(u=>'  <url><loc>'+xmlEsc(u)+'</loc></url>'),...articleUrls.map(a=>'  <url><loc>'+xmlEsc(a.url)+'</loc>'+(a.modified?"<lastmod>"+a.modified+"</lastmod>":"")+'<changefreq>monthly</changefreq><priority>0.8</priority></url>')];
await fs.writeFile("sitemap.xml",'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+entries.join("\n")+"\n</urlset>\n","utf8");
await fs.writeFile("sitemap.txt",[...unique,...articleUrls.map(a=>a.url)].join("\n")+"\n","utf8");
console.log("Generated "+articles.length+" published article pages and refreshed sitemap.xml/sitemap.txt.");
