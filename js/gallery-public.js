document.addEventListener('DOMContentLoaded', async () => {
  const config=window.MASAL_GALLERY_CONFIG||{};
  if(!/^https:\/\/[^/]+/.test(config.url||'')||!config.publishableKey)return;
  const carousel=document.querySelector('[data-service-carousel][data-gallery-category]');
  const grid=document.querySelector('[data-gallery-grid][data-gallery-category]');
  const host=carousel||grid;
  if(!host)return;
  const category=host.dataset.galleryCategory;
  const url=new URL(`${config.url.replace(/\/$/,'')}/rest/v1/gallery_photos`);
  url.searchParams.set('select','id,image_url,alt_text,item_title,item_description,same_day_available,image_width,image_height');
  url.searchParams.set('category',`eq.${category}`);
  url.searchParams.set('order','sort_order.asc,created_at.asc,id.asc');
  try{
    const response=await fetch(url,{cache:'no-store',headers:{apikey:config.publishableKey,Accept:'application/json'}});
    if(!response.ok)throw new Error(`Gallery ${response.status}`);
    const rows=await response.json();
    if(!Array.isArray(rows))throw new Error('Gallery response');
    const source=value=>/^https:\/\//i.test(value)?value:new URL(value,document.baseURI).href;
    // The editorial cover is independent from the admin gallery order.
    // Reordering photos must never replace the wedding or henna hero image.
    if(carousel){
      const track=carousel.querySelector('[data-carousel-track]');
      const service=carousel.dataset.serviceName||'organizasyon';
      const slides=rows.map((row,index)=>{
        const button=document.createElement('button');
        button.className='wedding-slide';button.type='button';
        button.dataset.serviceSlide='';button.dataset.src=source(row.image_url);
        button.dataset.caption=row.alt_text||`${service} fotoğrafı`;
        button.setAttribute('aria-label',`${index+1}. ${service} fotoğrafını görüntüle`);
        const img=document.createElement('img');img.src=button.dataset.src;
        img.alt=button.dataset.caption;img.width=row.image_width||1200;img.height=row.image_height||1800;
        img.loading='lazy';img.decoding='async';img.draggable=false;
        const zoom=document.createElement('span');zoom.className='wedding-slide-zoom';zoom.setAttribute('aria-hidden','true');
        zoom.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.7" cy="10.7" r="6.7"/><path d="m16 16 5 5M10.7 8v5.4M8 10.7h5.4"/></svg><span>FOTOĞRAFI BÜYÜT</span>';
        button.append(img,zoom);return button;
      });
      if(!slides.length){const empty=document.createElement('p');empty.className='gallery-empty';empty.textContent='Bu hizmetin fotoğrafları yakında eklenecek.';track.replaceChildren(empty);}
      else track.replaceChildren(...slides);
      carousel.dispatchEvent(new Event('gallery:updated'));
    }else if(grid){
      const cards=rows.map(row=>{
        if (grid.dataset.galleryKind === 'cicekcilik' && window.MASAL_PRODUCT_CARD) {
          return window.MASAL_PRODUCT_CARD(row, grid.dataset.categoryLabel || category, source);
        }
        const frame=document.createElement('button');frame.type='button';frame.className='gallery-item named-product';
        frame.dataset.src=source(row.image_url);frame.dataset.caption=row.item_title||row.alt_text||`${category} fotoğrafı`;
        frame.setAttribute('aria-label',`${frame.dataset.caption} görselini büyüt`);
        const image=document.createElement('img');image.src=source(row.image_url);
        image.alt=row.alt_text||`${category} fotoğrafı`;
        image.width=row.image_width||1200;image.height=row.image_height||1800;
        image.loading='lazy';image.decoding='async';frame.append(image);
        if(row.item_title){const caption=document.createElement('span');const title=document.createElement('strong');title.textContent=row.item_title;caption.append(title);frame.append(caption);}
        return frame;
      });
      if(!cards.length){const empty=document.createElement('p');empty.className='gallery-empty';empty.textContent='Bu hizmetin fotoğrafları yakında eklenecek.';grid.replaceChildren(empty);}
      else grid.replaceChildren(...cards);
    }
  }catch(error){
    // Keep the existing static gallery if Supabase is temporarily unreachable.
    document.documentElement.dataset.galleryFallback='true';
  }
});
