// Music Practice Pro: what the iOS and Android apps sell, through RevenueCat
// (the App Store and Google Play underneath). The free app has the metronome,
// the tuner and the Playback Recorder; Pro adds the Drone, every take kept,
// renamed and saved as an MP3, and all the themes. Pro Yearly (with the free
// trial set up in the stores) and Pro Lifetime both grant the `pro`
// entitlement. On the website everything is free and none of this shows.

import { isApp, platform, call, listen } from './native.js';
import { REVENUECAT_KEYS, ENTITLEMENT, PRIVACY_URL, TERMS_URL, MANAGE_URL, PLAY_REDEEM_URL } from './pro-config.js';

const CACHE = 'musicpractice.pro'; // the last known answer, so Pro shows at once on launch (also read in index.html)
const INELIGIBLE = 1; // RevenueCat's INTRO_ELIGIBILITY_STATUS_INELIGIBLE

const $ = (id) => document.getElementById(id);

function cached() {
  try { return localStorage.getItem(CACHE) === '1'; } catch { return false; }
}

let pro = !isApp() || cached();
let configured = false;
let customer = null;
let offering = null; // RevenueCat's current offering: { annual, lifetime, … }
let offeringError = '';
let loading = false;
const trialUsed = {}; // product id → true when the store says its trial was already used (iOS)
let busy = false;
let reason = '';
let appUserID = '';
const listeners = new Set();

/** Is Pro on? Always on the website. */
export const isPro = () => pro;

/** Call fn(on) whenever Pro turns on or off. */
export const onProChange = (fn) => listeners.add(fn);

/** Is this the app without Pro (so Pro features show their lock)? */
export const locked = () => !pro;

function setPro(on) {
  try { localStorage.setItem(CACHE, on ? '1' : '0'); } catch { /* not kept */ }
  if (on === pro) return;
  pro = on;
  for (const f of listeners) f(on);
}

function setCustomer(info) {
  if (!info?.entitlements) return;
  customer = info;
  setPro(!!info.entitlements.active?.[ENTITLEMENT]);
  render();
}

/** Start purchases in the app (once, at launch). Does nothing on the website. */
export async function initPro() {
  if (!isApp()) return;
  setupPaywall();
  const key = REVENUECAT_KEYS[platform()];
  if (!key) {
    setPro(false);
    render();
    return;
  }
  try {
    await call('Purchases', 'configure', { apiKey: key });
    configured = true;
    listen('Purchases', 'addCustomerInfoUpdateListener', {}, (info) => setCustomer(info));
    const { customerInfo } = await call('Purchases', 'getCustomerInfo');
    setCustomer(customerInfo);
    appUserID = (await call('Purchases', 'getAppUserID'))?.appUserID || '';
  } catch (err) {
    console.warn('Purchases:', err); // offline at first launch: the cached answer stands
  }
  render();
}

/**
 * For a Pro feature: true if Pro is on; otherwise opens the paywall and
 * returns false. `why` says which feature was asked for.
 */
export function requirePro(why) {
  if (pro) return true;
  openPaywall(why);
  return false;
}

// ---------------------------------------------------------------- paywall

const HEADLINES = {
  drone: 'The Drone is part of Pro',
  takes: 'Renaming and saving takes are part of Pro',
  older: 'Keep every take with Pro',
  themes: 'Themes are part of Pro',
};

export function openPaywall(why = '') {
  reason = why;
  say('');
  render();
  const d = $('paywall');
  if (!d.open) d.showModal();
  if (configured && !offering) loadOffering();
}

async function loadOffering() {
  if (loading) return;
  loading = true;
  offeringError = '';
  render();
  try {
    const offerings = await call('Purchases', 'getOfferings');
    offering = offerings?.current || null;
    if (!offering) offeringError = 'Pro isn\'t available right now. Try again later.';
    const yearly = offering?.annual?.product;
    if (yearly && platform() === 'ios') {
      const r = await call('Purchases', 'checkTrialOrIntroductoryPriceEligibility', { productIdentifiers: [yearly.identifier] });
      trialUsed[yearly.identifier] = r?.[yearly.identifier]?.status === INELIGIBLE;
    }
  } catch {
    offeringError = `Couldn't reach ${store()}. Check the connection and try again.`;
  } finally {
    loading = false;
  }
  render();
}

const store = () => (platform() === 'android' ? 'Google Play' : 'the App Store');

/** "7 days", "1 week", "1 month": a store period. */
function period(n, unit) {
  const u = String(unit || '').toLowerCase().replace(/s$/, '');
  return `${n} ${u}${n === 1 ? '' : 's'}`;
}

/** The free trial on a subscription product, as "7 days", or '' if none (or already used). */
export function trialOf(product) {
  if (!product || trialUsed[product.identifier]) return '';
  const intro = product.introPrice;
  if (intro && intro.price === 0) return period(intro.periodNumberOfUnits * Math.max(1, intro.cycles || 1), intro.periodUnit);
  const free = product.defaultOption?.freePhase?.billingPeriod; // Google Play
  if (free?.value) return period(free.value, free.unit);
  return '';
}

function say(text) {
  const el = $('pw-message');
  if (el) el.textContent = text;
}

const cancelled = (err) => String(err?.code) === '1' || err?.data?.userCancelled === true || err?.userCancelled === true;

async function buy(pkg) {
  if (busy) return;
  busy = true;
  say('');
  render();
  try {
    const r = await call('Purchases', 'purchasePackage', { aPackage: pkg });
    setCustomer(r?.customerInfo);
    if (pro) {
      say('Thank you! Pro is on.');
      setTimeout(() => $('paywall').close(), 1400);
    }
  } catch (err) {
    if (!cancelled(err)) say(`The purchase didn't go through: ${err?.message || 'try again'}.`);
  } finally {
    busy = false;
    render();
  }
}

