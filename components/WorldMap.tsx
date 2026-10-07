import React, { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";
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
  cx: number | null;
  cy: number | null;
  bboxWidth: number;
  bboxHeight: number;
};

type ContinentBounds = { minX: number; minY: number; maxX: number; maxY: number };

const { countries, width, height, continentBounds } = countriesData as {
  countries: Country[];
  width: number;
  height: number;
  continentBounds: Record<string, ContinentBounds>;
};

// Only label countries with enough on-screen room, otherwise the map turns
// into unreadable text soup (Vatican, Singapore, Caribbean micro-states...).
const LABEL_MIN_WIDTH = 9;
const LABEL_MIN_HEIGHT = 6;
const labelCountries = countries.filter(
  (c) => c.cx !== null && c.cy !== null && c.bboxWidth > LABEL_MIN_WIDTH && c.bboxHeight > LABEL_MIN_HEIGHT
);

const AnimatedSvgPath = Animated.createAnimatedComponent(Path);

const MIN_SCALE = 1;
const MAX_SCALE = 8;

type ViewState = { cx: number; cy: number; scale: number };

const INITIAL_VIEW: ViewState = { cx: width / 2, cy: height / 2, scale: MIN_SCALE };

// Frames a continent's bounding box with some breathing room, clamped to the
// same zoom range the pinch gesture allows.
function viewForBounds(bounds: ContinentBounds): ViewState {
  const padding = 0.18;
  const bw = bounds.maxX - bounds.minX;
  const bh = bounds.maxY - bounds.minY;
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const paddedW = bw * (1 + padding * 2);
  const paddedH = bh * (1 + padding * 2);
  const scale = Math.min(width / paddedW, height / paddedH, MAX_SCALE);
  return { cx, cy, scale: Math.max(scale, MIN_SCALE) };
}

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
  focusedContinent?: string | null;
  renderWidth: number;
  renderHeight: number;
  lang: string;
};

export default function WorldMap({
  visited,
  isCountryPartiallyVisited,
  onPressCountry,
  theme,
  focusedContinent = null,
  renderWidth,
  renderHeight,
  lang,
}: Props) {
  const svgHeight = renderHeight;

  const animatedValues = useRef<Map<string, Animated.Value>>(new Map());
  const prevStatus = useRef<Map<string, Status>>(new Map());

  const [view, setView] = useState<ViewState>(INITIAL_VIEW);

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

  // Smoothly tween the viewBox to frame the selected continent (or back to
  // the whole world) instead of snapping.
  const focusAnim = useRef(new Animated.Value(0)).current;
  const focusFrom = useRef<ViewState>(INITIAL_VIEW);
  const focusTo = useRef<ViewState>(INITIAL_VIEW);

  useEffect(() => {
    const bounds = focusedContinent ? continentBounds[focusedContinent] : null;
    const target = bounds ? viewForBounds(bounds) : INITIAL_VIEW;
    focusFrom.current = view;
    focusTo.current = target;
    focusAnim.setValue(0);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: false,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedContinent]);

  useEffect(() => {
    const id = focusAnim.addListener(({ value }) => {
      const from = focusFrom.current;
      const to = focusTo.current;
      setView({
        cx: from.cx + (to.cx - from.cx) * value,
        cy: from.cy + (to.cy - from.cy) * value,
        scale: from.scale + (to.scale - from.scale) * value,
      });
    });
    return () => focusAnim.removeListener(id);
  }, [focusAnim]);

  const handlePress = (country: Country) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPressCountry(country);
  };

  const visibleWidth = width / view.scale;
  const visibleHeight = height / view.scale;
  const minX = view.cx - visibleWidth / 2;
  const minY = view.cy - visibleHeight / 2;
  const viewBox = `${minX} ${minY} ${visibleWidth} ${visibleHeight}`;

  return (
    <Svg width={renderWidth} height={svgHeight} viewBox={viewBox}>
      {countries.map((country) => {
        const animatedValue = animatedValues.current.get(country.id);
        const status = statusOf(country, visited, isCountryPartiallyVisited);
        const isDimmed = !!focusedContinent && country.continent !== focusedContinent;

        if (animatedValue) {
          return (
            <AnimatedSvgPath
              key={country.id}
              d={country.d}
              fill={animatedValue.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [theme.unvisited, theme.partial, theme.visited],
              })}
              opacity={isDimmed ? 0.12 : 1}
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
            opacity={isDimmed ? 0.12 : 1}
            stroke={theme.mapStroke}
            strokeWidth={0.5}
            onPress={() => handlePress(country)}
          />
        );
      })}
      {labelCountries.map((country) => {
        const isDimmed = !!focusedContinent && country.continent !== focusedContinent;
        if (isDimmed) return null;
        const label = (country.names as Record<string, string>)[lang] ?? country.name;
        return (
          <SvgText
            key={`label-${country.id}`}
            x={country.cx as number}
            y={country.cy as number}
            fontSize={5.5}
            fill={theme.text}
            stroke={theme.background}
            strokeWidth={0.5}
            textAnchor="middle"
            pointerEvents="none"
          >
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

export const MAP_WIDTH = width;
export const MAP_HEIGHT = height;

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
