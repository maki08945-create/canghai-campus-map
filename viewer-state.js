(function exposeViewerState(globalScope) {
  const modelApi = typeof module !== 'undefined'
    ? require('./model.js')
    : globalScope.CanghaiModel;

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function normalizeRadians(value) {
    const fullTurn = Math.PI * 2;
    return ((value % fullTurn) + fullTurn) % fullTurn;
  }

  function createViewerState() {
    return {
      camera: { ...modelApi.presetCamera('free'), panX: 0, panY: 0 },
      selectedBuildingId: null,
      activePreset: 'free',
    };
  }

  function applyPointerDrag(state, delta) {
    return {
      ...state,
      camera: {
        ...state.camera,
        // Standard 3D model orbit: horizontal movement turns around Y and
        // vertical movement turns around X. Z remains fixed so the map never
        // rolls as if it were a flat compass card.
        rotationX: normalizeRadians(state.camera.rotationX + delta.y * 0.0065),
        rotationY: normalizeRadians(state.camera.rotationY + delta.x * 0.009),
        rotationZ: state.camera.rotationZ,
      },
      activePreset: 'free',
    };
  }

  function applyPan(state, delta) {
    return {
      ...state,
      camera: {
        ...state.camera,
        panX: (state.camera.panX || 0) + delta.x,
        panY: (state.camera.panY || 0) + delta.y,
      },
      activePreset: state.activePreset,
    };
  }

  function applyZoom(state, wheelDelta) {
    return {
      ...state,
      camera: {
        ...state.camera,
        zoom: clamp(state.camera.zoom - wheelDelta * 0.001, 0.6, 2),
      },
    };
  }

  function applyPinchZoom(state, previousDistance, nextDistance) {
    if (!Number.isFinite(previousDistance) || previousDistance <= 0 || !Number.isFinite(nextDistance)) return state;
    return {
      ...state,
      camera: {
        ...state.camera,
        zoom: clamp(state.camera.zoom * (nextDistance / previousDistance), 0.6, 2),
      },
    };
  }

  function applyPinchGesture(state, previous, next) {
    if (!previous || !next || !previous.center || !next.center) return state;
    const zoomed = applyPinchZoom(state, previous.distance, next.distance);
    return {
      ...zoomed,
      camera: {
        ...zoomed.camera,
        panX: (zoomed.camera.panX || 0) + (next.center.x - previous.center.x),
        panY: (zoomed.camera.panY || 0) + (next.center.y - previous.center.y),
        // Pinch gestures stay dedicated to map scale and position; no hidden
        // rotation is introduced while a user is trying to zoom.
        rotationX: zoomed.camera.rotationX,
        rotationY: zoomed.camera.rotationY,
        rotationZ: zoomed.camera.rotationZ,
      },
    };
  }

  function setZoom(state, zoom) {
    return {
      ...state,
      camera: { ...state.camera, zoom: clamp(Number(zoom), 0.6, 2) },
    };
  }

  function selectBuilding(state, buildingId) {
    return { ...state, selectedBuildingId: buildingId };
  }

  function setPreset(state, presetName) {
    return {
      ...state,
      camera: { ...modelApi.presetCamera(presetName), panX: 0, panY: 0 },
      activePreset: presetName,
    };
  }

  const api = { createViewerState, applyPointerDrag, applyPan, applyZoom, applyPinchZoom, applyPinchGesture, setZoom, selectBuilding, setPreset };
  if (typeof module !== 'undefined') module.exports = api;
  if (globalScope) globalScope.CanghaiViewerState = api;
}(typeof window !== 'undefined' ? window : globalThis));

