window.MASAL_PRODUCT_CARD = (row, categoryLabel, assetUrl, index = 99) => {
  const entry = window.MASAL_PRODUCT_DATA?.[row.id];
  const curated = entry?.source === row.image_url ? entry : null;
  const rawTitle = (curated?.title || row.item_title || row.alt_text || categoryLabel).trim();
  const cleanedTitle = rawTitle.replace(/\b\d{3,4}\s*[x×]\s*\d{3,4}(?:\s*px)?\b/gi, '')
    .replace(/^masal\s+(?:çiçekçilik|cicekcilik)\s+/i, '').replace(/\s{2,}/g, ' ').trim();
  const title = cleanedTitle ? cleanedTitle[0].toLocaleUpperCase('tr-TR') + cleanedTitle.slice(1) : categoryLabel;
  const article = document.createElement('article');
  article.className = 'flower-product-card';
  const imageButton = document.createElement('button');
  imageButton.type = 'button'; imageButton.className = 'gallery-item flower-product-image';
  imageButton.dataset.src = curated?.asset ? new URL(curated.asset, document.baseURI).href : assetUrl(row.image_url);
  imageButton.dataset.caption = title;
  imageButton.setAttribute('aria-label', `${title} görselini büyüt`);
  const image = document.createElement('img');
  if (curated?.asset) {
    const thumb = width => new URL(curated.asset.replace(/\.webp$/i, `-${width}.webp`), document.baseURI).href;
    image.src = thumb(640);
    image.srcset = `${thumb(320)} 320w, ${thumb(640)} 640w`;
    image.sizes = '(max-width: 750px) 50vw, (max-width: 1050px) 33vw, 25vw';
  } else {
    image.src = imageButton.dataset.src;
  }
  image.alt = `${title} — Masal Dekor Darende`;
  image.width = row.image_width || 1200; image.height = row.image_height || 1800;
  image.loading = index < 4 ? 'eager' : 'lazy'; image.decoding = 'async';
  if (index === 0) image.fetchPriority = 'high';
  imageButton.append(image);
  if (row.same_day_available === true) {
    const badge = document.createElement('span');
    badge.className = 'flower-product-badge';
    badge.textContent = 'Aynı gün için sor';
    imageButton.append(badge);
  }
  const copy = document.createElement('div'); copy.className = 'flower-product-copy';
  const group = document.createElement('small'); group.textContent = categoryLabel;
  const heading = document.createElement('h3'); heading.textContent = title;
  const description = document.createElement('p');
  description.textContent = row.item_description || curated?.description || '';
  if (!description.textContent) description.hidden = true;
  const actions = document.createElement('div'); actions.className = 'flower-product-actions';
  const message = `Merhaba Masal Dekor, ${title} hakkında bilgi ve sipariş koşullarını öğrenmek istiyorum. Ürün: ${location.href}`;
  const order = document.createElement('a');
  order.href = 'https://wa.me/905304476344?text=' + encodeURIComponent(message);
  order.target = '_blank'; order.rel = 'noopener noreferrer';
  order.className = 'flower-product-order'; order.textContent = 'WhatsApp’tan bilgi al';
  const detail = document.createElement('button');
  detail.type = 'button'; detail.className = 'flower-product-detail';
  detail.textContent = 'Görseli incele'; detail.setAttribute('aria-label', `${title} görselini büyüt`);
  detail.addEventListener('click', () => imageButton.click());
  actions.append(order, detail); copy.append(group, heading, description, actions);
  article.append(imageButton, copy);
  return article;
};

document.addEventListener('click', event => {
  const zoom = event.target.closest?.('[data-product-zoom]');
  if (zoom) zoom.closest('.flower-product-card')?.querySelector('.flower-product-image')?.click();
});
