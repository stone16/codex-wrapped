export const colors = {
  background: "#f5efe6",
  backgroundAlt: "#efe5d6",
  surface: "rgba(255, 250, 244, 0.88)",
  surfaceStrong: "#fff9f0",
  border: "rgba(48, 36, 24, 0.1)",
  text: {
    primary: "#231f19",
    muted: "#514a43",
    faint: "#6a6259",
  },
  accent: {
    primary: "#10a37f",
    strong: "#0f9d7a",
    warm: "#f1b375",
    rose: "#e58b7a",
    soft: "rgba(16, 163, 127, 0.2)",
  },
  heatmap: [
    "#efe6da",
    "#d7ece6",
    "#b9dfd4",
    "#93d1c1",
    "#6bc1ad",
    "#41b299",
    "#1aa386",
  ],
};

export const typography = {
  fontFamily: '"IBM Plex Mono"',
  size: {
    xs: 9,
    sm: 11,
    md: 12,
    lg: 14,
    xl: 16,
    "2xl": 18,
    "3xl": 20,
    "4xl": 24,
    "5xl": 28,
    "6xl": 34,
    "7xl": 42,
  },
  weight: {
    regular: 400,
    medium: 500,
    bold: 700,
  },
};

export const spacing = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64];

export const layout = {
  // Card-only output (no outer canvas)
  canvas: {
    width: 900,
    height: 920,  // Full content height with footer padding
  },
  // For HTML comparison (includes outer padding)
  htmlViewport: {
    width: 1200,
    height: 968,
  },
  card: {
    width: 900,
    height: 920,
  },
  padding: {
    horizontal: 20,
    top: 20,
    bottom: 24,  // Extra padding below footer
  },
  radius: {
    md: 10,
    lg: 12,
    card: 16,
  },
  // 2x scale for high-resolution output
  scale: 2,
  shadow: "0 10px 26px rgba(35, 31, 25, 0.09)",
  cardShadow: "0 20px 60px rgba(35, 31, 25, 0.15)",
};
