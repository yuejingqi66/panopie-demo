/* Durable commerce APIs. No provider credentials or simulated paid states. */
(() => {
  'use strict';
  const db = window.PANOPIE_DB;
  if (!db) return;
  let cartRevision = null;
  const client = () => {
    if (!db.configured || !db.client) throw new Error('Secure services are unavailable. No changes have been sent.');
    return db.client;
  };
  const rpc = async (name, values = {}) => {
    const { data, error } = await client().rpc(name, values);
    if (error) {
      // The code is kept on the error: it is there only when the database answered, which tells a refusal from a request that got no answer.
      const failed = message => Object.assign(new Error(message), { code: error.code || '' });
      if (error.code === 'PGRST202' || error.code === '42P01' || error.code === '42703') throw failed('This service is awaiting the commerce database update. No changes have been sent.');
      if (error.code === '40001') throw failed('This changed in another session. Refresh, check the latest details, and try again.');
      throw failed(db.friendlyMessage ? db.friendlyMessage(error) : error.message || 'The request could not be saved. Try again.');
    }
    return data;
  };
  // A store logo or cover is a path in storage (migration 017), shown through a short-lived signed link.
  // An older outside address is not shown: the page's security policy blocks outside images.
  const isStoragePath = value => typeof value === 'string' && /^[0-9a-f-]{36}\/store\/[^/]+$/i.test(value);
  const signedStoreImage = async path => { if (!isStoragePath(path)) return ''; const { data, error } = await client().storage.from('product-images').createSignedUrl(path, 3600); return error ? '' : data.signedUrl; };
  const signStoreImages = rowsIn => Promise.all((rowsIn || []).map(async row => ({ ...row, logo_src: await signedStoreImage(row.logo_url), banner_src: await signedStoreImage(row.banner_url) })));
  const rows = async query => { const { data, error } = await query; if (error) throw Object.assign(new Error(db.friendlyMessage ? db.friendlyMessage(error) : error.message), { code: error.code || '' }); return data || []; };
  const imageFiles = files => {
    const result = Array.from(files || []).filter(file => file.size);
    if (result.length > 10) throw new Error('Upload up to 10 images at a time.');
    if (result.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5242880)) throw new Error('Use JPG, PNG or WebP images, each under 5 MB.');
    return result;
  };
  Object.assign(db, {
    rpc,
    loadPublicStores: async () => signStoreImages(await rows(client().from('public_store_profiles').select('*').order('name').limit(200))),
    // The next 200 stores by name, for "Show more stores" in the directory (plan C5).
    loadMoreStores: async offset => signStoreImages(await rows(client().from('public_store_profiles').select('*').order('name').range(Math.max(0, Number(offset) || 0), Math.max(0, Number(offset) || 0) + 199))),
    // One published store, for a store page whose store is not in the first 200 (plan C5). Null when it isn't published.
    loadPublicStore: async id => { const { data, error } = await client().from('public_store_profiles').select('*').eq('id', id).maybeSingle(); if (error) throw Object.assign(new Error(db.friendlyMessage ? db.friendlyMessage(error) : error.message), { code: error.code || '' }); return data ? (await signStoreImages([data]))[0] : null; },
    loadHeaderCollections: async () => {
      const collections = await Promise.all(['men','women'].map(async audience => {
        const country = window.PANOPIE_CURRENCY?.site().country;
        const response = await rpc('catalogue_page', {p_filters:{audience,page_size:1,...(country ? {country} : {})}});
        return [audience,(response.brands || []).sort((a,b)=>a.name.localeCompare(b.name))];
      }));
      return Object.fromEntries(collections);
    },
    // The private listing records come from a table migration 022 adds; before it is pasted the list loads without them.
    // The tables no longer give a listing's base SKU, review note or each option's SKU and stock (migration 037);
    // addPrivateFields gets them for the store's own members.
    loadStoreProducts: async storeId => { const query = records => client().from('products').select(`id, store_id, slug, name, description, category, tone, status, created_at, updated_at, details, submitted_at, stores(*), product_variants(id, product_id, store_id, name, attributes, price_cents, is_active, created_at), product_images(*)${records}`).eq('store_id',storeId).order('created_at',{ascending:false}); let list; try { list = await rows(query(', product_seller_records(photo_edits, imported_from)')); } catch (error) { if (error?.code !== 'PGRST200') throw error; list = await rows(query('')); } return Promise.all((await db.addPrivateFields(list)).map(row=>db.mapProduct(row,new Set(),true))); },
    loadMarketplace: async (userId, filters = {}) => {
      const cleaned = window.PANOPIE_STYLES.filtersFor({...filters,q:String(filters.q || '').replace(/(?:under|below|budget|max|(?:US|CA|C|NZ|A)?\$|£|预算|以内)\s*(?:(?:US|CA|C|NZ|A)?\$|£)?\s*\d+(?:\.\d+)?(?:\s*(?:美元|加元|英镑|元|USD|CAD|GBP|AUD|NZD))?/ig,'').trim()});
      // Each site shows only stores that ship to its country, the home page included. The maximum price
      // and price order are in the site's currency; the database converts with the rate the page has,
      // or keeps to that currency when there is none.
      const fx = window.PANOPIE_CURRENCY; const site = fx?.site();
      if (window.PANOPIE_HOME.isHome(new URLSearchParams(filters))) { Object.keys(cleaned).forEach(key=>delete cleaned[key]); cleaned.sort='newest'; }
      if (site) { cleaned.country = site.country; cleaned.currency = site.currency; const rate = fx.rateForServer?.(); if (rate) cleaned.usdToCad = rate; }
      if (filters.view === 'store' && filters.id) cleaned.store = filters.id;
      // Since migration 025 the search takes lists (brand, category, condition and style; values joined by "|" in the
      // address), a price range, followed brands and the followed-first switch, and returns counts for each filter.
      // Before 025 is pasted the older single-value search answers, and the page shows the older filters.
      const list = value => [...new Set(String(value || '').split('|').map(item => item.trim()).filter(item => item && item !== 'all'))].slice(0, 50);
      const search = { q: cleaned.q || '', sort: cleaned.sort || '', page: cleaned.page || 1, audience: cleaned.audience || '', store: cleaned.store || '',
        country: cleaned.country || '', currency: cleaned.currency || '', ...(cleaned.usdToCad ? { usdToCad: cleaned.usdToCad } : {}),
        minPrice: filters.minPrice || '', maxPrice: cleaned.maxPrice || '',
        brands: list(filters.brand), categories: list(filters.category), conditions: list(filters.condition), styles: list(filters.style),
        sizes: list(filters.size), colors: list(filters.color),
        // Since migration 026: lists from the fixed details a store picks. An older search ignores these keys.
        colorFamilies: list(filters.colorFamily), materials: list(filters.material), fits: list(filters.fit), subtypes: list(filters.subtype),
        patterns: list(filters.pattern), eras: list(filters.era), grades: list(filters.grade),
        includeSoldOut: filters.includeSoldOut === 'true', followedOnly: filters.followedOnly === 'true', followFirst: filters.followFirst !== 'false',
        // Since migration 034: only stores based in this country (a two-letter code). An older search ignores it.
        basedIn: /^[A-Z]{2}$/.test(filters.basedIn || '') && filters.basedIn === site?.country ? filters.basedIn : '' };
      if (window.PANOPIE_HOME.isHome(new URLSearchParams(filters))) Object.assign(search, { sort: 'newest', brands: [], categories: [], conditions: [], styles: [], sizes: [], colors: [], colorFamilies: [], materials: [], fits: [], subtypes: [], patterns: [], eras: [], grades: [], minPrice: '', maxPrice: '', q: '', audience: '', basedIn: '' });
      let response;
      try {
        if (db.searchApi === 24) throw Object.assign(new Error('older search'), { code: 'PGRST202' });
        response = await rpc('catalogue_search', { p_filters: search });
        db.searchApi = 25;
      } catch (error) {
        if (error.code !== 'PGRST202') throw error;
        db.searchApi = 24;
        // One value per filter, as the older search takes.
        const first = value => list(value)[0] || '';
        const older = { ...cleaned, brand: first(filters.brand), condition: first(filters.condition), size: first(filters.size), color: first(filters.color) };
        if (filters.category) older.category = first(filters.category) || 'all';
        if (filters.view !== 'style') delete older.style;
        response = await rpc('catalogue_page', { p_filters: older });
      }
      const followed = new Set(userId ? (await db.loadFollowedStores(userId)).map(store => store.id) : []);
      const products = await Promise.all((response.products || []).map(row => db.mapProduct(row, followed)));
      db.cataloguePage = { total: response.total || 0, page: response.page || 1, pageSize: response.page_size || 24, brands: response.brands || [], api: response.api || 24, facets: response.facets || null, followFirst: response.follow_first !== false, searched: response.searched === true };
      return products;
    },
    // Published stores by id, 100 at a time, so every founding store can be shown, not only the first 200 by name (plan E1).
    loadPublicStoresById: async ids => { const list = [...new Set((ids || []).filter(Boolean))]; const out = []; for (let i = 0; i < list.length; i += 100) out.push(...await rows(client().from('public_store_profiles').select('*').in('id', list.slice(i, i + 100)))); return signStoreImages(out); },
    // Founding stores (plan E1, migration 035). Before 035 is in the cloud the functions are missing: no date, no stores.
    loadOpeningDate: async () => { try { const day = await rpc('public_opening_date'); return /^\d{4}-\d{2}-\d{2}$/.test(String(day || '')) ? String(day) : null; } catch (error) { if (/awaiting the commerce database update/.test(error.message || '')) return null; throw error; } },
    loadFoundingStoreIds: async () => { try { const rowsIn = await rpc('founding_store_ids'); return (Array.isArray(rowsIn) ? rowsIn : []).map(row => typeof row === 'string' ? row : row?.founding_store_ids || row?.id).filter(Boolean); } catch (error) { if (/awaiting the commerce database update/.test(error.message || '')) return []; throw error; } },
    // A store's newest live pieces on this site, for its card in the founding section. It never touches db.cataloguePage.
    loadStorePieces: async (storeId, count = 2) => {
      const site = window.PANOPIE_CURRENCY?.site();
      const response = await rpc('catalogue_search', { p_filters: { store: storeId, sort: 'newest', country: site?.country || '', currency: site?.currency || '', followFirst: false } });
      return Promise.all((response?.products || []).slice(0, count).map(row => db.mapProduct(row)));
    },
    // The store page's tab counts (plan C3): this store on this site, with no tab and no search words. It never touches
    // db.cataloguePage, which holds the page being shown.
    loadStoreCounts: async storeId => {
      const site = window.PANOPIE_CURRENCY?.site();
      const response = await rpc('catalogue_search', { p_filters: { store: storeId, country: site?.country || '', currency: site?.currency || '', followFirst: false } });
      return { total: Number(response?.total) || 0, facets: response?.facets || null };
    },
    // Migration 050: the VAT invoice and credit notes Panopie issued for one of the shopper's orders. Before 050 the table is missing: no documents.
    loadOrderTaxDocuments: async orderId => {
      try { return await rows(client().from('tax_documents').select('id, number, kind, jurisdiction, tax_id, currency, net_cents, tax_cents, gross_cents, gbp_micro, tax_gbp_cents, issued_at').eq('order_id', orderId).order('issued_at', { ascending: true })); } catch (error) { if (['42P01', 'PGRST205'].includes(error?.code)) return []; throw error; }
    },
    // Migration 050: the tax for one store's part of an order, worked out by the server (the same function that locks it when the buyer
    // pays). Before 050 the function is missing, so this answers null and checkout keeps its own estimate.
    quoteOrderTax: async (storeId, address, itemsCents, shipCents, currency) => {
      try { return await rpc('quote_order_tax', { p_store_id: storeId, p_country: address?.country_code || '', p_region: address?.region || null, p_postal: address?.postal_code || null, p_items: itemsCents, p_ship: shipCents, p_currency: currency }); } catch { return null; }
    },
    loadProduct: async id => {
      const row = await rpc('product_record', { p_id: id });
      return row ? db.mapProduct(row) : null;
    },
    loadCart: async () => {
      const response = await rpc('get_cart');
      cartRevision = response.revision;
      // A piece that shoppers can no longer see stays in the bag as a plain line that can only be removed.
      const unavailable = product => product?.available === false || (product?.status && product.status !== 'active');
      // A piece from a store on vacation (migration 042) keeps its details and stays in the bag, but can't be ordered.
      const away = product => product?.available === false && typeof product?.vacation_until === 'string' && product.status === 'active';
      return Promise.all((response.items || []).map(async entry => ({ product: away(entry.product) ? { ...(await db.mapProduct(entry.product)), unavailable: true, vacationUntil: entry.product.vacation_until } : unavailable(entry.product) ? { id: entry.product.id, name: entry.product.name || 'A piece', merchantStoreId: 'unavailable', store: 'No longer available', unavailable: true, variants: [], mediaGallery: [], price: 0, stock: 0, details: {} } : await db.mapProduct(entry.product), variantId: entry.variant_id, quantity: entry.quantity })));
    },
    replaceCart: async (_userId, entries) => {
      if (cartRevision === null) await db.loadCart();
      const response = await rpc('sync_cart', { p_expected_revision: cartRevision, p_items: entries.filter(entry => !entry.item?.unavailable || entry.item?.vacationUntil).map(entry => ({ variant_id: entry.variantId, quantity: entry.quantity })) });
      cartRevision = response.revision;
      return response;
    },
    // currency is the store currency the page showed (migration 018); the server refuses the save if the store changed it since.
    saveProduct: async ({ id = null, storeId, currency = null, values, variants, images = [], files = [], expectedUpdatedAt = null }) => {
      const shown = currency ? { p_currency: currency } : {};
      const media = imageFiles(files);
      // A new option gets its id here, so the second save (with the uploaded images) updates the same options instead of adding them again with the same SKU.
      const options = variants.map(row => row.id ? row : { ...row, id: crypto.randomUUID() });
      let record = await rpc('save_product', { p_id: id, p_store_id: storeId, p_values: values, p_variants: options, p_images: images, p_expected_updated_at: expectedUpdatedAt, ...shown });
      const added = [];
      try {
        for (const [index, file] of media.entries()) {
          const path = `${storeId}/${record.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
          const { error } = await client().storage.from('product-images').upload(path, file, { upsert: false, contentType: file.type });
          if (error) throw error;
          added.push({ storage_path: path, alt_text: `${values.name} — image ${images.length + index + 1}`, sort_order: images.length + index });
        }
        if (added.length) record = await rpc('save_product', { p_id: record.id, p_store_id: storeId, p_values: values, p_variants: options, p_images: [...images, ...added], p_expected_updated_at: record.updated_at, ...shown });
      } catch (error) {
        // The draft exists now. The page keeps its id and the option ids, so pressing Save again updates this draft instead of starting another one.
        throw Object.assign(new Error('The draft was saved, but the photos did not finish uploading. Press Save draft again to retry the photos, or open the draft later from Products.'), { savedProductId: record.id, savedOptionIds: options.map(row => row.id), cause: error });
      }
      return record;
    },
    setProductStatus: (id, status) => rpc('set_product_status', { p_id: id, p_status: status }),
    updateInventory: (id, quantity, priceCents) => rpc('update_variant_inventory', { p_variant_id: id, p_quantity: quantity, p_price_cents: priceCents }),
    savePublicStore: (id, values) => rpc('save_store_profile', { p_store_id: id, p_values: values }),
    setStoreVacation: (id, until) => rpc('set_store_vacation', { p_store_id: id, p_until: until }),
    loadMembers: id => rpc('store_team',{p_store_id:id}),
    inviteMember: (storeId,email,role) => rpc('invite_store_member',{p_store_id:storeId,p_email:email,p_role:role}),
    acceptInvitation: token => rpc('accept_store_invitation',{p_token:token}),
    loadModeration: async () => ({reviews:await rows(client().from('product_reviews').select('*').eq('status','pending')),looks:await rows(client().from('creator_looks').select('*').eq('status','pending'))}),
    moderate: (id,type,status,note) => rpc('moderate_content',{p_id:id,p_type:type,p_status:status,p_note:note}),
    manageMember: (storeId, email, role, remove = false) => rpc('manage_store_member', { p_store_id: storeId, p_email: email, p_role: role, p_remove: remove }),
    loadMessages: () => rpc('inbox_threads'),
    sendMessage: values => rpc('send_message', { p_thread_id: values.threadId || null, p_store_id: values.storeId || null, p_order_id: values.orderId || null, p_subject: values.subject || 'Order support', p_body: values.body }),
    markThreadRead: id => rpc('mark_thread_read', { p_thread_id: id }),
    loadReturns: () => rows(client().from('return_requests').select('*').order('created_at', { ascending: false })),
    createReturn: values => rpc('request_return', { p_order_id: values.orderId, p_reason: values.reason, p_description: values.description, p_item_ids: values.items, p_evidence_urls: values.evidence || [] }),
    resolveReturn: (id, status, note) => rpc('resolve_return', { p_id: id, p_status: status, p_note: note }),
    escalateThread: id => rpc('escalate_thread', { p_thread_id: id }),
    loadProductReviews: id => rows(client().from('product_reviews').select('id, rating, body, created_at, display_name, fit_feedback').eq('product_id', id).eq('status', 'published').order('created_at', { ascending: false }).limit(50)),
    createReview: values => rpc('submit_review', { p_order_item_id: values.itemId, p_rating: values.rating, p_body: values.body, p_fit: values.fit }),
    loadLooks: id => rpc('product_looks', { p_product_id: id }),
    saveLook: values => rpc('save_creator_look', { p_values: values }),
    loadAudit: () => rows(client().from('commerce_audit_log').select('*').order('created_at', { ascending: false }).limit(100)),
    loadNotifications: () => rows(client().from('notifications').select('*').order('created_at', { ascending: false }).limit(50)),
    markNotification: id => rpc('read_notification', { p_id: id }),
    fulfilOrder: (id, carrier, tracking) => rpc('fulfil_order', { p_order_id: id, p_carrier: carrier, p_tracking: tracking }),
    updateShipment: (id, carrier, tracking) => rpc('fulfil_order', { p_order_id: id, p_carrier: carrier, p_tracking: tracking }),
    cancelOrder: id => rpc('cancel_unpaid_order', { p_order_id: id }),
    // Migration 049: delivery, receipt, cancelling a paid order.
    reportDelivery: (id, date) => rpc('report_delivery', { p_order_id: id, p_delivered_on: date }),
    confirmReceived: id => rpc('confirm_received', { p_order_id: id }),
    reportNotReceived: (id, note) => rpc('report_not_received', { p_order_id: id, p_note: note }),
    cancelPaidOrder: (id, reason) => rpc('cancel_paid_order', { p_order_id: id, p_reason: reason }),
    requestData: type => rpc('request_account_data', { p_type: type }),
    signStoreImages,
    // Store logo and cover (migration 017): uploaded under <store id>/store/, then saved on the profile as that path.
    uploadStoreImage: async (storeId, file) => {
      if (!file?.size) return null;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5242880) throw new Error('Use a JPG, PNG or WebP image under 5 MB.');
      const name = String(file.name || 'image').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/\.{2,}/g, '.').replace(/^[-.]+|[-.]+$/g, '') || 'image';
      const path = `${storeId}/store/${crypto.randomUUID()}-${name}`;
      const { error } = await client().storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
      if (error) throw Object.assign(new Error(/row-level security|not allowed|unauthorized/i.test(error.message || '') ? 'You can add a logo or cover after your application is submitted.' : (db.friendlyMessage ? db.friendlyMessage(error) : 'The image could not be uploaded.')), { code: error.code || '' });
      return path;
    },
    leaveStore: storeId => rpc('leave_store', { p_store_id: storeId }),
    // Every open request, oldest first, and the 50 most recently closed ones.
    loadDataRequests: async () => { const columns = 'id, user_id, type, status, created_at, resolved_at, resolution_note'; const [open, closed] = await Promise.all([rows(client().from('account_data_requests').select(columns).neq('status', 'done').order('created_at', { ascending: true })), rows(client().from('account_data_requests').select(columns).eq('status', 'done').order('resolved_at', { ascending: false }).limit(50))]); return [...open, ...closed]; },
    resolveDataRequest: (id, note) => rpc('resolve_data_request', { p_id: id, p_note: note }),
    loadProfileChanges: async () => { const data = await rpc('list_store_profile_changes'); return Array.isArray(data) ? data : []; },
    markProfileChecked: (storeId, seenAt) => rpc('mark_store_profile_checked', { p_store_id: storeId, p_seen_changed_at: seenAt }),
    passwordReset: async email => { const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/index.html?view=recovery` }); if (error) throw error; },
    resendVerification: async email => { const { error } = await client().auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${location.origin}/index.html?view=verified` } }); if (error) throw error; },
    updateCredentials: async values => { const { error } = await client().auth.updateUser(values); if (error) throw error; },
    signOutAll: async () => { const { error } = await client().auth.signOut({ scope: 'global' }); if (error) throw error; },
    mfaEnroll: async () => { const { data, error } = await client().auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Panopie authenticator', issuer: 'Panopie' }); if (error) throw error; return data; },
    mfaVerify: async (factorId, code) => { const { error } = await client().auth.mfa.challengeAndVerify({ factorId, code }); if (error) throw error; },
    loadMfa: async () => { const { data, error } = await client().auth.mfa.listFactors(); if (error) throw error; return data.totp || []; },
    // Staff pages need a session confirmed with the authenticator (assurance level aal2).
    mfaLevel: async () => { const { data, error } = await client().auth.mfa.getAuthenticatorAssuranceLevel(); if (error) throw error; return data; },
    mfaStepUp: async code => {
      const { data, error } = await client().auth.mfa.listFactors(); if (error) throw error;
      const factor = (data.totp || []).find(row => row.status === 'verified');
      if (!factor) throw new Error('Set up an authenticator on your Security page first.');
      const { error: verifyError } = await client().auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (verifyError) {
        // A wrong or old code is the common case; other failures (too many tries, an expired sign-in, no connection) get their own words.
        if (/invalid|expired.*code|code.*expired|totp/i.test(verifyError.message || '') && verifyError.status !== 429) throw new Error('That code did not work. Check the time on your phone and try the newest code.');
        throw new Error(db.friendlyMessage ? db.friendlyMessage(verifyError) : 'That didn’t go through. Please try again.');
      }
    },
    checkoutSession: async () => { const { data, error } = await client().functions.invoke('checkout-session', { body: {} }); if (error) throw new Error('Payment is not ready. Your bag is unchanged and you have not been charged.'); return data; }
  });
})();
