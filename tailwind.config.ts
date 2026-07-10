import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172131",
        muted: "#5f6e7d",
        ivory: "#faf7f1",
        oat: "#f3ecdf",
        mist: "#e8f2ef",
        sage: "#8aa99d",
        pine: "#245247",
        coral: "#c85f4a",
        amber: "#c9822f",
        lilac: "#8072a8",
        skywash: "#dcecf7",
        clinical: "#3b6ea8"
      },
      boxShadow: {
        soft: "0 18px 44px rgba(23, 33, 49, 0.10)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
