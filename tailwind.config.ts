import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./store/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        sand: "#FBF8EF",
        field: "#F5EDD5",
        olive: "#596247",
        terracotta: "#DC6432",
        khaki: "#DED1AA",
        border: "#C1BDAD",
        ink: "#171B18",
        inkSoft: "#645A32",
        paper: "#F5EDD5",
        stone: "#E8E6E0",
        brass: "#DC6432",
        brassLight: "#E79370",
        copper: "#DC6432",
        rust: "#DC6432",
        success: "#84B58D",
        successDeep: "#3F7652",
        danger: "#D96758"
      },
      fontFamily: {
        sans: ["Avenir Next", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["ui-serif", "Georgia", "Cambria", "serif"]
      },
      boxShadow: {
        map: "0 20px 58px rgba(23, 27, 24, 0.18)",
        command: "0 30px 90px rgba(11, 14, 12, 0.44)",
        insetPanel: "inset 0 1px 0 rgba(244, 239, 229, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
