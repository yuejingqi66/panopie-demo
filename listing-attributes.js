/* Fixed lists a store picks from when it lists a piece, so shoppers can filter reliably (REQUEST_LOG 102-106, option A).
   Migration 026 holds the same lists for its review check; tests/listing-attributes.test.cjs keeps the two equal. */
(() => {
  'use strict';
  const colorFamilies = { black: 'Black', white: 'White', gray: 'Gray', cream: 'Cream & beige', brown: 'Brown', red: 'Red', pink: 'Pink', orange: 'Orange', yellow: 'Yellow', green: 'Green', blue: 'Blue', navy: 'Navy', purple: 'Purple', gold: 'Gold tone', silver: 'Silver tone', multicolor: 'Multicolor' };
  const materials = { cotton: 'Cotton', linen: 'Linen', wool: 'Wool', cashmere: 'Cashmere', silk: 'Silk', denim: 'Denim', leather: 'Leather', suede: 'Suede', 'faux-leather': 'Faux leather', polyester: 'Polyester', nylon: 'Nylon', viscose: 'Viscose / rayon', lyocell: 'Lyocell', acrylic: 'Acrylic', fleece: 'Fleece', down: 'Down', canvas: 'Canvas', rubber: 'Rubber', gold: 'Karat gold', silver: 'Sterling silver (925)', 'other-metal': 'Plated or other metal', other: 'Other' };
  const fitsTop = { slim: 'Slim', regular: 'Regular', relaxed: 'Relaxed', oversized: 'Oversized', boxy: 'Boxy', cropped: 'Cropped' };
  const fitsBottom = { skinny: 'Skinny', slim: 'Slim', straight: 'Straight', relaxed: 'Relaxed', wide: 'Wide', tapered: 'Tapered', bootcut: 'Bootcut' };
  // Fit is needed for tops and pants (owner's option A); for other clothing it is optional, and shoes, bags, accessories and jewelry have none.
  const fitNeeded = { 't-shirts': 'top', shirts: 'top', knitwear: 'top', hoodies: 'top', jackets: 'top', jeans: 'bottom', 'cargo-pants': 'bottom', trousers: 'bottom', shorts: 'bottom' };
  const fitOptional = { suits: 'top', dresses: 'top', skirts: 'top' };
  const fitsFor = category => ({ top: fitsTop, bottom: fitsBottom })[fitNeeded[category] || fitOptional[category]] || null;
  const patterns = { solid: 'Solid', striped: 'Striped', plaid: 'Plaid or check', graphic: 'Graphic or print', floral: 'Floral', logo: 'Logo', camo: 'Camo', animal: 'Animal print', dots: 'Polka dot', other: 'Other' };
  const subtypes = {
    't-shirts': { tee: 'T-shirt', tank: 'Tank top', polo: 'Polo', 'long-sleeve': 'Long sleeve', crop: 'Crop top', bodysuit: 'Bodysuit' },
    shirts: { 'button-up': 'Button-up', blouse: 'Blouse', overshirt: 'Overshirt', flannel: 'Flannel' },
    knitwear: { sweater: 'Sweater', cardigan: 'Cardigan', 'sweater-vest': 'Sweater vest', turtleneck: 'Turtleneck' },
    hoodies: { pullover: 'Pullover hoodie', zip: 'Zip hoodie', sweatshirt: 'Sweatshirt' },
    jackets: { bomber: 'Bomber', 'denim-jacket': 'Denim jacket', leather: 'Leather jacket', puffer: 'Puffer', coat: 'Coat', blazer: 'Blazer', parka: 'Parka', windbreaker: 'Windbreaker', vest: 'Vest' },
    suits: { 'two-piece': 'Two-piece', 'three-piece': 'Three-piece', tuxedo: 'Tuxedo' },
    trousers: { chinos: 'Chinos', dress: 'Dress pants', sweatpants: 'Sweatpants', joggers: 'Joggers', leggings: 'Leggings' },
    shorts: { 'denim-shorts': 'Denim shorts', cargo: 'Cargo shorts', athletic: 'Athletic shorts' },
    skirts: { 'mini-skirt': 'Mini skirt', 'midi-skirt': 'Midi skirt', 'maxi-skirt': 'Maxi skirt' },
    dresses: { 'mini-dress': 'Mini dress', 'midi-dress': 'Midi dress', 'maxi-dress': 'Maxi dress', gown: 'Gown', slip: 'Slip dress' },
    'athletic-shoes': { running: 'Running', basketball: 'Basketball', skate: 'Skate', lifestyle: 'Lifestyle' },
    'leather-shoes': { boots: 'Boots', loafers: 'Loafers', derbies: 'Derbies', oxfords: 'Oxfords', heels: 'Heels', sandals: 'Sandals' },
    bags: { tote: 'Tote', shoulder: 'Shoulder bag', crossbody: 'Crossbody', backpack: 'Backpack', clutch: 'Clutch', duffel: 'Duffel' },
    accessories: { hat: 'Hat', cap: 'Cap', beanie: 'Beanie', belt: 'Belt', scarf: 'Scarf', gloves: 'Gloves', sunglasses: 'Sunglasses', socks: 'Socks', tie: 'Tie' },
    jewelry: { necklace: 'Necklace', ring: 'Ring', bracelet: 'Bracelet', earrings: 'Earrings', watch: 'Watch' }
  };
  // Sizes a store can pick for each category. A size typed instead is kept as the store wrote it, and shoppers can filter by it too.
  const letters = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
  const waists = Array.from({ length: 21 }, (_, i) => String(24 + i));
  const shoes = Array.from({ length: 23 }, (_, i) => `US ${4 + i / 2}`);
  const chests = Array.from({ length: 10 }, (_, i) => String(34 + i * 2));
  const sizeGroup = category => ({ jeans: 'bottom', 'cargo-pants': 'bottom', trousers: 'bottom', shorts: 'bottom', skirts: 'bottom', suits: 'suit', 'athletic-shoes': 'shoe', 'leather-shoes': 'shoe', bags: 'one', accessories: 'one', jewelry: 'one' })[category] || 'top';
  const sizeLists = { top: [...letters, 'One size'], bottom: [...waists, ...letters, 'One size'], suit: [...chests, ...letters], shoe: shoes, one: ['One size', ...letters] };
  const sizesFor = category => sizeLists[sizeGroup(category)];
  // Saved as the brand of a piece with no maker's name, label or logo (migration 025 refuses it as a brand to follow).
  // Shoppers never see these words: cards, the product page and filters say "Unbranded".
  const NO_BRAND = 'No brand / no label';
  const fitGroups = { top: 'Tops, jackets, dresses and skirts', bottom: 'Pants and shorts' };
  const fitKind = category => fitNeeded[category] || fitOptional[category] || '';

  // A store's own color name read as a color family: "Jet black" is Black, "Heather grey" is Gray. More exact words come first.
  const COLOR_WORDS = [
    ['multicolor', /\b(multi|multicolou?r|rainbow|tie[\s-]?dye|mixed)\b/i],
    ['cream', /\b(off[\s-]?white|cream|beige|ivory|ecru|oatmeal|sand|stone|bone|natural|nude|khaki|taupe)\b/i],
    ['navy', /\b(navy|midnight)\b/i],
    ['gray', /\b(gr[ae]y|charcoal|heather|slate|ash|graphite|smoke|pewter)\b/i],
    ['black', /\b(black|jet|onyx|ebony|noir)\b/i],
    ['white', /\b(white|snow|optic)\b/i],
    ['brown', /\b(brown|tan|camel|chocolate|coffee|mocha|cognac|espresso|chestnut)\b/i],
    ['red', /\b(red|burgundy|maroon|wine|crimson|scarlet|cherry|oxblood)\b/i],
    ['pink', /\b(pink|rose|blush|fuchsia|magenta)\b/i],
    ['orange', /\b(orange|rust|coral|peach|terracotta|apricot)\b/i],
    ['yellow', /\b(yellow|mustard|lemon|butter)\b/i],
    ['green', /\b(green|olive|sage|forest|mint|emerald|army|teal|moss)\b/i],
    ['blue', /\b(blue|denim|indigo|sky|cobalt|azure|royal)\b/i],
    ['purple', /\b(purple|lilac|lavender|violet|plum|mauve)\b/i],
    ['gold', /\bgold(en)?\b/i],
    ['silver', /\bsilver\b/i]
  ];
  const colorFamilyOf = text => (COLOR_WORDS.find(([, words]) => words.test(String(text || ''))) || [''])[0];
  // Materials named in a file's fabric text, main one first: "80% cotton, 20% polyester" is Cotton, then Polyester.
  // Only fibers and fabrics are read; metals are never read from a file, because a gold or silver claim needs a mark.
  // The reading is careful (REQUEST_LOG 107, legal and QA reviews): only the first composition that adds up to 100% counts,
  // a lining, fill, sleeve or trim part is left out, look-alike words ("wool-like", "cashmere feel", "cotton blend") and
  // sales ("20% off") are not materials, and with no percentages a material is picked only when exactly one is named.
  const MATERIAL_WORDS = [
    ['faux-leather', /\b(faux|vegan|pu|synthetic|imitation)[\s-]+(leather|suede)\b|\bpleather\b/i],
    ['suede', /\bsuede\b/i], ['leather', /\bleather\b/i], ['cashmere', /\bcashmere\b/i],
    ['wool', /\b(wool|merino|lambswool|alpaca|mohair)\b/i], ['cotton', /\bcotton\b/i], ['linen', /\b(linen|flax)\b/i], ['silk', /\bsilk\b/i],
    ['denim', /\bdenim\b/i], ['polyester', /\bpolyester\b/i], ['nylon', /\b(nylon|polyamide)\b/i], ['viscose', /\b(viscose|rayon|modal)\b/i],
    ['lyocell', /\b(lyocell|tencel)\b/i], ['acrylic', /\bacrylic\b/i], ['fleece', /\bfleece\b/i],
    ['down', /\b(duck|goose)[\s-]+down\b|^down$/i], ['canvas', /\bcanvas\b/i], ['rubber', /\brubber\b/i]
  ];
  const materialOfWord = word => (MATERIAL_WORDS.find(([, pattern]) => pattern.test(word)) || [])[0] || '';
  const materialsOf = text => {
    const none = { ids: [], shares: false };
    let body = String(text || '').toLowerCase().replace(/\s+/g, ' ')
      .replace(/\bbutton[\s-]down\b/g, ' ').replace(/\bfaux[\s-]+(fur|down)\b/g, ' ')
      .replace(/\b[a-z]+[\s-]*(like|feel|look|touch|effect|style|alternative|blend|blended|mix)\b/g, ' ')
      .replace(/\d{1,3}(\.\d+)?\s*%\s*(off|less|more|fewer|discount|sale)\b/g, ' ');
    // Only the main part counts: text from a lining, fill, sleeve, trim or sole label on is left out.
    body = body.split(/\b(lining|lined|fill|filling|padding|insulation|sleeves?|trims?|pocketing|contrast|rib|ribbing|sole|outsole|insole|collar|cuffs?|embroidery)\b/)[0];
    const QUALIFIER = '(?:organic|recycled|virgin|extra[\\s-]fine|combed|pima|supima|mercerized)\\s+';
    const WORD = '([a-z]+(?:[\\s-]+(?:leather|suede|down))?)';
    const shares = [];
    const before = new RegExp(`(\\d{1,3}(?:\\.\\d+)?)\\s*%\\s*(?:${QUALIFIER})?${WORD}`, 'g');
    const after = new RegExp(`(?:${QUALIFIER})?${WORD}\\s*:?\\s*(\\d{1,3}(?:\\.\\d+)?)\\s*%`, 'g');
    for (const match of body.matchAll(before)) shares.push({ at: match.index, share: Number(match[1]), id: materialOfWord(match[2]) });
    if (!shares.length) for (const match of body.matchAll(after)) shares.push({ at: match.index, share: Number(match[2]), id: materialOfWord(match[1]) });
    if (shares.length) {
      // The first composition: shares in order until they add up to 100.
      const first = []; let total = 0;
      for (const entry of shares.sort((a, b) => a.at - b.at)) { if (total >= 99.5) break; first.push(entry); total += entry.share; }
      const ids = [...new Set(first.filter(entry => entry.id).sort((a, b) => b.share - a.share || a.at - b.at).map(entry => entry.id))].slice(0, 3);
      return { ids, shares: true };
    }
    const named = new Set(MATERIAL_WORDS.filter(([, pattern]) => pattern.test(body.trim())).map(([id]) => id));
    if (named.has('faux-leather')) { named.delete('leather'); named.delete('suede'); }
    return named.size === 1 ? { ids: [...named], shares: false } : none;
  };
  // A size from a file read as the listed one: "Medium" is M, "2XL" is XXL, "32" is a waist, "9.5" is US 9.5. Otherwise it stays as typed.
  const SIZE_WORDS = { 'xx-small': 'XXS', 'x-small': 'XS', small: 'S', medium: 'M', large: 'L', 'x-large': 'XL', 'xx-large': 'XXL', '2xl': 'XXL', xxxl: '3XL', '3xl': '3XL', '4xl': '4XL', os: 'One size', 'one size': 'One size', onesize: 'One size', 'o/s': 'One size' };
  const listedSize = (text, category) => {
    const raw = String(text || '').trim(); if (!raw) return '';
    const list = sizesFor(category); const lower = raw.toLowerCase().replace(/\s+/g, ' ');
    const exact = list.find(size => size.toLowerCase() === lower); if (exact) return exact;
    const word = SIZE_WORDS[lower] || SIZE_WORDS[lower.replace(/\s+/g, '')] || SIZE_WORDS[lower.replace(/\s+/g, '-')]; if (word && list.includes(word)) return word;
    const shoe = lower.match(/^(?:us\s*)?(\d{1,2}(?:\.5)?)$/); if (shoe && list.includes(`US ${Number(shoe[1])}`)) return `US ${Number(shoe[1])}`;
    if (shoe && list.includes(String(Number(shoe[1])))) return String(Number(shoe[1]));
    return '';
  };

  // Every unmet rule for the search fields, each with the form field it is about. The same rules run in migration 026.
  const problems = (details, category, variants = []) => {
    const d = details || {}; const out = []; const add = (field, message) => out.push({ field, message });
    const brand = String(d.brand || '').trim();
    if (!brand) add('brand', 'Add the brand, or check “This piece has no brand”.');
    else if (brand.includes('|')) add('brand', 'Remove the “|” sign from the brand name.');
    else if (brand.length > 120) add('brand', 'Keep the brand to 120 characters or fewer.');
    if (!Object.hasOwn(colorFamilies, d.color_family || '')) add('colorFamily', 'Choose the main color family.');
    if (!Object.hasOwn(materials, d.material_main || '')) add('materialMain', 'Choose the main material.');
    const more = Array.isArray(d.material_more) ? d.material_more : [];
    if (more.length > 2 || new Set(more).size !== more.length || more.some(value => !Object.hasOwn(materials, value) || value === d.material_main)) add('materialMore1', 'Each extra material must be different from the main material and from each other.');
    const fits = fitsFor(category);
    if (fitNeeded[category] && !d.fit_type) add('fitType', 'Choose the fit.');
    else if (d.fit_type && !fits) add('fitType', 'Clear the fit. Shoes, bags, accessories and jewelry don’t use it.');
    else if (d.fit_type && !Object.hasOwn(fits, d.fit_type)) add('fitType', `This fit is for a different kind of piece. Choose one from the “${fitGroups[fitKind(category)]}” list.`);
    if (d.subtype && !Object.hasOwn(subtypes[category] || {}, d.subtype)) add('subtype', 'Choose a type from the list for this category, or clear it.');
    if (d.pattern && !Object.hasOwn(patterns, d.pattern)) add('pattern', 'Choose a pattern from the list, or clear it.');
    // Option problems name the first option (counted from 0 in the list given) that has them.
    const rows = (variants || []).map((row, index) => [row, index]).filter(([row]) => row && row.active !== false);
    const sizeOf = row => String(row.size || row.attributes?.size || '').trim();
    const first = test => (rows.find(([row]) => test(row)) || [])[1];
    const noSize = first(row => !sizeOf(row)); const longSize = first(row => sizeOf(row).length > 40); const pipeSize = first(row => sizeOf(row).includes('|'));
    const badFamily = first(row => { const family = row.color_family ?? row.attributes?.color_family ?? ''; return family && !Object.hasOwn(colorFamilies, family); });
    if (noSize !== undefined) out.push({ field: 'variantSize', row: noSize, message: 'Give every option a size. Pick one from the list, or type your own.' });
    else if (longSize !== undefined) out.push({ field: 'variantSize', row: longSize, message: 'Keep each size to 40 characters or fewer.' });
    else if (pipeSize !== undefined) out.push({ field: 'variantSize', row: pipeSize, message: 'Remove the “|” sign from the size.' });
    if (badFamily !== undefined) out.push({ field: 'variantColorFamily', row: badFamily, message: 'Choose each option’s color family from the list.' });
    return out;
  };

  // Listing text rules (REQUEST_LOG 139, plan B1, B2, B4). Migration 031 runs the same rules in the same order, with the
  // same patterns: a character that may not come before a match is matched as a prefix, because some browsers can't look
  // back, and both sides read it the same way. tests/fixtures/listing-text-samples.json keeps the two equal.
  const TEXT_RULES = [
    ['email', /[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+/i, 'Remove the email address. Listings can’t include contact details. Shoppers can message you on Panopie, and your store page shows your support email.'],
    ['link', /(https?:\/\/|www\.)|(^|[^a-z0-9.-])[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|ca|net|org|io|ly|ee|uk|info|biz|xyz|de|fr|au)(?![a-z0-9-])/i, 'Remove the web address. Listings can’t include links, even to your own website. If the address is printed on the piece, describe the print without it. Shoppers can message you on Panopie, and your store page shows your support email.'],
    // These endings are English words too, so only a lowercase ending counts: "Made in Italy.Co-ord set" is fine,
    // "Visit MyStore.shop" is not.
    ['link', /(^|[^A-Za-z0-9.-])[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.(shop|store|site|link|app|me|us|co|jp|nl|eu|tv|gg|page|bio)(?![A-Za-z0-9-])/, 'Remove the web address. Listings can’t include links, even to your own website. If the address is printed on the piece, describe the print without it. Shoppers can message you on Panopie, and your store page shows your support email.'],
    // The first character after @ is a letter or _, so a measurement such as "@22in" is fine.
    ['handle', /(^|[^a-z0-9._%+-])@[a-z_][a-z0-9._]{1,29}/i, 'Remove the social media handle (like @name). Listings can’t include contact details. If you used @ for something else, write it another way.']
  ];
  // A SKU (migration 036, listing_sku_text_error): the same rules, except that a two-letter country ending in capitals,
  // such as "JKT-01.CA" or "TEE-BLK.UK", is not a web address, because stores often mark a region that way.
  const SKU_RULES = [
    TEXT_RULES[0],
    ['link', /(https?:\/\/|www\.)|(^|[^a-z0-9.-])[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|net|org|info|biz|xyz)(?![a-z0-9-])/i, TEXT_RULES[1][2]],
    ['link', /(^|[^A-Za-z0-9.-])[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.(shop|store|site|link|app|page|bio|ca|co|io|uk|us|me|de|fr|au|ee|ly|jp|nl|eu|tv|gg)(?![A-Za-z0-9-])/, TEXT_RULES[1][2]],
    TEXT_RULES[3]
  ];
  const GENERIC_BRANDS = ['', 'vintage', 'unknown', 'unknown brand', 'unbranded', 'no brand', 'nobrand', 'no label', 'no name', 'noname', 'unlabeled', 'unlabelled', 'none', 'na', 'n a', 'generic', 'other', 'various', 'denim', 'designer', 'handmade'];
  const brandKey = brand => String(brand || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  // Blank is judged the same way as in migration 031: these spaces count, other characters don't.
  const blank = text => !String(text).replace(/[\t\n\v\f\r \u00a0\ufeff]/g, '');
  const ERA_NOTE_TYPES = ['pre-owned-vintage', 'unworn-vintage'];
  const textFields = (name, description, tone, details) => {
    const d = details || {};
    return [['name', 'Product name', name], ['description', 'Description', description], ['tone', 'Color name', tone], ['brand', 'Brand', d.brand], ['series', 'Series / model', d.series], ['model', 'Model measurements', d.model], ['material', 'Fabric and composition', d.material], ['fit', 'Fit notes', d.fit], ['features', 'Construction & details', d.features], ['care', 'Care', d.care], ['conversion', 'International size notes', d.size_conversion], ['conditionNotes', 'Condition notes', d.condition_notes], ['eraNote', 'Year or history', d.era_note], ['originalBrand', 'Original brand', d.reworked_from_brand], ['originalItem', 'Original item', d.reworked_from_item]]
      .filter(([, , text]) => typeof text === 'string' && text)
      // Look-alike characters count as what they look like, as in migration 031: full-width letters and signs become
      // plain ones (NFKC), and zero-width characters go.
      .map(([field, label, text]) => [field, label, text.normalize('NFKC').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')]);
  };
  // The first contact rule a text breaks, with what was found: the whole word the match is in, such as
  // "www.example.com" and not only "www.", or "my_shop.com" and not only "shop.com". The page's own short sentence
  // names it; the explanation is shown once under the list.
  const contactFind = (raw, rules = TEXT_RULES) => {
    const text = String(raw ?? '').normalize('NFKC').replace(/[\u200B-\u200D\u2060\uFEFF]/g, '');
    for (const [kind, pattern, message] of rules) {
      const hit = text.match(pattern);
      if (!hit) continue;
      const start = text.slice(0, hit.index + hit[0].length - hit[0].replace(/^[^a-z0-9@]+/i, '').length).search(/\S*$/);
      const word = text.slice(start).split(/\s/)[0].replace(/^[^\w@]+/, '').replace(/[.,;:!?)"”’]+$/, '');
      const found = [...word].slice(0, 60).join('');
      const short = { email: `remove the email address “${found}”.`, link: `remove the web address “${found}”.`, handle: `remove the social media handle “${found}”. If the @ means something else, write it another way.` }[kind];
      return { kind, message, found, short };
    }
    return null;
  };
  // The first rule each field breaks, with what was found; then the brand and the year or history note.
  const textProblems = (name, description, tone, details) => {
    const d = details || {}; const out = [];
    for (const [field, label, text] of textFields(name, description, tone, d)) {
      const hit = contactFind(text);
      if (hit) out.push({ field, label, message: hit.message, found: hit.found, short: hit.short, contact: true });
    }
    // A brand that is only signs ("-", "?") is caught here; an empty one is problems()'s to report.
    if (typeof d.brand === 'string' && !blank(d.brand) && d.brand !== NO_BRAND && GENERIC_BRANDS.includes(brandKey(d.brand))) out.push({ field: 'brand', label: 'Brand', message: 'Write the maker’s or label’s name as the brand, not a word like “vintage” or “unknown.” If there’s no maker’s name, label, or logo, check “This piece has no brand.”', short: `“${String(d.brand).trim()}” isn’t a brand name. Write the maker’s or label’s name, or check “This piece has no brand.”` });
    const note = d.era_note;
    if (note !== undefined && note !== null && (typeof note !== 'string' || [...note].length > 200)) out.push({ field: 'eraNote', label: 'Year or history', message: 'Keep the year or history note to 200 characters or fewer.', short: 'keep the note to 200 characters or fewer.' });
    else if (typeof note === 'string' && !blank(note) && !ERA_NOTE_TYPES.includes(d.vintage_type)) out.push({ field: 'eraNote', label: 'Year or history', message: 'The year or history note is only for pre-owned or unworn vintage. Change the vintage type, or clear the note.', short: 'only pre-owned or unworn vintage can have this note. Change the vintage type, or clear the note.' });
    return out;
  };
  // The base SKU, each option's size, color, name and SKU, and image descriptions (migration 036): the contact rules
  // only, as in the database. Options that are switched off are not read. Each problem is linked to its control and
  // says what was found; image descriptions with the same find (often copied from the piece's name) are one problem.
  const partProblems = (variants, images, baseSku) => {
    const out = [];
    const add = (field, row, label, text, rules) => { const hit = contactFind(text, rules); if (hit) out.push({ field, ...(row === undefined ? {} : { row }), label, message: hit.message, found: hit.found, short: hit.short, contact: true }); return Boolean(hit); };
    add('sku', undefined, 'Base SKU', baseSku, SKU_RULES);
    (variants || []).forEach((variant, row) => {
      if (variant.active === false || variant.is_active === false) return;
      const raw = variant.attributes; const a = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;
      const name = variant.label || variant.name || '';
      const tag = `Option ${row + 1}${name ? ` (“${[...name].slice(0, 40).join('')}”)` : ''}`;
      const rest = a ? Object.keys(a).filter(key => !['size', 'color'].includes(key)).sort().map(key => a[key]).filter(value => value != null).map(value => typeof value === 'string' ? value : JSON.stringify(value)).join('\n')
        : raw == null ? '' : typeof raw === 'string' ? raw : JSON.stringify(raw);
      add('variantSize', row, `${tag}, size`, a?.size) || add('variantColor', row, `${tag}, color`, a?.color) || add('variantName', row, `${tag}, name`, name)
        || add('variantSku', row, `${tag}, SKU`, variant.sku, SKU_RULES) || add('variantName', row, `${tag}, details`, rest);
    });
    const groups = new Map();
    (images || []).forEach((image, row) => { const hit = contactFind(image.alt_text ?? image.altText ?? image.alt); if (!hit) return; const key = `${hit.kind} ${hit.found}`; if (!groups.has(key)) groups.set(key, { hit, rows: [] }); groups.get(key).rows.push(row); });
    for (const { hit, rows } of groups.values()) out.push({ field: 'imageAlt', row: rows[0], rows, label: rows.length > 1 ? `Image descriptions ${rows.map(row => row + 1).join(', ')}` : `Image ${rows[0] + 1} description`, message: hit.message, found: hit.found, short: hit.short, contact: true });
    return out;
  };
  // What the database says for the same piece: the first rule broken anywhere in its text, in rule order.
  const textError = (name, description, tone, details) => {
    const d = details || {};
    const all = textFields(name, description, tone, d).map(([, , text]) => text).join('\n');
    const rule = TEXT_RULES.find(([, pattern]) => pattern.test(all));
    if (rule) return rule[2];
    const rest = textProblems('', '', '', { brand: d.brand, era_note: d.era_note, vintage_type: d.vintage_type });
    return rest.length ? rest[0].message : null;
  };

  window.PANOPIE_ATTRIBUTES = { partProblems, colorFamilies, materials, fitsTop, fitsBottom, fitNeeded, fitOptional, fitsFor, fitGroups, fitKind, patterns, subtypes, sizeLists, sizeGroup, sizesFor, colorFamilyOf, materialsOf, listedSize, problems, NO_BRAND, GENERIC_BRANDS, brandKey, textProblems, textError };
})();
