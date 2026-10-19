/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './apps/desktop/src/**/*.{ts,tsx,html}',
    './apps/desktop/index.html',
  ],
  theme: {
    extend: {
      colors: {
        // KuroStudio dark studio palette
        'studio-bg':        '#0e0e0e',
        'studio-surface':   '#1a1a1a',
        'studio-border':    '#2a2a2a',
        'studio-accent':    '#7c3aed',
        'studio-accent-hi': '#9f67ff',
        'studio-text':      '#e4e4e7',
        'studio-muted':     '#71717a',
        'studio-warn':      '#f59e0b',
        'studio-danger':    '#ef4444',
        'studio-success':   '#22c55e',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
