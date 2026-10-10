// Local progress store. It keeps multiple profiles and the solved state of
// each puzzle per profile. It uses localStorage, so progress stays on the
// device and needs no server. Several people can each keep a profile and
// learn in parallel.

const KEY = 'chess-endgames-trainer-v1';

export interface ProfileProgress {
  /** Map of puzzle id to true when solved. */
  solved: Record<string, boolean>;
}

export interface StoreState {
  profiles: string[];
  activeProfile: string;
  /** Progress per profile name. */
  progress: Record<string, ProfileProgress>;
}

function emptyState(): StoreState {
  return {
    profiles: ['Player 1'],
    activeProfile: 'Player 1',
    progress: { 'Player 1': { solved: {} } }
  };
}

/** Load the whole store from localStorage. */
export function loadState(): StoreState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return emptyState();
    }
    const parsed = JSON.parse(raw) as StoreState;
    if (!parsed.profiles || parsed.profiles.length === 0) {
      return emptyState();
    }
    return parsed;
  } catch {
    return emptyState();
  }
}

/** Save the whole store to localStorage. */
export function saveState(state: StoreState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

/** Add a new profile. Names must be unique. Returns the updated state. */
export function addProfile(state: StoreState, name: string): StoreState {
  const trimmed = name.trim();
  if (trimmed.length === 0 || state.profiles.includes(trimmed)) {
    return state;
  }
  const next: StoreState = {
    ...state,
    profiles: [...state.profiles, trimmed],
    activeProfile: trimmed,
    progress: { ...state.progress, [trimmed]: { solved: {} } }
  };
  saveState(next);
  return next;
}

/** Switch the active profile. */
export function setActiveProfile(state: StoreState, name: string): StoreState {
  if (!state.profiles.includes(name)) {
    return state;
  }
  const next = { ...state, activeProfile: name };
  saveState(next);
  return next;
}

/** Mark a puzzle solved for the active profile. */
export function markSolved(state: StoreState, puzzleId: string): StoreState {
  const current = state.progress[state.activeProfile] ?? { solved: {} };
  const next: StoreState = {
    ...state,
    progress: {
      ...state.progress,
      [state.activeProfile]: { solved: { ...current.solved, [puzzleId]: true } }
    }
  };
  saveState(next);
  return next;
}

/** Read the solved map for the active profile. */
export function solvedMap(state: StoreState): Record<string, boolean> {
  return state.progress[state.activeProfile]?.solved ?? {};
}
