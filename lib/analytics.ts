/**
 * Événements analytics (specs §9 — Mixpanel / équivalent).
 * No-op tant que le SDK n’est pas branché ; garder les noms d’événements stables.
 */
export type DirectionsApp = 'google_maps' | 'apple_maps' | 'waze';

export function track(_event: string, _props?: Record<string, unknown>): void {
  /* intégration future : Mixpanel.getInstance().track(event, props) */
}
