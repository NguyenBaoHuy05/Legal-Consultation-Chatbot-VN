import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      },
    },
  },
  plugins: [],
};

export default config;