document.addEventListener('DOMContentLoaded', async () => {
  const config = window.MASAL_GALLERY_CONFIG || {};
  const gallery = document.querySelector('#dynamic-gallery');
  if (!gallery) return;
  const slug = new URLSearchParams(location.search).get('slug') || '';
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
    categoryUrl.searchParams.set('select', 'slug,label,kind,summary,is_visible');
    categoryUrl.searchParams.set('slug', `eq.${slug}`);
    const categoryResponse = await fetch(categoryUrl, {cache: 'no-store', headers});
    if (!categoryResponse.ok) throw new Error(`Category ${categoryResponse.status}`);
    const category = (await categoryResponse.json())[0];
    if (!category?.is_visible) { showError('Bu kategori artık yayında değil.'); return; }
    document.querySelector('#dynamic-title').textContent = category.label;
    document.querySelector('#dynamic-kind').textContent = category.kind === 'cicekcilik' ? 'MASAL DEKOR / ÇİÇEKÇİLİK' : 'MASAL DEKOR / ORGANİZASYON';
    document.querySelector('#dynamic-summary').textContent = category.summary || `${category.label} için Masal Dekor çalışmalarını inceleyin.`;
    document.querySelector('#dynamic-offer').href = 'https://wa.me/905304476344?text=' + encodeURIComponent(`Merhaba Masal Dekor, ${category.label} kategorisi hakkında bilgi almak istiyorum. Sayfa: ${location.href}`);
    document.title = `${category.label} | Masal Dekor Darende`;
    const description = `${category.label}: ${category.summary || 'Masal Dekor Darende organizasyon ve çiçekçilik çalışmaları.'}`.slice(0, 160);
    document.querySelector('meta[name="description"]').content = description;
    const canonical = `https://masaldekordarende.com/kategori.html?slug=${slug}`;
    document.querySelector('link[rel="canonical"]').href = canonical;
    document.querySelector('meta[property="og:title"]').content = document.title;
    document.querySelector('meta[property="og:description"]').content = description;
    document.querySelector('meta[property="og:url"]').content = canonical;

    const photoUrl = new URL(endpoint + 'gallery_photos');
    photoUrl.searchParams.set('select', 'id,image_url,alt_text,item_title,item_description,same_day_available,image_width,image_height');
    photoUrl.searchParams.set('category', `eq.${slug}`);
    photoUrl.searchParams.set('order', 'sort_order.asc,created_at.asc,id.asc');
    const photoResponse = await fetch(photoUrl, {cache: 'no-store', headers});
    if (!photoResponse.ok) throw new Error(`Gallery ${photoResponse.status}`);
    const rows = await photoResponse.json();
    if (!Array.isArray(rows)) throw new Error('Gallery response');
    if (category.kind === 'organizasyon') {
      const section=gallery.closest('section');
      const heading=section.querySelector('.catalog-group-heading');
      section.className='wedding-gallery';
      heading.className='wedding-gallery-heading container';
      heading.querySelector('h2').textContent='Fotoğraflardan ilham alın';
      heading.querySelector('p')?.remove();
      const title=document.createElement('div');title.append(...heading.childNodes);heading.append(title);
      const hint=document.createElement('p');hint.className='wedding-gallery-hint';
      hint.innerHTML='<span aria-hidden="true">↔</span><span class="hint-desktop">SÜRÜKLEYEREK KEŞFEDİN</span><span class="hint-mobile">KAYDIRARAK KEŞFEDİN</span>';heading.append(hint);
      const carousel=document.createElement('div');carousel.className='wedding-carousel';
      carousel.dataset.serviceCarousel='';carousel.dataset.serviceName=category.label.toLocaleLowerCase('tr-TR');
      carousel.setAttribute('role','region');carousel.setAttribute('aria-roledescription','carousel');
      carousel.setAttribute('aria-label',category.label+' fotoğrafları');carousel.tabIndex=0;
      carousel.innerHTML='<div class="wedding-carousel-backdrop" aria-hidden="true"></div><div class="wedding-carousel-viewport"><div class="wedding-carousel-track" data-carousel-track></div></div><div class="wedding-carousel-controls container"><button type="button" data-carousel-prev aria-label="Önceki fotoğraf"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#arrow"></use></svg></button><span class="wedding-carousel-count" aria-live="polite"><strong data-carousel-current>00</strong><span>/</span><span data-carousel-total>00</span></span><button type="button" data-carousel-next aria-label="Sonraki fotoğraf"><svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#arrow"></use></svg></button></div>';
      const slides=rows.map((row,index)=>{
        const button=document.createElement('button');button.className='wedding-slide';button.type='button';
        button.dataset.serviceSlide='';button.dataset.src=assetUrl(row.image_url);button.dataset.caption=row.alt_text||`${category.label} fotoğrafı`;
        const img=document.createElement('img');img.src=button.dataset.src;img.alt=button.dataset.caption;
        img.width=row.image_width||1200;img.height=row.image_height||1800;img.loading=index?'lazy':'eager';img.decoding='async';img.draggable=false;
        const zoom=document.createElement('span');zoom.className='wedding-slide-zoom';zoom.setAttribute('aria-hidden','true');
        zoom.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.7" cy="10.7" r="6.7"/><path d="m16 16 5 5M10.7 8v5.4M8 10.7h5.4"/></svg><span>FOTOĞRAFI BÜYÜT</span>';
        button.append(img,zoom);return button;
      });
      const track=carousel.querySelector('[data-carousel-track]');track.append(...slides);
      if(!slides.length){const empty=document.createElement('p');empty.className='gallery-empty';empty.textContent='Bu kategoriye ait fotoğraflar yakında eklenecek.';track.append(empty);}
      section.replaceChildren(heading,carousel);document.body.classList.add('page-service-carousel');
      document.querySelector('.lightbox')?.classList.add('wedding-lightbox');
      window.MASAL_INIT_SERVICE_CAROUSELS?.();return;
    }
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
        return window.MASAL_PRODUCT_CARD(row, category.label, assetUrl, index);
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
