/* Browser controller for the editable, schematic campus-navigation MVP. */
(function initializeNavigator() {
  const campusData = window.CanghaiCampusData;
  const navigationData = window.CanghaiNavigationData;
  const logic = window.CanghaiNavigationLogic;
  if (!campusData || !navigationData || !logic) return;

  const svg = document.querySelector('#navigation-map');
  const searchInput = document.querySelector('#place-search');
  const searchResults = document.querySelector('#search-results');
  const startLabel = document.querySelector('#start-location');
  const targetLabel = document.querySelector('#target-location');
  const routeSummary = document.querySelector('#route-summary');
  const routeSteps = document.querySelector('#route-steps');
  const facilityList = document.querySelector('#facility-list');
  const mapHint = document.querySelector('#map-hint');
  const mapBounds = { minX: 28, maxX: 972, minY: 28, maxY: 672 };
  const svgWidth = 1000;
  const svgHeight = 700;
  const nodeById = Object.fromEntries(navigationData.nodes.map((node) => [node.id, node]));
  const placeById = Object.fromEntries(navigationData.places.map((place) => [place.id, place]));
  const buildingPlaceById = Object.fromEntries(navigationData.places
    .filter((place) => place.type === '教学楼')
    .map((place) => [place.buildingId, place]));
  const graph = buildGraph(navigationData.edges);

  let state = {
    mapMode: 'target',
    start: makeStartFromNode(navigationData.defaultStartNodeId),
    targetPlaceId: null,
  };

  function buildGraph(edges) {
    const result = Object.fromEntries(navigationData.nodes.map((node) => [node.id, []]));
    edges.forEach((edge) => {
      result[edge.from].push({ to: edge.to, distance: edge.distance });
      result[edge.to].push({ to: edge.from, distance: edge.distance });
    });
    return result;
  }

  function pointToMap([lat, lon]) {
    const x = ((lon - campusData.bounds.minLon) / (campusData.bounds.maxLon - campusData.bounds.minLon)) * svgWidth;
    const y = ((campusData.bounds.maxLat - lat) / (campusData.bounds.maxLat - campusData.bounds.minLat)) * svgHeight;
    return { x, y };
  }

  function mapPointToNearestNode(mapPoint) {
    return navigationData.nodes.reduce((closest, node) => {
      const nodePoint = pointToMap(node.point);
      const distance = (nodePoint.x - mapPoint.x) ** 2 + (nodePoint.y - mapPoint.y) ** 2;
      return distance < closest.distance ? { node, distance } : closest;
    }, { node: navigationData.nodes[0], distance: Infinity }).node;
  }

  function makeStartFromNode(nodeId) {
    const node = nodeById[nodeId];
    return { point: pointToMap(node.point), nodeId, label: node.name, isCustom: false };
  }

  function setCustomStart(point) {
    const constrained = {
      x: Math.max(mapBounds.minX, Math.min(mapBounds.maxX, point.x)),
      y: Math.max(mapBounds.minY, Math.min(mapBounds.maxY, point.y)),
    };
    const node = mapPointToNearestNode(constrained);
    state = {
      ...state,
      start: { point: constrained, nodeId: node.id, label: `自定义点 · 接入${node.name}`, isCustom: true },
    };
    render();
  }

  function targetPlace() {
    return state.targetPlaceId ? placeById[state.targetPlaceId] : null;
  }

  function routeToTarget() {
    const target = targetPlace();
    return target ? logic.findShortestPath(graph, state.start.nodeId, target.nodeId) : null;
  }

  function routeDistancesFromStart() {
    return Object.fromEntries(navigationData.nodes.map((node) => [
      node.id,
      logic.findShortestPath(graph, state.start.nodeId, node.id)?.distance ?? Infinity,
    ]));
  }

  function createElement(name, attributes = {}, text = '') {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    if (text) element.textContent = text;
    return element;
  }

  function polygonPoints(points) {
    const footprint = points.at(-1)?.[0] === points[0]?.[0] && points.at(-1)?.[1] === points[0]?.[1]
      ? points.slice(0, -1) : points;
    return footprint.map((point) => {
      const mapped = pointToMap(point);
      return `${mapped.x.toFixed(1)},${mapped.y.toFixed(1)}`;
    }).join(' ');
  }

  function buildingCenter(building) {
    const footprint = building.footprint.slice(0, -1).map(pointToMap);
    return {
      x: footprint.reduce((sum, point) => sum + point.x, 0) / footprint.length,
      y: footprint.reduce((sum, point) => sum + point.y, 0) / footprint.length,
    };
  }

  function clearMap() {
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
  }

  function drawBaseMap() {
    clearMap();
    svg.append(createElement('rect', { x: 0, y: 0, width: svgWidth, height: svgHeight, class: 'map-background' }));
    const roadLayer = createElement('g', { class: 'road-layer' });
    campusData.roads.forEach((road) => {
      const points = road.line.map((point) => {
        const mapped = pointToMap(point);
        return `${mapped.x.toFixed(1)},${mapped.y.toFixed(1)}`;
      }).join(' ');
      roadLayer.append(createElement('polyline', { points, class: `road road--${road.classification}` }));
    });
    navigationData.edges.forEach((edge) => {
      const from = pointToMap(nodeById[edge.from].point);
      const to = pointToMap(nodeById[edge.to].point);
      roadLayer.append(createElement('line', {
        x1: from.x, y1: from.y, x2: to.x, y2: to.y, class: 'walk-network',
      }));
    });
    svg.append(roadLayer);

    const buildings = createElement('g', { class: 'building-layer' });
    campusData.buildings.forEach((building) => {
      const selected = targetPlace()?.buildingId === building.id;
      const polygon = createElement('polygon', {
        points: polygonPoints(building.footprint),
        class: `map-building${selected ? ' is-selected' : ''}`,
        'data-building-id': building.id,
        tabindex: '0',
        role: 'button',
        'aria-label': `选择${building.name}作为目的地`,
      });
      buildings.append(polygon);
      const labelPlace = buildingPlaceById[building.id];
      if (labelPlace) {
        const center = buildingCenter(building);
        buildings.append(createElement('text', {
          x: center.x, y: center.y, class: 'building-label', 'text-anchor': 'middle', 'pointer-events': 'none',
        }, labelPlace.name.replace('（', '\n（')));
      }
    });
    svg.append(buildings);
  }

  function drawRoute() {
    const route = routeToTarget();
    if (!route) return;
    const points = route.nodes.map((nodeId) => {
      const point = pointToMap(nodeById[nodeId].point);
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    }).join(' ');
    svg.append(createElement('polyline', { points, class: 'active-route' }));
  }

  function drawMarkers() {
    const target = targetPlace();
    const markerLayer = createElement('g', { class: 'marker-layer' });
    const start = state.start.point;
    markerLayer.append(createElement('circle', { cx: start.x, cy: start.y, r: 11, class: 'start-marker-ring' }));
    markerLayer.append(createElement('circle', { cx: start.x, cy: start.y, r: 5, class: 'start-marker' }));
    markerLayer.append(createElement('text', { x: start.x + 12, y: start.y - 12, class: 'marker-label' }, '你在这里'));
    if (target) {
      const nodePoint = pointToMap(nodeById[target.nodeId].point);
      markerLayer.append(createElement('circle', { cx: nodePoint.x, cy: nodePoint.y, r: 10, class: 'target-marker' }));
      markerLayer.append(createElement('circle', { cx: nodePoint.x, cy: nodePoint.y, r: 3, class: 'target-marker-dot' }));
      markerLayer.append(createElement('text', { x: nodePoint.x + 13, y: nodePoint.y - 12, class: 'marker-label marker-label--target' }, '目的地'));
    }
    svg.append(markerLayer);
  }

  function renderRoutePanel() {
    const target = targetPlace();
    const route = routeToTarget();
    startLabel.textContent = state.start.label;
    if (!target || !route) {
      targetLabel.textContent = '尚未选择目的地';
      routeSummary.textContent = '请搜索或点选一栋建筑 / 设施。';
      routeSteps.replaceChildren();
      return;
    }
    targetLabel.textContent = `${target.name}${target.floor ? ` · ${target.floor}` : ''}`;
    routeSummary.textContent = `约 ${Math.round(route.distance)} m · 步行约 ${Math.max(1, Math.ceil(route.distance / 70))} 分钟`;
    routeSteps.replaceChildren(...route.nodes.slice(1).map((nodeId) => {
      const item = document.createElement('li');
      item.textContent = nodeId === target.nodeId ? `到达：${target.name}` : `经由：${nodeById[nodeId].name}`;
      return item;
    }));
  }

  function renderFacilities() {
    const target = targetPlace();
    facilityList.replaceChildren();
    if (!target?.buildingId) {
      facilityList.textContent = '先选择目标楼栋，再查看该楼栋的模拟设施。';
      return;
    }
    const places = logic.listBuildingFacilities(navigationData.places, target.buildingId, routeDistancesFromStart());
    if (!places.length) {
      facilityList.textContent = '该楼栋尚未录入设施样例。';
      return;
    }
    places.forEach((place) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'facility-option';
      button.dataset.placeId = place.id;
      const detail = place.routeDistance === Infinity ? '待补路线节点' : `约 ${Math.round(place.routeDistance)} m`;
      button.innerHTML = `<span>${place.name}</span><small>${place.floor || '楼内'} · ${detail} · 模拟</small>`;
      facilityList.append(button);
    });
  }

  function renderSearchResults(query = searchInput.value) {
    const results = logic.searchPlaces(navigationData.places, query).slice(0, 6);
    searchResults.replaceChildren();
    if (!query.trim()) return;
    if (!results.length) {
      searchResults.textContent = '没有找到匹配地点；可试试“致艺”“厕所”“茶水”或“Studio”。';
      return;
    }
    results.forEach((place) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'search-option';
      button.dataset.placeId = place.id;
      button.innerHTML = `<span>${place.name}</span><small>${place.floor ? `${place.floor} · ` : ''}${place.type}${place.simulated ? ' · 模拟' : ''}</small>`;
      searchResults.append(button);
    });
  }

  function render() {
    drawBaseMap();
    drawRoute();
    drawMarkers();
    renderRoutePanel();
    renderFacilities();
    document.querySelectorAll('[data-map-mode]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.mapMode === state.mapMode);
    });
    mapHint.textContent = state.mapMode === 'start'
      ? '当前位置模式：点地图，或用下方方向键微调“你在这里”。'
      : '目的地模式：点一栋建筑，或先用搜索查找地点。';
  }

  function selectTarget(placeId) {
    state = { ...state, targetPlaceId: placeId, mapMode: 'target' };
    searchInput.value = '';
    searchResults.replaceChildren();
    render();
  }

  function pointFromEvent(event) {
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * svgWidth,
      y: ((event.clientY - rect.top) / rect.height) * svgHeight,
    };
  }

  svg.addEventListener('click', (event) => {
    const buildingElement = event.target.closest('[data-building-id]');
    if (state.mapMode === 'start') {
      setCustomStart(pointFromEvent(event));
      return;
    }
    if (buildingElement) {
      const buildingPlace = buildingPlaceById[buildingElement.dataset.buildingId];
      if (buildingPlace) selectTarget(buildingPlace.id);
    }
  });

  svg.addEventListener('keydown', (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.dataset.buildingId) {
      event.preventDefault();
      const buildingPlace = buildingPlaceById[event.target.dataset.buildingId];
      if (buildingPlace) selectTarget(buildingPlace.id);
    }
  });

  document.querySelectorAll('[data-map-mode]').forEach((button) => button.addEventListener('click', () => {
    state = { ...state, mapMode: button.dataset.mapMode };
    render();
  }));

  document.querySelector('#nudge-controls').addEventListener('click', (event) => {
    const direction = event.target.closest('[data-direction]')?.dataset.direction;
    if (!direction) return;
    const point = logic.nudgeMapPoint(state.start.point, direction, mapBounds, 16);
    setCustomStart(point);
  });

  document.querySelector('#place-search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const first = logic.searchPlaces(navigationData.places, searchInput.value)[0];
    if (first) selectTarget(first.id);
    else renderSearchResults();
  });
  searchInput.addEventListener('input', () => renderSearchResults());
  searchResults.addEventListener('click', (event) => {
    const placeId = event.target.closest('[data-place-id]')?.dataset.placeId;
    if (placeId) selectTarget(placeId);
  });
  facilityList.addEventListener('click', (event) => {
    const placeId = event.target.closest('[data-place-id]')?.dataset.placeId;
    if (placeId) selectTarget(placeId);
  });

  render();
}());

