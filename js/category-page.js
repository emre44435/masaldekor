document.addEventListener('DOMContentLoaded', async () => {
  const config = window.MASAL_GALLERY_CONFIG || {};
  const gallery = document.querySelector('#dynamic-gallery');
  if (!gallery) return;
  const slug = new URLSearchParams(location.search).get('slug') || '';
  if (slug === 'nisan-2') { location.replace('hizmet-nisan.html'); return; }
  if (['kurumsal', 'konsept'].includes(slug)) { location.replace('hizmetler.html'); return; }
  const showError = text => {
    document.querySelector('#dynamic-title').textContent = 'Kategori bulunamadı';
    document.querySelector('#dynamic-summary').textContent = text;
    document.querySelector('#dynamic-offer').hidden = true;
    gallery.replaceChildren();
  };
  if (!/^[a-z0-9-]{2,80}$/.test(slug)) { showError('Lütfen kategoriler sayfasından bir seçim yapın.'); return; }
  if (!/^https:\/\//.test(config.url || '') || !config.publishableKey) {
    showError('Kategori şu anda yüklenemiyor. Lütfen daha sonra tekrar deneyin.'); return;
  }
  const headers = {apikey: config.publishableKey, Accept: 'application/json'};
  const endpoint = config.url.replace(/\/$/, '') + '/rest/v1/';
  const assetUrl = value => /^https:\/\//i.test(value) ? value : new URL(value, document.baseURI).href;
  try {
    const categoryUrl = new URL(endpoint + 'gallery_categories');
    categoryUrl.searchParams.set('select', 'slug,label,kind,summary,cover_url,is_visible');
    categoryUrl.searchParams.set('slug', `eq.${slug}`);
    const categoryResponse = await fetch(categoryUrl, {headers});
    if (!categoryResponse.ok) throw new Error(`Category ${categoryResponse.status}`);
    const category = (await categoryResponse.json())[0];
    if (!category?.is_visible) { showError('Bu kategori artık yayında değil.'); return; }
    document.querySelector('meta[name="robots"]')?.setAttribute('content', 'index,follow');
    const staleOrganizationCopy = category.kind === 'cicekcilik' && /\b(nişan|düğün|kına)\b/i.test(category.summary || '') && !/\b(nişan|düğün|kına)\b/i.test(category.label || '');
    const summary = !staleOrganizationCopy && category.summary?.trim() || `${category.label} için Masal Dekor çalışmalarını inceleyin.`;
    document.body.classList.add(category.kind === 'cicekcilik' ? 'dynamic-flower' : 'dynamic-organization');
    if (category.kind !== 'cicekcilik' && category.cover_url) {
      document.querySelector('.dynamic-category-hero').style.backgroundImage = `linear-gradient(90deg,rgba(8,20,15,.86),rgba(8,20,15,.38) 62%,rgba(8,20,15,.1)),url("${assetUrl(category.cover_url)}")`;
    }
    document.querySelector('#dynamic-title').textContent = category.label;
    document.querySelector('#dynamic-breadcrumb').textContent = category.label;
    document.querySelector('#dynamic-kind').textContent = category.kind === 'cicekcilik' ? 'MASAL DEKOR / ÇİÇEKÇİLİK / ' + category.label : 'MASAL DEKOR / ORGANİZASYON / ' + category.label;
    document.querySelector('#dynamic-summary').textContent = summary;
    document.querySelector('#dynamic-offer').href = 'https://wa.me/905304476344?text=' + encodeURIComponent(`Merhaba Masal Dekor, ${category.label} kategorisi hakkında bilgi almak istiyorum. Sayfa: ${location.href}`);
    document.title = `${category.label} | Masal Dekor Darende`;
    const description = `${category.label}: ${summary}`.slice(0, 160);
    document.querySelector('meta[name="description"]').content = description;
    const canonical = `https://masaldekordarende.com/kategori.html?slug=${slug}`;
    document.querySelector('link[rel="canonical"]').href = canonical;
    document.querySelector('meta[property="og:title"]').content = document.title;
    document.querySelector('meta[property="og:description"]').content = description;
    document.querySelector('meta[property="og:url"]').content = canonical;
    document.querySelector('.dynamic-category-gallery .catalog-group-heading h2').textContent = category.kind === 'cicekcilik' ? 'Çiçek koleksiyonu' : `${category.label} fotoğrafları`;

    const photoUrl = new URL(endpoint + 'gallery_photos');
    photoUrl.searchParams.set('select', 'id,image_url,alt_text,item_title,item_description,same_day_available,image_width,image_height');
    photoUrl.searchParams.set('category', `eq.${slug}`);
    photoUrl.searchParams.set('order', 'sort_order.asc,created_at.asc,id.asc');
    const photoResponse = await fetch(photoUrl, {headers});
    if (!photoResponse.ok) throw new Error(`Gallery ${photoResponse.status}`);
    const rows = await photoResponse.json();
    if (!Array.isArray(rows)) throw new Error('Gallery response');
    if (!rows.length) {
      const empty = document.createElement('p'); empty.className = 'gallery-empty';
      empty.textContent = 'Bu kategoriye ait fotoğraflar yakında eklenecek.';
      gallery.replaceChildren(empty); return;
    }
    gallery.classList.toggle('flower-product-grid', category.kind === 'cicekcilik');
    const cards = rows.filter(row => {
      const curated = window.MASAL_PRODUCT_DATA?.[row.id];
      return !(curated?.duplicate && curated.source === row.image_url);
    }).map((row, index) => {
      if (category.kind === 'cicekcilik' && window.MASAL_PRODUCT_CARD) {
        return window.MASAL_PRODUCT_CARD(row, category.label, assetUrl);
      }
      const title = row.item_title || row.alt_text || `${category.label} fotoğrafı`;
      const button = document.createElement('button');
      button.className = 'gallery-item dynamic-product'; button.type = 'button';
      button.dataset.src = assetUrl(row.image_url);
      button.dataset.caption = title;
      button.setAttribute('aria-label', `${index + 1}. görseli büyüt: ${title}`);
      const img = document.createElement('img'); img.src = button.dataset.src;
      img.alt = row.alt_text || title;
      img.width = row.image_width || 1200; img.height = row.image_height || 1800;
      img.loading = 'lazy'; img.decoding = 'async';
      const copy = document.createElement('span');
      const kicker = document.createElement('small'); kicker.textContent = category.label;
      const name = document.createElement('strong'); name.textContent = title;
      copy.append(kicker, name); button.append(img, copy); return button;
    });
    gallery.replaceChildren(...cards);
  } catch {
    showError('Kategori şu anda yüklenemiyor. Lütfen daha sonra tekrar deneyin.');
  }
});
