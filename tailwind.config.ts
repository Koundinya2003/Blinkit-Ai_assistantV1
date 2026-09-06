import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: "hsl(var(--brand))",
        "brand-ink": "hsl(var(--brand-ink))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        background: "hsl(var(--background))",
        surface: "hsl(var(--surface))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        accent: "hsl(var(--accent))",
        danger: "hsl(var(--danger))",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "calc(var(--radius) + 4px)",
      },
      boxShadow: {
        card: "0 1px 2px rgb(15 23 42 / 0.06), 0 1px 3px rgb(15 23 42 / 0.1)",
        pop: "0 10px 30px -12px rgb(15 23 42 / 0.25)",
        rail: "0 -8px 24px -12px rgb(15 23 42 / 0.25)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
