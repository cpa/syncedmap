import './style.css'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const MAP_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
}

const MAP_CONFIGS = {
  left: {
    elementId: 'map-left',
    label: 'Gauche · Vue principale',
    initialCenter: [2.30137, 48.83886],
    allowRotation: false,
  },
  right: {
    elementId: 'map-right',
    label: 'Droite · Vue complémentaire',
    initialCenter: [2.36929, 48.85301],
    allowRotation: true,
  },
}

const APP_TEMPLATE = `
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <div class="mx-auto flex min-h-screen max-w-none flex-col px-4 py-6">
      <header class="space-y-2 pb-6">
        <p class="text-sm font-semibold uppercase tracking-[0.35em] text-indigo-300">Cartes synchronisées</p>
        <h1 class="text-3xl font-semibold text-white sm:text-4xl">Comparez deux quartiers côte à côte</h1>
        <p class="max-w-2xl text-slate-300">
          Les niveaux de zoom restent liés pour conserver la même échelle. Naviguez librement lorsque le verrou est ouvert, ou verrouillez une carte pour fixer son centre tout en explorant l’autre.
        </p>
      </header>
      <div class="grid flex-1 gap-6 lg:grid-cols-2">
        <section class="map-panel" data-map="left">
          <div class="map-surface">
            <div id="map-left" class="map-canvas"></div>
          </div>
          <div class="absolute top-4 left-4 right-4 z-20 flex justify-between">
            <span class="map-label">Gauche · Vue principale</span>
            <span class="map-label hidden sm:inline-flex">Échelle liée</span>
          </div>
          <div class="map-controls">
            <label class="control-card" for="lock-left">
              <input
                id="lock-left"
                type="checkbox"
                data-role="lock-toggle"
                data-map="left"
                class="h-4 w-4 accent-indigo-400"
              />
              <span>Verrouiller le centre</span>
            </label>
            <button class="control-button" data-role="reset-button" data-map="left" type="button">Revenir au départ</button>
          </div>
        </section>
        <section class="map-panel" data-map="right">
          <div class="map-surface">
            <div id="map-right" class="map-canvas"></div>
          </div>
          <div class="absolute top-4 left-4 right-4 z-20 flex justify-between">
            <span class="map-label">Droite · Vue complémentaire</span>
            <span class="map-label hidden sm:inline-flex">Échelle liée</span>
          </div>
          <div class="map-controls">
            <label class="control-card" for="lock-right">
              <input
                id="lock-right"
                type="checkbox"
                data-role="lock-toggle"
                data-map="right"
                class="h-4 w-4 accent-indigo-400"
              />
              <span>Verrouiller le centre</span>
            </label>
            <button class="control-button" data-role="reset-button" data-map="right" type="button">Revenir au départ</button>
            <div
              class="control-card flex-col items-stretch gap-2 text-xs uppercase tracking-wide text-indigo-200 sm:flex-row sm:items-center sm:gap-3"
              data-role="bearing-control"
              data-map="right"
            >
              <div class="flex items-center gap-2 text-xs font-semibold">
                <span>Rotation</span>
                <span data-role="bearing-display" data-map="right" class="tabular-nums text-indigo-100">0°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value="0"
                step="1"
                data-role="bearing-slider"
                data-map="right"
                class="bearing-slider"
              />
            </div>
            <button class="control-button" data-role="reset-bearing" data-map="right" type="button">Réinitialiser la rotation</button>
          </div>
        </section>
      </div>
    </div>
  </div>
`

const INITIAL_ZOOM = 15
const ZOOM_EPSILON = 1e-6
const EARTH_RADIUS_METERS = 6378137
const RING_RADII_METERS = [100, 200, 300, 400, 500, 800, 1000]
const CIRCLE_SEGMENTS = 120

const mapStates = {}
let isApplyingZoom = false

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

function toDegrees(radians) {
  return (radians * 180) / Math.PI
}

