import React, { useEffect, useRef } from "react";
import { Animated, Dimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import countriesData from "../assets/countries.json";
import { Theme } from "../lib/theme";

export type Country = {
  id: string;
  name: string;
  names: { en: string; it: string; fr: string; de: string; es: string };
  d: string;
  cca2: string | null;
  flag: string;
  continent: string;
};

const { countries, width, height } = countriesData as {
  countries: Country[];
  width: number;
  height: number;
};

const AnimatedSvgPath = Animated.createAnimatedComponent(Path);

type Status = "none" | "partial" | "full";

function statusOf(country: Country, visited: Set<string>, isPartial: (cca2: string | null) => boolean): Status {
  if (visited.has(country.id)) return "full";
  if (isPartial(country.cca2)) return "partial";
  return "none";
}

function statusValue(status: Status): number {
  return status === "full" ? 1 : status === "partial" ? 0.5 : 0;
}

type Props = {
  visited: Set<string>;
  isCountryPartiallyVisited: (cca2: string | null) => boolean;
  onPressCountry: (country: Country) => void;
  theme: Theme;
  scaleFactor?: number;
};

export default function WorldMap({
  visited,
  isCountryPartiallyVisited,
  onPressCountry,
  theme,
  scaleFactor = 1,
}: Props) {
  const screenWidth = Dimensions.get("window").width * scaleFactor;
  const scale = screenWidth / width;
  const svgHeight = height * scale;

  const animatedValues = useRef<Map<string, Animated.Value>>(new Map());
  const prevStatus = useRef<Map<string, Status>>(new Map());

  useEffect(() => {
    countries.forEach((country) => {
      const status = statusOf(country, visited, isCountryPartiallyVisited);
      const prev = prevStatus.current.get(country.id) ?? "none";
      if (prev !== status) {
        let value = animatedValues.current.get(country.id);
        if (!value) {
          value = new Animated.Value(statusValue(prev));
          animatedValues.current.set(country.id, value);
        }
        Animated.timing(value, {
          toValue: statusValue(status),
          duration: 260,
          useNativeDriver: false,
        }).start();
      }
      prevStatus.current.set(country.id, status);
    });
  }, [visited, isCountryPartiallyVisited]);

  const handlePress = (country: Country) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPressCountry(country);
  };

  return (
    <Svg width={screenWidth} height={svgHeight} viewBox={`0 0 ${width} ${height}`}>
      {countries.map((country) => {
        const animatedValue = animatedValues.current.get(country.id);
        const status = statusOf(country, visited, isCountryPartiallyVisited);

        if (animatedValue) {
          return (
            <AnimatedSvgPath
              key={country.id}
              d={country.d}
              fill={animatedValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [theme.unvisited, theme.partial, theme.visited],
              })}
              stroke={theme.mapStroke}
              strokeWidth={0.5}
              onPress={() => handlePress(country)}
            />
          );
        }

        const fill = status === "full" ? theme.visited : status === "partial" ? theme.partial : theme.unvisited;

        return (
          <Path
            key={country.id}
            d={country.d}
            fill={fill}
            stroke={theme.mapStroke}
            strokeWidth={0.5}
            onPress={() => handlePress(country)}
          />
        );
      })}
    </Svg>
  );
}

export function getAllCountries(): Country[] {
  return countries;
}

export function getTotalCountries(): number {
  return countries.length;
}

export function getCountryById(id: string): Country | undefined {
  return countries.find((c) => c.id === id);
}

export function getCountryName(country: Country, lang: string): string {
  return (country.names as Record<string, string>)[lang] ?? country.name;
}
