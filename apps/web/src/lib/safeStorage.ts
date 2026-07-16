// sessionStorage that survives strict privacy modes (iOS "Block All Cookies"
// throws SecurityError on ANY storage access — including reads during render,
// which unmounts the whole app). Falls back to an in-memory map so flows that
// span pages within one SPA session (login token, pending appointment id)
// keep working; they just won't survive a full page reload.

const memory = new Map<string, string>()

export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      return window.sessionStorage.getItem(key)
    } catch {
      return memory.get(key) ?? null
    }
  },

  setItem(key: string, value: string): void {
    try {
      window.sessionStorage.setItem(key, value)
    } catch {
      memory.set(key, value)
    }
  },

  removeItem(key: string): void {
    try {
      window.sessionStorage.removeItem(key)
    } catch {
      // fall through to memory cleanup below
    }
    memory.delete(key)
  },
}