async function restore() {
  if (busy) return;
  busy = true;
  say('Looking for your purchases…');
  render();
  try {
    const { customerInfo } = await call('Purchases', 'restorePurchases');
    setCustomer(customerInfo);
    say(pro ? 'Pro is on again.' : `No Pro purchase found for this ${platform() === 'android' ? 'Google account' : 'Apple Account'}.`);
  } catch (err) {
    say(`Couldn't restore: ${err?.message || 'try again'}.`);
  } finally {
    busy = false;
    render();
  }
}

async function redeem() {
  if (platform() === 'ios') {
    try {
      await call('Purchases', 'presentCodeRedemptionSheet');
      say('Once the code is redeemed, Pro turns on by itself.');
    } catch {
      say('Redeem the code in the App Store app (your account picture › Redeem Gift Card or Code), then tap Restore purchases.');
    }
  } else {
    window.open(PLAY_REDEEM_URL, '_blank');
    say('Redeem the code in Google Play, then come back and tap Restore purchases.');
  }
}

function link(href, text) {
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = text;
  return a;
}

function plan(pkg, kind) {
  const p = pkg.product;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `plan plan-${kind}`;
  b.disabled = busy;
  const trial = kind === 'yearly' ? trialOf(p) : '';
  const name = kind === 'yearly' ? 'Yearly' : 'Lifetime';
  const main = kind === 'yearly'
    ? (trial ? `Try ${trial} free` : `${p.priceString} a year`)
    : `${p.priceString} once`;
  const sub = kind === 'yearly'
    ? (trial ? `Then ${p.priceString} a year. Cancel anytime.` : 'Renews each year. Cancel anytime.')
    : 'Pay once, Pro for good.';
  b.innerHTML = '<span class="plan-name"></span><span class="plan-main"></span><span class="plan-sub"></span>';
  b.querySelector('.plan-name').textContent = name;
  b.querySelector('.plan-main').textContent = main;
  b.querySelector('.plan-sub').textContent = sub;
  b.addEventListener('click', () => buy(pkg));
  return b;
}

/** Bring the paywall and the Pro row in Settings up to date. */
function render() {
  if (!isApp()) return;
  const d = $('paywall');
  if (!d) return;
  const ios = platform() === 'ios';
  $('pw-title').textContent = pro ? 'Music Practice Pro' : (HEADLINES[reason] || 'Music Practice Pro');
  $('pw-have').hidden = !pro;
  const plans = $('pw-plans');
  plans.replaceChildren();
  let note = '';
  if (pro) {
    const ent = customer?.entitlements?.active?.[ENTITLEMENT];
    const lifetime = ent && !ent.expirationDate;
    $('pw-have').textContent = lifetime ? 'You have Pro for good. Thank you!'
      : ent?.willRenew === false ? `You have Pro until ${new Date(ent.expirationDate).toLocaleDateString()}.`
        : 'You have Pro. Thank you!';
    if (ent && !lifetime) plans.append(link(customer?.managementURL || MANAGE_URL[platform()], 'Manage your subscription'));
  } else if (!configured) {
    note = REVENUECAT_KEYS[platform()] ? `Couldn't reach ${store()}. Check the connection and try again.` : 'Purchases aren\'t set up in this build yet.';
  } else if (loading) {
    note = 'Loading…';
  } else if (offeringError) {
    note = offeringError;
    const again = document.createElement('button');
    again.type = 'button';
    again.className = 'pill';
    again.textContent = 'Try again';
    again.addEventListener('click', loadOffering);
    plans.append(again);
  } else if (offering) {
    if (offering.annual) plans.append(plan(offering.annual, 'yearly'));
    if (offering.lifetime) plans.append(plan(offering.lifetime, 'lifetime'));
  }
  $('pw-note').textContent = note;
  $('pw-note').hidden = !note;
  $('pw-fine').textContent = pro ? '' : ios
    ? 'Payment is charged to your Apple Account. Yearly renews automatically each year, and the free trial turns into it, unless you cancel at least 24 hours before the trial or year ends. Manage or cancel any time in Settings › your name › Subscriptions.'
    : 'Payment is charged to your Google Play account. Yearly renews automatically each year, and the free trial turns into it, unless you cancel before the trial or year ends. Manage or cancel any time in Google Play › Payments & subscriptions.';
  $('pw-restore').disabled = busy || !configured;
  $('pw-redeem').disabled = busy;
  $('pw-terms').href = TERMS_URL[platform()] || TERMS_URL.ios;
  $('pw-privacy').href = PRIVACY_URL;
  // The Pro row in Settings.
  $('pro-row').hidden = false;
  $('pro-status').textContent = pro ? 'Pro is on' : 'Drone, every take, all themes';
  $('pro-open').textContent = pro ? 'Pro…' : 'Get Pro…';
  $('pro-id').textContent = appUserID;
  $('pro-id-row').hidden = !appUserID;
}

let setUp = false;
function setupPaywall() {
  if (setUp || !$('paywall')) return;
  setUp = true;
  const d = $('paywall');
  d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
  $('pw-restore').addEventListener('click', restore);
  $('pw-redeem').addEventListener('click', redeem);
  $('pro-open').addEventListener('click', () => { $('pro-open').closest('dialog')?.close(); openPaywall(); });
  $('pro-id').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(appUserID); $('pro-id-copied').hidden = false; } catch { /* select it by hand */ }
  });
  // Back from the store app (a code redeemed, a subscription changed): check again.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !configured) return;
    call('Purchases', 'getCustomerInfo').then((r) => setCustomer(r?.customerInfo)).catch(() => { /* offline */ });
  });
  render();
}
