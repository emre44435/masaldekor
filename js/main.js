document.addEventListener('DOMContentLoaded',()=>{
  const prepareCatalogImage = card => {
    const img = card.querySelector(':scope > .catalog-photo');
    if (!img) return;
    const stage = document.createElement('span');
    stage.className = 'catalog-media';
    stage.style.setProperty('--catalog-image', `url("${img.src.replaceAll('"', '%22')}")`);
    img.before(stage);
    stage.append(img);
  };
  document.querySelectorAll('.catalog-card.has-photo').forEach(prepareCatalogImage);
  document.querySelectorAll('[data-category-grid]').forEach(grid => new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === 1 && node.matches?.('.catalog-card.has-photo')) prepareCatalogImage(node);
    }));
  }).observe(grid, {childList:true}));
  const header=document.querySelector('.site-header');
  const onScroll=()=>header?.classList.toggle('scrolled',window.scrollY>8);
  onScroll();window.addEventListener('scroll',onScroll,{passive:true});
  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
  const toggle=document.querySelector('.menu-toggle');
  const mobile=document.querySelector('#mobile-menu');
  if(toggle&&mobile){
    const close=()=>{mobile.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Menüyü aç');toggle.innerHTML='<svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#menu"></use></svg>';};
    toggle.addEventListener('click',()=>{const open=mobile.hidden;mobile.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Menüyü kapat':'Menüyü aç');toggle.innerHTML=`<svg class="icon" aria-hidden="true"><use href="assets/icons/sprite.svg#${open?'close':'menu'}"></use></svg>`;});
    mobile.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!mobile.hidden)close();});
    window.matchMedia('(min-width:1121px)').addEventListener('change',e=>{if(e.matches)close();});
  }
  const reveal=document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    const observer=new IntersectionObserver((entries,obs)=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');obs.unobserve(entry.target);}}),{threshold:.08});reveal.forEach(el=>observer.observe(el));
  }else reveal.forEach(el=>el.classList.add('in-view'));
  const form=document.querySelector('#whatsapp-form');
  form?.addEventListener('submit',e=>{
    e.preventDefault();if(!form.reportValidity())return;
    const data=new FormData(form);
    const message=`Merhaba, Darende Organizasyon web sitesi üzerinden iletişime geçiyorum.\n\nAd Soyad: ${String(data.get('name')).trim()}\nTelefon: ${String(data.get('phone')).trim()}\nOrganizasyon: ${String(data.get('event')).trim()}\nMesaj: ${String(data.get('message')).trim()}`;
    const url='https://wa.me/905304476344?text='+encodeURIComponent(message);
    const opened=window.open(url,'_blank');if(opened)opened.opener=null;else window.location.href=url;
  });
  document.querySelectorAll('[data-appointment-form]').forEach(appointment=>{
    const date=appointment.querySelector('input[name="date"]');
    if(date){
      const now=new Date();
      const localToday=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);
      date.min=localToday;
    }
    appointment.addEventListener('submit',e=>{
      e.preventDefault();
      if(!appointment.reportValidity())return;
      const data=new FormData(appointment);
      const name=String(data.get('name')||'').trim();
      const phone=String(data.get('phone')||'').trim();
      const event=String(data.get('event')||'').trim();
      const day=String(data.get('date')||'').trim();
      const chosenDay=day?new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'long',year:'numeric'}).format(new Date(`${day}T12:00:00`)):'Görüşerek belirleyelim';
      const message=`Merhaba, Masal Organizasyon için bir görüşme randevusu talep etmek istiyorum.\n\nAd Soyad: ${name}\nTelefon: ${phone}\nOrganizasyon Türü: ${event}\nTercih Ettiğim Görüşme Günü: ${chosenDay}\n\nUygunluğunuzu paylaşabilir misiniz?`;
      const url='https://wa.me/905304476344?text='+encodeURIComponent(message);
      const opened=window.open(url,'_blank');
      if(opened)opened.opener=null;else window.location.href=url;
    });
  });
  document.querySelectorAll('[data-comparison]').forEach(frame=>{
    const range=frame.querySelector('.comparison-range');
    let dragging=false;
    const setPosition=value=>{const clamped=Math.max(0,Math.min(100,value));range.value=String(Math.round(clamped));frame.style.setProperty('--position',`${clamped}%`);};
    const move=event=>{const rect=frame.getBoundingClientRect();setPosition((event.clientX-rect.left)/rect.width*100);};
    frame.addEventListener('pointerdown',event=>{dragging=true;frame.setPointerCapture?.(event.pointerId);move(event);});
    frame.addEventListener('pointermove',event=>{if(dragging)move(event);});
    frame.addEventListener('pointerup',()=>{dragging=false;});
    frame.addEventListener('pointercancel',()=>{dragging=false;});
    range.addEventListener('input',()=>setPosition(Number(range.value)));
  });
  const filters=[...document.querySelectorAll('[data-filter]')];
  const items=()=>[...document.querySelectorAll('.gallery-item, [data-service-slide]')];
  const box=document.querySelector('.lightbox');
  const boxImg=box?.querySelector('img');const caption=box?.querySelector('figcaption');
  const previousImage=box?.querySelector('.lightbox-previous-image');
  const weddingLightbox=box?.classList.contains('wedding-lightbox');
  const weddingHistoryKey='masalWeddingLightbox';
  let current=0;let lastFocus=null;let transitionToken=0;let weddingHistoryEntry=false;
  const visible=()=>items().filter(item=>!item.hidden);
  filters.forEach(button=>button.addEventListener('click',()=>{
    filters.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    items().forEach(item=>item.hidden=button.dataset.filter!=='Tümü'&&item.dataset.category!==button.dataset.filter);
  }));
  function show(index){
    const list=visible();if(!list.length||!boxImg)return;
    const sourceIndex=current;
    current=(index+list.length)%list.length;
    const item=list[current];
    const previousSrc=boxImg.getAttribute('src');
    const previousAlt=boxImg.alt;
    caption.textContent=item.dataset.caption;
    const animate=box?.classList.contains('wedding-lightbox')&&previousImage&&previousSrc&&
      previousSrc!==item.dataset.src&&window.matchMedia('(max-width:767px)').matches&&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches&&
      typeof boxImg.animate==='function'&&typeof previousImage.animate==='function';
    const token=++transitionToken;
    if(!animate){
      boxImg.getAnimations?.().forEach(animation=>animation.cancel());
      previousImage?.getAnimations?.().forEach(animation=>animation.cancel());
      if(previousImage){previousImage.hidden=true;previousImage.removeAttribute('src');}
      boxImg.src=item.dataset.src;boxImg.alt=item.dataset.caption;
      return;
    }
    boxImg.getAnimations?.().forEach(animation=>animation.cancel());
    previousImage.getAnimations?.().forEach(animation=>animation.cancel());
    previousImage.hidden=true;previousImage.removeAttribute('src');
    const direction=index>sourceIndex?1:-1;
    const preload=new Image();preload.src=item.dataset.src;
    const ready=typeof preload.decode==='function'?preload.decode().catch(()=>{}):
      new Promise(resolve=>{if(preload.complete)resolve();else{preload.onload=resolve;preload.onerror=resolve;}});
    ready.then(()=>{
      if(token!==transitionToken||box.hidden)return;
      boxImg.getAnimations?.().forEach(animation=>animation.cancel());
      previousImage.getAnimations?.().forEach(animation=>animation.cancel());
      previousImage.src=previousSrc;previousImage.alt=previousAlt;previousImage.hidden=false;
      boxImg.src=item.dataset.src;boxImg.alt=item.dataset.caption;
      const options={duration:390,easing:'cubic-bezier(.22,.68,.2,1)',fill:'both'};
      const outgoing=previousImage.animate([
        {opacity:1,transform:'translate(-50%,-50%) translateX(0) scale(1)'},
        {opacity:0,transform:`translate(-50%,-50%) translateX(${-direction*26}px) scale(.985)`}
      ],options);
      const incoming=boxImg.animate([
        {opacity:0,transform:`translate(-50%,-50%) translateX(${direction*30}px) scale(.985)`},
        {opacity:1,transform:'translate(-50%,-50%) translateX(0) scale(1)'}
      ],options);
      Promise.allSettled([outgoing.finished,incoming.finished]).then(()=>{
        if(token!==transitionToken)return;
        outgoing.cancel();incoming.cancel();
        previousImage.hidden=true;previousImage.removeAttribute('src');
      });
    });
  }
  function closeOverlay(){
    if(!box)return;
    transitionToken++;
    boxImg?.getAnimations?.().forEach(animation=>animation.cancel());
    previousImage?.getAnimations?.().forEach(animation=>animation.cancel());
    if(previousImage){previousImage.hidden=true;previousImage.removeAttribute('src');}
    box.hidden=true;document.body.style.overflow='';boxImg.removeAttribute('src');lastFocus?.focus();
  }
  function close(){
    if(!box||box.hidden)return;
    const restoreHistory=weddingLightbox&&weddingHistoryEntry;
    weddingHistoryEntry=false;
    closeOverlay();
    if(restoreHistory)window.history?.back();
  }
  const boundItems=new WeakSet();
  function openItem(event,item){
    if(event.defaultPrevented||!box)return;
    if(weddingLightbox&&box.hidden&&window.history?.pushState){
      try{window.history.pushState({[weddingHistoryKey]:true},'');weddingHistoryEntry=true;}
      catch{weddingHistoryEntry=false;}
    }
    lastFocus=item;box.hidden=false;document.body.style.overflow='hidden';
    show(visible().indexOf(item));box.querySelector('.lightbox-close').focus();
  }
  items().forEach(item=>{boundItems.add(item);item.addEventListener('click',event=>openItem(event,item));});
  document.addEventListener('click',event=>{
    const item=event.target.closest?.('.gallery-item, [data-service-slide]');
    if(item&&!boundItems.has(item))openItem(event,item);
  });
  if(weddingLightbox)window.addEventListener('popstate',event=>{
    if(event.state?.[weddingHistoryKey]){
      weddingHistoryEntry=true;
      if(box.hidden&&lastFocus){
        box.hidden=false;document.body.style.overflow='hidden';
        show(current);box.querySelector('.lightbox-close').focus();
      }
    }else{
      weddingHistoryEntry=false;
      if(!box.hidden)closeOverlay();
    }
  });
  box?.querySelector('.lightbox-close').addEventListener('click',close);
  box?.querySelector('.lightbox-prev').addEventListener('click',()=>show(current-1));
  box?.querySelector('.lightbox-next').addEventListener('click',()=>show(current+1));
  box?.addEventListener('click',e=>{if(e.target===box)close();});
  document.addEventListener('keydown',e=>{if(!box||box.hidden)return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')show(current-1);if(e.key==='ArrowRight')show(current+1);});
});
