export enum CurrencyCode {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  NGN = 'NGN',
  CAD = 'CAD',
  AUD = 'AUD',
}

export const CURRENCY_LOCALE_MAP: Record<CurrencyCode, string> = {
  [CurrencyCode.USD]: 'en-US',
  [CurrencyCode.EUR]: 'de-DE',
  [CurrencyCode.GBP]: 'en-GB',
  [CurrencyCode.NGN]: 'en-NG',
  [CurrencyCode.CAD]: 'en-CA',
  [CurrencyCode.AUD]: 'en-AU',
};

export const CURRENCY_SYMBOL_MAP: Record<CurrencyCode, string> = {
  [CurrencyCode.USD]: '$',
  [CurrencyCode.EUR]: '€',
  [CurrencyCode.GBP]: '£',
  [CurrencyCode.NGN]: '₦',
  [CurrencyCode.CAD]: 'C$',
  [CurrencyCode.AUD]: 'A$',
};
