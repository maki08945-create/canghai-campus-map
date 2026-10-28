/* Screen-space candidate ranking for free map-point selection. */
(function exposeMapPick(globalScope) {
  function findNearbyAnchors(point, anchors, radius) {
    const limit = radius ** 2;
    return anchors
      .map((anchor) => ({ ...anchor, distance: (anchor.point.x - point.x) ** 2 + (anchor.point.y - point.y) ** 2 }))
      .filter((anchor) => anchor.distance <= limit)
      .sort((left, right) => left.distance - right.distance);
  }

  const api = { findNearbyAnchors };
  if (typeof module !== 'undefined') module.exports = api;
  if (globalScope) globalScope.CanghaiMapPick = api;
}(typeof window !== 'undefined' ? window : globalThis));

