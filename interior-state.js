/* State for the deliberately schematic 致艺楼 interior viewer. */
(function exposeInteriorState(globalScope) {
  function createInteriorState() { return { isOpen: false, buildingId: null, floor: '1F' }; }
  function openInterior(state, buildingId) { return buildingId === 'design-west' ? { ...state, isOpen: true, buildingId, floor: '1F' } : state; }
  function selectInteriorFloor(state, floor) { return state.isOpen ? { ...state, floor } : state; }
  function closeInterior(state) { return { ...state, isOpen: false, buildingId: null, floor: '1F' }; }
  const api = { createInteriorState, openInterior, selectInteriorFloor, closeInterior };
  if (typeof module !== 'undefined') module.exports = api;
  if (globalScope) globalScope.CanghaiInteriorState = api;
}(typeof window !== 'undefined' ? window : globalThis));

