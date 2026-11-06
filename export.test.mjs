import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPublicLifeSigns, floorSignificant } from './export.mjs';

// Relevé factice : deux profils comptés, un ignoré.
const NOW = Date.parse('2026-11-06T09:30:00Z');
const stats = {
  profils: [
    { profil: 'p1', nom: 'Un', plateformes: { a: { vues: 300_174, likes: 17_289 }, b: { vues: 3_000, likes: 11 } } },
    { profil: 'p2', nom: 'Deux', plateformes: { a: { vues: 1_000, likes: null } } },
    { profil: 'p3', nom: 'Ignoré', plateformes: { a: { vues: 9_999_999, likes: 9_999 } } },
  ],
  publications: [
    // La même vidéo sur deux plateformes : une seule vidéo.
    { profil: 'p1', requete: 'r1', publiee: '2026-10-07T10:02:07Z' },
    { profil: 'p1', requete: 'r1', publiee: '2026-10-07T10:05:00Z' },
    { profil: 'p1', requete: 'r2', publiee: '2026-11-05T19:08:54Z' },
    { profil: 'p2', titre: 't1', publiee: '2026-11-04T08:00:00Z' },
    // Aujourd'hui : jamais compté (journée pas finie).
    { profil: 'p2', titre: 't2', publiee: '2026-11-06T08:00:00Z' },
    { profil: 'p3', requete: 'x', publiee: '2026-11-05T12:00:00Z' },
  ],
};
const build = () => buildPublicLifeSigns(stats, ['Un', 'Deux'], NOW);

test('floorSignificant arrondit vers le bas à deux chiffres', () => {
  assert.equal(floorSignificant(303_174), 300_000);
  assert.equal(floorSignificant(17_289), 17_000);
  assert.equal(floorSignificant(353), 350);
  assert.equal(floorSignificant(9), 9);
  assert.equal(floorSignificant(0), 0);
  assert.equal(floorSignificant(-4), 0);
  assert.equal(floorSignificant(Number.NaN), 0);
});

test('totaux arrondis, profils hors liste ignorés', () => {
  assert.deepEqual(build().factory, {
    channels: 2,
    videos: 3,
    perDay: 0,
    views: 300_000,
    likes: 17_000,
  });
});

test('dates grossies : jour, mois, fin de la veille', () => {
  const signs = build();
  assert.equal(signs.measuredAt, '2026-11-05T23:00:00Z');
  assert.equal(signs.lastActivityAt, '2026-11-05T00:00:00Z');
  assert.equal(signs.since, '2026-10-01T00:00:00Z');
});

test("activité des 14 jours terminés, sans aujourd'hui", () => {
  const { activity } = build();
  assert.equal(activity.length, 14);
  assert.deepEqual(activity.slice(-3), [0, 1, 1]);
  assert.equal(activity.reduce((a, b) => a + b, 0), 2);
});

test('rien du relevé ne ressort en dehors du format', () => {
  const text = JSON.stringify(build());
  for (const secret of ['"Un"', '"Deux"', 'p1', 'r1', 't1', '300174', '17289', '9999']) {
    assert.ok(!text.includes(secret), secret);
  }
  assert.deepEqual(Object.keys(build()).sort(), [
    'activity', 'factory', 'lastActivityAt', 'measuredAt', 'since', 'version',
  ]);
});

test('un profil introuvable arrête tout, sans le nommer', () => {
  assert.throws(
    () => buildPublicLifeSigns(stats, ['Un', 'Secret'], NOW),
    (error) => !error.message.includes('Secret'),
  );
});
