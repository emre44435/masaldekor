(() => {
  'use strict';
  const config = window.MASAL_GALLERY_CONFIG || {};
  const $ = selector => document.querySelector(selector);
  const loginView = $('#login-view'), adminView = $('#admin-view');
  const list = $('#photo-list'), status = $('#status');
  const saveButton = $('#save-order');
  const preview = $('#preview');
  let client, categories = [], category, photos = [], dirty = false, busy = false, uploading = false, statusTimer, categoryOrderDirty = false;

  function message(text, error = false) {
    status.textContent = text;
    status.classList.toggle('error', error);
    status.classList.add('show');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => status.classList.remove('show'), 5000);
  }
  function fail(error) { message(error?.message || 'İşlem tamamlanamadı. Tekrar deneyin.', true); }
  function setDirty(value) {
    dirty = value;
    saveButton.disabled = !value || busy;
    $('#change-indicator').textContent = value ? 'Kaydedilmemiş sıralama var.' : 'Tüm değişiklikler kaydedildi.';
  }
  function setBusy(value) {
    busy = value;
    saveButton.disabled = value || !dirty;
    $('#add-files').disabled = value || !category;
    $('#save-suggested-titles').disabled = value;
    $('#remove-duplicate-photos').disabled = value;
    $('#save-category-order').disabled = value || !categoryOrderDirty;
    $('#logout').disabled = value;
    $('#bulk-upload-zone').setAttribute('aria-disabled', String(value || !category));
    document.querySelectorAll('#create-category button, #edit-category button, #edit-category input, #edit-category select, #edit-category textarea, .category-move, .category-drag').forEach(control => control.disabled = value);
  }
  function curated(photo) {
    const data = window.MASAL_PRODUCT_DATA?.[photo.id];
    return data?.source === photo.image_url ? data : null;
  }
  function photoUrl(url) {
    if (/^https:\/\//i.test(url)) return url;
    return new URL('../' + url.replace(/^\/+/, ''), location.href).href;
  }
  function renumber() {
    [...list.querySelectorAll('.photo-card')].forEach((card, index) => {
      card.querySelector('.photo-number').textContent = String(index + 1);
      card.querySelector('.drag-handle').setAttribute('aria-label', `${index + 1}. fotoğrafı sürükleyerek sırala`);
    });
  }
  function card(photo) {
    const article = document.createElement('article');
    article.className = 'photo-card';
    article.dataset.id = photo.id;
    const top = document.createElement('div'); top.className = 'photo-top';
    const number = document.createElement('span'); number.className = 'photo-number';
    const drag = document.createElement('button'); drag.type = 'button'; drag.className = 'drag-handle'; drag.textContent = '☷  Tutup sürükleyin';
    top.append(number, drag);
    const image = document.createElement('img');
    image.src = photoUrl(curated(photo)?.asset || photo.image_url); image.alt = photo.alt_text || `${category.label} fotoğrafı`;
    image.width = photo.image_width || 1200; image.height = photo.image_height || 1800;
    image.loading = 'lazy'; image.decoding = 'async';
    const caption = document.createElement('label'); caption.className = 'photo-caption'; caption.textContent = 'Ürün / görsel adı';
    const titleInput = document.createElement('input'); titleInput.className = 'item-title'; titleInput.maxLength = 120;
    titleInput.value = curated(photo)?.title || photo.item_title || ''; titleInput.placeholder = 'Örn. Beyaz gül buketi';
    caption.append(titleInput);
    let productFields = [];
    if (category.kind === 'cicekcilik') {
      const description = document.createElement('label'); description.className = 'photo-caption'; description.textContent = 'Kısa ürün açıklaması';
      const descriptionInput = document.createElement('textarea'); descriptionInput.className = 'item-description';
      descriptionInput.maxLength = 320; descriptionInput.rows = 2;
      descriptionInput.value = photo.item_description || curated(photo)?.description || '';
      descriptionInput.placeholder = 'Gerçek ürün özelliklerini yazın';
      description.append(descriptionInput);
      const sameDay = document.createElement('label'); sameDay.className = 'photo-caption same-day-toggle';
      const checkbox = document.createElement('input'); checkbox.className = 'same-day-available'; checkbox.type = 'checkbox';
      checkbox.checked = photo.same_day_available === true;
      sameDay.append(checkbox, document.createTextNode('Aynı gün hazırlanabilir (yalnız teyit edilmişse)'));
      productFields = [description, sameDay];
    }
    const actions = document.createElement('div'); actions.className = 'card-actions';
    for (const [label, action, extra] of [
      ['Önizle', 'preview', ''], ['1. Sıraya Al', 'first', ''],
      ['Bilgileri Kaydet', 'title', ''], ['Değiştir', 'replace', ''], ['Sil', 'delete', 'delete']
    ]) {
      const button = document.createElement('button'); button.type = 'button';
      button.textContent = label; button.dataset.action = action; button.className = extra;
      actions.append(button);
    }
    article.append(top, image, caption, ...productFields, actions);
    return article;
  }
  function renderPhotos() {
    list.replaceChildren(...photos.map(card));
    if (!photos.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Bu kategoride henüz fotoğraf yok. İlk fotoğrafı ekleyebilirsiniz.';
      list.append(empty);
    }
    renumber(); setDirty(false);
  }
  async function loadCategory(slug) {
    if (busy) return;
    if (dirty && !confirm('Kaydedilmemiş sıralama var. Değişiklikleri iptal etmek istiyor musunuz?')) return;
    category = categories.find(item => item.slug === slug);
    if (!category) return;
    setBusy(true);
    try {
    const edit = $('#edit-category');
    edit.elements.label.value = category.label;
    edit.elements.kind.value = category.kind || 'organizasyon';
    edit.elements.summary.value = category.summary || '';
    edit.elements.is_visible.checked = category.is_visible !== false;
    $('#category-title').textContent = category.label;
    $('#public-link').href = '../' + category.public_page;
    $('#categories').querySelectorAll('.category-select').forEach(button => button.setAttribute('aria-current', String(button.dataset.slug === slug)));
    photos = []; setDirty(false);
    list.textContent = 'Fotoğraflar yükleniyor…';
    const { data, error } = await client.from('gallery_photos').select('id,category,image_url,storage_path,alt_text,item_title,item_description,same_day_available,image_width,image_height,sort_order,created_at')
      .eq('category', slug).order('sort_order', { ascending: true }).order('created_at', { ascending: true }).order('id', { ascending: true });
    if (error) { list.textContent = ''; fail(error); return; }
    photos = data || []; renderPhotos();
    const suggestions = photos.filter(photo => {
      const suggestion = curated(photo);
      return suggestion && (!photo.item_description || !photo.item_title || /^[A-F\d -]{20,}$/i.test(photo.item_title));
    });
    const duplicates = photos.filter(photo => curated(photo)?.duplicate);
    $('#save-suggested-titles').hidden = category.kind !== 'cicekcilik' || !suggestions.length;
    $('#remove-duplicate-photos').hidden = category.kind !== 'cicekcilik' || !duplicates.length;
    } catch (error) { list.textContent = ''; fail(error); } finally { setBusy(false); }
  }
  async function saveOrder() {
    if (busy) return false;
    if (!(await saveCategoryOrder())) return false;
    if (!dirty) return true;
    setBusy(true);
    const ids = [...list.querySelectorAll('.photo-card')].map(item => item.dataset.id);
    const { error } = await client.rpc('reorder_gallery', { p_category: category.slug, p_ids: ids });
    setBusy(false);
    if (error) { fail(error); return false; }
    photos.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    setDirty(false); message('Fotoğraf sıralaması kaydedildi. Hizmet sayfasına yansıdı.');
    return true;
  }
  async function dimensions(file) {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight, image };
    } finally { URL.revokeObjectURL(url); }
  }
  async function prepare(file) {
    const types = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    if (!types[file.type] || !/\.(jpe?g|png|webp)$/i.test(file.name)) throw new Error('JPG, PNG veya WebP fotoğraf seçin.');
    if (file.size > 15 * 1024 * 1024) throw new Error('Fotoğraf en fazla 15 MB olabilir.');
    const original = await dimensions(file);
    if (!original.width || !original.height) throw new Error('Fotoğraf okunamadı.');
    if (file.type === 'image/webp' && file.size <= 8 * 1024 * 1024 && Math.max(original.width, original.height) <= 2600) {
      return { file, width: original.width, height: original.height, extension: types[file.type] };
    }
    const scale = Math.min(1, 1800 / Math.max(original.width, original.height));
    const width = Math.round(original.width * scale), height = Math.round(original.height * scale);
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    canvas.getContext('2d').drawImage(original.image, 0, 0, width, height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .8));
    canvas.width = canvas.height = 0;
    if (!blob) throw new Error('Fotoğraf işlenemedi.');
    if (blob.size > 15 * 1024 * 1024) throw new Error('İşlenen fotoğraf 15 MB sınırını aşıyor.');
    return { file: blob, width, height, extension: 'webp' };
  }
  async function upload(file, prefix = category.slug) {
    const prepared = await prepare(file);
    const path = `${prefix}/${crypto.randomUUID()}.${prepared.extension}`;
    const result = await client.storage.from('gallery-photos').upload(path, prepared.file, {
      contentType: prepared.file.type, cacheControl: '31536000', upsert: false
    });
    if (result.error) throw result.error;
    const { data } = client.storage.from('gallery-photos').getPublicUrl(path);
    return { path, url: data.publicUrl, width: prepared.width, height: prepared.height };
  }
  function titleFromFile(filename) {
    const title = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')
      .replace(/\b\d{3,4}\s*[x×]\s*\d{3,4}(?:\s*px)?\b/gi, '')
      .replace(/^masal\s+(?:çiçekçilik|cicekcilik)\s+/i, '').replace(/\s{2,}/g, ' ').trim();
    return /^[0-9a-f]{8}(?:\s+[0-9a-f]{4}){3}\s+[0-9a-f]{12}$/i.test(title) ? '' : title.slice(0, 120);
  }
  async function addFiles(files) {
    if (busy || uploading || !category || !files.length) return;
    uploading = true;
    if (!(await saveOrder())) { uploading = false; return; }
    setBusy(true);
    const selectedCategory = category;
    let added = 0;
    const failures = [];
    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        $('#upload-progress').textContent = `${index + 1} / ${files.length} yükleniyor: ${file.name}`;
        let uploaded;
        try {
          uploaded = await upload(file, selectedCategory.slug);
          const { data, error } = await client.from('gallery_photos').insert({
            category: selectedCategory.slug, image_url: uploaded.url, storage_path: uploaded.path,
            alt_text: `${selectedCategory.label} fotoğrafı`, item_title: titleFromFile(file.name), image_width: uploaded.width,
            image_height: uploaded.height, sort_order: photos.length + added + 1
          }).select('id').single();
          if (error) throw error;
          if (!data?.id) throw new Error('Fotoğraf kaydı doğrulanamadı.');
          added++;
        } catch (error) {
          if (uploaded) await client.storage.from('gallery-photos').remove([uploaded.path]);
          failures.push(`${file.name}: ${error.message || 'Yüklenemedi'}`);
        }
      }
    } finally {
      setBusy(false);
      await loadCategory(selectedCategory.slug);
      uploading = false;
      $('#upload-progress').textContent = `${added} / ${files.length} görsel eklendi.` + (failures.length ? ` Yüklenemeyenler: ${failures.join(' • ')}` : '');
      message(failures.length ? `${added} görsel eklendi, ${failures.length} görsel yüklenemedi. Ayrıntılar yükleme alanında.` : `${added} görsel eklendi.`, Boolean(failures.length));
    }
  }
  async function replacePhoto(photo, file) {
    if (!(await saveOrder())) return;
    setBusy(true);
    let uploaded;
    try {
      uploaded = await upload(file);
      const { error } = await client.from('gallery_photos').update({
        image_url: uploaded.url, storage_path: uploaded.path,
        image_width: uploaded.width, image_height: uploaded.height
      }).eq('id', photo.id).eq('category', category.slug);
      if (error) throw error;
      if (photo.storage_path) await client.storage.from('gallery-photos').remove([photo.storage_path]);
      message('Fotoğraf değiştirildi. Sırası korundu.');
    } catch (error) {
      if (uploaded) await client.storage.from('gallery-photos').remove([uploaded.path]);
      fail(error);
    }
    setBusy(false); await loadCategory(category.slug);
  }
  async function deletePhoto(photo) {
    const confirmation = $('#delete-confirm');
    const approved = await new Promise(resolve => {
      const cancel = $('#cancel-delete'), accept = $('#confirm-delete');
      const finish = value => {
        confirmation.close();
        cancel.removeEventListener('click', onCancel);
        accept.removeEventListener('click', onAccept);
        confirmation.removeEventListener('cancel', onCancel);
        resolve(value);
      };
      const onCancel = () => finish(false);
      const onAccept = () => finish(true);
      cancel.addEventListener('click', onCancel);
      accept.addEventListener('click', onAccept);
      confirmation.addEventListener('cancel', onCancel);
      confirmation.showModal();
    });
    if (!approved) return;
    if (!(await saveOrder())) return;
    setBusy(true);
    const { error } = await client.from('gallery_photos').delete().eq('id', photo.id).eq('category', category.slug);
    if (error) { setBusy(false); fail(error); return; }
    const remaining = photos.filter(item => item.id !== photo.id).map(item => item.id);
    const normalized = await client.rpc('reorder_gallery', { p_category: category.slug, p_ids: remaining });
    if (normalized.error) fail(normalized.error);
    let storageError = false;
    if (photo.storage_path) {
      const removed = await client.storage.from('gallery-photos').remove([photo.storage_path]);
      if (removed.error) { storageError = true; fail(new Error('Fotoğraf galeriden kaldırıldı; Storage dosyası temizlenemedi.')); }
    }
    setBusy(false); await loadCategory(category.slug);
    if (!storageError) message('Fotoğraf silindi.');
  }
  const categoryFields = 'slug,label,public_page,display_order,kind,summary,cover_url,cover_storage_path,cover_width,cover_height,is_visible,is_custom';
  async function updateCategory(slug, values) {
    const { data, error } = await client.from('gallery_categories').update(values).eq('slug', slug).select(categoryFields).single();
    if (error) throw new Error(`Kategori kaydedilemedi: ${error.message}`);
    if (!data || data.slug !== slug) throw new Error('Kategori güncellenmedi. Yönetici yetkisini kontrol edin.');
    return data;
  }
  function setCategoryOrderDirty(value) {
    categoryOrderDirty = value;
    $('#save-category-order').disabled = busy || !value;
    $('#category-order-status').textContent = value ? 'Kategori sırası değişti. Kaydet düğmesine basın.' : 'Kategori sırası kaydedildi.';
  }
  function syncCategoryOrder() {
    const ids = [...$('#categories').querySelectorAll('.category-tab')].map(item => item.dataset.slug);
    categories.sort((a, b) => ids.indexOf(a.slug) - ids.indexOf(b.slug));
    setCategoryOrderDirty(true);
  }
  function renderCategories() {
    const root = $('#categories'); root.replaceChildren();
    for (const [kind, title] of [['organizasyon', 'Organizasyon'], ['cicekcilik', 'Çiçek']]) {
      const section = document.createElement('section'); section.className = 'admin-category-group';
      const heading = document.createElement('h2'); heading.textContent = title;
      const nav = document.createElement('div'); nav.className = 'category-tabs'; nav.dataset.categoryKind = kind;
      nav.setAttribute('role', 'group'); nav.setAttribute('aria-label', `${title} kategorileri`);
      section.append(heading, nav); root.append(section);
      const items = categories.filter(item => (item.kind || 'organizasyon') === kind);
      if (!items.length) {
        const empty = document.createElement('p'); empty.className = 'help'; empty.textContent = 'Henüz kategori yok. Yeni kategori oluştururken bu bölümü seçebilirsiniz.'; nav.append(empty);
      }
      items.forEach((item, index) => {
      const wrapper = document.createElement('div'); wrapper.className = 'category-tab'; wrapper.dataset.slug = item.slug;
      const handle = document.createElement('button'); handle.type = 'button'; handle.className = 'category-drag'; handle.textContent = '☷';
      handle.setAttribute('aria-label', `${item.label} kategorisini sürükleyerek sırala`);
      const button = document.createElement('button'); button.type = 'button'; button.className = 'category-select';
      button.textContent = item.label + (item.is_visible === false ? ' (Gizli)' : ''); button.dataset.slug = item.slug;
      button.setAttribute('aria-current', String(category?.slug === item.slug));
      button.addEventListener('click', () => loadCategory(item.slug));
      wrapper.append(handle, button);
      for (const [direction, symbol, title] of [[-1, '←', 'Öne taşı'], [1, '→', 'Arkaya taşı']]) {
        const move = document.createElement('button'); move.type = 'button'; move.className = 'category-move'; move.textContent = symbol;
        move.setAttribute('aria-label', `${item.label}: ${title}`);
        move.disabled = direction < 0 ? index === 0 : index === items.length - 1;
        move.addEventListener('click', () => {
          if (busy) return;
          const target = direction < 0 ? wrapper.previousElementSibling : wrapper.nextElementSibling;
          if (!target) return;
          nav.insertBefore(wrapper, direction < 0 ? target : target.nextSibling);
          syncCategoryOrder(); renderCategories();
        });
        wrapper.append(move);
      }
      nav.append(wrapper);
      });
    }
  }
  async function saveCategoryOrder() {
    if (!categoryOrderDirty) return true;
    if (busy) return false;
    setBusy(true);
    try {
      for (let index = 0; index < categories.length; index++) {
        const row = await updateCategory(categories[index].slug, {display_order: index + 1});
        categories[index] = row;
      }
      setCategoryOrderDirty(false);
      message('Kategori sırası kaydedildi. Ana sayfayı yenileyerek görebilirsiniz.');
      return true;
    } catch (error) { fail(error); return false; }
    finally { setBusy(false); }
  }
  $('#save-category-order').addEventListener('click', saveCategoryOrder);
  let categoryDrag;
  const categoryNav = $('#categories');
  categoryNav.addEventListener('pointerdown', event => {
    const handle = event.target.closest('.category-drag');
    if (!handle || busy) return;
    categoryDrag = {id: event.pointerId, item: handle.closest('.category-tab'), x: event.clientX, y: event.clientY, moved: false};
    categoryNav.setPointerCapture(event.pointerId);
  });
  categoryNav.addEventListener('pointermove', event => {
    if (!categoryDrag || categoryDrag.id !== event.pointerId) return;
    if (!categoryDrag.moved && Math.hypot(event.clientX - categoryDrag.x, event.clientY - categoryDrag.y) < 8) return;
    categoryDrag.moved = true;
    const item = categoryDrag.item; item.classList.add('dragging'); item.style.pointerEvents = 'none';
    const nav = item.parentElement;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.category-tab');
    if (target && target !== item && target.parentElement === nav) {
      const rect = target.getBoundingClientRect();
      const before = event.clientX < rect.left + rect.width / 2;
      nav.insertBefore(item, before ? target : target.nextSibling);
    }
    const rect = nav.getBoundingClientRect();
    if (event.clientX < rect.left + 35) nav.scrollLeft -= 15;
    if (event.clientX > rect.right - 35) nav.scrollLeft += 15;
  });
  function finishCategoryDrag(event) {
    if (!categoryDrag || categoryDrag.id !== event.pointerId) return;
    categoryDrag.item.classList.remove('dragging'); categoryDrag.item.style.pointerEvents = '';
    if (categoryDrag.moved) { syncCategoryOrder(); renderCategories(); }
    categoryDrag = null;
    if (categoryNav.hasPointerCapture(event.pointerId)) categoryNav.releasePointerCapture(event.pointerId);
  }
  categoryNav.addEventListener('pointerup', finishCategoryDrag);
  categoryNav.addEventListener('pointercancel', finishCategoryDrag);
  categoryNav.addEventListener('lostpointercapture', finishCategoryDrag);
  async function showAdmin() {
    setBusy(true);
    try {
      const { data, error } = await client.from('gallery_categories').select(categoryFields).order('display_order').order('slug');
      if (error) throw error;
      categories = data || [];
      renderCategories(); setCategoryOrderDirty(false);
      loginView.hidden = true; adminView.hidden = false; $('#logout').hidden = false;
      $('#edit-category').hidden = !categories.length;
      if (!categories.length) { category = null; photos = []; renderPhotos(); $('#category-title').textContent = 'Yeni bir kategori oluşturun'; $('#public-link').removeAttribute('href'); }
    } catch (error) { fail(error); return; }
    finally { setBusy(false); }
    await loadCategory(category?.slug && categories.some(item => item.slug === category.slug) ? category.slug : categories[0]?.slug);
  }
  function slugify(value) {
    return value.toLocaleLowerCase('tr-TR').replaceAll('ı','i').replaceAll('ğ','g').replaceAll('ü','u').replaceAll('ş','s').replaceAll('ö','o').replaceAll('ç','c')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0, 70);
  }
  $('#create-category').addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    if (!(await saveOrder())) return;
    const label = form.elements.label.value.trim();
    const baseSlug = slugify(label);
    const kind = form.elements.kind.value;
    if (baseSlug.length < 2) { message('Daha uzun bir kategori adı yazın.', true); return; }
    const existing = categories.find(item => slugify(item.label) === baseSlug && item.kind === kind && !['kurumsal', 'konsept'].includes(item.slug));
    if (existing) {
      if (existing.is_visible !== false) {
        await loadCategory(existing.slug);
        message('Bu adla yayında bir kategori var. Düzenlemek için kategori seçildi.', true); return;
      }
      setBusy(true);
      try {
        await updateCategory(existing.slug, {label, kind, summary: form.elements.summary.value.trim() || existing.summary || '', is_visible: true});
        category = {slug: existing.slug};
        form.reset(); form.closest('details').open = false;
        setBusy(false); await showAdmin();
        message('Gizli kategori tekrar yayına açıldı. Eski kapak ve fotoğrafları korundu.');
      } catch (error) { fail(error); } finally { setBusy(false); }
      return;
    }
    // URLs are permanent identifiers: a renamed category must not reserve its old display name.
    let slug = baseSlug, suffix = 2;
    while (categories.some(item => item.slug === slug) || ['kurumsal', 'konsept'].includes(slug)) {
      slug = `${baseSlug.slice(0, 60)}-${suffix++}`;
    }
    setBusy(true);
    try {
    const { data: created, error } = await client.from('gallery_categories').insert({
      slug, label, kind, summary: form.elements.summary.value.trim(),
      public_page: `kategori.html?slug=${slug}`, display_order: Math.max(0,...categories.map(item => item.display_order || 0)) + 1,
      is_visible: false, is_custom: true
    }).select(categoryFields).single();
    setBusy(false);
    if (error) throw error;
    if (!created) throw new Error('Kategori oluşturulamadı. Yönetici yetkisini kontrol edin.');
    form.reset(); form.closest('details').open = false;
    category = {slug}; await showAdmin(); message('Taslak kategori oluşturuldu. Kapak ve fotoğrafları ekledikten sonra görünürlüğü açabilirsiniz.');
    } catch (error) { fail(error); } finally { setBusy(false); }
  });
  $('#edit-category').addEventListener('submit', async event => {
    event.preventDefault(); if (!category || busy) return;
    const form = event.currentTarget;
    if (!(await saveOrder())) return;
    const label = form.elements.label.value.trim();
    if (!label) return;
    setBusy(true);
    try {
    await updateCategory(category.slug, {
      label, kind: form.elements.kind.value, summary: form.elements.summary.value.trim(),
      is_visible: form.elements.is_visible.checked
    });
    setBusy(false);
    await showAdmin(); message('Kategori bilgileri kaydedildi. Ana sayfayı yenileyerek görebilirsiniz.');
    } catch (error) { fail(error); } finally { setBusy(false); }
  });
  $('#remove-category-cover').addEventListener('click', async () => {
    if (!category || busy) return;
    if (!category.cover_url) { message('Bu kategoride yüklenmiş kapak yok.'); return; }
    if (!confirm('Yüklediğiniz kategori kapağı kaldırılsın mı? Kategorinin fotoğrafları korunacak.')) return;
    if (!(await saveOrder())) return;
    const oldPath = category.cover_storage_path;
    setBusy(true);
    try {
      await updateCategory(category.slug, {cover_url: null, cover_storage_path: null, cover_width: null, cover_height: null});
      let storageError;
      if (oldPath) storageError = (await client.storage.from('gallery-photos').remove([oldPath])).error;
      setBusy(false); await showAdmin();
      message(storageError ? 'Kapak siteden kaldırıldı; depolama dosyası temizlenemedi.' : 'Yüklenen kategori kapağı kaldırıldı.', Boolean(storageError));
    } catch (error) { fail(error); } finally { setBusy(false); }
  });
  $('#delete-category').addEventListener('click', async () => {
    if (!category || busy) return;
    if (!confirm(`“${category.label}” kategorisi siteden kaldırılsın mı? Tekrar açabilmeniz için kapak ve fotoğrafları korunacak.`)) return;
    if (!(await saveOrder())) return;
    setBusy(true);
    try {
      await updateCategory(category.slug, {is_visible: false});
      setBusy(false); await showAdmin();
      message('Kategori siteden kaldırıldı. Aynı ad ve bölümle yeniden oluşturabilir veya Sitede göster seçeneğiyle geri açabilirsiniz.');
    } catch (error) { fail(error); } finally { setBusy(false); }
  });
  $('#cover-file').addEventListener('change', async event => {
    const file = event.target.files[0]; event.target.value = '';
    if (!file || !category || busy) return;
    if (!(await saveOrder())) return;
    setBusy(true); let uploaded;
    try {
      uploaded = await upload(file, `covers/${category.slug}`);
      const oldPath = category.cover_storage_path;
      await updateCategory(category.slug, {
        cover_url: uploaded.url, cover_storage_path: uploaded.path,
        cover_width: uploaded.width, cover_height: uploaded.height
      });
      if (oldPath) await client.storage.from('gallery-photos').remove([oldPath]);
      setBusy(false); await showAdmin(); message('Kategori kapağı güncellendi.');
    } catch (error) {
      if (uploaded) await client.storage.from('gallery-photos').remove([uploaded.path]);
      fail(error);
    } finally { setBusy(false); }
  });
  async function checkAdmin() {
    const { data: session } = await client.auth.getSession();
    if (!session.session?.user) return;
    const { data, error } = await client.from('gallery_admins').select('user_id').eq('user_id', session.session.user.id).maybeSingle();
    if (error || !data) { await client.auth.signOut(); message('Bu hesap yönetici olarak yetkilendirilmemiş.', true); return; }
    await showAdmin();
  }
  $('#login-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!client) return;
    const form = event.currentTarget; const button = form.querySelector('button'); button.disabled = true;
    const { error } = await client.auth.signInWithPassword({
      email: form.elements.email.value.trim(), password: form.elements.password.value
    });
    button.disabled = false;
    if (error) { fail(error); return; }
    form.reset(); await checkAdmin();
  });
  $('#logout').addEventListener('click', async () => {
    if ((dirty || categoryOrderDirty) && !confirm('Kaydedilmemiş sıralamayı iptal edip çıkış yapmak istiyor musunuz?')) return;
    await client.auth.signOut(); adminView.hidden = true; loginView.hidden = false; $('#logout').hidden = true;
  });
  const bulkZone = $('#bulk-upload-zone');
  bulkZone.addEventListener('click', () => { if (!busy && category) $('#add-files').click(); });
  bulkZone.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!busy && category) $('#add-files').click(); }
  });
  for (const name of ['dragenter', 'dragover']) bulkZone.addEventListener(name, event => {
    event.preventDefault(); if (!busy && category) { event.dataTransfer.dropEffect = 'copy'; bulkZone.classList.add('drag-over'); }
  });
  bulkZone.addEventListener('dragleave', () => bulkZone.classList.remove('drag-over'));
  bulkZone.addEventListener('drop', event => {
    event.preventDefault(); bulkZone.classList.remove('drag-over');
    if (!busy && category) addFiles([...event.dataTransfer.files]);
  });
  $('#add-files').addEventListener('change', event => {
    const files = [...event.target.files]; event.target.value = ''; addFiles(files);
  });
  $('#save-suggested-titles').addEventListener('click', async () => {
    if (busy || !category || !(await saveOrder())) return;
    const candidates = photos.filter(photo => {
      const suggestion = curated(photo);
      return suggestion && (!photo.item_description || !photo.item_title || /^[A-F\d -]{20,}$/i.test(photo.item_title));
    });
    if (!candidates.length) return;
    setBusy(true);
    let saved = 0;
    for (const photo of candidates) {
      const title = photo.item_title && !/^[A-F\d -]{20,}$/i.test(photo.item_title) ? photo.item_title : curated(photo).title;
      const description = photo.item_description || curated(photo).description;
      const { error } = await client.from('gallery_photos').update({
        item_title: title, item_description: description, alt_text: `${title} — Masal Dekor Darende`
      }).eq('id', photo.id).eq('category', category.slug);
      if (error) { fail(error); break; }
      photo.item_title = title; photo.item_description = description; saved++;
    }
    setBusy(false);
    await loadCategory(category.slug);
    if (saved) message(`${saved} ürünün eksik adı/açıklaması kaydedildi.`);
  });
  $('#remove-duplicate-photos').addEventListener('click', async () => {
    if (busy || !category || !(await saveOrder())) return;
    const duplicates = photos.filter(photo => curated(photo)?.duplicate);
    if (!duplicates.length || !confirm(`${duplicates.length} tekrar eden fotoğrafı galeriden ve depolamadan silmek istiyor musunuz?`)) return;
    setBusy(true);
    let deleted = 0;
    for (const photo of duplicates) {
      const { error } = await client.from('gallery_photos').delete().eq('id', photo.id).eq('category', category.slug);
      if (error) { fail(error); break; }
      if (photo.storage_path) {
        const removed = await client.storage.from('gallery-photos').remove([photo.storage_path]);
        if (removed.error) { fail(removed.error); break; }
      }
      deleted++;
    }
    setBusy(false);
    await loadCategory(category.slug);
    if (deleted) message(`${deleted} tekrar eden fotoğraf silindi.`);
  });
  saveButton.addEventListener('click', saveOrder);
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    const element = event.target.closest('.photo-card');
    if (!button || !element || busy) return;
    const photo = photos.find(item => item.id === element.dataset.id);
    if (!photo) return;
    switch (button.dataset.action) {
      case 'first': list.prepend(element); renumber(); setDirty(true); break;
      case 'preview':
        preview.querySelector('img').src = photoUrl(photo.image_url);
        preview.querySelector('img').alt = photo.alt_text;
        preview.querySelector('p').textContent = photo.alt_text;
        preview.showModal(); break;
      case 'delete': deletePhoto(photo); break;
      case 'title': {
        const title = element.querySelector('.item-title').value.trim();
        const description = element.querySelector('.item-description')?.value.trim() || '';
        const sameDay = element.querySelector('.same-day-available')?.checked || false;
        setBusy(true);
        client.from('gallery_photos').update({item_title: title, item_description: description, same_day_available: sameDay, alt_text: title ? `${title} — Masal Dekor ${category.label}` : `${category.label} fotoğrafı`})
          .eq('id', photo.id).eq('category', category.slug).then(({error}) => {
            setBusy(false); if (error) fail(error); else { photo.item_title = title; photo.item_description = description; photo.same_day_available = sameDay; message('Ürün bilgileri kaydedildi.'); }
          });
        break;
      }
      case 'replace': {
        const input = $('#replace-file');
        input.value = '';
        input.onchange = () => { if (input.files[0]) replacePhoto(photo, input.files[0]); };
        input.click(); break;
      }
    }
  });
  $('#close-preview').addEventListener('click', () => preview.close());
  preview.addEventListener('click', event => { if (event.target === preview) preview.close(); });
  let drag = null;
  list.addEventListener('pointerdown', event => {
    const handle = event.target.closest('.drag-handle');
    if (!handle || busy) return;
    const card = handle.closest('.photo-card');
    drag = { card, handle, id: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
    list.setPointerCapture(event.pointerId);
  });
  list.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 8) return;
    drag.moved = true; drag.card.classList.add('dragging');
    drag.card.style.pointerEvents = 'none';
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.photo-card');
    if (target && target !== drag.card && target.parentElement === list) {
      const rect = target.getBoundingClientRect();
      const before = Math.abs(event.clientY-(rect.top+rect.height/2)) < rect.height/2
        ? event.clientX < rect.left+rect.width/2
        : event.clientY < rect.top+rect.height/2;
      list.insertBefore(drag.card, before ? target : target.nextSibling);
      renumber();
    }
  });
  function finishDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    drag.card.classList.remove('dragging'); drag.card.style.pointerEvents = '';
    if (drag.moved) setDirty(true);
    drag = null;
  }
  list.addEventListener('pointerup', finishDrag);
  list.addEventListener('pointercancel', finishDrag);
  window.addEventListener('beforeunload', event => { if (dirty || categoryOrderDirty) { event.preventDefault(); event.returnValue = ''; } });

  if (!/^https:\/\/[^/]+/.test(config.url || '') || !config.publishableKey) {
    message('Önce js/gallery-config.js dosyasına Supabase URL ve publishable key girin.', true);
    $('#login-form').querySelector('button').disabled = true;
  } else if (!window.supabase?.createClient) {
    message('Supabase kütüphanesi yüklenemedi. Bağlantınızı kontrol edin.', true);
    $('#login-form').querySelector('button').disabled = true;
  } else {
    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
    });
    checkAdmin();
  }
})();



