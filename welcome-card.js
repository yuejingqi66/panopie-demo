(() => {
  'use strict';
  // The welcome card (request 176): shown once to a new visitor. It says which country site they are on,
  // lets them change it, lists the countries stores can deliver to, and gives four short facts about Panopie.
  // It is not the automatic-site banner dropped in request 76: it carries a Change button and appears once.
  const fx = window.PANOPIE_CURRENCY;
  if (!fx || !document.body) return;
  const KEY = 'panopie.welcome';
  const test = window.__TEST_FIXTURE === true;
  const q = new URLSearchParams(location.search);
  // The fixture page used by the automated tests shows the card only when a test asks for it, so the other tests are not blocked by it.
  if (test && !q.has('qa-welcome')) return;
  const read = () => { try { return window.localStorage.getItem(KEY) === '1'; } catch { return false; } };
  const write = () => { try { window.localStorage.setItem(KEY, '1'); } catch { /* The card then comes back on the next visit. */ } };
  // Pages a person reaches from an email or a sign-in must not be covered.
  const quiet = new Set(['register', 'forgot', 'verify', 'verified', 'recovery', 'reset-password', 'accept-invitation', 'unsubscribe', 'payment-status']);
  // A visitor who has already closed the card, or who has already chosen a country site, does not see it.
  // In a test, qa-welcome=always shows it every time and plain qa-welcome shows it until it is closed once.
  if (quiet.has(q.get('view') || '') || (test ? (q.get('qa-welcome') !== 'always' && read()) : (read() || !fx.autoPicked()))) return;

  const esc = value => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const facts = [
    ['Independent stores, one place.', 'Each store keeps its own name, prices and policies.'],
    ['Every store and listing is reviewed.', 'We check each store and each listing before it goes live. We don’t inspect or authenticate pieces.'],
    ['New or pre-owned, always labeled.', 'Every listing says which it is. Pre-owned pieces show a condition grade.'],
    ['One bag, many stores.', 'When shopping opens, you’ll add pieces from different stores to one bag.']
  ];
  // While the marketplace is in its private pilot the card says plainly that nothing can be ordered yet.
  const pilot = () => window.PANOPIE_LEGAL_PROFILE?.launchState !== 'public_ready';
  const opener = document.activeElement;
  const root = document.createElement('div');
  root.className = 'welcome-card-backdrop';
  const paint = () => {
    const site = fx.site();
    root.innerHTML = `<section class="welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcome-title" aria-describedby="welcome-region" tabindex="-1">
      <button type="button" class="welcome-close" data-welcome-close aria-label="Close">${'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>'}</button>
      <h2 id="welcome-title">Welcome to Panopie.</h2>
      <p class="welcome-lead">Independent clothing stores, side by side.${pilot() ? ' Panopie is in a private pilot. You can look around, but ordering isn’t open yet.' : ''}</p>
      <div class="welcome-region" id="welcome-region"><p>You’re on the <strong>${esc(site.name)}</strong> site. You’ll see stores that ship to ${esc(site.place)}.</p>
        <p class="welcome-delivery">${esc(window.PANOPIE_LOCATIONS?.deliveryLine || '')}</p>
        <div class="welcome-change" role="group" aria-label="Choose your country site"><span>Not right? Change it:</span>${Object.values(fx.SITES).map(value => `<button type="button" data-welcome-site="${esc(value.code)}" aria-pressed="${value.code === site.code}">${esc(value.name)}</button>`).join('')}</div></div>
      <ul class="welcome-facts" role="list">${facts.map(([lead, rest]) => `<li><strong>${esc(lead)}</strong> <span class="welcome-rest">${esc(rest)}</span></li>`).join('')}</ul>
      <div class="welcome-actions"><button type="button" class="platform-button" data-welcome-close>Take a look around</button></div>
    </section>`;
  };
  const focusables = () => [...root.querySelectorAll('button')].filter(node => !node.disabled);
  const close = () => {
    write();
    root.remove();
    document.removeEventListener('keydown', onKey, true);
    document.documentElement.classList.remove('welcome-open');
    // Focus goes back to where it was, or to the page heading so keyboard users start at the top of the page.
    const heading = document.querySelector('#panopieApp h1');
    if (heading && !heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    (opener && opener !== document.body && document.contains(opener) ? opener : heading)?.focus?.({ preventScroll: true });
  };
  const onKey = event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const nodes = focusables(); if (!nodes.length) return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  root.addEventListener('click', event => {
    if (event.target.closest('[data-welcome-close]') || event.target === root) { close(); return; }
    const choice = event.target.closest('[data-welcome-site]');
    if (!choice) return;
    const before = fx.siteCode();
    fx.setSite(choice.dataset.welcomeSite);
    paint();
    root.querySelector(`[data-welcome-site="${fx.siteCode()}"]`)?.focus();
    const live = document.querySelector('#platformLiveStatus');
    if (live && before !== fx.siteCode()) { live.textContent = ''; requestAnimationFrame(() => { live.textContent = `Switched to the ${fx.site().label} site.`; }); }
  });
  paint();
  // If the country site changes elsewhere on the page, the card shows the current one.
  fx.onChange?.(kind => { if (kind === 'site' && root.isConnected) paint(); });
  document.body.append(root);
  document.documentElement.classList.add('welcome-open');
  document.addEventListener('keydown', onKey, true);
  // The card itself takes focus, so a long card on a phone is not scrolled past its heading; Tab then goes to the first control.
  (root.querySelector('.welcome-card') || root).focus?.({ preventScroll: true });
})();
