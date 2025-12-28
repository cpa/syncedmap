# Syncmaps

Application Vite affichant deux cartes MapLibre synchronisées avec un fond OpenStreetMap. Chaque carte peut être verrouillée pour figer son centre, et des anneaux concentriques indiquent des rayons de 100 à 1 000 mètres.

## Fonctionnalités
- Synchronisation automatique du niveau de zoom entre les deux cartes
- Verrouillage individuel du centre et réinitialisation rapide de la vue
- Contrôle de rotation sur la carte de droite
- Anneaux métriques à 100, 200, 300, 400, 500, 800 et 1 000 mètres autour du centre actif
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
- Tuiles cartographiques © [contributeurs OpenStreetMap](https://www.openstreetmap.org/copyright)
