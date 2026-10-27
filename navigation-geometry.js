/* Shared pedestrian geometry. Navigation edges carry ground-level paths;
   buildings remain obstacles with their own separate footprints. */
(function () {
  function samePoint(a, b) {
    return a[0] === b[0] && a[1] === b[1];
  }

  function edgePolyline(edge, nodesById) {
    const start = nodesById[edge.from]?.point;
    const end = nodesById[edge.to]?.point;
    if (!start || !end) return [];
    return [start, ...(edge.via || []), end];
  }

  function pointInPolygon(point, polygon) {
    let inside = false;
    const vertices = samePoint(polygon[0], polygon.at(-1)) ? polygon.slice(0, -1) : polygon;
    for (let index = 0, previous = vertices.length - 1; index < vertices.length; previous = index++) {
      const [xi, yi] = vertices[index];
      const [xj, yj] = vertices[previous];
      const intersects = ((yi > point[1]) !== (yj > point[1]))
        && (point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function pathAvoidsBuildingInteriors(points, buildings) {
    return !points.some((point, index) => {
      if (index === points.length - 1) return false;
      const next = points[index + 1];
      return buildings.some((building) => {
        for (let step = 1; step < 24; step += 1) {
          const ratio = step / 24;
          const sample = [
            point[0] + (next[0] - point[0]) * ratio,
            point[1] + (next[1] - point[1]) * ratio,
          ];
          if (pointInPolygon(sample, building.footprint)) return true;
        }
        return false;
      });
    });
  }

  function routePolyline(route, edges, nodesById) {
    if (!route?.nodes?.length) return [];
    const points = [];
    for (let index = 0; index < route.nodes.length - 1; index += 1) {
      const from = route.nodes[index];
      const to = route.nodes[index + 1];
      const edge = edges.find((item) => item.from === from && item.to === to)
        || edges.find((item) => item.from === to && item.to === from);
      const segment = edgePolyline(edge || { from, to }, nodesById);
      if (edge && edge.from !== from) segment.reverse();
      segment.forEach((point) => {
        if (!points.length || !samePoint(points.at(-1), point)) points.push(point);
      });
    }
    return points.length ? points : [nodesById[route.nodes[0]].point];
  }

  const api = { edgePolyline, pathAvoidsBuildingInteriors, routePolyline };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.CanghaiNavigationGeometry = api;
}());

