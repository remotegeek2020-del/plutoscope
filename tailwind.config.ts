import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette (Master Plan — "About Plutoscope"): cool instrument, warm subject.
        instrument: '#3B2E58', // deep indigo — the ring/instrument
        pluto: '#E8A33D', // warm amber — the planet, "finally seen"
      },
    },
  },
  plugins: [],
};

export default config;
