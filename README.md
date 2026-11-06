# cv-desktop-data

Les signes de vie de l'usine, mes chaînes vidéo produites de bout en bout par des agents (création, relecture, validation humaine, publication, suivi des statistiques). Le site [alismaani.fr](https://alismaani.fr) lit `signes-de-vie.json` pour remplir la fiche de l'usine. Code du site : [sma-ali/CV-Desktop](https://github.com/sma-ali/CV-Desktop).

## Ce que contient le fichier

```json
{
  "version": 2,
  "measuredAt": "2026-11-05T23:00:00Z",
  "lastActivityAt": "2026-11-05T00:00:00Z",
  "since": "2026-10-01T00:00:00Z",
  "activity": [9, 14, 22, 21, 19, 17, 17, 18, 18, 16, 17, 17, 17, 17],
  "factory": { "channels": 9, "videos": 350, "perDay": 17, "views": 300000, "likes": 17000 }
}
```

Des totaux seulement, toutes chaînes et toutes plateformes mêlées. Aucune chaîne ne doit pouvoir être retrouvée à partir de ce fichier, d'où ces règles, appliquées ici puis vérifiées à nouveau par le site :

- vues, j'aime et vidéos arrondis vers le bas à deux chiffres significatifs (303 174 donne 300 000) ;
- dernière activité au jour près, début au mois près ;
- `activity` : vidéos publiées chacun des 14 derniers jours terminés, jamais le jour en cours ;
- une mise à jour par jour au plus.

## Fonctionnement

`export.mjs` lit un relevé des statistiques et la liste des profils à compter (deux fichiers privés, jamais publiés), puis écrit `signes-de-vie.json`. `run.sh` le lance chaque jour et pousse le fichier s'il a changé.

```bash
npm test
STATS_FILE=releve.json CONFIG_FILE=profils.json node export.mjs
```

Aucune dépendance : Node 22 ou plus.

## Licence

MIT
