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
  const fallbackSummary = {
    dugun: 'Size özel düğün dekoru ve davet tasarımı.',
    nisan: 'Nişan töreniniz için zarif bir atmosfer.',
    kina: 'Kına gecenize özel sahne ve dekor.',
    'dogum-gunu': 'Kutlamanıza uygun konsept tasarımı.',
    'arac-susleme': 'Özel gününüz için zarif ve özenli araç süslemeleri.',
    'evlilik-teklifi': 'Teklif anınıza özel dekor ve çiçek dokunuşları.',
    cicekler: 'Özel anlara eşlik eden taze çiçek tasarımları.',
    buketler: 'Sevdiklerinize özel hazırlanan buketler.',
    aranjmanlar: 'Mekâna ve kutlamaya özel çiçek aranjmanları.',
    'kiz-isteme-cikolata-cicekleri': 'Kız isteme törenine özel çikolata ve çiçek sunumları.'
  };
  const fixedLabels = {
    dugun: 'Düğün Organizasyonu', kina: 'Kına Gecesi', nisan: 'Nişan Organizasyonu',
    'arac-susleme': 'Araç Süsleme', 'dogum-gunu': 'Doğum Günü Organizasyonu',
    'evlilik-teklifi': 'Evlilik Teklifi', cicekler: 'Çiçekler', buketler: 'Buketler',
    aranjmanlar: 'Aranjmanlar', 'kiz-isteme-cikolata-cicekleri': 'Kız İsteme Çikolata ve Çiçekleri'
  };
  const existingSummaries = new Map([...document.querySelectorAll('[data-category-card]')].map(card => [card.dataset.categoryCard, card.querySelector('.catalog-description')?.textContent.trim()]));
  const imageUrl = value => /^https:\/\//i.test(value) ? value : new URL(value, document.baseURI).href;
  const safePage = row => /^hizmet-[a-z0-9-]+\.html$/.test(row.public_page || '') ||
    /^kategori\.html\?slug=[a-z0-9-]+$/.test(row.public_page || '')
    ? row.public_page : `kategori.html?slug=${encodeURIComponent(row.slug)}`;
  const createCard = row => {
    const label = row.label?.trim() || fixedLabels[row.slug] || row.slug;
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
      const media = document.createElement('span'); media.className = 'catalog-media';
      media.append(img); a.append(media);
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
    description.textContent = row.summary || existingSummaries.get(row.slug) || fallbackSummary[row.slug] || 'Masal Dekor ile size özel tasarım.';
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
    const response = await fetch(url, {cache: 'no-store', headers: {apikey: config.publishableKey, Accept: 'application/json'}});
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


