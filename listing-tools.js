(() => {
  'use strict';
  // Tools that save a merchant time when listing (owner decision 2026-10-15, REQUEST_LOG 80):
  // reading a product file exported from Shopify or WooCommerce, flaw notes for pre-owned pieces,
  // and photo fixes done in the browser. Nothing here reaches another website, and nothing is saved
  // until the merchant saves each piece in the editor, where every required fact is still checked.

  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const MAX_PIECES = 500;

  // A CSV reader for spreadsheet exports: quoted fields, doubled quotes, line breaks inside quotes,
  // Windows line ends and a byte order mark.
  const parseCsv = text => {
    const source = String(text || '').replace(/^﻿/, '');
    const rows = []; let row = []; let field = ''; let quoted = false;
    for (let i = 0; i < source.length; i++) {
      const char = source[i];
      if (quoted) {
        if (char === '"' && source[i + 1] === '"') { field += '"'; i++; }
        else if (char === '"') quoted = false;
        else field += char;
        continue;
      }
      if (char === '"' && field === '') quoted = true;
      else if (char === ',') { row.push(field); field = ''; }
      else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (char !== '\r') field += char;
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(cells => cells.some(cell => cell.trim() !== ''));
  };

  // Product descriptions in exports are HTML. Only the text is kept; nothing from the file is ever
  // put on the page as markup.
  const plainText = html => {
    const marked = String(html || '').replace(/<\s*(br|\/p|\/li|\/div|\/h[1-6])[^>]*>/gi, '\n').replace(/<\s*li[^>]*>/gi, '• ');
    let text;
    if (typeof DOMParser === 'function') text = new DOMParser().parseFromString(marked, 'text/html').body.textContent || '';
    else text = marked.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    return text.replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 6000);
  };

  // Words that point at one of the 17 categories. A piece that matches none is left for the merchant.
  const CATEGORY_WORDS = [
    ['jeans', /\bjeans?\b|\bdenim pants?\b/i],
    ['cargo-pants', /\bcargo/i],
    ['shorts', /\bshorts\b/i],
    ['skirts', /\bskirts?\b/i],
    ['dresses', /\bdress(es)?\b(?!\s+(shirts?|pants|trousers|shoes|boots))|\bgowns?\b/i],
    ['suits', /\bsuits?\b|\bblazers?\b|\btuxedos?\b/i],
    ['hoodies', /\bhood(ie|y|ies)\b|\bsweatshirts?\b|\bcrewnecks?\b/i],
    ['knitwear', /\bknit|\bsweaters?\b|\bcardigans?\b|\bjumpers?\b/i],
    ['jackets', /\bjackets?\b|\bcoats?\b|\bouterwear\b|\bparkas?\b|\bvests?\b/i],
    // No lookbehind: Safari before 16.4 can't read it, and the whole file would fail to load there (request 137).
    ['shirts', /(?:^|[^\w-]|(?:^|[^t])-)shirts?\b|\bblouses?\b|\bbutton[- ]?(up|down)s?\b/i],
    ['t-shirts', /\bt-?shirts?\b|\btees?\b|\btank tops?\b|\btops?\b/i],
    ['trousers', /\btrousers?\b|\bpants\b|\bchinos?\b|\bslacks\b/i],
    ['athletic-shoes', /\bsneakers?\b|\btrainers?\b|\brunning shoes?\b|\bathletic\b/i],
    ['leather-shoes', /\bboots?\b|\bloafers?\b|\boxfords?\b|\bheels?\b|\bshoes?\b/i],
    ['bags', /\bbags?\b|\btotes?\b|\bbackpacks?\b|\bpurses?\b|\bhandbags?\b/i],
    ['jewelry', /\bjewel|\bnecklaces?\b|\brings?\b|\bbracelets?\b|\bearrings?\b/i],
    ['accessories', /\bhats?\b|\bcaps?\b|\bbeanies?\b|\bbelts?\b|\bscar(f|ves)\b|\bsocks?\b|\bgloves?\b|\bsunglasses\b|\baccessor/i]
  ];
  const guessCategory = (...texts) => {
    for (const text of texts) {
      const value = String(text || '');
      if (!value) continue;
      const hit = CATEGORY_WORDS.find(([, words]) => words.test(value));
      if (hit) return hit[0];
    }
    return '';
  };

  // "148", "148.00", "1,250.00", and "12,50" or "1.250,00" from a spreadsheet set to use a decimal comma.
  const money = value => {
    let text = String(value || '').replace(/[^0-9.,]/g, '');
    const comma = text.lastIndexOf(','); const dot = text.lastIndexOf('.');
    text = comma > dot && /,\d{1,2}$/.test(text) ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
    const number = Number(text); return text && Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : null;
  };
  const whole = value => { const number = Number(String(value ?? '').trim()); return String(value ?? '').trim() !== '' && Number.isInteger(number) && number >= 0 ? number : null; };
  const optionRole = name => /size|taille|talla|größe/i.test(name) ? 'size' : /colou?r|couleur/i.test(name) ? 'color' : 'other';

  // One piece as the editor wants it. Condition, era, vintage type, the fabric and composition text, fit,
  // construction and care are never filled from a file: the merchant states them for each piece. When the file
  // states the fiber content (a material column, or percentages in the description), the main material is
  // picked from the fixed list for the merchant to check (REQUEST_LOG 107).
  const finish = (piece, warnings) => {
    const base = (piece.baseSku || piece.variants.find(row => row.sku)?.sku?.replace(/[-_][^-_]*$/, '') || piece.name).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'PIECE';
    const variants = piece.variants.length ? piece.variants : [{ size: '', color: '', other: '', sku: '', price: null, stock: null }];
    const notes = [...warnings];
    // A made-up SKU must not repeat one the file already uses for this piece.
    const used = new Set(variants.map(row => row.sku).filter(Boolean)); let next = 1;
    const freshSku = () => { while (used.has(`${base}-${next}`)) next += 1; used.add(`${base}-${next}`); return `${base}-${next}`; };
    const options = variants.map(row => {
      const label = [row.size, row.color, row.other].filter(Boolean).join(' / ') || 'One size';
      const sku = row.sku || freshSku();
      if (!row.sku) notes.push(`Option “${label}” had no SKU, so we made one: ${sku}. You can change it.`);
      if (row.price == null) notes.push(`Option “${label}” has no price in the file.`);
      if (row.stock == null) notes.push(`Option “${label}” has no stock count in the file, so stock is set to 0.`);
      return { label, size: row.size, color: row.color, sku, price: row.price, stock: row.stock ?? 0 };
    });
    // The shop's own category (Shopify's standard product category) is read before the free-text type, unless it stops at
    // a broad level such as "Shirts & Tops" or "Pants"; then the type, tags and name come first (QA review, REQUEST_LOG 109).
    const broad = /^(apparel & accessories|clothing|clothing tops|shirts & tops|tops|shoes|athletic shoes|pants|clothing accessories|outerwear|activewear|bottoms)$/i.test(String(piece.categories || '').trim());
    const category = broad ? guessCategory(piece.type, piece.tags, piece.name, piece.categories) : guessCategory(piece.categories, piece.type, piece.tags, piece.name);
    notes.push(category ? 'We guessed the category from the file. Check it.' : 'Choose a category. We couldn’t tell it from the file.');
    const readText = text => window.PANOPIE_ATTRIBUTES?.materialsOf(text) || { ids: [], shares: false };
    // The material column first; when it names nothing, a description that gives percentages.
    // Capped so an odd file can't stall the page in the material reader (security review, REQUEST_LOG 118).
    const fromColumn = readText(String(piece.material || '').slice(0, 1000)); const fromText = fromColumn.ids.length ? fromColumn : readText(plainText(String(piece.description || '').replace(/<\/?(p|br|li|ul|ol|div|h[1-6]|tr|td)\b[^>]*>/gi, ' ')));
    const read = fromText.shares || fromText === fromColumn ? fromText : { ids: [], shares: false }; const materials = read.ids;
    if (materials.length) {
      const names = materials.map(id => window.PANOPIE_ATTRIBUTES.materials[id]);
      notes.push(`Your file gives the fiber content, so we chose ${names[0]} as the main material${names.length > 1 ? ` and ${names.slice(1).join(' and ')} as ${names.length > 2 ? 'other materials' : 'another material'}` : ''}. Check this against the label. Then write the full fabric and composition from the label yourself.`);
      if (!read.shares) notes.push('Your file doesn’t give percentages, so check which material is the main one.');
    }
    return {
      name: piece.name.slice(0, 200), description: plainText(piece.description), brand: piece.brand || '', tone: options.find(row => row.color)?.color || (piece.colorList?.length === 1 && window.PANOPIE_ATTRIBUTES?.colorFamilyOf(piece.colorList[0]) ? piece.colorList[0] : ''),
      category, materials, baseSku: base, options, imageUrls: [...new Set(piece.images)].filter(url => /^https:\/\//i.test(url)).slice(0, 16), notes: [...new Set(notes)]
    };
  };

  const header = cells => cells.map(cell => cell.trim().toLowerCase());
  const col = (names, ...wanted) => { for (const name of wanted) { const index = names.indexOf(name.toLowerCase()); if (index > -1) return index; } return -1; };
  const cell = (row, index) => index > -1 ? String(row[index] ?? '').trim() : '';
  // A column that states the fiber content, such as Shopify's "Fabric (product.metafields.shopify.fabric)" or a "Material" column.
  const materialColumn = names => names.findIndex(name => /^(material|materials|fabric|fabrics|composition|fiber content|fibre content)( \(product\.metafields\.[a-z_]+\.(fabric|material|materials|composition)\))?$/.test(name));

  // Shopify: one row per option (and per extra image), grouped by Handle; the first row of a Handle has the title.
  // Shopify renamed its columns ("Handle" became "URL handle", "Variant SKU" became "SKU", and so on; checked against
  // Shopify's own product_template.csv on 2026-10-16, REQUEST_LOG 109). Both the older and the newer names are read:
  // a real export from a trial store on 2026-10-18 (REQUEST_LOG 118) still used the older names.
  const SHOPIFY_NAMES = { handle: ['handle', 'url handle'], 'body (html)': ['body (html)', 'description'], 'variant sku': ['variant sku', 'sku'], 'variant price': ['variant price', 'price'], 'variant inventory qty': ['variant inventory qty', 'inventory quantity'], 'image src': ['image src', 'product image url'], 'variant image': ['variant image', 'variant image url'] };
  // An option linked to a category field, and a category field column, hold Shopify's entry handles, not the words
  // the merchant sees: "s", "white", "light-blue", "polyester-1" (a real export, REQUEST_LOG 118). They are turned back
  // into "S", "White", "Light Blue", "Polyester". A list field holds several, joined with "; ". A value that is not a
  // handle (capitals or spaces, such as "Off-White") is kept as it is. A number keeps its region and its half size:
  // "us-9-5" is US 9.5, "eu-42" is EU 42, "9-5" is 9.5 (QA review).
  const entryName = value => {
    const raw = String(value || '').trim();
    if (!/^[a-z0-9-]+$/.test(raw)) return raw;
    const sized = raw.match(/^(?:(us|eu|uk|fr|it|jp|au)-)?(\d{1,2})(?:-(5))?$/);
    if (sized) return `${sized[1] ? `${sized[1].toUpperCase()} ` : ''}${sized[2]}${sized[3] ? '.5' : ''}`;
    const text = raw.replace(/([a-z]{2})-\d+$/, '$1');
    if (/^(\d?x{0,4}[sl]|m)$/.test(text)) return text.toUpperCase();
    return text.split('-').filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
  };
  const entryList = value => String(value || '').split(';').map(entryName).filter(Boolean);
  const fromShopify = (names, rows) => {
    const at = name => col(names, ...(SHOPIFY_NAMES[name] || [name]));
    const materialAt = materialColumn(names);
    const listField = /\(product\.metafields\.[a-z_]+\.[a-z_-]+\)$/;
    const colorAt = names.findIndex(name => /^colou?r \(product\.metafields\.[a-z_]+\.colou?r(-pattern)?\)$/.test(name));
    const pieces = new Map();
    for (const row of rows) {
      const handle = cell(row, at('handle')); if (!handle) continue;
      if (!pieces.has(handle)) pieces.set(handle, { name: '', description: '', brand: '', type: '', categories: '', tags: '', baseSku: handle, variants: [], images: [], status: '' });
      const piece = pieces.get(handle);
      piece.name ||= cell(row, at('title')); piece.description ||= cell(row, at('body (html)')); piece.brand ||= cell(row, at('vendor'));
      piece.type ||= cell(row, at('type')); piece.categories ||= cell(row, at('product category')).split('>').pop().trim(); piece.tags ||= cell(row, at('tags')); piece.status ||= cell(row, at('status')); piece.material ||= cell(row, materialAt);
      // Shopify's Fabric field lists entries without shares, so the usual rule applies: one fiber is suggested, two are
      // left for the store (REQUEST_LOG 107). Only the handles are turned back into words ("polyester-1" is Polyester).
      if (listField.test(names[materialAt] || '') && cell(row, materialAt) && !piece.materialList) { piece.materialList = entryList(cell(row, materialAt).slice(0, 1000)); piece.material = piece.materialList.join('; '); }
      if (colorAt > -1 && !piece.colorList) piece.colorList = cell(row, colorAt) ? entryList(cell(row, colorAt).slice(0, 500)) : null;
      [1, 2, 3].forEach(n => { if (cell(row, at(`option${n} linked to`))) piece[`linked${n}`] = true; });
      const image = cell(row, at('image src')); if (image) piece.images.push(image);
      const variantImage = cell(row, at('variant image')); if (variantImage) piece.images.push(variantImage);
      const values = [1, 2, 3].map(n => [cell(row, at(`option${n} name`)) || piece[`option${n}`] || '', piece[`linked${n}`] ? entryName(cell(row, at(`option${n} value`))) : cell(row, at(`option${n} value`))]);
      values.forEach(([name], n) => { if (name) piece[`option${n + 1}`] = name; });
      const sku = cell(row, at('variant sku')); const price = cell(row, at('variant price'));
      if (!sku && !price && !values.some(([, value]) => value)) continue;
      const option = { size: '', color: '', other: '' };
      for (const [name, value] of values) { if (!value || value === 'Default Title') continue; const role = optionRole(name); option[role] = option[role] ? `${option[role]} ${value}` : value; }
      piece.variants.push({ ...option, sku, price: money(price), stock: whole(cell(row, at('variant inventory qty'))) });
    }
    return [...pieces.values()].filter(piece => piece.name).map(piece => finish(piece, piece.status && piece.status.toLowerCase() !== 'active' ? [`This piece is marked “${piece.status}” in Shopify.`] : []));
  };

  // WooCommerce: a simple product is one row; a variable product has a parent row and one row per variation.
  const fromWoo = (names, rows) => {
    const at = name => col(names, name);
    const attributeColumns = [1, 2, 3, 4].map(n => [at(`attribute ${n} name`), at(`attribute ${n} value(s)`)]);
    const parents = new Map(); const order = [];
    const key = row => cell(row, at('id')) ? `id:${cell(row, at('id'))}` : cell(row, at('sku'));
    // Size, color and any other attribute of one row; an attribute that is neither keeps its name, such as "Logo: No".
    // A simple product keeps only a size or color that has one value; other attributes, such as Material, describe it instead.
    // WooCommerce writes a comma inside one value as "\\,".
    const optionOf = (row, simple = false) => { const option = { size: '', color: '', other: '' }; for (const [nameAt, valueAt] of attributeColumns) { const raw = cell(row, valueAt); if (!raw) continue; const name = cell(row, nameAt); const role = optionRole(name); if (simple && (role === 'other' || raw.replace(/\\,/g, '').includes(','))) continue; const value = raw.replace(/\\,/g, ','); const shown = role === 'other' && name ? `${name}: ${value}` : value; option[role] = option[role] ? `${option[role]}${role === 'other' ? ', ' : ' '}${shown}` : shown; } return option; };
    // Grouped, external, downloadable and virtual products are not pieces a store ships, so they are left out and counted.
    let skipped = 0;
    for (const row of rows) {
      const type = cell(row, at('type')).toLowerCase();
      if (type.includes('variation')) continue;
      if (/grouped|external|downloadable|virtual/.test(type)) { skipped += 1; continue; }
      const piece = { name: cell(row, at('name')), description: cell(row, at('description')) || cell(row, at('short description')), brand: cell(row, at('brands')), type: '', categories: cell(row, at('categories')), tags: cell(row, at('tags')), baseSku: cell(row, at('sku')), variants: [], images: cell(row, at('images')).split(',').map(url => url.trim()).filter(Boolean), variable: type.includes('variable') };
      // A product attribute named Material, Fabric or Composition, or a column with such a name, states the fiber content.
      piece.material = attributeColumns.map(([nameAt, valueAt]) => /^(material|materials|fabric|composition|fiber content)$/i.test(cell(row, nameAt)) ? cell(row, valueAt) : '').find(Boolean) || cell(row, materialColumn(names));
      // A simple product's attributes have one value each when they describe the piece itself, such as Color: Blue.
      if (!piece.variable) piece.variants.push({ ...optionOf(row, true), sku: cell(row, at('sku')), price: money(cell(row, at('sale price')) || cell(row, at('regular price'))), stock: whole(cell(row, at('stock'))) });
      parents.set(key(row), piece); if (cell(row, at('sku'))) parents.set(cell(row, at('sku')), piece); order.push(piece);
    }
    for (const row of rows) {
      const type = cell(row, at('type')).toLowerCase();
      if (!type.includes('variation')) continue;
      const piece = parents.get(cell(row, at('parent'))); if (!piece) continue;
      if (/downloadable|virtual/.test(type)) { skipped += 1; continue; }
      piece.variants.push({ ...optionOf(row), sku: cell(row, at('sku')), price: money(cell(row, at('sale price')) || cell(row, at('regular price'))), stock: whole(cell(row, at('stock'))) });
    }
    const pieces = order.filter(piece => piece.name && piece.variants.length).map(piece => finish(piece, []));
    pieces.skipped = skipped;
    return pieces;
  };

  // Panopie's own template: one row per option; rows with the same name are one piece.
  const TEMPLATE = 'name,brand,category,color,material,description,size,sku,price,stock\nCorduroy Chore Jacket,Your Label,Jackets,Brown,100% cotton corduroy,"Boxy fit, four patch pockets.",M,CHORE-M,148,3\nCorduroy Chore Jacket,Your Label,Jackets,Brown,100% cotton corduroy,"Boxy fit, four patch pockets.",L,CHORE-L,148,2\n';
  const fromTemplate = (names, rows) => {
    const at = name => col(names, name);
    const pieces = new Map();
    for (const row of rows) {
      const name = cell(row, at('name')); if (!name) continue;
      if (!pieces.has(name)) pieces.set(name, { name, description: cell(row, at('description')), brand: cell(row, at('brand')), type: cell(row, at('category')), categories: '', tags: '', baseSku: '', variants: [], images: [], material: cell(row, at('material')) });
      pieces.get(name).variants.push({ size: cell(row, at('size')), color: cell(row, at('color')), other: '', sku: cell(row, at('sku')), price: money(cell(row, at('price'))), stock: whole(cell(row, at('stock'))) });
    }
    return [...pieces.values()].map(piece => finish(piece, []));
  };

  // Reads an exported file. Returns { source, pieces } or throws with a message for the merchant.
  const readProductFile = text => {
    if (String(text || '').length > MAX_FILE_BYTES) throw new Error('This file is larger than 5 MB. Export fewer products at a time.');
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error('This file has no products in it. Export a CSV file from your store and try again.');
    const names = header(rows[0]); const body = rows.slice(1);
    let source; let pieces;
    if ((names.includes('handle') || names.includes('url handle')) && names.includes('title')) { source = 'Shopify'; pieces = fromShopify(names, body); }
    else if (names.includes('type') && names.includes('name') && (names.includes('regular price') || names.includes('parent'))) { source = 'WooCommerce'; pieces = fromWoo(names, body); }
    else if (names.includes('name') && names.includes('price')) { source = 'Panopie template'; pieces = fromTemplate(names, body); }
    else throw new Error('We couldn’t read this file. Use the CSV file that Shopify or WooCommerce exports, or our template.');
    if (!pieces.length) throw new Error(pieces.skipped ? 'We found no pieces to import. Grouped, external, downloadable and virtual products are left out.' : 'We found no products in this file.');
    if (pieces.length > MAX_PIECES) throw new Error(`This file has ${pieces.length} products. Import up to ${MAX_PIECES} at a time.`);
    return { source, pieces, skipped: pieces.skipped || 0 };
  };

  // Flaws a pre-owned seller can tick; they start the condition notes, and the merchant adds where and how big.
  const FLAWS = [['stain', 'Stain'], ['hole', 'Small hole'], ['repair', 'Repair'], ['fading', 'Fading'], ['pilling', 'Pilling'], ['discoloration', 'Discoloration'], ['loose-seam', 'Loose seam'], ['missing-button', 'Missing button'], ['missing-part', 'Missing part'], ['altered', 'Altered'], ['odor', 'Light odor'], ['broken-zipper', 'Broken zipper'], ['stretched', 'Stretched or shrunk']];
  // The ticked flaws are one line at the top, such as "Stain, Fading."; the merchant writes where and
  // how big on the lines below. Changing the ticks replaces only that first line.
  const flawLine = /^(?:Stain|Small hole|Repair|Fading|Pilling|Discoloration|Loose seam|Missing button|Altered|Light odor|Broken zipper|Stretched or shrunk|Missing part)(?:, (?:Stain|Small hole|Repair|Fading|Pilling|Discoloration|Loose seam|Missing button|Altered|Light odor|Broken zipper|Stretched or shrunk|Missing part))*\.$/;
  const flawNotes = (ids, existing = '') => {
    const lines = String(existing || '').split('\n');
    const rest = flawLine.test(lines[0]) ? lines.slice(1) : lines;
    const chosen = FLAWS.filter(([id]) => ids.includes(id)).map(([, name]) => name);
    return [...(chosen.length ? [`${chosen.join(', ')}.`] : []), ...rest].join('\n').replace(/^\n+|\n+$/g, '').slice(0, 2000);
  };

  // Photo fixes. The photo is drawn again in the browser, which also leaves out its hidden details
  // such as where it was taken. Brightness is held within 20% either way to limit how much a flaw can be washed out. It does not prevent it.
  const LIMITS = { straighten: 8, brightness: 20 };
  const normalEdits = (edits = {}) => ({
    turns: ((Math.round(Number(edits.turns) || 0) % 4) + 4) % 4,
    straighten: Math.max(-LIMITS.straighten, Math.min(LIMITS.straighten, Math.round(Number(edits.straighten) || 0))),
    brightness: Math.max(-LIMITS.brightness, Math.min(LIMITS.brightness, Math.round(Number(edits.brightness) || 0))),
    crop: ['square', 'portrait'].includes(edits.crop) ? edits.crop : 'none'
  });
  const describeEdits = (edits = {}) => {
    const value = normalEdits(edits); const parts = [];
    if (value.turns) parts.push(`turned ${value.turns * 90}°`);
    if (value.straighten) parts.push(`straightened ${Math.abs(value.straighten)}°`);
    if (value.brightness) parts.push(`${value.brightness > 0 ? 'brighter' : 'darker'} by ${Math.abs(value.brightness)}%`);
    if (value.crop !== 'none') parts.push(value.crop === 'square' ? 'cropped to a square' : 'cropped to 4:5');
    return parts.join(', ');
  };
  // Draws the photo with the edits on a canvas. Used for the preview and for the file that is uploaded.
  const draw = (canvas, bitmap, edits, maxEdge = 3000, clear = false) => {
    const value = normalEdits(edits);
    const quarter = value.turns % 2 === 1;
    let width = quarter ? bitmap.height : bitmap.width; let height = quarter ? bitmap.width : bitmap.height;
    // Straightening turns the photo a little and zooms in just enough that no empty corner shows.
    const angle = value.straighten * Math.PI / 180;
    const zoom = Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle)) * Math.max(width / height, height / width);
    let cropW = width; let cropH = height;
    if (value.crop === 'square') cropW = cropH = Math.min(width, height);
    if (value.crop === 'portrait') { if (width / height > 4 / 5) cropW = Math.round(height * 4 / 5); else cropH = Math.round(width * 5 / 4); }
    const scale = Math.min(1, maxEdge / Math.max(cropW, cropH));
    canvas.width = Math.max(1, Math.round(cropW * scale)); canvas.height = Math.max(1, Math.round(cropH * scale));
    const context = canvas.getContext('2d');
    if (!clear) { context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); }
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(value.turns * Math.PI / 2 + angle);
    context.scale(scale * zoom, scale * zoom);
    if (value.brightness) context.filter = `brightness(${100 + value.brightness}%)`;
    context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
    context.restore();
    return canvas;
  };
  // A phone browser can stall on a large photo without ever failing; after 30 seconds the page says so instead of staying silent.
  const withTimeout = (promise, ms = 30000) => new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Object.assign(new Error('This photo took too long to prepare.'), { code: 'browser' })), ms); promise.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); }); });
  const toBlob = (canvas, quality, type = 'image/jpeg') => withTimeout(new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('This photo could not be prepared.')), type, quality)));
  // A browser that can't prepare photos says so with the code 'browser', so the page can tell the person to update it.
  const browserError = () => { const error = new Error('This browser can’t prepare photos. Update it and try again.'); error.code = 'browser'; return error; };
  // Reads the photo upright. A browser that doesn't know the orientation option throws a TypeError: that is the same advice, update it.
  const readBitmap = async file => { try { return await withTimeout(createImageBitmap(file, { imageOrientation: 'from-image' })); } catch (error) { if (error instanceof TypeError) throw browserError(); throw error; } };
  // Returns a new JPEG file, under 5 MB, without the original's hidden details.
  const prepareImage = async (file, edits = {}) => {
    // Without these the photo can't be saved again, so its hidden details would stay: refuse instead.
    if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') throw browserError();
    const bitmap = await readBitmap(file);
    let canvas;
    try { canvas = draw(document.createElement('canvas'), bitmap, edits); } finally { bitmap.close?.(); }
    let quality = 0.9; let blob = await toBlob(canvas, quality);
    // Steps of one tenth, kept exact (0.9, 0.8 ... 0.5): repeated subtraction drifts and would take one step too many.
    while (blob.size > MAX_FILE_BYTES - 65536 && quality > 0.5) { quality = Math.round((quality - 0.1) * 10) / 10; blob = await toBlob(canvas, quality); }
    // Free the canvas now: a phone keeps a limited total of canvas memory, and the next photo needs it.
    canvas.width = 0; canvas.height = 0;
    if (blob.size > MAX_FILE_BYTES) { const error = new Error('This photo is too detailed to shrink under 5 MB.'); error.code = 'too-large'; throw error; }
    const name = String(file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  };
  // A logo is saved again too, so its hidden details go, but a PNG or WebP logo stays a PNG and keeps
  // a transparent background. A JPG logo is handled like any photo.
  const prepareLogo = async file => {
    if (file.type === 'image/jpeg') return prepareImage(file);
    if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') throw browserError();
    const bitmap = await readBitmap(file);
    // A very detailed PNG can be large: try a smaller one before falling back to a JPG with a white background.
    let blob = null;
    try { for (const edge of [1200, 800]) { blob = await toBlob(draw(document.createElement('canvas'), bitmap, {}, edge, true), undefined, 'image/png'); if (blob.size <= MAX_FILE_BYTES) break; } } finally { bitmap.close?.(); }
    if (blob.size > MAX_FILE_BYTES) return prepareImage(file);
    return new File([blob], String(file.name || 'logo').replace(/\.[^.]+$/, '') + '.png', { type: 'image/png', lastModified: Date.now() });
  };

  // Materials Panopie does not accept during the pilot (ivory, tortoiseshell, protected wild-animal parts). A colour called "ivory" and imitation such as tortoiseshell-pattern acetate are fine. This is a first check for the seller; review still reads the listing.
  const RESTRICTED_MATERIAL = /\b(elephant ivory|ivory tusk|(?:real|genuine|carved) ivory(?![\s-]*(?:colou?r|white|tone|shade))|tortoise[\s-]?shell(?![\s-]+(?:acetate|pattern|print|effect|resin|look|style|colou?r|tone|shade))|rhino(?:ceros)? horn|whale (?:bone|tooth|baleen)|sea turtle)\b/i;
  const IMITATION = /\b(?:faux|imitation|fake|vegan|synthetic|not|no)\s+(?:real\s+|genuine\s+)?(?:ivory|tortoise[\s-]?shell)/gi;
  // A named famous person, or a celebrity style, may not be used to sell a piece (request 191). The first pattern is case sensitive on purpose:
  // "worn by Rihanna" is caught, "can be worn by men and women" is not. Names can't be listed, so review still reads every listing.
  // "Worn by Rihanna", "WORN BY RIHANNA", "Worn By Madonna" and "spotted on Instagram" are caught; "worn by men and women", "Worn by Hand Dyed", "Owned by Mom" and "leopard spotted on the sleeve" are not.
  const COMMON_AFTER_BY = 'Hand|Hands|Many|Women|Men|Everyone|Everybody|One|Mom|Dad|Mother|Father|Skaters|Sailors|Workers|People|Kids|Girls|Boys|Anyone|Those|Both|All|Us|Me|Hand-?Dyed|Machine|Hand-?Made';
  const FAMOUS_NAMED = new RegExp("\\b(?:(?:[Ww]orn|[Oo]wned|WORN|OWNED)\\s+(?:[Bb]y|BY)|[Ss]potted\\s+(?:on|by))\\s+(?:the\\s+)?(?!(?:" + COMMON_AFTER_BY + ")\\b)[A-Z][\\w'\\u2019.-]*(?:\\s+[A-Z][\\w'\\u2019.-]*)?");
  const FAMOUS_WORDS = /\b(?:celebrit(?:y|ies)|celebs?|a-?list(?:er)?s?|red[- ]carpet|star[- ]worn)\b|明星|艺人|名人|网红同款/i;
  // Returns the words that matched (so the seller can see what to change), or an empty string.
  const famousClaim = text => { const value = String(text || ''); const hit = value.match(FAMOUS_NAMED) || value.match(FAMOUS_WORDS); return hit ? hit[0] : ''; };
  const restrictedMaterial = text => RESTRICTED_MATERIAL.test(String(text || '').replace(IMITATION, ' '));
  window.PANOPIE_LISTING_TOOLS = { famousClaim, restrictedMaterial, parseCsv, plainText, guessCategory, readProductFile, TEMPLATE, FLAWS, flawNotes, LIMITS, normalEdits, describeEdits, draw, prepareImage, prepareLogo, MAX_PIECES };
})();
