/* Public shopping disclosures and the authenticated account entry. */
(() => {
  'use strict';
  window.PANOPIE_HEADER = { attach(c) {
    const {esc:e,path} = c;
    const chevron = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg>';
    const closeIcon = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>';
    const link = (view,label,extras={},classes='') => `<a class="${classes}" href="${e(path(view,extras))}" data-commerce-route="${e(view)}" data-commerce-params="${e(JSON.stringify(extras))}">${e(label)}</a>`;
    const signed = () => Boolean(c.state().buyer.signedIn && (!c.configured() || c.backend() && c.userId()));
    let openId = null;
    let openMode = null;
    let closeTimer = null;
    const trigger = id => document.querySelector(`[data-header-toggle="${id}"]`);
    const panel = id => document.querySelector(`[data-header-panel="${id}"]`);
    const zone = target => target?.closest?.('[data-header-root], [data-header-panel]');
    const zoneId = target => zone(target)?.dataset.headerRoot || zone(target)?.dataset.headerPanel;
    const cancelClose = () => { if (closeTimer !== null) clearTimeout(closeTimer); closeTimer=null; };
    const sync = () => {
      if (openId && (!trigger(openId) || !panel(openId))) openId=null;
      document.querySelectorAll('[data-header-toggle]').forEach(button=>button.setAttribute('aria-expanded',String(button.dataset.headerToggle===openId)));
      document.querySelectorAll('[data-header-panel]').forEach(element=>element.hidden=element.dataset.headerPanel!==openId);
    };
    const close = (restoreFocus=false) => { cancelClose();const previous=openId;openId=null;openMode=null;sync();if(restoreFocus)trigger(previous)?.focus(); };
    const open = (id,focus=false,mode='keyboard') => {
      cancelClose();if(!trigger(id)||!panel(id))return;openId=id;openMode=mode;sync();
      if(focus)panel(id).querySelector('input, a, button')?.focus();
    };
    const heading = (id,title,action) => `<div class="header-panel-heading"><h2 id="header-panel-title-${id}">${e(title)}</h2>${action}<button type="button" class="header-panel-close" data-header-close aria-label="Close ${e(title)} menu">${closeIcon}</button></div>`;
    const collection = audience => {
      const title=audience==='men'?'Men’s':'Women’s';
      const data=c.data();const brands=data.collections?.[audience]||[];
      const brandContent=data.errors?.collections?`<p class="header-panel-note" role="status">Brands couldn’t load. <button type="button" data-header-retry>Try again</button></p>`:brands.length?`<div class="header-panel-links">${brands.slice(0,8).map(brand=>link('shop',brand.name,{audience,brand:brand.name,category:'all'})).join('')}</div>`:'<p class="header-panel-note">Brands appear here when approved products are available in this collection.</p>';
      return `<section class="header-mega-panel" id="header-panel-${audience}" data-header-panel="${audience}" aria-labelledby="header-panel-title-${audience}" hidden>${heading(audience,title,link('shop',`Shop all ${title.toLowerCase()}`,{audience},'header-panel-shop-all'))}<div class="header-panel-columns"><div><h3>Shop by category</h3>${c.categoryGroups?.length?`<div class="header-category-groups">${c.categoryGroups.map(([group,entries])=>`<div><h4>${e(group)}</h4><div class="header-panel-links header-category-links">${Object.entries(entries).map(([id,label])=>link('shop',label,{audience,category:id})).join('')}</div></div>`).join('')}</div>`:`<div class="header-panel-links header-category-links">${Object.entries(c.categories).map(([id,label])=>link('shop',label,{audience,category:id})).join('')}</div>`}</div><div><h3>Brands</h3>${brandContent}${link('shop','Explore brands & stores',{audience,tab:'stores'},'header-panel-more')}</div></div></section>`;
    };
    const styles = () => `<section class="header-mega-panel" id="header-panel-styles" data-header-panel="styles" aria-labelledby="header-panel-title-styles" hidden>${heading('styles','Find your style',link('styles','Explore all styles',{},'header-panel-shop-all'))}${c.styleFamilies?.length?`<div class="header-style-families">${c.styleFamilies.map(family=>`<div><h3>${e(family.name)}</h3><div class="header-panel-links">${c.styles.filter(style=>style.family===family.id).map(style=>link('style',style.name,{style:style.id})).join('')}</div></div>`).join('')}</div>`:`<div class="header-style-links">${c.styles.map(style=>`<div>${link('style',style.name,{style:style.id})}<p>${e(style.copy)}</p></div>`).join('')}</div>`}</section>`;
    const stores = () => {
      const data=c.data();const approved=data.stores||[];
      return `<section class="header-mega-panel" id="header-panel-stores" data-header-panel="stores" aria-labelledby="header-panel-title-stores" hidden>${heading('stores','Independent stores',link('stores','Explore all stores',{},'header-panel-shop-all'))}<div class="header-panel-columns"><div><h3>Discover stores</h3>${data.errors?.stores?'<p class="header-panel-note" role="status">Stores couldn’t load. <button type="button" data-header-retry>Try again</button></p>':approved.length?`<div class="header-panel-links">${approved.slice(0,8).map(store=>link('store',store.name,{id:store.id})).join('')}</div>`:'<p class="header-panel-note">Approved stores will appear here as they join the marketplace.</p>'}</div><div><h3>Your stores</h3><p class="header-panel-note">Keep the stores you love close, and find their pieces first.</p>${link('following','Stores you follow',{},'header-panel-more')}</div></div></section>`;
    };
    const category = (id,label,view,extras,active) => `<div class="header-disclosure" data-header-root="${id}">${link(view,label,extras,active?'is-active':'')}<button type="button" class="header-expand" id="header-toggle-${id}" data-header-toggle="${id}" aria-label="Browse ${e(label)}" aria-expanded="false" aria-controls="header-panel-${id}">${chevron}</button></div>`;
    const navigation = tasks => {
      const p=c.params();const current=p.get('view')||'home';
      return `<div class="header-navigation-rail">${category('men','Men’s','shop',{audience:'men'},current==='shop'&&p.get('audience')==='men')}${category('women','Women’s','shop',{audience:'women'},current==='shop'&&p.get('audience')==='women')}${category('styles','Styles','styles',{},['styles','style'].includes(current))}${category('stores','Stores','stores',{},['stores','store','brands'].includes(current))}${tasks}</div>${collection('men')}${collection('women')}${styles()}${stores()}`;
    };
    const account = () => {
      // Sign-in comes back to the page it was opened from, with that page's own details (request 137).
      const here=c.params();const view=here.get('view')||'home';const back=['register','forgot','verify','verified','recovery','reset-password','accept-invitation','unsubscribe'].includes(view)?{next:'account'}:{next:view,...Object.fromEntries(['id','store','order','thread','handle','q','category','audience','page','sort','brand','style','tab','import'].filter(key=>here.get(key)).map(key=>[key,here.get(key)]))};
      if(!signed())return link('register','',{mode:'signin',...back},'platform-icon-button').replace('class="platform-icon-button"','class="platform-icon-button" aria-label="Sign in or create an account" title="Sign in or create an account"').replace('></a>',`>${c.icon('user')}</a>`);
      const buyer=c.state().buyer;
      return `<div class="platform-account-control" data-header-root="account"><button type="button" class="platform-icon-button" id="header-toggle-account" data-header-toggle="account" data-account-menu aria-label="Open account menu" aria-expanded="false" aria-controls="accountMenu">${c.icon('user')}</button><section class="account-menu" id="accountMenu" data-header-panel="account" aria-label="Your account" hidden><div class="account-menu-identity"><strong>${e(buyer.name||'Your account')}<span>${e(buyer.email||'')}</span></strong><button type="button" class="header-panel-close" data-header-close aria-label="Close account menu">${closeIcon}</button></div><div class="account-menu-links">${[['account','Account overview'],['orders','Your orders'],['saved','Saved pieces'],['following','Stores you follow'],['messages','Messages'],['notifications','Updates'],['addresses','Addresses'],['returns','Returns & help'],[c.state().merchant?.submitted?'seller':'seller-start','Sell on Panopie'],['settings','Settings'],['security','Account security']].map(([view,label])=>link(view,label)).join('')}<button type="button" class="account-menu-signout" data-sign-out>Sign out</button></div></section></div>`;
    };
    // The search box opens on a click or tap only (never on hover), and the cursor lands in its field (request 199).
    const search = () => `<div class="platform-search-control" data-header-root="search"><button type="button" class="platform-icon-button" id="header-toggle-search" data-header-toggle="search" aria-label="Open search" aria-expanded="false" aria-controls="header-panel-search">${c.icon('search')}</button><div class="header-mega-panel header-search-panel" id="header-panel-search" data-header-panel="search" hidden><form class="platform-search-row" data-commerce-form="search" role="search"><label>${c.icon('search')}<span class="sr-only">Search brands, products or styles</span><input name="q" placeholder="Search a brand, piece or style" autocomplete="off" maxlength="120" required value="${c.params().get('view')==='shop'?e(c.params().get('q')||''):''}"></label><button type="submit">Search</button></form><button type="button" class="header-panel-close" data-header-close aria-label="Close search">${closeIcon}</button></div></div>`;
    // After Escape the pointer may still rest on the toggle; ignore hover briefly so the panel stays closed.
    let hoverBlockedUntil=0;
    document.addEventListener('pointerover',event=>{
      if(event.pointerType!=='mouse'||Date.now()<hoverBlockedUntil||!window.matchMedia('(hover: hover) and (pointer: fine)').matches)return;
      const id=zoneId(event.target);if(id==='search')return;if(id){cancelClose();if(openId!==id)open(id,false,'hover');}
    });
    document.addEventListener('pointerout',event=>{
      if(!openId||zoneId(event.target)!==openId||zoneId(event.relatedTarget)===openId)return;
      cancelClose();closeTimer=setTimeout(()=>{if(zoneId(document.activeElement)!==openId)close();},220);
    });
    document.addEventListener('click',async event=>{
      const button=event.target.closest('[data-header-toggle]');
      if(button){event.preventDefault();openId===button.dataset.headerToggle&&openMode==='click'?close():open(button.dataset.headerToggle,false,'click');if(openId==='search')panel('search')?.querySelector('input')?.focus();return;}
      if(event.target.closest('[data-header-close]')){close(true);return;}
      const retry=event.target.closest('[data-header-retry]');
      if(retry){retry.disabled=true;retry.textContent='Loading…';const id=openId;await c.retry();open(id);(panel(id)?.querySelector('[data-header-retry]')||panel(id)?.querySelector('a,button'))?.focus();return;}
      if(openId&&!zone(event.target))close();
    });
    /* Safari and iOS give a clicked button no focus, so the input would blur with no target and close the panel before the click lands. */
    let pointerInside=false;
    document.addEventListener('pointerdown',event=>{pointerInside=!!(openId&&zone(event.target));setTimeout(()=>{pointerInside=false;},400);});
    document.addEventListener('focusout',event=>{
      if(pointerInside)return;
      if(openId&&zoneId(event.target)===openId&&zoneId(event.relatedTarget)!==openId)close();
    });
    document.addEventListener('keydown',event=>{
      const root=event.target.closest('[data-header-root]');
      if(event.key==='ArrowDown'&&root&&!event.target.closest('[data-header-panel]')){event.preventDefault();open(root.dataset.headerRoot,true);return;}
      if(event.key==='Escape'&&openId){event.preventDefault();hoverBlockedUntil=Date.now()+600;close(true);return;}
      if(event.key!=='Tab'||!openId)return;
      const links=Array.from(panel(openId)?.querySelectorAll('a,button,input')||[]).filter(element=>!element.disabled);
      if(event.target===trigger(openId)&&!event.shiftKey){event.preventDefault();links[0]?.focus();}
      else if(event.target===links[0]&&event.shiftKey){event.preventDefault();trigger(openId)?.focus();}
      else if(event.target===links[links.length-1]&&!event.shiftKey){
        const targets=Array.from(document.querySelectorAll('#platformHeader .header-navigation-rail a, #platformHeader .header-navigation-rail button, #platformHeader .platform-header-actions > a, #platformHeader .platform-header-actions > div > button'));
        const next=targets[targets.indexOf(trigger(openId))+1];if(next){event.preventDefault();close();next.focus();}else close();
      }
    });
    return {navigation,account,search,sync,close};
  }};
})();
