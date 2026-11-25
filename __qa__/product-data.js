(() => {
  const products = [];

  const categoryDetails = {
    hoodies: { fit: 'Relaxed fit with room for a tee underneath', material: 'Heavyweight loopback cotton-blend fleece', features: 'Lined hood, front pocket, and ribbed trims', care: 'Cold wash inside out; reshape while damp', sizeNote: 'Use your usual size for an easy fit.' },
    jackets: { fit: 'Boxy outer layer with an easy shoulder', material: 'Structured woven shell with a smooth lining', features: 'Layering-friendly cut and utility pockets', care: 'Spot clean first; follow the final store care label', sizeNote: 'Designed to layer over a midweight top.' },
    jeans: { fit: 'Relaxed straight leg with an easy rise', material: 'Midweight cotton denim', features: 'Five-pocket construction and a full-length leg', care: 'Wash sparingly and separately to protect the finish', sizeNote: 'Choose by waist measurement once the store confirms its size chart.' },
    'cargo-pants': { fit: 'Relaxed utility fit with room through the leg', material: 'Durable cotton-blend twill', features: 'Utility pockets and an adjustable hem', care: 'Cold machine wash; close fastenings first', sizeNote: 'The final store listing will confirm waist and inseam.' },
    suits: { fit: 'Soft tailored shape designed for relaxed layering', material: 'Woven suiting blend with a light structure', features: 'Easy shoulder, clean lapel, and double vent', care: 'Dry clean only when the merchant confirms the final fabric', sizeNote: 'Compare shoulder and chest measurements before ordering.' },
    'athletic-shoes': { fit: 'Standard unisex fit', material: 'Mesh upper with a cushioned technical sole', features: 'Breathable upper and textured tread', care: 'Brush clean and air dry away from direct heat', sizeNote: 'The approved merchant will publish the final conversion chart.' },
    'leather-shoes': { fit: 'Standard unisex fit with a clean low profile', material: 'Smooth leather upper with a rubber sole', features: 'Padded collar and tonal lace closure', care: 'Wipe with a soft cloth and condition as needed', sizeNote: 'Check the merchant size guide before ordering.' }
  };

  const add = (category, image, entries) => entries.forEach(([name, store, tone, price, priority], index) => {
    const details = categoryDetails[category];
    products.push({
      id: `${category}-${String(index + 1).padStart(2, '0')}`,
      category,
      image,
      name,
      store,
      tone,
      price,
      priority,
      badge: priority === 'followed' ? 'FOLLOWED STORE' : 'WIDER EDIT',
      description: priority === 'followed'
        ? `A pilot catalog piece from ${store}, kept close because this is a store you follow.`
        : `A pilot catalog piece selected from the wider Panopie edit for its current demand and clear point of view.`,
      media: { asset: 'catalog-grid.png', crop: image, alt: `${name} in ${tone}; prototype product image` },
      details,
      variants: ['S', 'M', 'L', 'XL'],
      listingStatus: 'Active',
      reviewStatus: 'Seeded pilot catalog',
      inventoryStatus: 'Illustrative',
      source: 'Panopie pilot seed'
    });
  });

  add('hoodies', 'p1', [
    ['Night Shift Zip Hoodie', 'Sample Label', 'Black', 72, 'followed'],
    ['Orbit Heavy Hoodie', 'Demo Label Beta', 'Charcoal', 78, 'followed'],
    ['Double Layer Pullover', 'Demo Label Alpha', 'Stone', 74, 'followed'],
    ['Dense Fleece Hoodie', 'Demo Label Zeta', 'Graphite', 84, 'trending'],
    ['Washed Script Hoodie', 'Demo Label Eta', 'Faded bone', 76, 'trending'],
    ['Studio Loopback Hoodie', 'Demo Label Theta', 'Pepper', 82, 'trending']
  ]);

  add('jackets', 'p4', [
    ['Studio Moto Jacket', 'Sample Label', 'Black', 180, 'followed'],
    ['Faded Canvas Jacket', 'Demo Label Beta', 'Slate', 164, 'followed'],
    ['Panel Flight Jacket', 'Demo Label Alpha', 'Navy', 172, 'followed'],
    ['Cropped Work Jacket', 'Demo Label Zeta', 'Olive', 148, 'trending'],
    ['Soft Shell Blouson', 'Demo Label Eta', 'Cloud gray', 156, 'trending'],
    ['Archive Varsity Jacket', 'Demo Label Theta', 'Ink', 188, 'trending']
  ]);

  add('jeans', 'p2', [
    ['Raw Curve Denim', 'Sample Label', 'Indigo', 106, 'followed'],
    ['Loose Seam Jean', 'Demo Label Beta', 'Washed black', 112, 'followed'],
    ['Wide Stonewash Denim', 'Demo Label Alpha', 'Medium blue', 98, 'followed'],
    ['Relaxed Straight Denim', 'Demo Label Zeta', 'Blue gray', 96, 'trending'],
    ['Painter Pocket Jean', 'Demo Label Eta', 'Ecru', 104, 'trending'],
    ['Broken Twill Denim', 'Demo Label Theta', 'Faded indigo', 118, 'trending']
  ]);

  add('cargo-pants', 'p5', [
    ['Stack Pocket Cargo', 'Sample Label', 'Black', 96, 'followed'],
    ['Compact Utility Pant', 'Demo Label Beta', 'Moss', 92, 'followed'],
    ['Convertible Field Pant', 'Demo Label Alpha', 'Stone', 88, 'followed'],
    ['Field Cargo Pant', 'Demo Label Zeta', 'Olive', 89, 'trending'],
    ['Tapered Tech Cargo', 'Demo Label Eta', 'Ash', 102, 'trending'],
    ['Double Knee Cargo', 'Demo Label Theta', 'Tobacco', 108, 'trending']
  ]);

  add('suits', 'p4', [
    ['Relaxed Two Button Blazer', 'Sample Label', 'Black', 212, 'followed'],
    ['Soft Shoulder Suit Jacket', 'Demo Label Beta', 'Warm gray', 226, 'followed'],
    ['Boxy Evening Blazer', 'Demo Label Alpha', 'Ink', 198, 'followed'],
    ['Unstructured Suit Jacket', 'Demo Label Zeta', 'Charcoal', 186, 'trending'],
    ['Easy Pleat Suit Set', 'Demo Label Eta', 'Taupe', 204, 'trending'],
    ['Double Vent Blazer', 'Demo Label Theta', 'Navy', 218, 'trending']
  ]);

  add('athletic-shoes', 'p6', [
    ['Vector Runner', 'Demo Label Gamma', 'Silver', 142, 'followed'],
    ['Transit Mesh Runner', 'Demo Label Delta', 'Bone', 136, 'followed'],
    ['Daily Track Shoe', 'Demo Label Epsilon', 'Black', 128, 'followed'],
    ['Technical Trail Sneaker', 'Demo Label Zeta', 'Silver', 164, 'trending'],
    ['Pace Knit Runner', 'Demo Label Eta', 'Fog', 138, 'trending'],
    ['Road Form Trainer', 'Demo Label Theta', 'White / navy', 146, 'trending']
  ]);

  add('leather-shoes', 'p3', [
    ['Low Form Leather Sneaker', 'Demo Label Gamma', 'Cloud white', 152, 'followed'],
    ['Polished Court Shoe', 'Demo Label Delta', 'Black', 148, 'followed'],
    ['Everyday Leather Derby', 'Demo Label Epsilon', 'Oxblood', 166, 'followed'],
    ['Minimal Leather Sneaker', 'Demo Label Zeta', 'White', 118, 'trending'],
    ['Square Toe Derby', 'Demo Label Eta', 'Black', 154, 'trending'],
    ['Soft Leather Loafer', 'Demo Label Theta', 'Dark brown', 172, 'trending']
  ]);

  window.PANOPIE_CATALOG = products;
})();
