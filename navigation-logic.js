/* Pure navigation helpers: data in, deterministic route/search result out. */
(function exposeNavigationLogic(globalScope) {
  function normalize(value) {
    return String(value || '').trim().toLocaleLowerCase();
  }

  function searchPlaces(places, query) {
    const needle = normalize(query);
    if (!needle) return [];
    return places.filter((place) => [place.name, place.type, ...(place.aliases || [])]
      .some((value) => normalize(value).includes(needle)));
  }

  function createMapPointPlace(kind, screenPoint, nodeId) {
    return {
      id: kind === 'start' ? 'map-start' : 'map-target',
      name: kind === 'start' ? '用户所在地' : '地图点选位置',
      type: '地图选点',
      nodeId,
      screenPoint: { x: screenPoint.x, y: screenPoint.y },
      isMapPoint: true,
    };
  }

  function findBuildingPlace(places, buildingId) {
    return places.find((place) => place.type === '教学楼' && place.buildingId === buildingId) || null;
  }

  function findShortestPath(graph, startId, endId) {
    if (!graph[startId] || !graph[endId]) return null;
    const costs = { [startId]: 0 };
    const paths = { [startId]: [startId] };
    const remaining = new Set(Object.keys(graph));

    while (remaining.size) {
      let currentId = null;
      let currentCost = Infinity;
      for (const nodeId of remaining) {
        if ((costs[nodeId] ?? Infinity) < currentCost) {
          currentId = nodeId;
          currentCost = costs[nodeId];
        }
      }
      if (!currentId || currentId === endId) break;
      remaining.delete(currentId);
      for (const edge of graph[currentId]) {
        const nextCost = currentCost + edge.distance;
        if (nextCost < (costs[edge.to] ?? Infinity)) {
          costs[edge.to] = nextCost;
          paths[edge.to] = [...paths[currentId], edge.to];
        }
      }
    }

    return paths[endId] ? { nodes: paths[endId], distance: costs[endId] } : null;
  }

  function buildGraphFromEdges(edges) {
    const graph = {};
    edges.forEach((edge) => {
      graph[edge.from] ||= [];
      graph[edge.to] ||= [];
      graph[edge.from].push({ to: edge.to, distance: edge.distance });
      graph[edge.to].push({ to: edge.from, distance: edge.distance });
    });
    return graph;
  }

  function routeHasConnector(route, edges) {
    return route.nodes.some((nodeId, index) => {
      if (index === route.nodes.length - 1) return false;
      const nextId = route.nodes[index + 1];
      return edges.some((edge) => edge.kind === 'covered-connector'
        && ((edge.from === nodeId && edge.to === nextId) || (edge.from === nextId && edge.to === nodeId)));
    });
  }

  function findRouteOptions(edges, startId, endId) {
    const outdoorEdges = edges.filter((edge) => edge.kind !== 'covered-connector');
    const outdoor = findShortestPath(buildGraphFromEdges(outdoorEdges), startId, endId);
    const connector = findShortestPath(buildGraphFromEdges(edges), startId, endId);
    const options = [];
    if (outdoor) options.push({ id: 'outdoor', label: '室外主步行', ...outdoor, containsConnector: false });
    if (connector && routeHasConnector(connector, edges)) {
      options.push({
        id: 'connector', label: '连廊优先', ...connector, containsConnector: true,
        note: '含教学楼连廊或室内穿行段，请按现场开放情况确认。',
      });
    }
    return options;
  }

  function listBuildingFacilities(places, buildingId, distancesByNode) {
    const facilityTypes = new Set(['卫生间', '饮水点', '茶水间', '电梯', '楼梯']);
    return places
      .filter((place) => place.buildingId === buildingId
        && (place.isFacility || facilityTypes.has(place.type)))
      .map((place) => ({ ...place, routeDistance: distancesByNode[place.nodeId] ?? Infinity }))
      .sort((left, right) => left.routeDistance - right.routeDistance);
  }

  function nudgeMapPoint(point, direction, bounds, step) {
    const changes = {
      left: { x: -step, y: 0 }, right: { x: step, y: 0 },
      up: { x: 0, y: -step }, down: { x: 0, y: step },
    };
    const change = changes[direction] || { x: 0, y: 0 };
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, point.x + change.x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, point.y + change.y)),
    };
  }

  const api = {
    normalize,
    searchPlaces,
    createMapPointPlace,
    findBuildingPlace,
    findShortestPath,
    findRouteOptions,
    listBuildingFacilities,
    nudgeMapPoint,
  };
  if (typeof module !== 'undefined') module.exports = api;
  if (globalScope) globalScope.CanghaiNavigationLogic = api;
}(typeof window !== 'undefined' ? window : globalThis));

