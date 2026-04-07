/**
 * Rotation des gardes : changement le samedi matin (specs §11).
 */

/** Prochain créneau de changement de garde (samedi 6h local, ou suivant si déjà passé cette semaine). */
export function getNextGuardChangeDate(from: Date = new Date()): Date {
  const d = new Date(from);
  const dow = d.getDay(); // 0 = dim … 6 = sam
  let daysToAdd = (6 - dow + 7) % 7;
  if (daysToAdd === 0) {
    const h = d.getHours();
    // Même samedi : avant 6h = changement « ce matin », sinon semaine suivante
    if (h < 6) {
      daysToAdd = 0;
    } else {
      daysToAdd = 7;
    }
  }
  d.setDate(d.getDate() + daysToAdd);
  d.setHours(6, 0, 0, 0);
  if (d.getTime() <= from.getTime()) {
    d.setDate(d.getDate() + 7);
  }
  return d;
}

/** Libellé lisible pour la bannière d’accueil. */
export function formatGuardChangeBannerDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Date calendaire locale YYYY-MM-DD (filtre gardes SQLite / RPC). */
export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${String(y)}-${m}-${day}`;
}

/**
 * Fenêtre de garde « courante » en dates inclusives [start, end]
 * (alignée sur le passage samedi 6h — specs §11).
 */
export function getCurrentGardePeriodDateBounds(
  from: Date = new Date(),
): { start: string; end: string } {
  const nextBoundary = getNextGuardChangeDate(from);
  const endCal = new Date(nextBoundary);
  endCal.setDate(endCal.getDate() - 1);
  const startCal = new Date(endCal);
  startCal.setDate(startCal.getDate() - 6);
  return { start: toLocalISODate(startCal), end: toLocalISODate(endCal) };
}
