document.addEventListener('DOMContentLoaded',()=>{
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
  const items=[...document.querySelectorAll('.gallery-item')];
  const box=document.querySelector('.lightbox');
  const boxImg=box?.querySelector('img');const caption=box?.querySelector('figcaption');
  let current=0;let lastFocus=null;
  const visible=()=>items.filter(item=>!item.hidden);
  filters.forEach(button=>button.addEventListener('click',()=>{
    filters.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    items.forEach(item=>item.hidden=button.dataset.filter!=='Tümü'&&item.dataset.category!==button.dataset.filter);
  }));
  function show(index){const list=visible();if(!list.length)return;current=(index+list.length)%list.length;const item=list[current];boxImg.src=item.dataset.src;boxImg.alt=item.dataset.caption;caption.textContent=item.dataset.caption;}
  function close(){if(!box)return;box.hidden=true;document.body.style.overflow='';boxImg.removeAttribute('src');lastFocus?.focus();}
  items.forEach(item=>item.addEventListener('click',()=>{lastFocus=item;box.hidden=false;document.body.style.overflow='hidden';show(visible().indexOf(item));box.querySelector('.lightbox-close').focus();}));
  box?.querySelector('.lightbox-close').addEventListener('click',close);
  box?.querySelector('.lightbox-prev').addEventListener('click',()=>show(current-1));
  box?.querySelector('.lightbox-next').addEventListener('click',()=>show(current+1));
  box?.addEventListener('click',e=>{if(e.target===box)close();});
  document.addEventListener('keydown',e=>{if(!box||box.hidden)return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')show(current-1);if(e.key==='ArrowRight')show(current+1);});
});
