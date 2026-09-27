import { Platform, StatusBar } from "react-native";

export const colors = {
  bg: "#120F0D",
  surface: "#1C1714",
  surfaceRaised: "#26201B",
  surfaceHighlight: "#332A24",
  border: "#362C26",
  borderLight: "#4A3D35",
  text: "#F7F3EE",
  textMuted: "#ABA095",
  textFaint: "#73685E",
  habitGreen: "#22C55E",
  habitGreenGlow: "rgba(34, 197, 94, 0.25)",
  streakOrange: "#FF6B35",
  streakOrangeGlow: "rgba(255, 107, 53, 0.25)",
  streakGold: "#FBBF24",
  positive: "#22C55E",
  negative: "#EF4444",
  expense: "#E5983B",
  progress: "#FF6B35",
  periods: "#F472B6",
  periodsDark: "#831843",
  notes: "#818CF8",
  reminders: "#C084FC",
};

export const TOP_INSET = Platform.OS === "android" ? StatusBar.currentHeight || 26 : 48;
export const BOTTOM_INSET = 28;

export const cardShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.35,
  shadowRadius: 16,
  elevation: 6,
};
