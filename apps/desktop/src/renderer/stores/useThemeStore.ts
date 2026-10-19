type ThemeMode = 'dark' | 'light';

type Listener = () => void;

class ThemeStore {
  private theme: ThemeMode = 'dark';
  private listeners = new Set<Listener>();

  constructor() {
    const saved = localStorage.getItem('kuro_theme_mode') as ThemeMode | null;
    if (saved === 'dark' || saved === 'light') {
      this.theme = saved;
    } else {
      this.theme = 'dark';
    }
    this.applyToDOM();
  }

  public getTheme(): ThemeMode {
    return this.theme;
  }

  public toggleTheme(): void {
    this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
  }

  public setTheme(theme: ThemeMode): void {
    this.theme = theme;
    localStorage.setItem('kuro_theme_mode', theme);
    this.applyToDOM();
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private applyToDOM(): void {
    const root = document.documentElement;
    if (this.theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const themeStore = new ThemeStore();
