document.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-service-carousel]').forEach(carousel=>{
    const viewport=carousel.querySelector('.wedding-carousel-viewport');
    const track=carousel.querySelector('[data-carousel-track]');
    let slides=[...carousel.querySelectorAll('[data-service-slide]')];
    const serviceName=carousel.dataset.serviceName||'düğün';
    const previous=carousel.querySelector('[data-carousel-prev]');
    const next=carousel.querySelector('[data-carousel-next]');
    const count=carousel.querySelector('[data-carousel-current]');
    const total=carousel.querySelector('[data-carousel-total]');
    if(!viewport||!track)return;
    let active=0,dragStart=null,dragging=false,suppressClick=false,wheelLocked=false;
    const centerOffset=()=>{
      const slide=slides[active];
      if(!slide)return 0;
      return viewport.clientWidth/2-slide.offsetLeft-slide.offsetWidth/2;
    };
    const center=()=>{track.style.transform=`translate3d(${centerOffset()}px,0,0)`;};
    const go=index=>{
      active=Math.max(0,Math.min(index,slides.length-1));
      if(!slides.length){count.textContent='00';if(total)total.textContent='00';previous.disabled=true;next.disabled=true;return;}
      slides.forEach((slide,i)=>{
        const selected=i===active;
        slide.classList.toggle('is-active',selected);
        slide.setAttribute('aria-current',String(selected));
        slide.setAttribute('aria-label',`${i+1}. ${serviceName} fotoğrafını ${selected?'büyüt':'seç'}`);
        slide.tabIndex=selected?0:-1;
      });
      count.textContent=String(active+1).padStart(2,'0');
      if(total)total.textContent=String(slides.length).padStart(2,'0');
      previous.disabled=active===0;
      next.disabled=active===slides.length-1;
      carousel.style.setProperty('--wedding-backdrop',`url("${slides[active].dataset.src}")`);
      center();
    };
    previous.addEventListener('click',()=>go(active-1));
    next.addEventListener('click',()=>go(active+1));
    const bindSlides=()=>slides.forEach((slide,i)=>slide.addEventListener('click',event=>{
      if(i===active)return;
      event.preventDefault();
      go(i);
      slide.focus({preventScroll:true});
    }));
    bindSlides();
    carousel.addEventListener('gallery:updated',()=>{
      slides=[...carousel.querySelectorAll('[data-service-slide]')];
      bindSlides();
      go(0);
    });
    carousel.addEventListener('click',event=>{
      if(!suppressClick)return;
      event.preventDefault();event.stopImmediatePropagation();
      suppressClick=false;
    },true);
    viewport.addEventListener('pointerdown',event=>{
      if(event.button!==0&&event.pointerType==='mouse')return;
      dragStart={x:event.clientX,y:event.clientY,id:event.pointerId,base:centerOffset()};
      dragging=false;
    });
    viewport.addEventListener('pointermove',event=>{
      if(!dragStart||dragStart.id!==event.pointerId)return;
      const dx=event.clientX-dragStart.x,dy=event.clientY-dragStart.y;
      if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)){
        if(!dragging){dragging=true;track.classList.add('is-dragging');viewport.setPointerCapture?.(event.pointerId);}
        const edge=(active===0&&dx>0)||(active===slides.length-1&&dx<0);
        track.style.transform=`translate3d(${dragStart.base+dx*(edge?.35:1)}px,0,0)`;
      }
    });
    viewport.addEventListener('pointerup',event=>{
      if(!dragStart||dragStart.id!==event.pointerId)return;
      const dx=event.clientX-dragStart.x;
      if(dragging){
        track.classList.remove('is-dragging');
        suppressClick=true;
        if(Math.abs(dx)>45)go(active+(dx<0?1:-1));
        else center();
        window.setTimeout(()=>{suppressClick=false;},120);
      }
      dragStart=null;dragging=false;
    });
    viewport.addEventListener('pointercancel',()=>{track.classList.remove('is-dragging');dragStart=null;dragging=false;center();});
    viewport.addEventListener('wheel',event=>{
      const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:0;
      if(Math.abs(delta)<25||wheelLocked)return;
      const destination=active+(delta>0?1:-1);
      if(destination<0||destination>=slides.length)return;
      event.preventDefault();go(destination);wheelLocked=true;
      window.setTimeout(()=>{wheelLocked=false;},420);
    },{passive:false});
    carousel.addEventListener('keydown',event=>{
      if(event.target.closest('.wedding-carousel-controls'))return;
      let destination=null;
      if(event.key==='ArrowLeft')destination=active-1;
      if(event.key==='ArrowRight')destination=active+1;
      if(event.key==='Home')destination=0;
      if(event.key==='End')destination=slides.length-1;
      if(destination!==null){event.preventDefault();go(destination);slides[active].focus({preventScroll:true});}
    });
    if('ResizeObserver' in window)new ResizeObserver(center).observe(viewport);
    else window.addEventListener('resize',center,{passive:true});
    go(0);
  });
  const lightbox=document.querySelector('.wedding-lightbox');
  const lightboxPhoto=lightbox?.querySelector('figure');
  let lightboxStart=null;
  lightboxPhoto?.addEventListener('pointerdown',event=>{
    lightboxStart={x:event.clientX,y:event.clientY,id:event.pointerId};
    lightboxPhoto.setPointerCapture?.(event.pointerId);
  });
  lightboxPhoto?.addEventListener('pointerup',event=>{
    if(!lightboxStart||lightboxStart.id!==event.pointerId)return;
    const dx=event.clientX-lightboxStart.x,dy=event.clientY-lightboxStart.y;
    if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){
      lightbox.querySelector(dx<0?'.lightbox-next':'.lightbox-prev')?.click();
    }
    lightboxStart=null;
  });
  lightboxPhoto?.addEventListener('pointercancel',()=>{lightboxStart=null;});
});
