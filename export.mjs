#!/usr/bin/env node
// Construit le JSON public des signes de vie de l'usine, lu par le site
// alismaani.fr (route /api/signes-de-vie).
//
// Règle : aucune chaîne ne doit pouvoir être retrouvée à partir de ce
// fichier. Il ne contient donc que des totaux, toutes chaînes et toutes
// plateformes mêlées, arrondis vers le bas, et des journées terminées :
// - vues, j'aime et vidéos à 2 chiffres significatifs (303 174 -> 300 000) ;
// - vidéos par jour en entier ;
// - dernière activité au jour près, début au mois près ;
// - activité des 14 derniers jours TERMINÉS (jamais le jour en cours, qui
//   dirait à quelle heure une vidéo est sortie).
//
// Entrées (jamais publiées) : le relevé des statistiques et la liste des
// profils à compter, passés par variables d'environnement.
//   STATS_FILE    relevé JSON (profils, publications)
//   CONFIG_FILE   { "profiles": ["nom affiché du profil", ...] }
//   OUT_FILE      fichier à écrire (défaut : signes-de-vie.json)

import { readFileSync, writeFileSync } from 'node:fs';

const DAY = 86_400_000;
export const ACTIVITY_DAYS = 14;

/** n arrondi vers le bas à `digits` chiffres significatifs. */
export function floorSignificant(n, digits = 2) {
  if (!Number.isFinite(n) || n <= 0) return 0;
  const step = 10 ** Math.max(0, Math.floor(Math.log10(n)) + 1 - digits);
  return Math.floor(n / step) * step;
}

const startOfDay = (ms) => Math.floor(ms / DAY) * DAY;
const startOfMonth = (ms) => {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
};
const iso = (ms) => new Date(ms).toISOString().replace('.000Z', 'Z');
const sum = (values) => values.reduce((total, value) => total + value, 0);
const count = (value) => (Number.isFinite(value) && value > 0 ? value : 0);

/**
 * Le JSON public à l'instant now (ms), d'après le relevé et la liste des
 * profils à compter. Fonction pure, testée dans export.test.mjs.
 */
export function buildPublicLifeSigns(stats, profileNames, now) {
  const wanted = new Set(profileNames);
  const profiles = (stats.profils ?? []).filter((p) => wanted.has(p.nom));
  if (profiles.length !== wanted.size) {
    const found = new Set(profiles.map((p) => p.nom));
    const missing = [...wanted].filter((name) => !found.has(name));
    throw new Error(`profils introuvables dans le relevé : ${missing.length}`);
  }
  const ids = new Set(profiles.map((p) => p.profil));

  // Une vidéo publiée sur plusieurs plateformes compte une fois.
  const firstPublished = new Map();
  for (const pub of stats.publications ?? []) {
    if (!ids.has(pub.profil)) continue;
    const at = Date.parse(pub.publiee);
    if (!Number.isFinite(at)) continue;
    const key = `${pub.profil}|${pub.requete ?? pub.titre}`;
    if (!firstPublished.has(key) || at < firstPublished.get(key)) firstPublished.set(key, at);
  }
  const dates = [...firstPublished.values()];
  if (dates.length === 0) throw new Error('aucune publication dans le relevé');

  // Journées terminées seulement : la mesure s'arrête à la fin d'hier.
  const today = startOfDay(now);
  const lastDay = today - DAY;
  const activity = Array.from({ length: ACTIVITY_DAYS }, (_, i) => {
    const day = lastDay - (ACTIVITY_DAYS - 1 - i) * DAY;
    return dates.filter((at) => at >= day && at < day + DAY).length;
  });
  const done = dates.filter((at) => at < today);
  const lastActivity = done.length ? startOfDay(Math.max(...done)) : lastDay;

  const total = (key) =>
    sum(profiles.map((p) => sum(Object.values(p.plateformes ?? {}).map((s) => count(s?.[key])))));

  return {
    version: 2,
    measuredAt: iso(today - 3_600_000),
    lastActivityAt: iso(lastActivity),
    since: iso(startOfMonth(Math.min(...dates))),
    activity,
    factory: {
      channels: profiles.length,
      videos: floorSignificant(done.length),
      perDay: Math.round(sum(activity) / ACTIVITY_DAYS),
      views: floorSignificant(total('vues')),
      likes: floorSignificant(total('likes')),
    },
  };
}

function main() {
  const { STATS_FILE, CONFIG_FILE, OUT_FILE = 'signes-de-vie.json' } = process.env;
  if (!STATS_FILE || !CONFIG_FILE) throw new Error('STATS_FILE et CONFIG_FILE sont requis');
  const stats = JSON.parse(readFileSync(STATS_FILE, 'utf8'));
  const { profiles } = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
  const signs = buildPublicLifeSigns(stats, profiles, Date.now());
  writeFileSync(OUT_FILE, `${JSON.stringify(signs, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    // Jamais le contenu des entrées dans le journal : le message seulement.
    console.error(`export : ${error.message}`);
    process.exit(1);
  }
}
