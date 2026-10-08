document.addEventListener('DOMContentLoaded', async () => {
  const groups = [...document.querySelectorAll('[data-category-grid]')];
  const config = window.MASAL_GALLERY_CONFIG || {};
  if (!groups.length || !/^https:\/\//.test(config.url || '') || !config.publishableKey) return;

  const fallbackCover = {
    dugun: 'assets/images/dugun-organizasyonu.webp',
    nisan: 'assets/images/nisan-organizasyonu.webp',
    kina: 'assets/images/kina-gecesi.webp',
    'dogum-gunu': 'assets/images/dogum-gunu.webp',
    'arac-susleme': 'assets/images/car-hero.webp',
    'evlilik-teklifi': 'assets/images/konsept-tasarim.webp',
    cicekler: 'assets/images/flowers/renkli-kir-cicekleri-buketi-05.webp',
    buketler: 'assets/images/flowers/pembe-lilyum-buketi-06.webp',
    aranjmanlar: 'assets/images/flowers/aycicegi-aranjmani-03.webp',
    'kiz-isteme-cikolata-cicekleri': 'assets/images/flowers/kirmizi-buket-ve-cikolata-01.webp'
  };
  const summaryFor = row => {
    const summary = (row.summary || '').trim();
    const staleOrganizationCopy = row.kind === 'cicekcilik' && /\b(nişan|düğün|kına)\b/i.test(summary) && !/\b(nişan|düğün|kına)\b/i.test(row.label || '');
    return summary && !staleOrganizationCopy ? summary : `${row.label} için Masal Dekor çalışmalarını inceleyin.`;
  };
  // A stored public_page is only safe when it belongs to this category.
  // Admins may rename or repurpose a category without changing its old URL.
  const staticPages = {
    'hizmet-dugun.html': ['dugun', 'organizasyon'],
    'hizmet-kina.html': ['kina', 'organizasyon'],
    'hizmet-nisan.html': ['nisan-2', 'organizasyon'],
    'hizmet-dogum-gunu.html': ['dogum-gunu', 'organizasyon'],
    'hizmet-arac-susleme.html': ['arac-susleme', 'organizasyon'],
    'hizmet-evlilik-teklifi.html': ['evlilik-teklifi', 'organizasyon'],
    'hizmet-cicekler.html': ['cicekler', 'cicekcilik'],
    'hizmet-buketler.html': ['buketler', 'cicekcilik'],
    'hizmet-aranjmanlar.html': ['aranjmanlar', 'cicekcilik'],
    'hizmet-kiz-isteme-cikolata-cicekleri.html': ['kiz-isteme-cikolata-cicekleri', 'cicekcilik']
  };
  const imageUrl = value => /^https:\/\//i.test(value) ? value : new URL(value, document.baseURI).href;
  const safePage = row => {
    const page = row.public_page || '';
    if (row.slug === 'nisan-2' && row.kind === 'organizasyon') return 'hizmet-nisan.html';
    const staticCategory = staticPages[page];
    if (staticCategory && staticCategory[0] === row.slug && staticCategory[1] === row.kind) return page;
    const dynamic = /^kategori\.html\?slug=([a-z0-9-]+)$/.exec(page);
    if (dynamic && dynamic[1] === row.slug) return page;
    return `kategori.html?slug=${encodeURIComponent(row.slug)}`;
  };
  const createCard = row => {
    const label = row.label || row.slug;
    const a = document.createElement('a');
    a.className = 'catalog-card';
    a.dataset.categoryCard = row.slug;
    a.href = safePage(row);
    const oldSlowCover = /\/(?:d5786964-eb8a-485a-93b2-268fa029fe8e|a5310bd7-46be-4aa1-aa54-0b5408526af8)\.png$/i.test(row.cover_url || '');
    const cover = oldSlowCover ? fallbackCover[row.slug] : row.cover_url || fallbackCover[row.slug];
    a.classList.add(cover ? 'has-photo' : 'no-photo');
    if (cover) {
      const img = document.createElement('img');
      img.className = 'catalog-photo';
      img.src = imageUrl(cover);
      img.alt = `${label} kategorisi`;
      img.width = row.cover_width || 1200;
      img.height = row.cover_height || 900;
      img.loading = 'lazy';
      img.decoding = 'async';
      a.append(img);
    } else {
      const art = document.createElement('span');
      art.className = 'catalog-art'; art.setAttribute('aria-hidden', 'true');
      a.append(art);
    }
    const shade = document.createElement('span'); shade.className = 'catalog-shade'; a.append(shade);
    const content = document.createElement('span'); content.className = 'catalog-card-content';
    const group = document.createElement('small');
    group.textContent = row.kind === 'cicekcilik' ? 'ÇİÇEKÇİLİK' : 'ORGANİZASYON';
    const title = document.createElement('strong'); title.textContent = label;
    const description = document.createElement('span');
    description.className = 'catalog-description';
    description.textContent = summaryFor(row);
    const link = document.createElement('span'); link.className = 'catalog-link';
    link.textContent = 'Kategoriyi İncele';
    content.append(group, title, description, link); a.append(content);
    return a;
  };
  try {
    const url = new URL(`${config.url.replace(/\/$/, '')}/rest/v1/gallery_categories`);
    url.searchParams.set('select', 'slug,label,public_page,display_order,kind,summary,cover_url,cover_width,cover_height,is_visible');
    url.searchParams.set('is_visible', 'eq.true');
    url.searchParams.set('order', 'display_order.asc,slug.asc');
    const response = await fetch(url, {headers: {apikey: config.publishableKey, Accept: 'application/json'}});
    if (!response.ok) throw new Error(`Categories ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Categories response');
    for (const group of groups) {
      const cards = rows.filter(row => row.kind === group.dataset.categoryGrid && !['kurumsal', 'konsept'].includes(row.slug)).map(createCard);
      group.replaceChildren(...cards);
      group.closest('.catalog-group').hidden = !cards.length;
    }
  } catch {
    // Keep the built-in cards if Supabase is temporarily unavailable.
    document.documentElement.dataset.catalogFallback = 'true';
  }
});
