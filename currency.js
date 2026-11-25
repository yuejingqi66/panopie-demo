(() => {
  'use strict';
  // The site was called THREADLINE until 2026-10-20 (REQUEST_LOG 144). What a visitor's browser saved under the old
  // names moves to the new ones once, so the chosen site, followed stores and an unfinished application stay. This is
  // the first script on the page, so it runs before anything reads these keys.
  try {
    const moves = [['threadline.site', 'panopie.site'], ['threadline.site-follows', 'panopie.site-follows'], ['threadline.fx-usd', 'panopie.fx-usd'], ['threadline-platform-workspace-v1', 'panopie-platform-workspace-v1']];
    const sessionMoves = [['threadline-after-sign-in', 'panopie-after-sign-in']];
    // The saved workspace keeps only the view choices the live site saves itself (persist in index.html).
    const keep = { 'panopie-platform-workspace-v1': ['selectedVariants', 'selectedMedia', 'activeStoreId', 'checkoutAddressId', 'merchant'] };
    const only = (to, value) => {
      if (!keep[to]) return value;
      const saved = JSON.parse(value);
      const kept = Object.fromEntries(keep[to].filter(name => saved && name in saved).map(name => [name, saved[name]]));
      // Of the application, the live site saves only the step and whether a review note was seen.
      if (kept.merchant && typeof kept.merchant === 'object') kept.merchant = { step: kept.merchant.step, returnSeen: kept.merchant.returnSeen };
      return JSON.stringify(kept);
    };
    const move = (store, pairs) => {
      for (const [from, to] of pairs) {
        const value = store.getItem(from);
        if (value === null) continue;
        try { if (store.getItem(to) === null) store.setItem(to, only(to, value)); } catch {}
        store.removeItem(from);
      }
    };
    if (typeof window !== 'undefined' && window.localStorage) {
      move(window.localStorage, moves);
      // Local demo data from the test pages is not carried over.
      window.localStorage.removeItem('threadline-local-merchant-screening-v1');
      window.localStorage.removeItem('threadline-qa-workspace-v1');
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      move(window.sessionStorage, sessionMoves);
      window.sessionStorage.removeItem('threadline-local-reviewer-session');
    }
  } catch {} // Storage can be blocked (private windows); the site then simply starts fresh.
  // Sites (owner decisions 2026-10-14, REQUEST_LOG 72 and 75; the UK, Australia and New Zealand since
  // REQUEST_LOG 114). A store prices in one currency, US or Canadian dollars. A shopper whose site uses
  // another currency also sees an approximate amount, converted with the day's published rate, which the
  // shopper's browser reads from a free public service. Nothing here is a charge: the store's own price
  // is the price. On the UK, Australia and New Zealand sites prices are compared (sort, price filter) in
  // US dollars, and the estimate is in the local currency.
  const SITES = {
    US: { code: 'US', country: 'US', currency: 'USD', estimate: 'USD', name: 'United States', place: 'the United States', label: 'US', other: 'CA' },
    CA: { code: 'CA', country: 'CA', currency: 'CAD', estimate: 'CAD', name: 'Canada', place: 'Canada', label: 'Canada', other: 'US' },
    GB: { code: 'GB', country: 'GB', currency: 'USD', estimate: 'GBP', name: 'United Kingdom', place: 'the United Kingdom', label: 'UK', other: '' },
    AU: { code: 'AU', country: 'AU', currency: 'USD', estimate: 'AUD', name: 'Australia', place: 'Australia', label: 'Australia', other: '' },
    NZ: { code: 'NZ', country: 'NZ', currency: 'USD', estimate: 'NZD', name: 'New Zealand', place: 'New Zealand', label: 'New Zealand', other: '' }
  };
  const CURRENCIES = {
    USD: { prefix: 'US$', name: 'US dollars' }, CAD: { prefix: 'CA$', name: 'Canadian dollars' },
    GBP: { prefix: '£', name: 'British pounds' }, AUD: { prefix: 'A$', name: 'Australian dollars' }, NZD: { prefix: 'NZ$', name: 'New Zealand dollars' }
  };
  // How many of each currency one US dollar buys must fall in these ranges, or the rate is not used.
  const RANGES = { CAD: [0.5, 3], GBP: [0.3, 1.5], AUD: [0.7, 3], NZD: [0.7, 3.5] };
  const SITE_KEY = 'panopie.site';
  // A new key since the rate carries more than one currency, so an older saved rate is not read.
  const RATE_KEY = 'panopie.fx-usd';
  // A published rate older than this is not used, so an old rate never passes for today's. Banks do
  // not publish on weekends and holidays, so a Friday rate is still the latest on a long weekend.
  const MAX_RATE_AGE_DAYS = 5;
  const RATE_SOURCES = [
    // Frankfurter now blends many central banks by default, so the request asks for the ECB's rate only.
    { name: 'European Central Bank', url: 'https://api.frankfurter.dev/v2/rates?base=USD&quotes=CAD,GBP,AUD,NZD&providers=ECB', parse: json => parseFrankfurter(json) },
    { name: 'Bank of Canada', url: 'https://www.bankofcanada.ca/valet/observations/FXUSDCAD,FXGBPCAD,FXAUDCAD,FXNZDCAD/json?recent=1', parse: json => parseBankOfCanada(json) }
  ];

  const fixture = () => (typeof window !== 'undefined' && window.__TEST_FIXTURE) ? new URLSearchParams(location.search) : null;
  const store = () => { try { return window.localStorage; } catch { return null; } };
  const read = key => { try { return store()?.getItem(key) || ''; } catch { return ''; } };
  const write = (key, value) => { try { store()?.setItem(key, value); } catch { /* Private mode: the choice lasts for this page only. */ } };

  const currencyOf = value => {
    const code = typeof value === 'string' ? value : value?.currency || value?.listing_currency;
    return CURRENCIES[code] ? code : 'USD';
  };
  // The first browser language set for Canada, the UK, Australia or New Zealand picks that site; everything else picks the US site.
  const pickSite = languages => {
    for (const value of Array.isArray(languages) ? languages : []) {
      const region = (String(value || '').trim().match(/-([A-Za-z]{2})$/) || [])[1]?.toUpperCase();
      if (region && region !== 'US' && SITES[region]) return region;
    }
    return 'US';
  };
  let pageChoice = '';
  const chosenSite = () => {
    const forced = fixture()?.get('qa-site');
    if (forced && SITES[forced.toUpperCase()]) return forced.toUpperCase();
    if (pageChoice) return pageChoice;
    const saved = read(SITE_KEY);
    return SITES[saved] ? saved : '';
  };
  const browserLanguages = () => {
    const forced = fixture()?.get('qa-lang');
    if (forced) return [forced];
    try { return navigator.languages?.length ? [...navigator.languages] : [navigator.language]; } catch { return []; }
  };
  const siteCode = () => chosenSite() || pickSite(browserLanguages());
  const site = () => SITES[siteCode()];
  // True until the shopper picks a site.
  const autoPicked = () => !chosenSite();
  const listeners = new Set();
  // kind is 'site' when the shopper switched sites and 'rate' when a new rate arrived.
  const notify = kind => listeners.forEach(fn => { try { fn(kind); } catch { /* A broken listener must not stop the others. */ } });
  const setSite = code => {
    const value = String(code || '').toUpperCase();
    if (!SITES[value]) return site();
    pageChoice = value;
    write(SITE_KEY, value);
    notify('site');
    return site();
  };
  const onChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

  const number = (value, digits) => Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  // Always with the country marker, on both sites: "US$72.50", "CA$98.00".
  const format = (value, currency = 'USD') => {
    const amount = Number(value || 0);
    const text = `${CURRENCIES[currencyOf(currency)].prefix}${number(Math.abs(amount), 2)}`;
    return amount < 0 ? `-${text}` : text;
  };
  // Approximate amounts are rounded to whole dollars, so they never look exact.
  const formatWhole = (value, currency = 'USD') => `${CURRENCIES[currencyOf(currency)].prefix}${number(Math.round(Number(value || 0)), 0)}`;
  // The last argument is the rate read below, or just a US-to-Canadian number (older callers).
  const ratesOf = value => typeof value === 'number' || typeof value === 'string' ? { CAD: Number(value) } : { CAD: Number(value?.usdToCad), ...(value?.rates || {}) };
  const convert = (amount, from, to, rateValue) => {
    const source = currencyOf(from); const target = currencyOf(to); const value = Number(amount || 0);
    if (source === target) return value;
    const rates = ratesOf(rateValue);
    const usd = source === 'USD' ? value : Number(rates[source]) > 0 ? value / Number(rates[source]) : null;
    if (usd == null) return null;
    const result = target === 'USD' ? usd : Number(rates[target]) > 0 ? usd * Number(rates[target]) : null;
    return result == null ? null : Math.round(result * 100) / 100;
  };

  const inRange = (code, value) => Number.isFinite(value) && value > RANGES[code][0] && value < RANGES[code][1];
  const plausible = value => inRange('CAD', value);
  const isoDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : '';
  // The US-to-Canadian rate is needed; the others are kept only when they look right, so a missing
  // pound or Australian dollar rate means no estimate in that currency, never a wrong one.
  const withRates = (usdToCad, date, extra) => {
    if (!plausible(usdToCad) || !date) return null;
    const rates = { CAD: usdToCad };
    for (const code of ['GBP', 'AUD', 'NZD']) if (inRange(code, Number(extra[code]))) rates[code] = Number(extra[code]);
    return { usdToCad, rates, date };
  };
  // Accepts the v2 answer (a list of rows) and the older v1 shape.
  function parseFrankfurter(json) {
    const rows = Array.isArray(json) ? json.filter(value => value?.base === 'USD') : null;
    const pick = code => Number(rows ? rows.find(value => value?.quote === code)?.rate : json?.rates?.[code]);
    const date = isoDate(rows ? rows.find(value => value?.quote === 'CAD')?.date : json?.date);
    return withRates(pick('CAD'), date, { GBP: pick('GBP'), AUD: pick('AUD'), NZD: pick('NZD') });
  }
  // The Bank of Canada gives each currency in Canadian dollars, so one US dollar buys (USD in CAD) / (GBP in CAD) pounds.
  function parseBankOfCanada(json) {
    const rows = Array.isArray(json?.observations) ? json.observations : [];
    const last = rows[rows.length - 1]; const usdToCad = Number(last?.FXUSDCAD?.v); const date = isoDate(last?.d);
    const cross = code => { const value = Number(last?.[`FX${code}CAD`]?.v); return value > 0 ? usdToCad / value : NaN; };
    return withRates(usdToCad, date, { GBP: cross('GBP'), AUD: cross('AUD'), NZD: cross('NZD') });
  }
  const ageDays = (date, now) => (new Date(now).getTime() - new Date(`${date}T12:00:00Z`).getTime()) / 86400000;
  const fresh = (value, now = Date.now()) => Boolean(value && plausible(Number(value.usdToCad)) && isoDate(value.date) && ageDays(value.date, now) <= MAX_RATE_AGE_DAYS && ageDays(value.date, now) > -2);

  // Rates on a fixture page are fixed, so the page never reaches the network.
  const fixtureRate = () => {
    const mode = fixture()?.get('qa-fx') || 'ok';
    if (mode === 'none') return null;
    if (mode === 'stale') return { usdToCad: 1.38, rates: { CAD: 1.38, GBP: 0.75, AUD: 1.5, NZD: 1.7 }, date: '2026-09-01', source: 'European Central Bank' };
    return { usdToCad: 1.40, rates: { CAD: 1.40, GBP: 0.75, AUD: 1.52, NZD: 1.70 }, date: '2026-10-13', source: mode === 'fallback' ? 'Bank of Canada' : 'European Central Bank' };
  };
  let current = null; let loading = null; let tried = false;
  // The saved rate is judged by the same clock as the call that reads it.
  const cached = (now = Date.now()) => { try { const value = JSON.parse(read(RATE_KEY) || 'null'); return fresh(value, now) ? value : null; } catch { return null; } };
  const rate = () => {
    if (fixture()) { const value = fixtureRate(); return fresh(value, new Date('2026-10-14T12:00:00Z')) ? value : null; }
    if (current && fresh(current)) return current;
    current = cached();
    return current;
  };
  const fetchJson = async (url, fetcher) => {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 6000) : null;
    try {
      const response = await fetcher(url, { signal: controller?.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
      return response.ok ? await response.json() : null;
    } catch { return null; } finally { if (timer) clearTimeout(timer); }
  };
  // Read at most once a day: a cached rate published within the last day is kept.
  const loadRate = async ({ fetcher = typeof fetch === 'function' ? fetch.bind(window) : null, now = Date.now() } = {}) => {
    if (fixture()) { tried = true; return rate(); }
    const saved = cached(now);
    const checkedToday = saved && saved.checkedAt && new Date(saved.checkedAt).toISOString().slice(0, 10) === new Date(now).toISOString().slice(0, 10);
    if (checkedToday) { current = saved; tried = true; return saved; }
    if (!fetcher) { tried = true; return saved; }
    if (loading) return loading;
    loading = (async () => {
      for (const source of RATE_SOURCES) {
        const parsed = source.parse(await fetchJson(source.url, fetcher));
        if (parsed && fresh(parsed, now)) {
          current = { ...parsed, source: source.name, checkedAt: new Date(now).toISOString() };
          write(RATE_KEY, JSON.stringify(current));
          tried = true;
          notify('rate');
          return current;
        }
      }
      current = saved;
      // Marked as tried before the redraw, so pages say there is no recent rate instead of waiting.
      tried = true;
      notify('rate');
      return saved;
    })();
    try { return await loading; } finally { loading = null; tried = true; }
  };

  const dateLabel = date => isoDate(date) ? new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';
  // "about CA$102" or "about £55", or '' when the amount is already in the site's currency or there is no rate.
  const approx = (amount, from, target = site().estimate) => {
    if (currencyOf(from) === currencyOf(target)) return '';
    const value = rate(); const converted = value ? convert(amount, from, target, value) : null;
    return converted == null ? '' : `about ${formatWhole(converted, target)}`;
  };
  // Each source is named the way its terms ask: the rates from Frankfurter are worked out from the
  // European Central Bank's euro rates; the Bank of Canada publishes its own.
  const rateNote = () => {
    const value = rate(); if (!value) return '';
    return value.source === 'Bank of Canada' ? `the Bank of Canada’s ${dateLabel(value.date)} exchange rate` : `the ${dateLabel(value.date)} exchange rate, calculated from European Central Bank rates`;
  };
  // True while the first read of the day is still on its way, so a page does not say "no rate" too early.
  const rateLoading = () => !tried && !rate() && !fixture();
  // The server accepts at most 8 decimals; a cross rate is rounded so it is never silently ignored.
  const rateForServer = () => { const value = rate(); return value ? Math.round(Number(value.usdToCad) * 1e6) / 1e6 : null; };

  window.PANOPIE_CURRENCY = {
    SITES, CURRENCIES, MAX_RATE_AGE_DAYS, currencyOf, pickSite, site, siteCode, autoPicked, setSite, onChange,
    format, formatWhole, convert, parseFrankfurter, parseBankOfCanada, fresh, rate, loadRate, approx, rateNote, rateLoading, rateForServer, dateLabel,
    name: code => CURRENCIES[currencyOf(code)].name, prefix: code => CURRENCIES[currencyOf(code)].prefix,
    defaultFor: country => country === 'CA' ? 'CAD' : 'USD'
  };
})();
