import { useColorScheme } from "react-native";

const palette = {
  ocean: "#0f6d84",
  oceanDark: "#0a4f5e",
  sand: "#e8c07d",
  coral: "#e8734a",
  ink: "#1b2430",
  mist: "#f4f1ea",
};

export type Theme = {
  mode: "light" | "dark";
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
  primary: string;
  accent: string;
  visited: string;
  partial: string;
  unvisited: string;
  mapStroke: string;
  tabInactive: string;
};

export const lightTheme: Theme = {
  mode: "light",
  background: palette.mist,
  card: "#ffffff",
  text: palette.ink,
  subtext: "#5b6472",
  border: "#e2ddd0",
  primary: palette.ocean,
  accent: palette.coral,
  visited: palette.ocean,
  partial: palette.sand,
  unvisited: "#d7dbe0",
  mapStroke: "#ffffff",
  tabInactive: "#9aa3af",
};

export const darkTheme: Theme = {
  mode: "dark",
  background: "#0d1117",
  card: "#161c24",
  text: "#f2f0ea",
  subtext: "#9aa3af",
  border: "#252c37",
  primary: "#4fb3c9",
  accent: palette.coral,
  visited: "#4fb3c9",
  partial: "#c9a24f",
  unvisited: "#2a313d",
  mapStroke: "#0d1117",
  tabInactive: "#5b6472",
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkTheme : lightTheme;
}
