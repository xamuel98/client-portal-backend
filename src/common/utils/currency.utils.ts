import {
  CurrencyCode,
  CURRENCY_LOCALE_MAP,
} from '../constants/currency.constant';

export class CurrencyUtils {
  static format(
    amount: number,
    currency: string = 'USD',
    locale?: string,
  ): string {
    const defaultLocale =
      CURRENCY_LOCALE_MAP[currency as CurrencyCode] || 'en-US';
    const finalLocale = locale || defaultLocale;

    return new Intl.NumberFormat(finalLocale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }
}
