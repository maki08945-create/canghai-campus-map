/* One shared 3D scene: buildings, roads, selectable places, and navigation. */
(function initializeCombinedCampusMap() {
  const campusData = window.CanghaiCampusData;
  const navigationData = window.CanghaiNavigationData;
  const logic = window.CanghaiNavigationLogic;
  const geometry = window.CanghaiNavigationGeometry;
  const { buildCampusModel, projectFaces, projectGeoPoint, projectGroundPlane, placeExteriorLabel, pickBuilding } = window.CanghaiModel;
  const { createViewerState, applyPointerDrag, applyPan, applyZoom, applyPinchGesture, setZoom, selectBuilding, setPreset } = window.CanghaiViewerState;
  const { createFlowState, transitionFlow } = window.CanghaiNavigationFlow || {};
  if (!campusData || !navigationData || !logic || !geometry || !createFlowState) return;

  const canvas = document.querySelector('#model-canvas');
  const context = canvas.getContext('2d');
  const routeSummary = document.querySelector('#route-summary');
  const routeTitle = document.querySelector('#route-title');
  const routeOptionsContainer = document.querySelector('#route-options');
  const routeSteps = document.querySelector('#route-steps');
  const facilityList = document.querySelector('#facility-list');
  const searchInput = document.querySelector('#place-search');
  const searchResults = document.querySelector('#search-results');
  const selectedName = document.querySelector('#selected-name');
  const selectedDescription = document.querySelector('#selected-description');
  const selectedMeta = document.querySelector('#selected-meta');
  const zoomRange = document.querySelector('#zoom-range');
  const zoomValue = document.querySelector('#zoom-value');
  const controls = [...document.querySelectorAll('[data-preset]')];
  const landmarkInput = document.querySelector('#landmark-search');
  const landmarkResults = document.querySelector('#landmark-results');
  const landmarkForm = document.querySelector('#landmark-search-form');
  const startConfirmation = document.querySelector('#start-confirmation');
  const targetConfirmation = document.querySelector('#target-confirmation');
  const mapHint = document.querySelector('#map-hint');
  const screens = [...document.querySelectorAll('[data-flow-screen]')];
  const nodeById = Object.fromEntries(navigationData.nodes.map((node) => [node.id, node]));
  const placeById = Object.fromEntries(navigationData.places.map((place) => [place.id, place]));
  const buildingPlaceById = Object.fromEntries(navigationData.places.filter((place) => place.type === '教学楼')
    .map((place) => [place.buildingId, place]));
  const outdoorGraph = buildGraph(navigationData.edges.filter((edge) => edge.kind !== 'covered-connector'));
  const model = buildCampusModel(campusData);
  const colors = ['#9fc4d8', '#c5b7e4', '#a8cec0', '#ebc993', '#b7c3cf'];
  let state = { ...setPreset(createViewerState(), 'top'), startNodeId: navigationData.defaultStartNodeId, startPickPixel: null, targetPlaceId: null, targetNodeId: null, targetPickPixel: null, mapMode: 'idle', routeStrategy: 'outdoor' };
  let flow = createFlowState();
  let lastFaces = [];
  const activePointers = new Map();
  let primaryPointerId = null;
  let pinchGesture = null;
  let pinchActive = false;
  let isDragging = false;

  function buildGraph(edges) {
    const output = Object.fromEntries(navigationData.nodes.map((node) => [node.id, []]));
    edges.forEach((edge) => {
      output[edge.from].push({ to: edge.to, distance: edge.distance });
      output[edge.to].push({ to: edge.from, distance: edge.distance });
    });
    return output;
  }

  function shade(hex, multiplier) {
    const rgb = hex.match(/\w\w/g).map((value) => Math.round(parseInt(value, 16) * multiplier));
    return `rgb(${rgb.join(',')})`;
  }

  function pointInCanvas(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function viewport() {
    const rect = canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  function projectedGeo(point, z = 0) {
    return projectGeoPoint(model, state.camera, viewport(), point, z);
  }

  // Roads, surfaces and navigation all lie on this exact same world-space
  // plane as each building's footprint.  They are never a fixed screen overlay.
  function projectedBase(point) {
    return projectedGeo(point, 0);
  }

  function targetPlace() {
    if (state.targetPlaceId === 'map-target' && state.targetNodeId && state.targetPickPixel) {
      return logic.createMapPointPlace('target', state.targetPickPixel, state.targetNodeId);
    }
    return state.targetPlaceId ? placeById[state.targetPlaceId] : null;
  }

  function routeToTarget() {
    const target = targetPlace();
    if (!target) return null;
    const options = logic.findRouteOptions(navigationData.edges, state.startNodeId, target.nodeId);
    return options.find((option) => option.id === state.routeStrategy) || options[0] || null;
  }

  function routeOptionsToTarget() {
    const target = targetPlace();
    return target ? logic.findRouteOptions(navigationData.edges, state.startNodeId, target.nodeId) : [];
  }

  function allRouteDistances() {
    return Object.fromEntries(navigationData.nodes.map((node) => [
      node.id,
      logic.findShortestPath(outdoorGraph, state.startNodeId, node.id)?.distance ?? Infinity,
    ]));
  }

  function drawLine(points, color, width, dashed = false) {
    if (points.length < 2) return;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    context.strokeStyle = color;
    context.lineWidth = width;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.setLineDash(dashed ? [4, 5] : []);
    context.stroke();
    context.setLineDash([]);
  }

  function drawRoadLabel(road, points) {
    if (!road.name || points.length < 2) return;
    const middleIndex = Math.floor((points.length - 1) / 2);
    const start = points[middleIndex];
    const end = points[middleIndex + 1];
    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    let angle = Math.atan2(end.y - start.y, end.x - start.x);
    if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;
    context.save();
    context.translate(midpoint.x, midpoint.y);
    context.rotate(angle);
    context.font = '700 10px Microsoft YaHei, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const labelWidth = context.measureText(road.name).width + 12;
    context.fillStyle = 'rgba(255,255,255,.86)';
    context.fillRect(-labelWidth / 2, -9, labelWidth, 18);
    context.fillStyle = '#526663';
    context.fillText(road.name, 0, 1);
    context.restore();
  }

  function drawGroundPlane() {
    drawPolygon(projectGroundPlane(model, state.camera, viewport()), '#dceae4', '#a6bdb2');
  }

  function drawMapSurfaces() {
    const colorsByKind = { green: '#c4dfbd', courtyard: '#dbe8cf', plaza: '#e8e4d7' };
    (campusData.mapSurfaces || []).forEach((surface) => {
      const points = surface.polygon.map(projectedBase);
      drawPolygon(points, colorsByKind[surface.kind] || '#d7e5d7', '#a6beaa');
    });
  }

  function drawRoadSurface(points, classification) {
    const isMainRoad = classification === 'external-primary' || classification === 'external-secondary' || classification === 'internal-primary';
    const widthByClass = {
      'external-primary': 17,
      'external-secondary': 14,
      'internal-primary': 12,
      'internal-service': 9,
      pedestrian: 6,
    };
    const width = widthByClass[classification] || 7;
    drawLine(points, isMainRoad ? '#aeb8b3' : '#afc7bd', width + 4);
    drawLine(points, isMainRoad ? '#f5f1e8' : '#eff6f1', width);
    if (isMainRoad) drawLine(points, classification.startsWith('external') ? '#d1a65d' : '#9aa9a2', 1.5, true);
  }

  function drawRoadNetwork() {
    // Do not render the old hand-drawn road guesses. The visible internal
    // walking layer is the separately audited navigation graph below.
    campusData.roads.filter((road) => road.source !== 'schematic-reference').forEach((road) => {
      const points = road.line.map(projectedBase);
      drawRoadSurface(points, road.classification);
      drawRoadLabel(road, points);
    });
    navigationData.edges.forEach((edge) => {
      const points = geometry.edgePolyline(edge, nodeById).map(projectedBase);
      if (edge.kind === 'covered-connector') {
        drawLine(points, '#ece4fa', 8);
        drawLine(points, '#8a68c7', 3, true);
      } else {
        drawLine(points, '#b9cbc5', 9);
        drawLine(points, '#fbfdfb', 5);
        drawLine(points, '#7fa399', 1.3, true);
      }
    });
    const route = routeToTarget();
    const routeOptions = routeOptionsToTarget();
    if (route) {
      const points = geometry.routePolyline(route, navigationData.edges, nodeById).map(projectedBase);
      drawLine(points, 'rgba(255,255,255,.9)', 10);
      drawLine(points, '#1672cc', 5);
    }
  }

  function drawPolygon(points, fill, stroke) {
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = stroke;
    context.lineWidth = 0.9;
    context.stroke();
  }

  function drawBuildings() {
    lastFaces.forEach((face) => {
      const selected = face.buildingId === state.selectedBuildingId;
      const target = face.buildingId === targetPlace()?.buildingId;
      const base = target ? '#e76836' : (selected ? '#177d86' : colors[face.building.colorIndex % colors.length]);
      const fill = face.kind === 'roof' ? base : shade(base, 0.76 + (face.wallIndex % 2) * 0.08);
      drawPolygon(face.points, fill, target ? '#96391f' : '#506871');
    });
  }

  function drawBuildingLabels() {
    const placed = new Set();
    const occupied = [];
    const { width: canvasWidth, height: canvasHeight } = viewport();
    const reference = { x: canvasWidth / 2, y: canvasHeight / 2 };
    const overlaps = (left, right) => left.x < right.x + right.width && left.x + left.width > right.x
      && left.y < right.y + right.height && left.y + left.height > right.y;
    const placeWithoutOverlap = (placement, labelWidth, labelHeight) => {
      const sideways = { x: -placement.direction.y, y: placement.direction.x };
      const shifts = [0, 24, -24, 48, -48, 72, -72];
      const candidates = shifts.map((shift) => ({
        x: placement.center.x + sideways.x * shift,
        y: placement.center.y + sideways.y * shift,
      }));
      const chosen = candidates.find((candidate) => {
        const rect = { x: candidate.x - labelWidth / 2, y: candidate.y - labelHeight / 2, width: labelWidth, height: labelHeight };
        const insideCanvas = rect.x >= 6 && rect.y >= 6 && rect.x + rect.width <= canvasWidth - 6 && rect.y + rect.height <= canvasHeight - 6;
        return insideCanvas && !occupied.some((item) => overlaps(rect, item));
      }) || candidates[0];
      const rect = {
        x: Math.max(6, Math.min(canvasWidth - labelWidth - 6, chosen.x - labelWidth / 2)),
        y: Math.max(6, Math.min(canvasHeight - labelHeight - 6, chosen.y - labelHeight / 2)),
        width: labelWidth,
        height: labelHeight,
      };
      occupied.push(rect);
      return { x: rect.x + labelWidth / 2, y: rect.y + labelHeight / 2 };
    };
    context.font = '700 12px Microsoft YaHei, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    lastFaces.filter((face) => face.kind === 'roof').forEach((face) => {
      if (placed.has(face.buildingId)) return;
      placed.add(face.buildingId);
      const label = face.building.name;
      const width = context.measureText(label).width + 12;
      const height = 20;
      const exterior = placeExteriorLabel(face.points, reference, width, height);
      const labelCenter = placeWithoutOverlap(exterior, width, height);
      drawLine([exterior.anchor, exterior.leaderStart, labelCenter], '#5c7470', 1.1);
      context.fillStyle = 'rgba(255,255,255,.78)';
      context.fillRect(labelCenter.x - width / 2, labelCenter.y - height / 2, width, height);
      context.fillStyle = '#273d3b';
      context.fillText(label, labelCenter.x, labelCenter.y + 1);
    });
  }

  function drawCircle(point, radius, fill, stroke = '#fff') {
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = stroke;
    context.lineWidth = 2;
    context.stroke();
  }

  function facilityPoint(place) {
    return projectedGeo(place.point || nodeById[place.nodeId].point, 1.1);
  }

  function drawFacilitiesAndEndpoints() {
    navigationData.places.filter((place) => place.isFacility && place.simulated).forEach((place) => {
      const point = facilityPoint(place);
      const selected = place.id === state.targetPlaceId;
      drawCircle(point, selected ? 11 : 8, selected ? '#e76836' : '#486f9f');
      context.fillStyle = '#fff';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = '700 9px Microsoft YaHei, sans-serif';
      context.fillText(place.type === '卫生间' ? '厕' : '点', point.x, point.y + .5);
    });
    const start = state.startPickPixel || projectedGeo(nodeById[state.startNodeId].point, 1.4);
    drawCircle(start, 10, '#dc4d4d');
    context.fillStyle = '#a02f35';
    context.font = '700 11px Microsoft YaHei, sans-serif';
    context.textAlign = 'left';
    context.fillText(flow.startConfirmed ? '起点' : '起点候选', start.x + 12, start.y - 12);
    const target = targetPlace();
    if (target) {
      const point = target.screenPoint || facilityPoint(target);
      drawCircle(point, 10, '#dc4d4d');
      context.fillStyle = '#a02f35';
      context.fillText(flow.targetConfirmed ? '终点' : '终点候选', point.x + 13, point.y - 12);
    }
  }

  function render() {
    const { width, height } = viewport();
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#e8f0ef';
    context.fillRect(0, 0, width, height);
    drawGroundPlane();
    drawMapSurfaces();
    drawRoadNetwork();
    lastFaces = projectFaces(model, state.camera, { width, height });
    drawBuildings();
    drawBuildingLabels();
    drawFacilitiesAndEndpoints();
    updatePanel();
  }

  function updatePanel() {
    const target = targetPlace();
    const route = routeToTarget();
    routeTitle.textContent = target ? `前往 ${target.name}` : '准备出发';
    routeSummary.textContent = route ? `${route.label} · 约 ${route.distance} m · 步行约 ${Math.max(1, Math.ceil(route.distance / 70))} 分钟` : '确认起点与目的地后，这里会显示步行路线。';
    renderRouteOptions(routeOptionsToTarget(), route?.id);
    routeSteps.replaceChildren();
    if (route && target) {
      route.nodes.slice(1).forEach((nodeId) => {
        const item = document.createElement('li');
        item.textContent = nodeId === target.nodeId ? `到达：${target.name}` : `经由：${nodeById[nodeId].name}`;
        routeSteps.append(item);
      });
    }
    renderFacilities(target);
    updateInspector();
    controls.forEach((button) => button.classList.toggle('is-active', button.dataset.preset === state.activePreset));
    zoomRange.value = String(Math.round(state.camera.zoom * 100));
    zoomValue.textContent = `${Math.round(state.camera.zoom * 100)}%`;
    screens.forEach((screen) => { const active = screen.dataset.flowScreen === flow.screen; screen.hidden = !active; screen.classList.toggle('is-active', active); });
    mapHint.textContent = state.activePreset === 'top' ? (state.mapMode === 'start' ? '点选地图，标记「我在这里」' : (state.mapMode === 'target' ? '点选楼栋或设施，选择目的地' : '单指拖动平移 · 双指缩放')) : '拖动旋转 3D 视图 · 双指缩放 / 平移';
  }

  function renderRouteOptions(options, activeId) {
    routeOptionsContainer.replaceChildren();
    if (options.length < 2) return;
    options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `route-option${option.id === activeId ? ' is-active' : ''}${option.containsConnector ? ' is-connector' : ''}`;
      button.dataset.routeStrategy = option.id;
      button.innerHTML = `<strong>${option.label}</strong><span>约 ${option.distance} m</span><small>${option.note || '全程沿室外步行网络与建筑入口行进。'}</small>`;
      routeOptionsContainer.append(button);
    });
  }

  function renderFacilities(target) {
    facilityList.replaceChildren();
    if (!target?.buildingId) {
      facilityList.textContent = '先点选一栋楼，再查看该楼栋内的模拟设施。';
      return;
    }
    const facilities = logic.listBuildingFacilities(navigationData.places, target.buildingId, allRouteDistances());
    if (!facilities.length) {
      facilityList.textContent = '该楼栋暂未录入设施样例。';
      return;
    }
    facilities.forEach((place) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'facility-option';
      button.dataset.placeId = place.id;
      button.innerHTML = `<span>${place.name}</span><small>${place.floor || '楼内'} · 约 ${Math.round(place.routeDistance)} m · 模拟</small>`;
      facilityList.append(button);
    });
  }

  function updateInspector() {
    const building = model.buildings.find((item) => item.id === state.selectedBuildingId);
    if (!building) {
      selectedName.textContent = '点选一栋楼查看楼内分区';
      selectedDescription.textContent = '课程原型先提供可替换的楼层与设施信息位，实景与门牌范围可继续补充。';
      selectedMeta.innerHTML = '<div><dt>室内信息</dt><dd>待根据实地楼层图补全</dd></div>';
      return;
    }
    selectedName.textContent = building.name;
    selectedDescription.textContent = '楼内分区示意：入口与公共设施优先标注；教室可按“楼栋—楼层—门牌范围”逐步补录。';
    selectedMeta.innerHTML = `<div><dt>楼层提示</dt><dd>1F 入口 / 公共设施；其余楼层待录入门牌范围</dd></div><div><dt>室内设施</dt><dd>卫生间、饮水点、电梯为模拟标记</dd></div>`;
  }

  function renderSearchResults() {
    const results = logic.searchPlaces(navigationData.places, searchInput.value).slice(0, 6);
    searchResults.replaceChildren();
    if (!searchInput.value.trim()) return;
    if (!results.length) { searchResults.textContent = '没有匹配结果；可试“致艺”“厕所”“茶水”或“Studio”。'; return; }
    results.forEach((place) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'search-option';
      button.dataset.placeId = place.id;
      button.innerHTML = `<span>${place.name}</span><small>${place.floor ? `${place.floor} · ` : ''}${place.type}${place.simulated ? ' · 模拟' : ''}</small>`;
      searchResults.append(button);
    });
  }

  function selectTargetCandidate(placeId) {
    const target = placeById[placeId];
    if (!target) return;
    state = { ...state, targetPlaceId: placeId, targetNodeId: target.nodeId, targetPickPixel: null, selectedBuildingId: target.buildingId || state.selectedBuildingId, mapMode: 'target' };
    searchInput.value = '';
    searchResults.replaceChildren();
    flow = transitionFlow(flow, 'preview-target', placeId);
    renderCandidateCard(targetConfirmation, target, 'target');
    render();
  }

  function selectStartCandidate(nodeId, pickPixel = null) {
    const node = nodeById[nodeId];
    if (!node) return;
    state = { ...state, startNodeId: nodeId, startPickPixel: pickPixel, mapMode: 'start' };
    flow = transitionFlow(flow, 'preview-start', nodeId);
    const candidate = pickPixel ? logic.createMapPointPlace('start', pickPixel, nodeId) : { ...node, type: '位置节点', nodeId };
    renderCandidateCard(startConfirmation, candidate, 'start');
    render();
  }

  function selectTargetMapPoint(nodeId, pickPixel) {
    const node = nodeById[nodeId];
    if (!node || !pickPixel) return;
    const candidate = logic.createMapPointPlace('target', pickPixel, nodeId);
    state = { ...state, targetPlaceId: candidate.id, targetNodeId: nodeId, targetPickPixel: pickPixel, mapMode: 'target' };
    flow = transitionFlow(flow, 'preview-target', candidate.id);
    searchInput.value = '';
    searchResults.replaceChildren();
    renderCandidateCard(targetConfirmation, candidate, 'target');
    render();
  }

  function renderCandidateCard(container, candidate, kind) {
    const name = kind === 'start' ? '用户所在地' : candidate.name;
    const descriptor = candidate.isMapPoint
      ? '已保留你点选的地图位置；路线会从附近可通行道路开始计算。'
      : kind === 'start' ? '请先核对当前位置。' : `${candidate.type}${candidate.floor ? ` · ${candidate.floor}` : ''}，请先核对位置与入口。`;
    container.hidden = false;
    container.innerHTML = `<div class="candidate-heading"><span>${kind === 'start' ? '起点候选' : '目的地候选'}</span><b>${name}</b></div><div class="photo-frame"><span>▧</span><p>实景照片待补<br><small>此处替换为 ${name} 的入口 / 周边实拍</small></p></div><p>${descriptor}</p><button type="button" class="primary-action" data-confirm="${kind}">确认${kind === 'start' ? '这里' : '目的地'}</button>`;
  }

  function nearestNodeAt(point) {
    return navigationData.nodes.reduce((best, node) => {
      const projected = projectedGeo(node.point, 0);
      const distance = (projected.x - point.x) ** 2 + (projected.y - point.y) ** 2;
      return distance < best.distance ? { node, distance } : best;
    }, { node: navigationData.nodes[0], distance: Infinity }).node;
  }

  function pickFacility(point) {
    return navigationData.places.filter((place) => place.isFacility).find((place) => {
      const candidate = facilityPoint(place);
      return (candidate.x - point.x) ** 2 + (candidate.y - point.y) ** 2 < 18 ** 2;
    }) || null;
  }

  function nudgeStart(direction) {
    const current = projectedGeo(nodeById[state.startNodeId].point, 0);
    const candidates = graph[state.startNodeId].map((edge) => nodeById[edge.to]).filter((node) => {
      const next = projectedGeo(node.point, 0);
      return (direction === 'left' && next.x < current.x) || (direction === 'right' && next.x > current.x)
        || (direction === 'up' && next.y < current.y) || (direction === 'down' && next.y > current.y);
    });
    if (!candidates.length) return;
    const chosen = candidates.sort((a, b) => {
      const aPoint = projectedGeo(a.point, 0); const bPoint = projectedGeo(b.point, 0);
      const aDistance = (aPoint.x - current.x) ** 2 + (aPoint.y - current.y) ** 2;
      const bDistance = (bPoint.x - current.x) ** 2 + (bPoint.y - current.y) ** 2;
      return aDistance - bDistance;
    })[0];
    state = { ...state, startNodeId: chosen.id };
    render();
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const density = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * density);
    canvas.height = Math.round(rect.height * density);
    context.setTransform(density, 0, 0, density, 0, 0);
    render();
  }

  function pinchGestureForPointers() {
    const points = [...activePointers.entries()]
      .sort(([leftId], [rightId]) => leftId - rightId)
      .map(([, point]) => point);
    if (points.length !== 2) return null;
    return {
      distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
      center: { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 },
    };
  }

  canvas.addEventListener('pointerdown', (event) => {
    activePointers.set(event.pointerId, pointInCanvas(event));
    canvas.setPointerCapture(event.pointerId);
    if (activePointers.size === 1) {
      primaryPointerId = event.pointerId;
      isDragging = false;
      pinchActive = false;
    } else if (activePointers.size === 2) {
      pinchGesture = pinchGestureForPointers();
      pinchActive = true;
      isDragging = true;
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!activePointers.has(event.pointerId)) return;
    const previous = activePointers.get(event.pointerId);
    const next = pointInCanvas(event);
    activePointers.set(event.pointerId, next);
    if (activePointers.size === 2) {
      const nextGesture = pinchGestureForPointers();
      if (pinchGesture && nextGesture) state = applyPinchGesture(state, pinchGesture, nextGesture);
      pinchGesture = nextGesture;
      pinchActive = true;
      render();
      return;
    }
    if (event.pointerId !== primaryPointerId || pinchActive) return;
    const delta = { x: next.x - previous.x, y: next.y - previous.y };
    if (Math.abs(delta.x) + Math.abs(delta.y) > 2) {
      isDragging = true;
      state = state.activePreset === 'top' ? applyPan(state, delta) : applyPointerDrag(state, delta);
      render();
    }
  });
  canvas.addEventListener('pointerup', (event) => {
    const point = pointInCanvas(event);
    const wasSingleTap = activePointers.size === 1 && event.pointerId === primaryPointerId && !isDragging && !pinchActive;
    activePointers.delete(event.pointerId);
    if (wasSingleTap) {
      const buildingId = pickBuilding(lastFaces, point);
      if (buildingId) {
        const buildingPlace = buildingPlaceById[buildingId];
        state = selectBuilding(state, buildingId);
        if (buildingPlace && state.mapMode === 'start') selectStartCandidate(buildingPlace.nodeId, point);
        else if (buildingPlace && state.mapMode === 'target') selectTargetCandidate(buildingPlace.id);
        else if (window.CanghaiMapHooks?.onBuildingSelected) window.CanghaiMapHooks.onBuildingSelected(buildingId);
        else if (buildingPlace) selectTargetCandidate(buildingPlace.id);
      } else if (state.mapMode === 'start') {
        selectStartCandidate(nearestNodeAt(point).id, point);
      } else if (state.mapMode === 'target') {
        const facility = pickFacility(point);
        if (facility) selectTargetCandidate(facility.id);
        else selectTargetMapPoint(nearestNodeAt(point).id, point);
      }
      render();
    }
    if (!activePointers.size) {
      primaryPointerId = null;
      pinchGesture = null;
      pinchActive = false;
      isDragging = false;
    }
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointercancel', (event) => {
    activePointers.delete(event.pointerId);
    if (!activePointers.size) { primaryPointerId = null; pinchGesture = null; pinchActive = false; isDragging = false; }
  });
  canvas.addEventListener('wheel', (event) => { event.preventDefault(); state = applyZoom(state, event.deltaY); render(); }, { passive: false });

  controls.forEach((button) => button.addEventListener('click', () => { state = setPreset(state, button.dataset.preset); render(); }));
  document.querySelector('#reset-view').addEventListener('click', () => { const camera = setPreset(createViewerState(), 'top').camera; state = { ...state, camera, activePreset: 'top' }; render(); });
  document.querySelector('#zoom-out').addEventListener('click', () => { state = setZoom(state, state.camera.zoom - .1); render(); });
  document.querySelector('#zoom-in').addEventListener('click', () => { state = setZoom(state, state.camera.zoom + .1); render(); });
  zoomRange.addEventListener('input', () => { state = setZoom(state, Number(zoomRange.value) / 100); render(); });
  document.querySelector('#place-search-form').addEventListener('submit', (event) => { event.preventDefault(); const first = logic.searchPlaces(navigationData.places, searchInput.value)[0]; if (first) selectTargetCandidate(first.id); else renderSearchResults(); });
  searchInput.addEventListener('input', renderSearchResults);
  searchResults.addEventListener('click', (event) => { const placeId = event.target.closest('[data-place-id]')?.dataset.placeId; if (placeId) selectTargetCandidate(placeId); });
  facilityList.addEventListener('click', (event) => { const placeId = event.target.closest('[data-place-id]')?.dataset.placeId; if (placeId) selectTargetCandidate(placeId); });
  routeOptionsContainer.addEventListener('click', (event) => {
    const strategy = event.target.closest('[data-route-strategy]')?.dataset.routeStrategy;
    if (!strategy) return;
    state = { ...state, routeStrategy: strategy };
    render();
  });

  document.querySelectorAll('[data-flow-action]').forEach((button) => button.addEventListener('click', () => {
    const action = button.dataset.flowAction;
    if (action === 'begin') { flow = transitionFlow(flow, 'begin'); state = { ...state, mapMode: 'start' }; }
    else if (action === 'back-welcome') { flow = { ...flow, screen: 'welcome' }; state = { ...state, mapMode: 'idle' }; }
    else if (action === 'edit-start') { flow = transitionFlow(flow, 'edit-start'); state = { ...state, mapMode: 'start' }; }
    else if (action === 'edit-target') { flow = transitionFlow(flow, 'edit-target'); state = { ...state, mapMode: 'target' }; }
    render();
  }));
  document.querySelectorAll('[data-start-mode]').forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.startMode === 'map') { landmarkForm.hidden = true; state = { ...state, mapMode: 'start' }; }
    else { landmarkForm.hidden = false; landmarkInput.focus(); }
    render();
  }));
  landmarkForm.addEventListener('submit', (event) => { event.preventDefault(); renderLandmarkResults(); });
  landmarkInput.addEventListener('input', renderLandmarkResults);
  landmarkResults.addEventListener('click', (event) => { const nodeId = event.target.closest('[data-node-id]')?.dataset.nodeId; if (nodeId) selectStartCandidate(nodeId); });
  document.querySelectorAll('[data-popular-place]').forEach((button) => button.addEventListener('click', () => selectTargetCandidate(button.dataset.popularPlace)));
  document.querySelector('[data-target-mode]').addEventListener('click', () => { state = { ...state, mapMode: 'target' }; render(); });
  document.querySelector('.navigation-panel').addEventListener('click', (event) => {
    const confirmation = event.target.closest('[data-confirm]')?.dataset.confirm;
    if (confirmation === 'start') { flow = transitionFlow(flow, 'confirm-start'); state = { ...state, mapMode: 'target' }; }
    if (confirmation === 'target') { flow = transitionFlow(flow, 'confirm-target'); state = { ...state, mapMode: 'idle' }; }
    render();
  });
  function renderLandmarkResults() {
    const query = landmarkInput.value.trim().toLowerCase(); landmarkResults.replaceChildren(); if (!query) return;
    const candidates = navigationData.nodes.filter((node) => node.name.toLowerCase().includes(query) || navigationData.places.some((place) => place.nodeId === node.id && `${place.name} ${(place.aliases || []).join(' ')}`.toLowerCase().includes(query))).slice(0, 6);
    if (!candidates.length) { landmarkResults.textContent = '暂未匹配到地点。可以直接在地图上选择离你最近的道路节点。'; return; }
    candidates.forEach((node) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'search-option'; button.dataset.nodeId = node.id; button.innerHTML = `<span>${node.name}</span><small>地图定位候选</small>`; landmarkResults.append(button); });
  }

  window.CanghaiMapHooks = {
    ...(window.CanghaiMapHooks || {}),
    onBuildingRoute: (buildingId) => {
      const place = logic.findBuildingPlace(navigationData.places, buildingId) || buildingPlaceById[buildingId];
      if (place) selectTargetCandidate(place.id);
    },
  };

  new ResizeObserver(resizeCanvas).observe(canvas);
  resizeCanvas();
}());

