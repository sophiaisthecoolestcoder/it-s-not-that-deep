import type { OfferStatus } from '../types/offer';

type Translator = (key: string, vars?: Record<string, string>) => string;

export function offerStatusLabel(status: OfferStatus, t: Translator): string {
  return t(`offer.status.${status}`);
}
