import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  countries: "visitedCountries",
  regions: "visitedRegions",
  cities: "visitedCities",
} as const;

export type SetKind = keyof typeof KEYS;

export async function loadSet(kind: SetKind): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(KEYS[kind]);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export async function saveSet(kind: SetKind, values: Set<string>): Promise<void> {
  await AsyncStorage.setItem(KEYS[kind], JSON.stringify(Array.from(values)));
}
