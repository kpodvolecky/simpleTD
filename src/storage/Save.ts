/**
 * Persistence layer (§4.5). Progress and settings live in `localStorage`, but
 * access goes through this interface so a remote/account-based store can be
 * swapped in later without touching game code (§2.2).
 */
export interface SaveData {
  /** Highest level index unlocked (0-based); linear progression (§4.5). */
  unlockedLevelIndex: number;
  settings: {
    volume: number;
  };
}

const KEY = 'simpletd.save.v1';

const DEFAULT_SAVE: SaveData = {
  unlockedLevelIndex: 0,
  settings: { volume: 1 },
};

export interface SaveStore {
  load(): SaveData;
  save(data: SaveData): void;
}

/** localStorage-backed store with graceful fallback when storage is absent. */
export class LocalSaveStore implements SaveStore {
  private memory: SaveData = { ...DEFAULT_SAVE };

  load(): SaveData {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULT_SAVE };
      const parsed = JSON.parse(raw) as Partial<SaveData>;
      return {
        unlockedLevelIndex: parsed.unlockedLevelIndex ?? 0,
        settings: {
          volume: parsed.settings?.volume ?? 1,
        },
      };
    } catch {
      return { ...this.memory };
    }
  }

  save(data: SaveData): void {
    this.memory = data;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // Storage unavailable (private mode / quota); keep in-memory copy only.
    }
  }

  /** Unlock the level after `completedIndex` (linear progression, §4.5). */
  completeLevel(completedIndex: number): SaveData {
    const data = this.load();
    const next = completedIndex + 1;
    if (next > data.unlockedLevelIndex) data.unlockedLevelIndex = next;
    this.save(data);
    return data;
  }
}
