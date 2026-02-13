# Syncmaps

Application Vite affichant deux cartes MapLibre synchronisées avec le fond cartographique Plan IGN J+1 en tuiles vectorielles (`PLAN.IGN` style standard). Chaque carte peut être verrouillée pour figer son centre, et des anneaux concentriques indiquent des rayons de 100 à 1 000 m, puis 1 500 et 2 000 m.

## Fonctionnalités
- Synchronisation automatique du niveau de zoom entre les deux cartes
- Verrouillage individuel du centre et réinitialisation rapide de la vue
- Contrôle de rotation sur la carte de droite
- Anneaux métriques à 100 m, 200 m, 300 m, 400 m, 500 m, 600 m, 700 m, 800 m, 900 m, 1 000 m, 1 500 m et 2 000 m autour du centre actif
- Interface entièrement localisée en français

## Prérequis
- Node.js 20 ou version supérieure
- npm (fourni avec Node.js)

## Installation
```bash
npm install
```

## Développement
```bash
npm run dev
```
Le serveur de développement démarre sur `http://localhost:5173` (port personnalisé possible via Vite).

## Production
```bash
npm run build
npm run preview
```
`npm run preview` lance un serveur statique local pour vérifier le build.

## Commandes disponibles
- `npm run dev` : serveur de développement Vite
- `npm run build` : build de production
- `npm run preview` : serveur de prévisualisation du build

## Remerciements
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js-docs/)
- Tuiles cartographiques © [Institut National de l’Information Géographique et Forestière (IGN)](https://www.ign.fr/)
