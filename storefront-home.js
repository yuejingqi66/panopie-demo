/* Campaign and category images are illustrative; sale cards require reviewed cloud records. */
(() => {
  'use strict';
  const audienceMatches = (item, audience) => !audience || [audience, 'unisex'].includes(item.details?.audience);
  const isHome = p => p.get('view') === 'home' || ((!p.get('view') || p.get('view') === 'shop') && !['q','category','audience','brand','style','store','maxPrice','size','color','country','inStock','sort','tab','page','condition','minPrice','includeSoldOut','followedOnly','followFirst','colorFamily','material','fit','subtype','pattern','era','grade','basedIn'].some(name=>p.has(name)));
  const campaign = {
    image:'home-campaign.jpg',
    // Phones get a portrait file, so the wide picture is not cut down to a strip.
    mobileImage:'home-campaign-mobile.jpg',
    alt:'Illustration: three adults by a dark wall in three different styles. One wears a dark knit sweater and cream wide-leg pants, one a worn brown leather jacket and blue jeans, and one a gray hoodie and olive cargo pants.',
    title:'Dress your own way.',
    action:'Explore styles',
    view:'styles'
  };
  // The home pictures are a row of slides: swipe or use the arrows, and they change by themselves every six seconds. Today they are
  // illustrations; the same row will carry event posters and store ads. A slide with no view is a picture only. One slide links to its
  // style page (owner, 2026-11-24, request 211).
  const slides = [
    { image:campaign.image, mobileImage:campaign.mobileImage, alt:campaign.alt, title:campaign.title, action:campaign.action, view:campaign.view, params:{} },
    { image:'home-style-vintage.jpg', mobileImage:'home-style-vintage.jpg', alt:'Illustration: worn brown leather jacket over a white T-shirt with faded blue jeans', title:'Vintage.', action:'Shop vintage', view:'style', params:{style:'vintage'} },
    { image:'home-style-minimal.jpg', mobileImage:'home-style-minimal.jpg', alt:'Illustration: ivory knit sweater tucked into cream wide-leg pants', title:'Minimal.', action:'', view:'', params:{} }
  ];
  const SLIDE_MS = 6000;
  // One set of listeners for the page, started when the script loads, so a redraw of the home page never doubles them.
  const carousel = () => document.querySelector('[data-home-carousel]');
  const trackOf = box => box?.querySelector('.home-track');
  const reduced = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const indexOf = track => Math.max(0, Math.min(track.children.length - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
  const show = (box, behavior) => {
    const track = trackOf(box); if (!track) return; const at = indexOf(track);
    [...track.children].forEach((slide, i) => { if (i === at) slide.removeAttribute('inert'); else slide.setAttribute('inert', ''); });
    box.querySelectorAll('[data-carousel-dot]').forEach((dot, i) => { if (i === at) dot.setAttribute('aria-current', 'true'); else dot.removeAttribute('aria-current'); });
    const live = box.querySelector('[data-carousel-status]'); if (live && box.dataset.shown !== String(at)) { box.dataset.shown = String(at); /* Only a slide the visitor chose is announced; the automatic ones are not. */ if (Date.now() - Number(box.dataset.touched || 0) < 1500) live.textContent = `Slide ${at + 1} of ${track.children.length}: ${track.children[at]?.dataset.title || ''}`; }
  };
  const go = (box, to, user) => {
    const track = trackOf(box); if (!track) return; const count = track.children.length; const at = ((to % count) + count) % count;
    if (user) box.dataset.touched = String(Date.now()); else box.dataset.autoAt = String(Date.now());
    // Going round from the last picture to the first jumps at once, so the dots do not flash the middle one on the way.
    const jump = reduced() || Math.abs(at - indexOf(track)) > 1;
    track.scrollTo({ left: at * track.clientWidth, behavior: jump ? 'auto' : 'smooth' });
    if (jump) show(box);
  };
  const tick = () => {
    const box = carousel(); const track = trackOf(box); if (!box || !track || box.dataset.playing !== 'true' || reduced() || document.hidden) return;
    // The first look at a new row only starts its clock, so the first picture stays for a full six seconds.
    if (!box.dataset.autoAt) { box.dataset.autoAt = String(Date.now()); return; }
    if (box.matches(':hover') || box.querySelector(':focus-visible')) return;
    if (Date.now() - Math.max(Number(box.dataset.touched || 0), Number(box.dataset.autoAt || 0)) < SLIDE_MS) return;
    const rect = box.getBoundingClientRect(); if (rect.bottom < 0 || rect.top > (window.innerHeight || 800)) return;
    go(box, indexOf(track) + 1, false);
  };
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function' && typeof setInterval === 'function') {
    document.addEventListener('click', event => {
      const box = event.target?.closest?.('[data-home-carousel]'); if (!box) return; const track = trackOf(box); if (!track) return;
      const hit = selector => event.target.closest(selector);
      if (hit('[data-carousel-prev]')) { event.preventDefault(); go(box, indexOf(track) - 1, true); }
      else if (hit('[data-carousel-next]')) { event.preventDefault(); go(box, indexOf(track) + 1, true); }
      else if (hit('[data-carousel-dot]')) { event.preventDefault(); go(box, Number(hit('[data-carousel-dot]').dataset.carouselDot), true); }
    });
    // A scroll does not bubble, so it is heard on the way down.
    document.addEventListener('scroll', event => { const box = event.target?.closest?.('[data-home-carousel]'); if (box) { if (Date.now() - Number(box.dataset.autoAt || 0) > 1500) box.dataset.touched = String(Date.now()); show(box); } }, true);
    setInterval(tick, 1000);
  }
  const layoutPreview = () => window.__TEST_FIXTURE === true && ['localhost','127.0.0.1','[::1]'].includes(location.hostname) && location.pathname === '/__qa__/index.html' && new URLSearchParams(location.search).get('preview') === 'layout';
  const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || '');
  const arrivals = items => items.filter(item => item.status === 'active' && item.reviewStatus === 'Approved' && uuid(item.id) && uuid(item.merchantStoreId)).sort((a,b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)).slice(0,4);
  window.PANOPIE_HOME = {audienceMatches,isHome,campaign,slides,arrivals,attach(c) {
    const {esc:e,link,icon} = c;
    // What each style illustration shows, for people who cannot see it.
    const styleAlt = {minimal:'Illustration: ivory knit sweater tucked into cream wide-leg pants',vintage:'Illustration: worn brown leather jacket over a white T-shirt with faded blue jeans',workwear:'Illustration: faded navy chore jacket over a gray T-shirt with tan canvas pants',formal:'Illustration: black dinner jacket with satin lapels, white dress shirt, black bow tie and black pants'};
    // One square image file per tile: home-category-<id>.jpg. The preview shelf still uses the shared sheet.
    const tiles = [['dresses','Dresses'],['knitwear','Knitwear'],['jackets','Outerwear'],['jeans','Denim'],['bags','Bags']];
    const previewShelf = (id,title,copy,route,action,previews,extras={}) => `<section class="home-merchandise" aria-labelledby="home-${id}-title"><div class="home-section-heading"><h2 id="home-${id}-title">${e(title)}</h2>${link(route,action,extras,'table-action')}</div><p class="home-shelf-note">${e(copy)} <span>Layout preview · Not for sale.</span></p><div class="home-product-grid">${previews.map(([name,crop])=>`<article class="home-product-preview"><div class="home-preview-image ${crop}" role="img" aria-label="${e(name)} illustrative product reference"><span>Preview</span></div><div class="home-preview-info"><h3>${e(name)}</h3><p>Store & product details to come</p></div></article>`).join('')}</div></section>`;
    return () => {
      const connected = c.configured?.() && c.backend?.();
      const pieces = connected ? arrivals(c.market()) : [];
      const previews = layoutPreview() ? window.PANOPIE_HOME_PREVIEW : null;
      const merchandise = previews ? previewShelf('featured','New stores','Pieces from new stores will show here.','stores','Explore stores',previews.featured) + previewShelf('bestsellers','Best sellers','Once shopping opens, this shelf will show the pieces bought most often in paid orders on Panopie in the last 30 days.','shop','Browse all',previews.bestsellers,{category:'all',sort:'sales'}) : pieces.length ? `<section class="home-merchandise" aria-labelledby="home-arrivals-title"><div class="home-section-heading"><h2 id="home-arrivals-title">New arrivals</h2>${link('shop','Explore new arrivals',{category:'all',sort:'newest'},'table-action')}</div><div class="home-product-grid">${pieces.map(item=>c.card(item,{headingLevel:3})).join('')}</div></section>` : connected ? `<p class="home-availability">The first collections are on their way. ${link('seller-start','Apply to sell',{},'table-action')}</p>` : '';
      return `<section class="storefront-home">
        <div class="home-utility"><form class="platform-search-row home-search" data-commerce-form="search"><label>${icon('search')}<span class="sr-only">Search brands, products or styles</span><input name="q" placeholder="Search a brand, piece or style" autocomplete="off" maxlength="120"></label><button type="submit">Search</button></form></div>
        <h1 class="sr-only">${e(campaign.title)}</h1>
        <section class="home-carousel" data-home-carousel data-playing="${reduced() ? 'false' : 'true'}" aria-roledescription="carousel" aria-label="Featured">
          <div class="home-track" tabindex="0" role="group" aria-label="Featured pictures. Use the left and right arrow keys, or swipe.">${slides.map((slide,i)=>`<figure class="home-campaign home-slide" role="group" aria-roledescription="slide" aria-label="${i+1} of ${slides.length}" data-title="${e(slide.title)}"${i?' inert':''}><picture><source media="(max-width:700px)" srcset="${e(slide.mobileImage)}"><img src="${e(slide.image)}" alt="${e(slide.alt)}" width="${i?1000:2400}" height="${i?1000:1200}"${i?' loading="lazy"':' fetchpriority="high"'} decoding="async" draggable="false"></picture><figcaption><div class="home-campaign-copy"><p class="home-campaign-title">${e(slide.title)}</p>${slide.view?link(slide.view,slide.action,slide.params,'home-campaign-action'):''}</div><p class="home-campaign-note">Illustration only. Not a Panopie store or a product for sale.</p></figcaption></figure>`).join('')}</div>
          <div class="home-carousel-controls"><button type="button" class="home-carousel-arrow is-prev" data-carousel-prev aria-label="Previous slide">${icon('arrow')}</button><div class="home-carousel-dots">${slides.map((slide,i)=>`<button type="button" class="home-carousel-dot" data-carousel-dot="${i}" aria-label="Show slide ${i+1}: ${e(slide.title)}"${i?'':' aria-current="true"'}></button>`).join('')}</div><button type="button" class="home-carousel-arrow is-next" data-carousel-next aria-label="Next slide">${icon('arrow')}</button></div>
          <p class="sr-only" role="status" aria-live="polite" data-carousel-status></p>
        </section>
        <div class="home-content">
          ${merchandise}
          ${c.founding?.() || ''}
          <section class="home-categories"><div class="home-section-heading"><h2>Shop by category</h2>${link('shop','Shop all',{category:'all'},'table-action')}</div><nav class="home-category-grid" aria-label="Shop by category">${tiles.map(([id,name])=>link('shop',`<img class="home-tile-image" src="home-category-${e(id)}.jpg" alt="" width="800" height="800" loading="lazy" decoding="async"><span>${e(name)} ${icon('arrow')}</span>`,{category:id},'home-category-link')).join('')}</nav><nav class="home-category-more" aria-label="More categories">${[['t-shirts','T-shirts & tops'],['hoodies','Hoodies'],['trousers','Trousers'],['skirts','Skirts'],['athletic-shoes','Sneakers'],['jewelry','Jewelry']].map(([id,name])=>link('shop',e(name),{category:id})).join('')}</nav><p class="home-reference-note">Category images are illustrative, not products for sale.</p></section>
          <section class="home-styles"><div class="home-section-heading"><h2>Shop by style</h2>${link('styles','Explore all styles',{},'table-action')}</div><div class="home-style-grid">${(window.PANOPIE_STYLES.featured||window.PANOPIE_STYLES.directions.slice(0,3)).map(style=>link('style',`<img class="home-tile-image" src="${e(style.image)}" alt="${e(styleAlt[style.id]||`Illustrative image for ${style.name}`)}" width="1000" height="1000" loading="lazy" decoding="async"><span>${e(style.name)} ${icon('arrow')}</span>`,{style:style.id},'home-style-link')).join('')}</div><p class="home-reference-note">Style images are illustrative, not products for sale.</p></section>
        </div>
      </section>`;
    };
  }};
})();
