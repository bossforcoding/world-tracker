import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useVisited } from "../lib/VisitedContext";
import { useTheme } from "../lib/theme";
import { getCountryById, getCountryName } from "../components/WorldMap";
import { getRegionsForCountry, getCitiesForCountry, City } from "../lib/geoData";

export default function CountryDetailScreen(props: any) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { countryId, regionId: initialRegionId } = props.route.params as {
    countryId: string;
    regionId?: string | null;
  };
  const country = getCountryById(countryId);
  const {
    visitedCountries,
    visitedRegions,
    visitedCities,
    setCountryVisited,
    toggleRegion,
    toggleCity,
  } = useVisited();

  const countryRegions = getRegionsForCountry(country?.cca2 ?? null);
  const allCities = useMemo(() => getCitiesForCountry(country?.cca2 ?? null), [country?.cca2]);
  const hasRegions = !!countryRegions && countryRegions.regions.length > 1;

  const [expandedRegionId, setExpandedRegionId] = useState<string | null>(initialRegionId ?? null);
  const [regionSearch, setRegionSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");

  const filteredRegions = useMemo(() => {
    const list = countryRegions?.regions ?? [];
    const sorted = [...list].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    if (!regionSearch.trim()) return sorted;
    const q = regionSearch.trim().toLowerCase();
    return sorted.filter((r) => r.name.toLowerCase().includes(q));
  }, [countryRegions, regionSearch]);

  if (!country) {
    return (
      <SafeAreaView edges={["bottom", "left", "right"]} style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>{t("countryDetail.notFound")}</Text>
      </SafeAreaView>
    );
  }

  const isFullyVisited = visitedCountries.has(country.id);

  const handleToggleWholeCountry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setCountryVisited(country.id, !isFullyVisited);
  };

  // Map taps always mark visited and expand that region's city list — they
  // never collapse, so there is no ambiguous "still selected" state to get
  // stuck on. Collapsing only happens by tapping the already-expanded row.
  const handleMapRegionPress = (regionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toggleRegion(regionId);
    setExpandedRegionId(regionId);
  };

  const handleRowPress = (regionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setExpandedRegionId((prev) => (prev === regionId ? null : regionId));
  };

  const handleToggleRegionVisited = (regionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toggleRegion(regionId);
  };

  const handleCityPress = (cityId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toggleCity(cityId);
  };

  const renderCityList = (cities: City[], emptyLabel: string) => {
    const q = citySearch.trim().toLowerCase();
    const filtered = q ? cities.filter((c) => c.name.toLowerCase().includes(q)) : cities;
    return (
      <>
        <TextInput
          value={citySearch}
          onChangeText={setCitySearch}
          placeholder={t("countryDetail.searchCities") ?? ""}
          placeholderTextColor={theme.subtext}
          style={[
            styles.search,
            { backgroundColor: theme.card, color: theme.text, borderColor: theme.border },
          ]}
        />
        <View style={[styles.listCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {filtered.map((city) => {
            const isVisited = visitedCities.has(city.id);
            return (
              <TouchableOpacity
                key={city.id}
                style={[styles.row, { borderBottomColor: theme.border }]}
                onPress={() => handleCityPress(city.id)}
              >
                <Text style={{ color: theme.text, fontSize: 13 }}>
                  {city.capital ? "★ " : ""}
                  {city.name}
                </Text>
                <Text style={{ color: isVisited ? theme.visited : theme.subtext, fontWeight: "700" }}>
                  {isVisited ? "✓" : "+"}
                </Text>
              </TouchableOpacity>
            );
          })}
          {filtered.length === 0 && (
            <Text style={{ color: theme.subtext, padding: 8 }}>{emptyLabel}</Text>
          )}
        </View>
      </>
    );
  };

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          {country.flag} {getCountryName(country, i18n.language)}
        </Text>

        <TouchableOpacity
          style={[
            styles.wholeCountryButton,
            {
              backgroundColor: isFullyVisited ? theme.visited : theme.card,
              borderColor: theme.border,
            },
          ]}
          onPress={handleToggleWholeCountry}
        >
          <Text style={{ color: isFullyVisited ? "#fff" : theme.text, fontWeight: "700" }}>
            {isFullyVisited ? t("countryDetail.markedVisited") : t("countryDetail.markVisited")}
          </Text>
        </TouchableOpacity>

        {hasRegions && countryRegions ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t("countryDetail.regionsCount", {
                count: countryRegions.regions.filter((r) => visitedRegions.has(r.id)).length,
                total: countryRegions.regions.length,
              })}
            </Text>
            <Text style={[styles.hint, { color: theme.subtext }]}>{t("countryDetail.regionsHint")}</Text>
            <View style={styles.mapWrapper}>
              <Svg
                width={countryRegions.width}
                height={countryRegions.height}
                viewBox={`0 0 ${countryRegions.width} ${countryRegions.height}`}
              >
                {countryRegions.regions.map((region) => (
                  <Path
                    key={region.id}
                    d={region.d}
                    fill={visitedRegions.has(region.id) ? theme.visited : theme.unvisited}
                    stroke={region.id === expandedRegionId ? theme.accent : theme.mapStroke}
                    strokeWidth={region.id === expandedRegionId ? 2 : 0.6}
                    onPress={() => handleMapRegionPress(region.id)}
                  />
                ))}
              </Svg>
            </View>

            <TextInput
              value={regionSearch}
              onChangeText={setRegionSearch}
              placeholder={t("countryDetail.searchRegions") ?? ""}
              placeholderTextColor={theme.subtext}
              style={[
                styles.search,
                { backgroundColor: theme.card, color: theme.text, borderColor: theme.border },
              ]}
            />
            <View style={[styles.listCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {filteredRegions.map((region) => {
                const isVisited = visitedRegions.has(region.id);
                const isExpanded = region.id === expandedRegionId;
                const regionCities = allCities.filter((c) => c.regionId === region.id);
                return (
                  <View key={region.id}>
                    <TouchableOpacity
                      style={[
                        styles.row,
                        { borderBottomColor: theme.border },
                        isExpanded && { backgroundColor: theme.background },
                      ]}
                      onPress={() => handleRowPress(region.id)}
                    >
                      <Text
                        style={{
                          color: isExpanded ? theme.primary : theme.text,
                          fontSize: 13,
                          fontWeight: isExpanded ? "700" : "400",
                        }}
                      >
                        {region.name}
                      </Text>
                      <TouchableOpacity
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => handleToggleRegionVisited(region.id)}
                      >
                        <Text style={{ color: isVisited ? theme.visited : theme.subtext, fontWeight: "700" }}>
                          {isVisited ? "✓" : "+"}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    {isExpanded && (
                      <View
                        style={[styles.expandedPanel, { backgroundColor: theme.background, borderBottomColor: theme.border }]}
                      >
                        <Text style={[styles.expandedTitle, { color: theme.subtext }]}>
                          {t("countryDetail.citiesInRegion", { region: region.name })} (
                          {regionCities.filter((c) => visitedCities.has(c.id)).length} /{" "}
                          {regionCities.length})
                        </Text>
                        {regionCities.length === 0 ? (
                          <Text style={{ color: theme.subtext, fontSize: 13 }}>
                            {t("countryDetail.noCitiesInRegion")}
                          </Text>
                        ) : (
                          regionCities.map((city) => {
                            const isCityVisited = visitedCities.has(city.id);
                            return (
                              <TouchableOpacity
                                key={city.id}
                                style={styles.expandedCityRow}
                                onPress={() => handleCityPress(city.id)}
                              >
                                <Text style={{ color: theme.text, fontSize: 12 }}>
                                  {city.capital ? "★ " : ""}
                                  {city.name}
                                </Text>
                                <Text
                                  style={{
                                    color: isCityVisited ? theme.visited : theme.subtext,
                                    fontWeight: "700",
                                  }}
                                >
                                  {isCityVisited ? "✓" : "+"}
                                </Text>
                              </TouchableOpacity>
                            );
                          })
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
              {filteredRegions.length === 0 && (
                <Text style={{ color: theme.subtext, padding: 8 }}>{t("countryDetail.noRegionsMatch")}</Text>
              )}
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t("countryDetail.citiesCount", {
                count: allCities.filter((c) => visitedCities.has(c.id)).length,
                total: allCities.length,
              })}
            </Text>
            {renderCityList(allCities, t("countryDetail.noCitiesMatch"))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, paddingBottom: 32 },
  title: { fontSize: 19, fontWeight: "700", marginBottom: 10 },
  wholeCountryButton: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 11,
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginTop: 10, marginBottom: 3 },
  hint: { fontSize: 11, marginBottom: 6 },
  mapWrapper: { alignItems: "center", marginBottom: 12 },
  search: {
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
    fontSize: 13,
  },
  listCard: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  expandedPanel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  expandedTitle: { fontSize: 11, fontWeight: "700", marginBottom: 5 },
  expandedCityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
});
