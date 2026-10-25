/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tokens lifted 1:1 from linear.app (LCH values read off its CSS custom properties).
        canvas: "lch(98.94% 0.5 282)", // --bg-base-color
        panel: "#ffffff",
        muted: "lch(93.44% 0.5 282)", // --color-bg-secondary
        hover: "lch(91.94% 0.5 282)", // --color-bg-tertiary
        stroke: "lch(89.49% 0 282)", // --bg-border-color
        stroke_soft: "lch(93.94% 0 282)",

        ink: "#23252a", // --color-text
        ink_muted: "lch(39.576% 1.25 282)", // --color-text-tertiary
        ink_subtle: "lch(50% 0 282)",
        ink_faint: "lch(70% 0 282)",
        ink_secondary: "lch(19.788% 1.25 282)", // --color-text-secondary

        accent: "#5e6ad2",
        accent_bg: "lch(93% 4 283)",
        accent_border: "lch(82% 8 283)",

        buy: "#0f7b3f",
        buy_bg: "lch(94% 18 142)",
        sell: "#be2929",
        sell_bg: "lch(94% 12 30)",
        warn: "#bc4a00",
        warn_bg: "lch(94% 12 60)",
      },
      fontFamily: {
        sans: ["Inter", "Inter Variable", "SF Pro Display", "-apple-system", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        // The type scale: 19px body, 16px small, 24px and 36px headings. mini is for chart labels and small tags only.
        mini: ["14px", { lineHeight: "1.4" }],
        small: ["16px", { lineHeight: "1.4" }],
        regular: ["19px", { lineHeight: "1.4" }],
        large: ["24px", { lineHeight: "1.25" }],
        title: ["36px", { lineHeight: "1.12" }],
        display: ["48px", { lineHeight: "1.1" }],
      },
      fontWeight: {
        body: "450",
      },
      borderRadius: {
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(17, 17, 17, 0.04)",
        hover: "0 2px 6px rgba(17, 17, 17, 0.06)",
      },
      screens: {
        xs: "480px",
      },
    },
  },
  plugins: [],
};
