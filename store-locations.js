/* Where a store is based. A merchant picks a country and, for Canada or the United States, a province, territory or state.
   Nothing here is typed by a merchant, so a street or a city can never end up in this field. The database checks the same lists (migration 016).
   Russia, Belarus, Iran, North Korea and Syria are left out: a store can't be based there (migration 027; counsel to confirm, J10). */
(() => {
  'use strict';
  const countries = "AF:Afghanistan|AX:Åland Islands|AL:Albania|DZ:Algeria|AS:American Samoa|AD:Andorra|AO:Angola|AI:Anguilla|AG:Antigua & Barbuda|AR:Argentina|AM:Armenia|AW:Aruba|AU:Australia|AT:Austria|AZ:Azerbaijan|BS:Bahamas|BH:Bahrain|BD:Bangladesh|BB:Barbados|BE:Belgium|BZ:Belize|BJ:Benin|BM:Bermuda|BT:Bhutan|BO:Bolivia|BA:Bosnia & Herzegovina|BW:Botswana|BR:Brazil|IO:British Indian Ocean Territory|VG:British Virgin Islands|BN:Brunei|BG:Bulgaria|BF:Burkina Faso|BI:Burundi|KH:Cambodia|CM:Cameroon|CA:Canada|CV:Cape Verde|BQ:Caribbean Netherlands|KY:Cayman Islands|CF:Central African Republic|TD:Chad|CL:Chile|CN:China|CX:Christmas Island|CC:Cocos (Keeling) Islands|CO:Colombia|KM:Comoros|CG:Congo (Brazzaville)|CD:Congo (Kinshasa)|CK:Cook Islands|CR:Costa Rica|CI:Côte d'Ivoire|HR:Croatia|CU:Cuba|CW:Curaçao|CY:Cyprus|CZ:Czechia|DK:Denmark|DJ:Djibouti|DM:Dominica|DO:Dominican Republic|EC:Ecuador|EG:Egypt|SV:El Salvador|GQ:Equatorial Guinea|ER:Eritrea|EE:Estonia|SZ:Eswatini|ET:Ethiopia|FK:Falkland Islands|FO:Faroe Islands|FJ:Fiji|FI:Finland|FR:France|GF:French Guiana|PF:French Polynesia|GA:Gabon|GM:Gambia|GE:Georgia|DE:Germany|GH:Ghana|GI:Gibraltar|GR:Greece|GL:Greenland|GD:Grenada|GP:Guadeloupe|GU:Guam|GT:Guatemala|GG:Guernsey|GN:Guinea|GW:Guinea-Bissau|GY:Guyana|HT:Haiti|HN:Honduras|HK:Hong Kong|HU:Hungary|IS:Iceland|IN:India|ID:Indonesia|IQ:Iraq|IE:Ireland|IM:Isle of Man|IL:Israel|IT:Italy|JM:Jamaica|JP:Japan|JE:Jersey|JO:Jordan|KZ:Kazakhstan|KE:Kenya|KI:Kiribati|XK:Kosovo|KW:Kuwait|KG:Kyrgyzstan|LA:Laos|LV:Latvia|LB:Lebanon|LS:Lesotho|LR:Liberia|LY:Libya|LI:Liechtenstein|LT:Lithuania|LU:Luxembourg|MO:Macao|MG:Madagascar|MW:Malawi|MY:Malaysia|MV:Maldives|ML:Mali|MT:Malta|MH:Marshall Islands|MQ:Martinique|MR:Mauritania|MU:Mauritius|YT:Mayotte|MX:Mexico|FM:Micronesia|MD:Moldova|MC:Monaco|MN:Mongolia|ME:Montenegro|MS:Montserrat|MA:Morocco|MZ:Mozambique|MM:Myanmar|NA:Namibia|NR:Nauru|NP:Nepal|NL:Netherlands|NC:New Caledonia|NZ:New Zealand|NI:Nicaragua|NE:Niger|NG:Nigeria|NU:Niue|NF:Norfolk Island|MK:North Macedonia|MP:Northern Mariana Islands|NO:Norway|OM:Oman|PK:Pakistan|PW:Palau|PS:Palestinian Territories|PA:Panama|PG:Papua New Guinea|PY:Paraguay|PE:Peru|PH:Philippines|PN:Pitcairn Islands|PL:Poland|PT:Portugal|PR:Puerto Rico|QA:Qatar|RE:Réunion|RO:Romania|RW:Rwanda|WS:Samoa|SM:San Marino|ST:São Tomé & Príncipe|SA:Saudi Arabia|SN:Senegal|RS:Serbia|SC:Seychelles|SL:Sierra Leone|SG:Singapore|SX:Sint Maarten|SK:Slovakia|SI:Slovenia|SB:Solomon Islands|SO:Somalia|ZA:South Africa|KR:South Korea|SS:South Sudan|ES:Spain|LK:Sri Lanka|BL:St. Barthélemy|SH:St. Helena|KN:St. Kitts & Nevis|LC:St. Lucia|MF:St. Martin|PM:St. Pierre & Miquelon|VC:St. Vincent & Grenadines|SD:Sudan|SR:Suriname|SJ:Svalbard & Jan Mayen|SE:Sweden|CH:Switzerland|TW:Taiwan|TJ:Tajikistan|TZ:Tanzania|TH:Thailand|TL:Timor-Leste|TG:Togo|TK:Tokelau|TO:Tonga|TT:Trinidad & Tobago|TN:Tunisia|TR:Türkiye|TM:Turkmenistan|TC:Turks & Caicos Islands|TV:Tuvalu|VI:U.S. Virgin Islands|UG:Uganda|UA:Ukraine|AE:United Arab Emirates|GB:United Kingdom|US:United States|UY:Uruguay|UZ:Uzbekistan|VU:Vanuatu|VA:Vatican City|VE:Venezuela|VN:Vietnam|WF:Wallis & Futuna|EH:Western Sahara|YE:Yemen|ZM:Zambia|ZW:Zimbabwe".split('|').map(entry => entry.split(':'));
  const regions = {
    CA: {"AB":"Alberta","BC":"British Columbia","MB":"Manitoba","NB":"New Brunswick","NL":"Newfoundland and Labrador","NS":"Nova Scotia","NT":"Northwest Territories","NU":"Nunavut","ON":"Ontario","PE":"Prince Edward Island","QC":"Quebec","SK":"Saskatchewan","YT":"Yukon"},
    US: {"AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California","CO":"Colorado","CT":"Connecticut","DE":"Delaware","DC":"District of Columbia","FL":"Florida","GA":"Georgia","HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa","KS":"Kansas","KY":"Kentucky","LA":"Louisiana","ME":"Maine","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi","MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York","NC":"North Carolina","ND":"North Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon","PA":"Pennsylvania","RI":"Rhode Island","SC":"South Carolina","SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont","VA":"Virginia","WA":"Washington","WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming"}
  };
  const countryNames = Object.fromEntries(countries);
  const known = (country, region) => Boolean(countryNames[country]) && (regions[country] ? Boolean(regions[country][region]) : !region);
  // 'Ontario, Canada', or 'Canada' when the region is not given (an individual seller shows only the country unless they choose otherwise).
  const label = (country, region) => countryNames[country] ? [regions[country]?.[region], countryNames[country]].filter(Boolean).join(', ') : '';
  const regionLabel = country => ({ CA: 'Province or territory', US: 'State' })[country] || '';
  const isQuebec = (country, region) => country === 'CA' && region === 'QC';
  // An address the database refuses as Quebec (migrations 017 and 023): the region read without case, spaces or dots,
  // in any country, or a Canadian postal code that starts with G, H or J.
  const QUEBEC_NAMES = ['qc', 'pq', 'que', 'qué', 'quebec', 'québec', 'province of quebec', 'province of québec', 'province de quebec', 'province de québec'];
  const isQuebecAddress = (country, region, postal) => QUEBEC_NAMES.includes(String(region || '').normalize('NFC').replace(/^[\s.]+|[\s.]+$/g, '').toLowerCase())
    || (String(country || '').toUpperCase() === 'CA' && /^[GHJ]/.test(String(postal || '').trim().toUpperCase()));
  // Where orders can be delivered (REQUEST_LOG 114): each store chooses among these, and the database keeps to the same
  // list (migration 027). Delivery addresses also need a region from these lists; a store's location still uses only
  // the Canada and United States lists above, as the database checks (migration 016).
  const deliveryCountries = [['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom'], ['AU', 'Australia'], ['NZ', 'New Zealand']];
  const addressRegions = {
    ...regions,
    // Northern Ireland is left out during the pilot (owner decision 2026-10-17; counsel J15), like Quebec.
    GB: { ENG: 'England', SCT: 'Scotland', WLS: 'Wales' },
    AU: { ACT: 'Australian Capital Territory', NSW: 'New South Wales', NT: 'Northern Territory', QLD: 'Queensland', SA: 'South Australia', TAS: 'Tasmania', VIC: 'Victoria', WA: 'Western Australia' },
    NZ: { AUK: 'Auckland', BOP: 'Bay of Plenty', CAN: 'Canterbury', CIT: 'Chatham Islands', GIS: 'Gisborne', HKB: 'Hawke’s Bay', MWT: 'Manawatū-Whanganui', MBH: 'Marlborough', NSN: 'Nelson', NTL: 'Northland', OTA: 'Otago', STL: 'Southland', TKI: 'Taranaki', TAS: 'Tasman', WKO: 'Waikato', WGN: 'Wellington', WTC: 'West Coast' }
  };
  // The labels, the first choice and the postcode check for each delivery country.
  const addressFields = {
    US: { city: 'City', region: 'State', ask: 'Choose a state', postal: 'ZIP code', pattern: /^\d{5}(-\d{4})?$/, wrong: 'This doesn’t look like a US ZIP code, such as 10001. Check the country and ZIP code.' },
    CA: { city: 'City', region: 'Province or territory', ask: 'Choose a province or territory', postal: 'Postal code', pattern: /^[A-Za-z]\d[A-Za-z] ?\d[A-Za-z]\d$/, wrong: 'This doesn’t look like a Canadian postal code, such as M5V 2T6. Check the country and postal code.' },
    GB: { city: 'Town or city', region: 'Part of the UK', ask: 'Choose England, Scotland or Wales', postal: 'Postcode', pattern: /^[A-Za-z]{1,2}\d[A-Za-z\d]? ?\d[A-Za-z]{2}$/, wrong: 'This doesn’t look like a UK postcode, such as SW1A 1AA. Check the country and postcode.' },
    AU: { city: 'Suburb or town', region: 'State or territory', ask: 'Choose a state or territory', postal: 'Postcode', pattern: /^\d{4}$/, wrong: 'This doesn’t look like an Australian postcode, such as 2000. Check the country and postcode.' },
    NZ: { city: 'Town or city', region: 'Region', ask: 'Choose a region', postal: 'Postcode', pattern: /^\d{4}$/, wrong: 'This doesn’t look like a New Zealand postcode, such as 6011. Check the country and postcode.' }
  };
  // The message for a postcode that doesn't fit the country, or '' when it fits (or the country has no check).
  const postalProblem = (country, postal) => { const field = addressFields[String(country || '').toUpperCase()]; return field && !field.pattern.test(String(postal || '').trim()) ? field.wrong : ''; };
  // How a saved address's town line and country read, the way each country writes them: "New York, NY 10001",
  // "Sydney NSW 2000", and "London SW1A 1AA" or "Wellington 6011" (UK and New Zealand addresses leave out the region).
  const addressPlace = address => { const country = String(address?.country_code || '').toUpperCase(); const city = address?.city || ''; const region = address?.region || ''; const postal = address?.postal_code || '';
    if (country === 'US' || country === 'CA') return [[city, region].filter(Boolean).join(', '), postal].filter(Boolean).join(' ');
    if (country === 'AU') return [city, regionCode('AU', region) || region, postal].filter(Boolean).join(' ');
    if (country === 'GB' || country === 'NZ') return [city, postal].filter(Boolean).join(' ');
    return [city, region, postal].filter(Boolean).join(' '); };
  const addressCountry = code => { const value = String(code || '').toUpperCase(); return deliveryCountries.find(([id]) => id === value)?.[1] || countryNames[value] || value; };
  // The one line shown wherever the page says where orders can go (footer, bag, address form, checkout, help).
  // Wording from the legal role (2026-10-17): the countries first, then that each store chooses among them.
  const deliveryLine = 'Stores on Panopie can deliver to the United States, Canada (except Quebec), the United Kingdom (except Northern Ireland), Australia and New Zealand. Each store chooses which of these countries it ships to.';
  // A UK address in Northern Ireland: the region reads as Northern Ireland, or the postcode, read without spaces or other
  // marks, starts with BT. The database (migration 027) is stricter still: a UK address needs England, Scotland or
  // Wales and a UK postcode, which the form asks for anyway.
  const isNorthernIrelandAddress = (country, region, postal) => String(country || '').toUpperCase() === 'GB'
    && (['nir', 'ni', 'northern ireland'].includes(String(region || '').trim().toLowerCase()) || /^BT/.test(String(postal || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()));
  // '' when stores can deliver to the address, 'outside' for a country off the list, 'quebec' for Quebec,
  // 'northern-ireland' for Northern Ireland.
  const deliveryProblem = (country, region, postal) => !deliveryCountries.some(([code]) => code === String(country || '').toUpperCase()) ? 'outside' : isQuebecAddress(country, region, postal) ? 'quebec' : isNorthernIrelandAddress(country, region, postal) ? 'northern-ireland' : '';
  const deliveryNote = { quebec: 'Orders can’t be sent to an address in Quebec during the pilot.', 'northern-ireland': 'Orders can’t be sent to an address in Northern Ireland during the pilot.' };
  // A saved address's state, province or region as a code from the lists: "NY", "ny" and "New York" are all NY. Empty when it isn't one.
  const regionCode = (country, value) => { const list = addressRegions[country] || {}; const text = String(value || '').normalize('NFC').trim().replace(/\.$/, ''); const upper = text.toUpperCase(); if (list[upper]) return upper; return Object.keys(list).find(code => list[code].toLowerCase() === text.toLowerCase()) || ''; };
  window.PANOPIE_LOCATIONS = { countries, regions, known, label, regionLabel, regionCode, isQuebec, isQuebecAddress, QUEBEC_NAMES, first: ['CA', 'US'],
    deliveryCountries, addressRegions, addressFields, postalProblem, deliveryProblem, deliveryLine, addressPlace, addressCountry, isNorthernIrelandAddress, deliveryNote };
})();
