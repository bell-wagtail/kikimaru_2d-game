export const DASH_FEEDBACK = {
  color: "#fffaf2", outlineColor: "#526d82", outlineAlpha: 0.35,
  minAlpha: 0.5, maxAlpha: 0.95,
  minLengthRatio: 0.12, maxLengthRatio: 0.5,
  thickness: 4, gapRatio: 0.15, travelRatio: 0.18,
  slowCycleSeconds: 0.65, fastCycleSeconds: 0.3,
  rows: [
    { heightRatio: 0.5, lengthScale: 1, offsetRatio: 0, phase: 0 },
    { heightRatio: 0.72, lengthScale: 0.7, offsetRatio: 0.12, phase: 0.45 },
    { heightRatio: 0.3, lengthScale: 0.85, offsetRatio: 0.06, phase: 0.75 },
    { heightRatio: 0.86, lengthScale: 0.55, offsetRatio: 0.18, phase: 0.25 }
  ]
} as const;
