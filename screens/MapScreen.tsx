import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Text,
  Dimensions,
  LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import WorldMap, { Country, MAP_WIDTH, MAP_HEIGHT } from "../components/WorldMap";
import SearchBar from "../components/SearchBar";
import { useVisited } from "../lib/VisitedContext";
import { useTheme } from "../lib/theme";

const CONTINENTS = ["Africa", "Americas", "Asia", "Europe", "Oceania", "Antarctic"];
const MAP_ASPECT = MAP_WIDTH / MAP_HEIGHT;

export default function MapScreen({ navigation }: any) {
  const { visitedCountries, ready, isCountryPartiallyVisited } = useVisited();
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const [focusedContinent, setFocusedContinent] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleWrapperLayout = (e: LayoutChangeEvent) => {
    setContainerHeight(e.nativeEvent.layout.height);
  };

  if (!ready) {
    return (
      <SafeAreaView edges={["top", "left", "right"]} style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  const handlePressCountry = (country: Country) => {
    navigation.navigate("CountryDetail", { countryId: country.id });
  };

  const handleSelectCountry = (countryId: string) => {
    navigation.navigate("CountryDetail", { countryId });
  };

  const handleSelectCity = (countryId: string, regionId: string | null) => {
    navigation.navigate("CountryDetail", { countryId, regionId });
  };

  const handleSelectContinent = (continent: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFocusedContinent((prev) => (prev === continent ? null : continent));
  };

  // Unfocused: the map fills the whole available height and overflows
  // horizontally — pan with a plain ScrollView to explore the world.
  // Focused on a continent: fit the whole thing on screen instead (no
  // panning needed), zoomed via the SVG's own viewBox.
  const screenWidth = Dimensions.get("window").width;
  const panRenderHeight = containerHeight;
  const panRenderWidth = containerHeight * MAP_ASPECT;
  const focusedRenderWidth = screenWidth;
  const focusedRenderHeight = screenWidth / MAP_ASPECT;

  const handleContentSizeChange = (contentWidth: number) => {
    const offset = (contentWidth - screenWidth) / 2;
    if (offset > 0) scrollRef.current?.scrollTo({ x: offset, animated: false });
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.container, { backgroundColor: theme.background }]}>
      <SearchBar theme={theme} onSelectCountry={handleSelectCountry} onSelectCity={handleSelectCity} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.continentScroll}
        contentContainerStyle={styles.continentRow}
      >
        {CONTINENTS.map((continent) => {
          const isActive = focusedContinent === continent;
          return (
            <TouchableOpacity
              key={continent}
              onPress={() => handleSelectContinent(continent)}
              style={[
                styles.continentChip,
                {
                  backgroundColor: isActive ? theme.primary : theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={{ color: isActive ? "#fff" : theme.text, fontSize: 12, fontWeight: "600" }}>
                {t(`continents.${continent}`, continent)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.mapWrapper} onLayout={handleWrapperLayout}>
        {containerHeight > 0 &&
          (focusedContinent ? (
            <View style={styles.centeredMap}>
              <WorldMap
                visited={visitedCountries}
                isCountryPartiallyVisited={isCountryPartiallyVisited}
                onPressCountry={handlePressCountry}
                theme={theme}
                focusedContinent={focusedContinent}
                renderWidth={focusedRenderWidth}
                renderHeight={focusedRenderHeight}
                lang={i18n.language}
              />
            </View>
          ) : (
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              onContentSizeChange={handleContentSizeChange}
            >
              <WorldMap
                visited={visitedCountries}
                isCountryPartiallyVisited={isCountryPartiallyVisited}
                onPressCountry={handlePressCountry}
                theme={theme}
                focusedContinent={null}
                renderWidth={panRenderWidth}
                renderHeight={panRenderHeight}
                lang={i18n.language}
              />
            </ScrollView>
          ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  continentScroll: { flexGrow: 0, marginTop: 10 },
  continentRow: { paddingHorizontal: 14, gap: 6, alignItems: "center" },
  continentChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 6,
  },
  mapWrapper: { flex: 1 },
  centeredMap: { flex: 1, alignItems: "center", justifyContent: "center" },
});
