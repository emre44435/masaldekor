document.addEventListener('DOMContentLoaded', () => {
  const main = document.querySelector('main[data-category-kind="organizasyon"]');
  if (!main) return;
  const gallery = main.querySelector('.wedding-gallery, .detail-gallery');
  const scope = main.querySelector('.detail-content');
  // The reference page places photos directly after the hero. Move only the
  // surrounding service copy; leave the gallery component and its children intact.
  if (gallery && scope && scope.previousElementSibling !== gallery) gallery.after(scope);
});
