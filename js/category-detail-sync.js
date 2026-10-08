document.addEventListener('DOMContentLoaded', async () => {
  const main = document.querySelector('main[data-category-slug][data-category-kind]');
  const config = window.MASAL_GALLERY_CONFIG || {};
  if (!main || !/^https:\/\//.test(config.url || '') || !config.publishableKey) return;
  const slug = main.dataset.categorySlug;
  if (!/^[a-z0-9-]+$/.test(slug)) return;
  const url = new URL(`${config.url.replace(/\/$/, '')}/rest/v1/gallery_categories`);
  url.searchParams.set('select', 'slug,label,kind,summary,is_visible');
  url.searchParams.set('slug', `eq.${slug}`);
  try {
    const response = await fetch(url, {headers: {apikey: config.publishableKey, Accept: 'application/json'}});
    if (!response.ok) return;
    const category = (await response.json())[0];
    if (!category?.is_visible || category.kind !== main.dataset.categoryKind) return;
    const label = (category.label || '').trim();
    if (!label) return;
    const heading = main.querySelector('h1');
    const originalLabel = main.dataset.categoryLabel || heading?.textContent.trim();
    const changed = originalLabel !== label;
    if (heading) heading.textContent = label;
    const breadcrumb = main.querySelector('[data-breadcrumb-category]');
    if (breadcrumb) breadcrumb.textContent = label;
    const storedSummary = (category.summary || '').trim();
    const staleOrganizationCopy = category.kind === 'cicekcilik' && /\b(nişan|düğün|kına)\b/i.test(storedSummary) && !/\b(nişan|düğün|kına)\b/i.test(label);
    const heroSummary = main.querySelector('.detail-hero-overlay p');
    const summary = storedSummary && !staleOrganizationCopy ? storedSummary :
      category.kind === 'organizasyon' && heroSummary?.textContent.trim() || `${label} için Masal Dekor çalışmalarını inceleyin.`;
    if (summary && heroSummary) heroSummary.textContent = summary;
    const flowerIntro = main.querySelector('.flower-collection-intro');
    if (flowerIntro && (changed || storedSummary)) flowerIntro.textContent = summary;
    const gallery = main.querySelector('[data-gallery-grid]');
    if (gallery) gallery.dataset.categoryLabel = label;
    // Static samples can belong to the former label. Never display them as another category.
    if (changed && main.dataset.categoryKind === 'cicekcilik' && gallery) {
      gallery.querySelectorAll('[data-static-product]').forEach(card => card.remove());
      if (!gallery.children.length) {
        const empty = document.createElement('p');
        empty.className = 'gallery-empty';
        empty.textContent = 'Bu kategoriye ait fotoğraflar yükleniyor.';
        gallery.append(empty);
      }
    }
    const offer = main.querySelector('.detail-hero-overlay .btn, #dynamic-offer');
    if (offer) offer.href = 'https://wa.me/905304476344?text=' + encodeURIComponent(`Merhaba Masal Dekor, ${label} hakkında bilgi almak istiyorum. Sayfa: ${location.href}`);
    document.title = `${label} | Masal Dekor Darende`;
    const description = `${label} | ${summary || 'Masal Dekor Darende organizasyon ve çiçekçilik hizmetleri.'}`.slice(0, 160);
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    main.querySelector('.detail-hero-overlay .eyebrow')?.replaceChildren(document.createTextNode(`MASAL DEKOR / ${label}`));
    main.querySelector('.flower-product-grid')?.setAttribute('aria-label', `${label} fotoğraf galerisi`);
  } catch {
    // The static page stays usable while the public category service is unavailable.
  }
});
