import React, { useRef } from "react";
import { SafeAreaView, ScrollView, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import WorldMap, { Country } from "../components/WorldMap";
import SearchBar from "../components/SearchBar";
import { useVisited } from "../lib/VisitedContext";
import { useTheme } from "../lib/theme";

const SCALE_FACTOR = 1.2;

export default function MapScreen({ navigation }: any) {
  const { visitedCountries, ready, isCountryPartiallyVisited } = useVisited();
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  if (!ready) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.background }]}>
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

  // The map is intentionally wider than the screen (SCALE_FACTOR > 1); center
  // the horizontal scroll on it instead of leaving it pinned to the left edge.
  const handleContentSizeChange = (contentWidth: number) => {
    const screenWidth = Dimensions.get("window").width;
    const offset = (contentWidth - screenWidth) / 2;
    if (offset > 0) scrollRef.current?.scrollTo({ x: offset, animated: false });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <SearchBar theme={theme} onSelectCountry={handleSelectCountry} onSelectCity={handleSelectCity} />
      <ScrollView contentContainerStyle={styles.verticalWrapper}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalWrapper}
          onContentSizeChange={handleContentSizeChange}
        >
          <WorldMap
            visited={visitedCountries}
            isCountryPartiallyVisited={isCountryPartiallyVisited}
            onPressCountry={handlePressCountry}
            theme={theme}
            scaleFactor={SCALE_FACTOR}
          />
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  verticalWrapper: { flexGrow: 1, justifyContent: "center", paddingVertical: 12 },
  horizontalWrapper: { alignItems: "center" },
});
