import React, { useMemo, useState } from "react";
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { Theme } from "../lib/theme";
import { getSearchIndex, SearchResult } from "../lib/geoData";

const MAX_RESULTS = 20;

function localizedName(result: SearchResult, lang: string): string {
  if (result.kind === "country") {
    return (result.names as Record<string, string>)[lang] ?? result.name;
  }
  return result.name;
}

function localizedCountryName(result: Extract<SearchResult, { kind: "city" }>, lang: string): string {
  return (result.countryNames as Record<string, string>)[lang] ?? result.countryName;
}

type Props = {
  theme: Theme;
  onSelectCountry: (countryId: string) => void;
  onSelectCity: (countryId: string, regionId: string | null) => void;
};

export default function SearchBar({ theme, onSelectCountry, onSelectCity }: Props) {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const index = useMemo(() => getSearchIndex(), []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    type Scored = { item: SearchResult; rank: number; weight: number };
    const scored: Scored[] = [];
    for (const item of index) {
      const name = localizedName(item, i18n.language).toLowerCase();
      const countryMatch = item.kind === "city" && localizedCountryName(item, i18n.language).toLowerCase().includes(q);
      let rank: number | null = null;
      if (name === q) rank = 0;
      else if (name.startsWith(q)) rank = 1;
      else if (name.includes(q)) rank = 2;
      else if (countryMatch) rank = 3;
      if (rank === null) continue;
      // Within the same rank, surface countries, capitals, and bigger cities first.
      const weight = item.kind === "country" ? Infinity : (item.capital ? 1e9 : 0) + item.population;
      scored.push({ item, rank, weight });
    }
    scored.sort((a, b) => (a.rank !== b.rank ? a.rank - b.rank : b.weight - a.weight));
    return scored.slice(0, MAX_RESULTS).map((s) => s.item);
  }, [query, index, i18n.language]);

  const handleSelect = (item: SearchResult) => {
    setQuery("");
    setFocused(false);
    if (item.kind === "country") {
      onSelectCountry(item.countryId);
    } else {
      onSelectCity(item.countryId, item.regionId);
    }
  };

  const showDropdown = focused && query.trim().length > 0;

  return (
    <View style={styles.container}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        onFocus={() => setFocused(true)}
        placeholder={t("map.searchPlaceholder") ?? ""}
        placeholderTextColor={theme.subtext}
        style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
      />
      {showDropdown && (
        <View style={[styles.dropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.dropdownScroll}>
            {results.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.row, { borderBottomColor: theme.border }]}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.flag}>{item.flag}</Text>
                <View style={styles.rowText}>
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: "600" }}>
                    {localizedName(item, i18n.language)}
                  </Text>
                  {item.kind === "city" && (
                    <Text style={{ color: theme.subtext, fontSize: 11 }}>
                      {localizedCountryName(item, i18n.language)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
            {results.length === 0 && (
              <Text style={{ color: theme.subtext, padding: 10 }}>{t("map.searchNoMatch")}</Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 14, paddingTop: 10, zIndex: 10 },
  input: {
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
  },
  dropdown: {
    position: "absolute",
    top: 42,
    left: 14,
    right: 14,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: 300,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  dropdownScroll: { maxHeight: 300 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  rowText: { flex: 1 },
  flag: { fontSize: 15 },
});