function destinationPoint([longitude, latitude], bearingDegrees, distanceMeters) {
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS
  const bearing = toRadians(bearingDegrees)
  const latRad = toRadians(latitude)
  const lonRad = toRadians(longitude)

  const sinLat = Math.sin(latRad)
  const cosLat = Math.cos(latRad)
  const sinAngular = Math.sin(angularDistance)
  const cosAngular = Math.cos(angularDistance)

  const destLat = Math.asin(
    sinLat * cosAngular + cosLat * sinAngular * Math.cos(bearing),
  )

  const destLon =
    lonRad +
    Math.atan2(
      Math.sin(bearing) * sinAngular * cosLat,
      cosAngular - sinLat * Math.sin(destLat),
    )

  return [((toDegrees(destLon) + 540) % 360) - 180, toDegrees(destLat)]
}

function createCircleFeature(center, radiusMeters, segments = CIRCLE_SEGMENTS) {
  const coordinates = []
  const step = 360 / segments

  for (let bearing = 0; bearing < 360; bearing += step) {
    coordinates.push(destinationPoint(center, bearing, radiusMeters))
  }

  coordinates.push(coordinates[0])

  return {
    type: 'Feature',
    properties: { radius: radiusMeters },
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  }
}

function buildRingCollection(center) {
  return {
    type: 'FeatureCollection',
    features: RING_RADII_METERS.map((radius) => createCircleFeature(center, radius)),
  }
}

function updateRingOverlays(key) {
  const state = mapStates[key]
  if (!state?.ringSourceId) return

  const source = state.map.getSource(state.ringSourceId)
  if (!source) return

  const center = state.map.getCenter()
  source.setData(buildRingCollection([center.lng, center.lat]))
}

function destroyExistingMaps() {
  Object.keys(mapStates).forEach((key) => {
    const state = mapStates[key]
    state?.cleanup?.()
    delete mapStates[key]
  })
}

function renderAppShell() {
  const host = document.querySelector('#app')
  if (!host) throw new Error('App container "#app" not found')
  host.innerHTML = APP_TEMPLATE
}

function initializeApp() {
  destroyExistingMaps()
  renderAppShell()
  Object.keys(MAP_CONFIGS).forEach((key) => {
    setupMap(key)
  })
}

function normalizeBearing(bearing) {

  const wrapped = ((bearing % 360) + 360) % 360
  return wrapped > 180 ? wrapped - 360 : wrapped
}

function updateBearingUI(key, bearing) {
  const state = mapStates[key]
  if (!state || !state.bearingSlider || !state.bearingDisplay) return
  const normalized = normalizeBearing(bearing)
  state.bearingSlider.value = normalized.toFixed(0)
  state.bearingDisplay.textContent = `${Math.round(normalized)}°`
}

function handleLockToggle(key, shouldLock) {
  const state = mapStates[key]
  if (!state) return

  state.isLocked = shouldLock
  if (shouldLock) {
    state.lockedCenter = state.map.getCenter().toArray()
    state.map.dragPan.disable()
  } else {
    state.map.dragPan.enable()
  }
}

function resetMap(key) {
  const state = mapStates[key]
  const config = MAP_CONFIGS[key]
  if (!state) return

  state.lockedCenter = [...state.initialCenter]

  const baseOptions = {
    center: state.initialCenter,
    zoom: INITIAL_ZOOM,
    pitch: 0,
    duration: 500,
  }

  if (config.allowRotation) {
    state.map.easeTo({ ...baseOptions, bearing: 0 })
    updateBearingUI(key, 0)
  } else {
    state.map.easeTo({ ...baseOptions, bearing: state.map.getBearing() })
  }
}

function syncZoomFrom(originKey) {
  if (isApplyingZoom) return

  const originState = mapStates[originKey]
  if (!originState) return

  const targetKey = originKey === 'left' ? 'right' : 'left'
  const targetState = mapStates[targetKey]
  if (!targetState) return

  const originZoom = originState.map.getZoom()
  const targetZoom = targetState.map.getZoom()

  if (Math.abs(originZoom - targetZoom) < ZOOM_EPSILON) return

  isApplyingZoom = true
  targetState.map.easeTo({ zoom: originZoom, duration: 0 })
  requestAnimationFrame(() => {
    isApplyingZoom = false
  })
}

