const isBrowser = () => typeof window !== "undefined";

export const storage = {
  get<T>(key: string, fallback: T): T {
    if (!isBrowser()) return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`Erro ao ler localStorage (${key}):`, error);
      return fallback;
    }
  },

  set<T>(key: string, value: T) {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Erro ao salvar localStorage (${key}):`, error);
    }
  },

  remove(key: string) {
    if (!isBrowser()) return;
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Erro ao remover localStorage (${key}):`, error);
    }
  },
};
