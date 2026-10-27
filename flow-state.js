/* Small, DOM-free state machine for the three visible map screens. */
(function exposeNavigationFlow(globalScope) {
  function createFlowState(overrides = {}) { return { screen: 'welcome', startCandidateId: null, targetCandidateId: null, startConfirmed: false, targetConfirmed: false, ...overrides }; }
  function transitionFlow(state, action, value = null) {
    switch (action) {
      case 'begin': return { ...state, screen: 'start' };
      case 'preview-start': return { ...state, screen: 'start', startCandidateId: value, startConfirmed: false };
      case 'confirm-start': return state.startCandidateId ? { ...state, screen: 'target', startConfirmed: true } : state;
      case 'preview-target': return { ...state, screen: 'target', targetCandidateId: value, targetConfirmed: false };
      case 'confirm-target': return state.targetCandidateId && state.startConfirmed ? { ...state, screen: 'route', targetConfirmed: true } : state;
      case 'edit-start': return { ...state, screen: 'start', startConfirmed: false };
      case 'edit-target': return { ...state, screen: 'target', targetConfirmed: false };
      default: return state;
    }
  }
  const api = { createFlowState, transitionFlow };
  if (typeof module !== 'undefined') module.exports = api;
  if (globalScope) globalScope.CanghaiNavigationFlow = api;
}(typeof window !== 'undefined' ? window : globalThis));