function setupMap(key) {
  const config = MAP_CONFIGS[key]

  const map = new maplibregl.Map({
    container: config.elementId,
    style: MAP_STYLE,
    center: config.initialCenter,
    zoom: INITIAL_ZOOM,
    bearing: 0,
    pitch: 0,
    dragRotate: config.allowRotation,
    pitchWithRotate: config.allowRotation,
    touchPitch: config.allowRotation,
  })

  if (!config.allowRotation) {
    map.dragRotate.disable()
    map.touchZoomRotate.disableRotation()
  }

  const navControl = new maplibregl.NavigationControl({
    showCompass: config.allowRotation,
    showZoom: true,
    visualizePitch: false,
  })
  map.addControl(navControl, 'bottom-right')

  const lockToggle = document.querySelector(`[data-role="lock-toggle"][data-map="${key}"]`)
  const resetButton = document.querySelector(`[data-role="reset-button"][data-map="${key}"]`)
  const bearingSlider = document.querySelector(`[data-role="bearing-slider"][data-map="${key}"]`)
  const bearingDisplay = document.querySelector(`[data-role="bearing-display"][data-map="${key}"]`)
  const resetBearingButton = document.querySelector(`[data-role="reset-bearing"][data-map="${key}"]`)
  const ringSourceId = `${key}-rings`

  mapStates[key] = {
    map,
    lockToggle,
    resetButton,
    bearingSlider,
    bearingDisplay,
    resetBearingButton,
    ringSourceId,
    isLocked: false,
    lockedCenter: [...config.initialCenter],
    initialCenter: [...config.initialCenter],
  }

  lockToggle?.addEventListener('change', (event) => {
    handleLockToggle(key, event.target.checked)
  })

  resetButton?.addEventListener('click', () => resetMap(key))

  if (config.allowRotation && bearingSlider && bearingDisplay && resetBearingButton) {
    bearingSlider.addEventListener('input', (event) => {
      const value = Number(event.target.value)
      map.rotateTo(value, { duration: 0 })
      updateBearingUI(key, value)
    })

    resetBearingButton.addEventListener('click', () => {
      map.easeTo({ bearing: 0, duration: 300 })
    })

    map.on('rotate', () => updateBearingUI(key, map.getBearing()))
  }

  const refreshSize = () => map.resize()
  const runInitialSizing = () => {
    refreshSize()
    requestAnimationFrame(refreshSize)
    setTimeout(refreshSize, 120)
    setTimeout(refreshSize, 360)
  }

  map.on('load', () => {
    map.addSource(ringSourceId, {
      type: 'geojson',
      data: buildRingCollection(config.initialCenter),
    })

    map.addLayer({
      id: `${key}-rings-outline`,
      type: 'line',
      source: ringSourceId,
      paint: {
        'line-color': '#6366f1',
        'line-width': 2,
        'line-opacity': 0.8,
        'line-dasharray': [2, 2],
      },
    })

    updateRingOverlays(key)
    runInitialSizing()
    updateBearingUI(key, map.getBearing())
  })

  map.on('move', () => updateRingOverlays(key))
  map.on('zoomend', () => syncZoomFrom(key))

  window.addEventListener('resize', refreshSize)

  const containerEl = document.getElementById(config.elementId)
  let observer
  if (typeof ResizeObserver !== 'undefined' && containerEl) {
    observer = new ResizeObserver(refreshSize)
    observer.observe(containerEl)
  }

  runInitialSizing()

  mapStates[key].cleanup = () => {
    if (observer) observer.disconnect()
    window.removeEventListener('resize', refreshSize)
    map.remove()
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp, { once: true })
} else {
  initializeApp()
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    destroyExistingMaps()
  })
}
