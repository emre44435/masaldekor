document.addEventListener('DOMContentLoaded', async () => {
  const groups = [...document.querySelectorAll('[data-category-grid]')];
  const config = window.MASAL_GALLERY_CONFIG || {};
  if (!groups.length || !/^https:\/\//.test(config.url || '') || !config.publishableKey) return;

  const fallbackCover = {
    dugun: 'assets/images/dugun-organizasyonu.webp',
    nisan: 'assets/images/nisan-organizasyonu.webp',
    kina: 'assets/images/kina-gecesi.webp',
    'dogum-gunu': 'assets/images/dogum-gunu.webp',
    kurumsal: 'assets/images/kurumsal-etkinlik.webp',
    konsept: 'assets/images/konsept-tasarim.webp'
  };
  const fallbackSummary = {
    dugun: 'Size özel düğün dekoru ve davet tasarımı.',
    nisan: 'Nişan töreniniz için zarif bir atmosfer.',
    kina: 'Kına gecenize özel sahne ve dekor.',
    'dogum-gunu': 'Kutlamanıza uygun konsept tasarımı.',
    kurumsal: 'Markanıza yakışan etkinlik düzeni.',
    konsept: 'Mekâna ve hikâyenize özel tasarım.',
    'arac-susleme': 'Özel gününüz için zarif ve özenli araç süslemeleri.',
    'evlilik-teklifi': 'Teklif anınıza özel dekor ve çiçek dokunuşları.',
    cicekler: 'Özel anlara eşlik eden taze çiçek tasarımları.',
    buketler: 'Sevdiklerinize özel hazırlanan buketler.',
    aranjmanlar: 'Mekâna ve kutlamaya özel çiçek aranjmanları.',
    'kiz-isteme-cikolata-cicekleri': 'Kız isteme törenine özel çikolata ve çiçek sunumları.'
  };
  const imageUrl = value => /^https:\/\//i.test(value) ? value : new URL(value, document.baseURI).href;
  const safePage = row => /^hizmet-[a-z0-9-]+\.html$/.test(row.public_page || '') ||
    /^kategori\.html\?slug=[a-z0-9-]+$/.test(row.public_page || '')
    ? row.public_page : `kategori.html?slug=${encodeURIComponent(row.slug)}`;
  const createCard = row => {
    const a = document.createElement('a');
    a.className = 'catalog-card';
    a.dataset.categoryCard = row.slug;
    a.href = safePage(row);
    const cover = row.cover_url || fallbackCover[row.slug];
    a.classList.add(cover ? 'has-photo' : 'no-photo');
    if (cover) {
      const img = document.createElement('img');
      img.className = 'catalog-photo';
      img.src = imageUrl(cover);
      img.alt = `${row.label} kategorisi`;
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
    const title = document.createElement('strong'); title.textContent = row.label;
    const description = document.createElement('span');
    description.className = 'catalog-description';
    description.textContent = row.summary || fallbackSummary[row.slug] || 'Masal Dekor ile size özel tasarım.';
    const link = document.createElement('span'); link.className = 'catalog-link';
    link.textContent = 'KATEGORİYİ İNCELE  →';
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
      const cards = rows.filter(row => row.kind === group.dataset.categoryGrid).map(createCard);
      group.replaceChildren(...cards);
      group.closest('.catalog-group').hidden = !cards.length;
    }
  } catch {
    // Keep the built-in cards if Supabase is temporarily unavailable.
    document.documentElement.dataset.catalogFallback = 'true';
  }
});
