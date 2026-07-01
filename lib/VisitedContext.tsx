import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { loadSet, saveSet } from "./storage";
import { getRegionsForCountry, getCitiesForCountry } from "./geoData";

type VisitedContextValue = {
  ready: boolean;
  visitedCountries: Set<string>;
  visitedRegions: Set<string>;
  visitedCities: Set<string>;
  toggleCountry: (id: string) => void;
  setCountryVisited: (id: string, visited: boolean) => void;
  toggleRegion: (id: string) => void;
  toggleCity: (id: string) => void;
  isCountryPartiallyVisited: (cca2: string | null) => boolean;
};

const VisitedContext = createContext<VisitedContextValue | undefined>(undefined);

function useToggleSet(kind: "countries" | "regions" | "cities") {
  const [set, setSet] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSet(kind).then((s) => {
      setSet(s);
      setReady(true);
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveSet(kind, next);
      return next;
    });
  }, []);

  const setValue = useCallback((id: string, visited: boolean) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (visited) {
        next.add(id);
      } else {
        next.delete(id);
      }
      saveSet(kind, next);
      return next;
    });
  }, []);

  return { set, ready, toggle, setValue };
}

export function VisitedProvider({ children }: { children: React.ReactNode }) {
  const countries = useToggleSet("countries");
  const regions = useToggleSet("regions");
  const cities = useToggleSet("cities");

  const isCountryPartiallyVisited = useCallback(
    (cca2: string | null) => {
      if (!cca2) return false;
      const countryRegions = getRegionsForCountry(cca2);
      if (countryRegions?.regions.some((r) => regions.set.has(r.id))) return true;
      const countryCities = getCitiesForCountry(cca2);
      if (countryCities.some((c) => cities.set.has(c.id))) return true;
      return false;
    },
    [regions.set, cities.set]
  );

  const ready = countries.ready && regions.ready && cities.ready;

  return (
    <VisitedContext.Provider
      value={{
        ready,
        visitedCountries: countries.set,
        visitedRegions: regions.set,
        visitedCities: cities.set,
        toggleCountry: countries.toggle,
        setCountryVisited: countries.setValue,
        toggleRegion: regions.toggle,
        toggleCity: cities.toggle,
        isCountryPartiallyVisited,
      }}
    >
      {children}
    </VisitedContext.Provider>
  );
}

export function useVisited(): VisitedContextValue {
  const ctx = useContext(VisitedContext);
  if (!ctx) throw new Error("useVisited must be used within VisitedProvider");
  return ctx;
}
