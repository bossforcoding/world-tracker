import regionsData from "../assets/regions.json";
import citiesData from "../assets/cities.json";
import { getAllCountries } from "../components/WorldMap";

export type Region = { id: string; name: string; d: string };
export type CountryRegions = {
  width: number;
  height: number;
  regions: Region[];
  projection: { scale: number; translate: number[] };
};

export type City = {
  id: string;
  name: string;
  x: number;
  y: number;
  population: number;
  capital: boolean;
  regionId: string | null;
};

const regionsByCountry = regionsData as Record<string, CountryRegions>;
const citiesByCountry = citiesData as Record<string, City[]>;

export function getRegionsForCountry(cca2: string | null): CountryRegions | undefined {
  if (!cca2) return undefined;
  return regionsByCountry[cca2];
}

export function getCitiesForCountry(cca2: string | null): City[] {
  if (!cca2) return [];
  return citiesByCountry[cca2] ?? [];
}

export type Capital = City & {
  countryId: string;
  countryName: string;
  countryNames: { en: string; it: string; fr: string; de: string; es: string };
  countryFlag: string;
};

export type SearchResult =
  | {
      kind: "country";
      id: string;
      name: string;
      names: { en: string; it: string; fr: string; de: string; es: string };
      flag: string;
      countryId: string;
    }
  | {
      kind: "city";
      id: string;
      name: string;
      flag: string;
      countryId: string;
      countryName: string;
      countryNames: { en: string; it: string; fr: string; de: string; es: string };
      regionId: string | null;
      population: number;
      capital: boolean;
    };

let searchIndexCache: SearchResult[] | null = null;

export function getSearchIndex(): SearchResult[] {
  if (searchIndexCache) return searchIndexCache;
  const countries = getAllCountries();
  const index: SearchResult[] = [];
  for (const country of countries) {
    index.push({
      kind: "country",
      id: `country-${country.id}`,
      name: country.name,
      names: country.names,
      flag: country.flag,
      countryId: country.id,
    });
    if (!country.cca2) continue;
    const cities = citiesByCountry[country.cca2] ?? [];
    for (const city of cities) {
      index.push({
        kind: "city",
        id: `city-${city.id}`,
        name: city.name,
        flag: country.flag,
        countryId: country.id,
        countryName: country.name,
        countryNames: country.names,
        regionId: city.regionId,
        population: city.population,
        capital: city.capital,
      });
    }
  }
  searchIndexCache = index;
  return index;
}

export function getAllCapitals(): Capital[] {
  const countries = getAllCountries();
  const capitals: Capital[] = [];
  for (const country of countries) {
    if (!country.cca2) continue;
    const cities = citiesByCountry[country.cca2] ?? [];
    const capital = cities.find((c) => c.capital);
    if (!capital) continue;
    capitals.push({
      ...capital,
      countryId: country.id,
      countryName: country.name,
      countryNames: country.names,
      countryFlag: country.flag,
    });
  }
  return capitals.sort((a, b) => a.countryName.localeCompare(b.countryName));
}
