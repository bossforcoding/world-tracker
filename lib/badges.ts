import { getAllCountries } from "../components/WorldMap";
import { getAllCapitals } from "./geoData";

export type BadgeStats = {
  visitedCountryIds: Set<string>;
  visitedCityIds: Set<string>;
  visitedRegionCount: number;
};

export type Badge = {
  id: string;
  icon: string;
  titleKey: string;
  descKey: string;
  unlocked: boolean;
  current: number;
  target: number;
};

const CONTINENT_BADGES: { id: string; icon: string; continent: string }[] = [
  { id: "continent_africa", icon: "🦁", continent: "Africa" },
  { id: "continent_americas", icon: "🌎", continent: "Americas" },
  { id: "continent_asia", icon: "🏯", continent: "Asia" },
  { id: "continent_europe", icon: "🏰", continent: "Europe" },
  { id: "continent_oceania", icon: "🏝️", continent: "Oceania" },
  { id: "continent_antarctic", icon: "🐧", continent: "Antarctic" },
];

const COUNTRY_MILESTONES = [
  { id: "countries_1", icon: "🧳", target: 1 },
  { id: "countries_5", icon: "🗺️", target: 5 },
  { id: "countries_25", icon: "✈️", target: 25 },
  { id: "countries_100", icon: "🌍", target: 100 },
];

export function computeBadges(stats: BadgeStats): Badge[] {
  const allCountries = getAllCountries();
  const allCapitals = getAllCapitals();
  const badges: Badge[] = [];

  const countriesVisitedCount = allCountries.filter((c) => stats.visitedCountryIds.has(c.id)).length;

  for (const milestone of COUNTRY_MILESTONES) {
    badges.push({
      id: milestone.id,
      icon: milestone.icon,
      titleKey: `badges.${milestone.id}.title`,
      descKey: `badges.${milestone.id}.desc`,
      unlocked: countriesVisitedCount >= milestone.target,
      current: Math.min(countriesVisitedCount, milestone.target),
      target: milestone.target,
    });
  }

  badges.push({
    id: "countries_all",
    icon: "🏆",
    titleKey: "badges.countries_all.title",
    descKey: "badges.countries_all.desc",
    unlocked: countriesVisitedCount >= allCountries.length && allCountries.length > 0,
    current: countriesVisitedCount,
    target: allCountries.length,
  });

  for (const cb of CONTINENT_BADGES) {
    const inContinent = allCountries.filter((c) => c.continent === cb.continent);
    const visitedInContinent = inContinent.filter((c) => stats.visitedCountryIds.has(c.id)).length;
    badges.push({
      id: cb.id,
      icon: cb.icon,
      titleKey: `badges.${cb.id}.title`,
      descKey: `badges.${cb.id}.desc`,
      unlocked: inContinent.length > 0 && visitedInContinent >= inContinent.length,
      current: visitedInContinent,
      target: inContinent.length,
    });
  }

  const capitalsVisitedCount = allCapitals.filter((c) => stats.visitedCityIds.has(c.id)).length;
  badges.push({
    id: "capitals_10",
    icon: "🏛️",
    titleKey: "badges.capitals_10.title",
    descKey: "badges.capitals_10.desc",
    unlocked: capitalsVisitedCount >= 10,
    current: Math.min(capitalsVisitedCount, 10),
    target: 10,
  });
  badges.push({
    id: "capitals_all",
    icon: "👑",
    titleKey: "badges.capitals_all.title",
    descKey: "badges.capitals_all.desc",
    unlocked: allCapitals.length > 0 && capitalsVisitedCount >= allCapitals.length,
    current: capitalsVisitedCount,
    target: allCapitals.length,
  });

  badges.push({
    id: "regions_50",
    icon: "📍",
    titleKey: "badges.regions_50.title",
    descKey: "badges.regions_50.desc",
    unlocked: stats.visitedRegionCount >= 50,
    current: Math.min(stats.visitedRegionCount, 50),
    target: 50,
  });

  badges.push({
    id: "cities_100",
    icon: "🏙️",
    titleKey: "badges.cities_100.title",
    descKey: "badges.cities_100.desc",
    unlocked: stats.visitedCityIds.size >= 100,
    current: Math.min(stats.visitedCityIds.size, 100),
    target: 100,
  });

  return badges;
}
