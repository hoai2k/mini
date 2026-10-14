// Music Practice Pro in the iOS and Android apps (the website is all free).
// The keys are RevenueCat's *public* SDK keys (Project settings → API keys);
// they are meant to ship inside apps. Empty: purchases are off in that app
// and the paywall says so. See musicpractice/mobile/README.md.

export const REVENUECAT_KEYS = {
  ios: '', // appl_…
  android: '', // goog_…
};

/** The RevenueCat entitlement that Pro Yearly and Pro Lifetime both grant. */
export const ENTITLEMENT = 'pro';

/** How many takes the free app shows (the rest are kept and come back with Pro). */
export const FREE_TAKES = 3;

/** The theme the free app uses. */
export const FREE_THEME = 'classic';

export const PRIVACY_URL = 'https://hoai2k.github.io/mini/musicpractice/privacy.html';
export const TERMS_URL = {
  ios: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  android: 'https://hoai2k.github.io/mini/musicpractice/privacy.html#terms',
};
export const MANAGE_URL = {
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
};
/** Where Google Play promo codes are redeemed (iOS has a sheet in the app). */
export const PLAY_REDEEM_URL = 'https://play.google.com/redeem';
