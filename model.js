/* Shared, dependency-free geometry for the interactive campus massing view. */
(function exposeCampusModel(globalScope) {
  const FLOOR_HEIGHT_METERS = 3.6;

  function average(values) {
    return values.reduce((total, value) => total + value, 0) / values.length;
  }

  function uniqueFootprint(footprint) {
    const points = footprint.slice();
    const first = points[0];
    const last = points.at(-1);
    if (first[0] === last[0] && first[1] === last[1]) points.pop();
    return points;
  }

  function buildCampusModel(data) {
    const centerLat = (data.bounds.minLat + data.bounds.maxLat) / 2;
    const centerLon = (data.bounds.minLon + data.bounds.maxLon) / 2;
    const metersPerLat = 111_320;
    const metersPerLon = 111_320 * Math.cos((centerLat * Math.PI) / 180);
    const toLocal = ([lat, lon], z = 0) => ({
      x: (lon - centerLon) * metersPerLon,
      y: (lat - centerLat) * metersPerLat,
      z,
    });
    const buildings = data.buildings.map((building, index) => {
      const heightMeters = building.heightUnits * FLOOR_HEIGHT_METERS;
      const base = uniqueFootprint(building.footprint).map((point) => toLocal(point));
      const roof = base.map((point) => ({ ...point, z: heightMeters }));
      const walls = base.map((point, wallIndex) => [
        point,
        base[(wallIndex + 1) % base.length],
        roof[(wallIndex + 1) % roof.length],
        roof[wallIndex],
      ]);
      return { ...building, colorIndex: index, heightMeters, base, roof, walls };
    });
    const scenePoints = buildings.flatMap((building) => building.base);
    const sceneMinX = Math.min(...scenePoints.map((point) => point.x));
    const sceneMaxX = Math.max(...scenePoints.map((point) => point.x));
    const sceneMinY = Math.min(...scenePoints.map((point) => point.y));
    const sceneMaxY = Math.max(...scenePoints.map((point) => point.y));
    const sceneWidthMeters = sceneMaxX - sceneMinX;
    const sceneDepthMeters = sceneMaxY - sceneMinY;
    const maxHeightMeters = Math.max(...buildings.map((building) => building.heightMeters));
    const localCorners = [
      toLocal([data.bounds.minLat, data.bounds.minLon]),
      toLocal([data.bounds.maxLat, data.bounds.maxLon]),
    ];
    return {
      buildings,
      widthMeters: Math.abs(localCorners[1].x - localCorners[0].x),
      depthMeters: Math.abs(localCorners[1].y - localCorners[0].y),
      sceneWidthMeters,
      sceneDepthMeters,
      sceneDiameterMeters: Math.hypot(sceneWidthMeters, sceneDepthMeters),
      maxHeightMeters,
      sceneBounds: { minX: sceneMinX, maxX: sceneMaxX, minY: sceneMinY, maxY: sceneMaxY },
      // This is the shared world origin for the 2D ground substrate and every
      // 3D building.  The z=0 plane has a +Z normal before any scene rotation.
      sceneOrigin: { x: (sceneMinX + sceneMaxX) / 2, y: (sceneMinY + sceneMaxY) / 2, z: 0 },
      groundNormal: { x: 0, y: 0, z: 1 },
      toLocal,
    };
  }

  function presetCamera(name) {
    const presets = {
      free: { rotationX: 0.68, rotationY: 0, rotationZ: -0.72, zoom: 1 },
      top: { rotationX: 0, rotationY: 0, rotationZ: 0, zoom: 1.06 },
      west: { rotationX: 0.96, rotationY: 0, rotationZ: -Math.PI / 2, zoom: 1.02 },
      south: { rotationX: 0.96, rotationY: 0, rotationZ: 0, zoom: 1.02 },
      low: { rotationX: 1.14, rotationY: 0, rotationZ: -0.84, zoom: 1 },
    };
    return { ...presets[name || 'free'] };
  }

  function rotations(camera) {
    // yaw/pitch are accepted only for old saved states; all new interactions
    // write the explicit X/Y/Z rotations below.
    return {
      x: Number.isFinite(camera.rotationX) ? camera.rotationX : (camera.pitch || 0),
      y: Number.isFinite(camera.rotationY) ? camera.rotationY : 0,
      z: Number.isFinite(camera.rotationZ) ? camera.rotationZ : (camera.yaw || 0),
    };
  }

  function rotateX(point, angle) {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return {
      x: point.x,
      y: point.y * cosine - point.z * sine,
      z: point.y * sine + point.z * cosine,
    };
  }

  function rotateY(point, angle) {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return {
      x: point.x * cosine + point.z * sine,
      y: point.y,
      z: -point.x * sine + point.z * cosine,
    };
  }

  function rotateZ(point, angle) {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    return {
      x: point.x * cosine - point.y * sine,
      y: point.x * sine + point.y * cosine,
      z: point.z,
    };
  }

  function rotatePoint(point, camera, sceneOrigin) {
    const rotation = rotations(camera);
    // Z → X → Y is an explicit model-group transform around the one common
    // origin. Ground geometry and building base geometry therefore always
    // retain their shared edges, whatever the viewing direction.
    const local = {
      x: point.x - sceneOrigin.x,
      y: point.y - sceneOrigin.y,
      z: point.z - sceneOrigin.z,
    };
    const transformed = rotateY(rotateX(rotateZ(local, rotation.z), rotation.x), rotation.y);
    return { x: transformed.x, screenY: transformed.y, depth: transformed.z };
  }

  function createProjection(model, camera, viewport) {
    const scale = Math.min(
      viewport.width / (model.sceneDiameterMeters * 1.2),
      viewport.height / (model.sceneDiameterMeters * 0.92 + model.maxHeightMeters),
    ) * camera.zoom;
    // A yaw/pitch change alters the apparent footprint.  Centering only on the
    // geographic origin leaves a low-angle view stranded at the canvas edge.
    // Frame the actual extruded building group for every camera pose instead.
    const framingPoints = model.buildings.flatMap((building) => [...building.base, ...building.roof])
      .map((point) => rotatePoint(point, camera, model.sceneOrigin));
    const minX = Math.min(...framingPoints.map((point) => point.x));
    const maxX = Math.max(...framingPoints.map((point) => point.x));
    const minScreenY = Math.min(...framingPoints.map((point) => point.screenY));
    const maxScreenY = Math.max(...framingPoints.map((point) => point.screenY));
    const centerX = viewport.width / 2 - ((minX + maxX) / 2) * scale + (camera.panX || 0);
    const centerY = viewport.height / 2 + ((minScreenY + maxScreenY) / 2) * scale + (camera.panY || 0);
    return (point) => {
      const transformed = rotatePoint(point, camera, model.sceneOrigin);
      return {
        x: centerX + transformed.x * scale,
        y: centerY - transformed.screenY * scale,
        depth: transformed.depth,
      };
    };
  }

  function projectGeoPoint(model, camera, viewport, geoPoint, z = 0) {
    return createProjection(model, camera, viewport)(model.toLocal(geoPoint, z));
  }

  function projectGroundPlane(model, camera, viewport) {
    const margin = Math.max(model.sceneWidthMeters, model.sceneDepthMeters) * 0.32;
    const { minX, maxX, minY, maxY } = model.sceneBounds;
    const project = createProjection(model, camera, viewport);
    return [
      project({ x: minX - margin, y: minY - margin, z: 0 }),
      project({ x: maxX + margin, y: minY - margin, z: 0 }),
      project({ x: maxX + margin, y: maxY + margin, z: 0 }),
      project({ x: minX - margin, y: maxY + margin, z: 0 }),
    ];
  }

  function projectFaces(model, camera, viewport) {
    const project = createProjection(model, camera, viewport);
    const faces = [];
    model.buildings.forEach((building) => {
      building.walls.forEach((wall, wallIndex) => {
        const points = wall.map(project);
        faces.push({
          buildingId: building.id,
          building,
          kind: 'wall',
          wallIndex,
          points,
          depth: average(points.map((point) => point.depth)),
        });
      });
      const roof = building.roof.map(project);
      faces.push({
        buildingId: building.id,
        building,
        kind: 'roof',
        points: roof,
        depth: average(roof.map((point) => point.depth)),
      });
    });
    return faces.sort((left, right) => left.depth - right.depth);
  }

  function polygonCenter(points) {
    return {
      x: average(points.map((point) => point.x)),
      y: average(points.map((point) => point.y)),
    };
  }

  function cross(left, right) {
    return left.x * right.y - left.y * right.x;
  }

  function rayExitPoint(polygon, origin, direction) {
    const exits = [];
    polygon.forEach((start, index) => {
      const end = polygon[(index + 1) % polygon.length];
      const edge = { x: end.x - start.x, y: end.y - start.y };
      const denominator = cross(direction, edge);
      if (Math.abs(denominator) < 0.00001) return;
      const offset = { x: start.x - origin.x, y: start.y - origin.y };
      const rayDistance = cross(offset, edge) / denominator;
      const edgeDistance = cross(offset, direction) / denominator;
      if (rayDistance >= 0 && edgeDistance >= 0 && edgeDistance <= 1) {
        exits.push({ x: origin.x + direction.x * rayDistance, y: origin.y + direction.y * rayDistance, distance: rayDistance });
      }
    });
    const exit = exits.sort((left, right) => left.distance - right.distance)[0];
    return exit ? { x: exit.x, y: exit.y } : polygon[0];
  }

  function placeExteriorLabel(polygon, reference, labelWidth, labelHeight) {
    const center = polygonCenter(polygon);
    const delta = { x: center.x - reference.x, y: center.y - reference.y };
    const length = Math.hypot(delta.x, delta.y) || 1;
    const direction = { x: delta.x / length, y: delta.y / length };
    const anchor = rayExitPoint(polygon, center, direction);
    const gap = 12;
    return {
      anchor,
      leaderStart: { x: anchor.x + direction.x * 6, y: anchor.y + direction.y * 6 },
      center: {
        x: anchor.x + direction.x * (labelWidth / 2 + gap),
        y: anchor.y + direction.y * (labelHeight / 2 + gap),
      },
      direction,
    };
  }

  function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
      const currentPoint = polygon[index];
      const previousPoint = polygon[previous];
      const intersects = ((currentPoint.y > point.y) !== (previousPoint.y > point.y))
        && (point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y))
          / (previousPoint.y - currentPoint.y) + currentPoint.x);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function pickBuilding(faces, point) {
    const roofs = faces.filter((face) => face.kind === 'roof');
    for (let index = roofs.length - 1; index >= 0; index -= 1) {
      if (isPointInPolygon(point, roofs[index].points)) return roofs[index].buildingId;
    }
    return null;
  }

  const api = { FLOOR_HEIGHT_METERS, buildCampusModel, projectFaces, projectGeoPoint, projectGroundPlane, placeExteriorLabel, pickBuilding, presetCamera };
  if (typeof module !== 'undefined') module.exports = api;
  if (globalScope) globalScope.CanghaiModel = api;
}(typeof window !== 'undefined' ? window : globalThis));

