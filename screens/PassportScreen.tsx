import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { getAllCountries, getCountryName } from "../components/WorldMap";
import { useVisited } from "../lib/VisitedContext";
import { useTheme } from "../lib/theme";
import { getAllCapitals } from "../lib/geoData";
import { SUPPORTED_LANGUAGES, setAppLanguage } from "../lib/i18n";
import { computeBadges, Badge } from "../lib/badges";

const ALL_CAPITALS = getAllCapitals();

export default function PassportScreen() {
  const { visitedCountries: visitedSet, visitedCities, visitedRegions } = useVisited();
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const allCountries = getAllCountries();
  const visitedCapitalsCount = ALL_CAPITALS.filter((c) => visitedCities.has(c.id)).length;

  const badges = useMemo(
    () =>
      computeBadges({
        visitedCountryIds: visitedSet,
        visitedCityIds: visitedCities,
        visitedRegionCount: visitedRegions.size,
      }),
    [visitedSet, visitedCities, visitedRegions]
  );
  const unlockedBadgeCount = badges.filter((b) => b.unlocked).length;
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const { visitedCountries, percentWorld, continentStats } = useMemo(() => {
    const visitedList = allCountries.filter((c) => visitedSet.has(c.id));
    const continents = new Map<string, { visited: number; total: number }>();
    allCountries.forEach((c) => {
      const entry = continents.get(c.continent) ?? { visited: 0, total: 0 };
      entry.total += 1;
      if (visitedSet.has(c.id)) entry.visited += 1;
      continents.set(c.continent, entry);
    });
    return {
      visitedCountries: visitedList.sort((a, b) =>
        getCountryName(a, i18n.language).localeCompare(getCountryName(b, i18n.language))
      ),
      percentWorld: allCountries.length ? Math.round((visitedList.length / allCountries.length) * 100) : 0,
      continentStats: Array.from(continents.entries()).sort((a, b) => a[0].localeCompare(b[0])),
    };
  }, [visitedSet, allCountries, i18n.language]);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{t("passport.title")}</Text>

        <View style={styles.languageRow}>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isActive = i18n.language === lang;
            return (
              <TouchableOpacity
                key={lang}
                onPress={() => setAppLanguage(lang)}
                style={[
                  styles.languageChip,
                  {
                    backgroundColor: isActive ? theme.primary : theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={{ color: isActive ? "#fff" : theme.text, fontSize: 12, fontWeight: "700" }}>
                  {lang.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.heroNumber, { color: theme.primary }]}>{percentWorld}%</Text>
          <Text style={[styles.heroLabel, { color: theme.subtext }]}>{t("passport.percentExplored")}</Text>
          <Text style={[styles.heroSub, { color: theme.text }]}>
            {t("passport.countriesCount", { count: visitedCountries.length, total: allCountries.length })}
          </Text>
        </View>

        <View style={[styles.statRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={{ color: theme.text, fontSize: 13 }}>{t("passport.capitalsVisited")}</Text>
          <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "700" }}>
            {visitedCapitalsCount} / {ALL_CAPITALS.length}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t("badges.sectionTitle")} ({unlockedBadgeCount} / {badges.length})
        </Text>
        <View style={styles.badgeGrid}>
          {badges.map((badge) => (
            <TouchableOpacity
              key={badge.id}
              onPress={() => setSelectedBadge(badge)}
              style={[
                styles.badgeCard,
                {
                  backgroundColor: theme.card,
                  borderColor: badge.unlocked ? theme.primary : theme.border,
                  opacity: badge.unlocked ? 1 : 0.45,
                },
              ]}
            >
              <Text style={styles.badgeIcon}>{badge.icon}</Text>
              <Text style={[styles.badgeTitle, { color: theme.text }]} numberOfLines={2}>
                {t(badge.titleKey)}
              </Text>
              <Text style={[styles.badgeProgress, { color: theme.subtext }]}>
                {badge.current} / {badge.target}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("passport.continents")}</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {continentStats.map(([continent, stat]) => (
            <View key={continent} style={styles.continentRow}>
              <Text style={[styles.continentName, { color: theme.text }]}>
                {t(`continents.${continent}`, continent)}
              </Text>
              <Text style={[styles.continentCount, { color: theme.subtext }]}>
                {stat.visited} / {stat.total}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t("passport.visitedCountries", { count: visitedCountries.length })}
        </Text>
        {visitedCountries.length === 0 ? (
          <Text style={[styles.empty, { color: theme.subtext }]}>{t("passport.emptyHint")}</Text>
        ) : (
          <View style={styles.chipWrap}>
            {visitedCountries.map((c) => (
              <View key={c.id} style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={styles.chipFlag}>{c.flag}</Text>
                <Text style={[styles.chipText, { color: theme.text }]}>
                  {getCountryName(c, i18n.language)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!selectedBadge}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedBadge(null)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => {}}
          >
            {selectedBadge && (
              <>
                <Text style={styles.modalIcon}>{selectedBadge.icon}</Text>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{t(selectedBadge.titleKey)}</Text>
                <Text style={[styles.modalDesc, { color: theme.subtext }]}>{t(selectedBadge.descKey)}</Text>
                <Text style={[styles.modalProgress, { color: theme.primary }]}>
                  {selectedBadge.current} / {selectedBadge.target}
                </Text>
                <Text style={[styles.modalStatus, { color: selectedBadge.unlocked ? theme.visited : theme.subtext }]}>
                  {selectedBadge.unlocked ? "✓" : "🔒"}
                </Text>
                <TouchableOpacity
                  style={[styles.modalClose, { backgroundColor: theme.primary }]}
                  onPress={() => setSelectedBadge(null)}
                >
                  <Text style={{ color: "#fff", fontWeight: "700" }}>OK</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 14, paddingBottom: 28 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  languageRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  languageChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 14,
  },
  heroNumber: { fontSize: 32, fontWeight: "800" },
  heroLabel: { fontSize: 12, marginTop: 2 },
  heroSub: { fontSize: 13, marginTop: 6, fontWeight: "600" },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginBottom: 6, marginTop: 2 },
  card: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    marginBottom: 14,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 14,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  badgeCard: {
    width: 76,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  badgeIcon: { fontSize: 20, marginBottom: 4 },
  badgeTitle: { fontSize: 9.5, fontWeight: "700", textAlign: "center" },
  badgeProgress: { fontSize: 8.5, marginTop: 2 },
  continentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  continentName: { fontSize: 13 },
  continentCount: { fontSize: 13, fontWeight: "600" },
  empty: { fontSize: 13, fontStyle: "italic" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 5,
  },
  chipFlag: { fontSize: 13 },
  chipText: { fontSize: 12, fontWeight: "500" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 280,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  modalIcon: { fontSize: 38, marginBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6, textAlign: "center" },
  modalDesc: { fontSize: 13, textAlign: "center", marginBottom: 12 },
  modalProgress: { fontSize: 14, fontWeight: "700" },
  modalStatus: { fontSize: 17, marginTop: 4, marginBottom: 12 },
  modalClose: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 16,
  },
});
