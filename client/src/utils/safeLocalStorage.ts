export const safeLocalStorage = {
  read(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  write(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {}
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {}
  },
};
