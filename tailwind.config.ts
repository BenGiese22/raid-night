import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        night: 'rgb(var(--night) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        rule: 'rgb(var(--rule) / <alpha-value>)',
        bone: 'rgb(var(--bone) / <alpha-value>)',
        mist: 'rgb(var(--mist) / <alpha-value>)',
        hl: 'rgb(var(--highlighter) / <alpha-value>)',
        'hl-ink': 'rgb(var(--highlighter-ink) / <alpha-value>)',
        flare: 'rgb(var(--flare) / <alpha-value>)',
        ready: 'rgb(var(--ready) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
