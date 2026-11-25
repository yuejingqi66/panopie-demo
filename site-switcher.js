(() => {
  'use strict';
  // The Ship to site control in the dark strip at the top of every page, and the same choice in
  // the footer. The strip is not redrawn with the page, so focus stays on the control after a switch.
  const fx = window.PANOPIE_CURRENCY;
  const strip = document.querySelector('.shipping-strip');
  if (!fx || !strip) return;
  const esc = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const live = message => { const node = document.querySelector('#platformLiveStatus'); if (node) { node.textContent = ''; requestAnimationFrame(() => { node.textContent = message; }); } };
  const chevron = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  // Just the countries, with no extra text under them (owner decision 2026-10-15, REQUEST_LOG 77; the UK,
  // Australia and New Zealand since REQUEST_LOG 114).
  const options = Object.values(fx.SITES).map(value => [value.code, value.name]);
  const message = code => `Switched to the ${fx.SITES[code].label} site. You’ll see stores that ship to ${fx.SITES[code].place}.`;

  const text = strip.textContent.trim();
  strip.innerHTML = `<p class="shipping-strip-copy"><span>PRIVATE PILOT</span><span class="shipping-strip-more"> · REVIEWED STORES · ONE SHOPPER BAG</span></p><div class="site-switcher"><button class="site-switcher-button" type="button" aria-expanded="false" aria-controls="sitePanel"></button><div class="site-panel" id="sitePanel" hidden><p class="site-panel-title" id="sitePanelTitle">Where is your order going?</p><div class="site-panel-options" role="group" aria-labelledby="sitePanelTitle">${options.map(([code, name]) => `<button type="button" class="site-panel-option" data-site-choice="${code}" aria-pressed="false"><strong>${esc(name)}<small class="site-panel-current">Current</small></strong></button>`).join('')}</div></div></div>`;
  strip.dataset.original = text;
  const button = strip.querySelector('.site-switcher-button');
  const panel = strip.querySelector('#sitePanel');

  const paint = () => {
    const site = fx.site();
    button.innerHTML = `<span>Ship to: ${esc(site.label)}</span>${chevron}`;
    button.setAttribute('aria-label', `Ship to ${site.label}. Change country`);
    strip.querySelectorAll('[data-site-choice]').forEach(option => {
      const current = option.dataset.siteChoice === site.code;
      option.setAttribute('aria-pressed', String(current));
      option.classList.toggle('is-current', current);
    });
    document.querySelectorAll('[data-site-footer]').forEach(option => option.setAttribute('aria-pressed', String(option.dataset.siteFooter === site.code)));
  };
  const open = () => { panel.hidden = false; button.setAttribute('aria-expanded', 'true'); };
  const close = (focus = false) => { panel.hidden = true; button.setAttribute('aria-expanded', 'false'); if (focus) button.focus(); };
  // Where the last switch came from, read once by the page after it redraws, to put focus back.
  let origin = '';
  const choose = (code, { from = 'strip' } = {}) => {
    const before = fx.siteCode(); origin = from;
    fx.setSite(code);
    paint();
    if (from === 'strip') close(true);
    live(before === fx.siteCode() ? `You're on the ${fx.site().label} site.` : message(fx.siteCode()));
  };

  button.addEventListener('click', () => (panel.hidden ? open() : close()));
  button.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); open(); strip.querySelector('.site-panel-option.is-current, .site-panel-option')?.focus(); }
  });
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const items = [...panel.querySelectorAll('.site-panel-option')];
    const index = items.indexOf(document.activeElement);
    items[(index + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus();
  });
  strip.addEventListener('focusout', event => { if (!panel.hidden && !strip.querySelector('.site-switcher').contains(event.relatedTarget)) close(); });
  document.addEventListener('click', event => {
    const choice = event.target.closest('[data-site-choice]');
    if (choice) { choose(choice.dataset.siteChoice, { from: strip.contains(choice) ? 'strip' : 'page' }); return; }
    // "Change where you ship" on an empty page opens the panel at the top, with focus on the current country.
    if (event.target.closest('[data-site-panel-open]')) { open(); strip.scrollIntoView?.({ block: 'nearest' }); strip.querySelector('.site-panel-option.is-current, .site-panel-option')?.focus(); return; }
    const footerChoice = event.target.closest('[data-site-footer]');
    if (footerChoice) { choose(footerChoice.dataset.siteFooter, { from: 'footer' }); return; }
    if (!panel.hidden && !strip.querySelector('.site-switcher').contains(event.target)) close();
  });
  fx.onChange(paint);
  paint();
  // setOrigin lets a switch made by the page itself (from an address) say where focus belongs after the redraw.
  window.PANOPIE_SITE_SWITCHER = { paint, takeOrigin: () => { const value = origin; origin = ''; return value; }, setOrigin: value => { origin = String(value || ''); } };
})();
