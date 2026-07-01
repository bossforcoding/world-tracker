import React, { useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList } from "react-native";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { useVisited } from "../lib/VisitedContext";
import { useTheme } from "../lib/theme";
import { getAllCapitals, Capital } from "../lib/geoData";

const ALL_CAPITALS = getAllCapitals();

function localizedCountryName(capital: Capital, lang: string): string {
  return (capital.countryNames as Record<string, string>)[lang] ?? capital.countryName;
}

export default function CapitalsScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { visitedCities, toggleCity } = useVisited();
  const [search, setSearch] = useState("");

  const sortedCapitals = useMemo(() => {
    return [...ALL_CAPITALS].sort((a, b) =>
      localizedCountryName(a, i18n.language).localeCompare(localizedCountryName(b, i18n.language))
    );
  }, [i18n.language]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sortedCapitals;
    const q = search.trim().toLowerCase();
    return sortedCapitals.filter(
      (c) => c.name.toLowerCase().includes(q) || localizedCountryName(c, i18n.language).toLowerCase().includes(q)
    );
  }, [sortedCapitals, search, i18n.language]);

  const visitedCount = ALL_CAPITALS.filter((c) => visitedCities.has(c.id)).length;

  const handlePress = (cityId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    toggleCity(cityId);
  };

  const renderItem = ({ item }: { item: Capital }) => {
    const isVisited = visitedCities.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: theme.border }]}
        onPress={() => handlePress(item.id)}
      >
        <View style={styles.rowLeft}>
          <Text style={styles.flag}>{item.countryFlag}</Text>
          <View>
            <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>{item.name}</Text>
            <Text style={{ color: theme.subtext, fontSize: 12 }}>
              {localizedCountryName(item, i18n.language)}
            </Text>
          </View>
        </View>
        <Text style={{ color: isVisited ? theme.visited : theme.subtext, fontWeight: "700", fontSize: 16 }}>
          {isVisited ? "✓" : "+"}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>{t("capitals.title")}</Text>
        <Text style={[styles.stats, { color: theme.subtext }]}>
          {t("capitals.visitedCount", { count: visitedCount, total: ALL_CAPITALS.length })}
        </Text>
      </View>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t("capitals.searchPlaceholder") ?? ""}
        placeholderTextColor={theme.subtext}
        style={[
          styles.search,
          { backgroundColor: theme.card, color: theme.text, borderColor: theme.border },
        ]}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 20, fontWeight: "700" },
  stats: { fontSize: 14, marginTop: 2 },
  search: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  flag: { fontSize: 22 },
});
