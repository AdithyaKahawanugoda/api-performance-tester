import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-1)',
        foreground: 'var(--fg-0)',
        border: 'var(--line)',
        input: 'var(--bg-3)',
        ring: 'var(--accent)',
        primary: { DEFAULT: 'var(--accent)', foreground: 'var(--accent-ink)' },
        secondary: { DEFAULT: 'var(--bg-2)', foreground: 'var(--fg-0)' },
        destructive: { DEFAULT: 'var(--err)', foreground: 'var(--fg-0)' },
        muted: { DEFAULT: 'var(--bg-2)', foreground: 'var(--fg-2)' },
        accent: { DEFAULT: 'var(--bg-3)', foreground: 'var(--fg-0)' },
        popover: { DEFAULT: 'var(--bg-2)', foreground: 'var(--fg-0)' },
        card: { DEFAULT: 'var(--bg-1)', foreground: 'var(--fg-0)' },
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius)',
        sm: 'var(--radius-sm)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
