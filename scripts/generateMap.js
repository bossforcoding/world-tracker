const fs = require("fs");
const path = require("path");
const { feature } = require("topojson-client");
const { geoNaturalEarth1, geoPath } = require("d3-geo");
const worldAtlas = require("world-atlas/countries-110m.json");
const worldCountries = require("world-countries");

const WIDTH = 960;
const HEIGHT = 500;

const geo = feature(worldAtlas, worldAtlas.objects.countries);

const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], geo);
const pathGen = geoPath(projection);

const byCcn3 = new Map(worldCountries.map((c) => [c.ccn3, c]));

const countries = geo.features
  .filter((f) => f.id && f.properties && f.properties.name && f.properties.name !== "Antarctica")
  .map((f) => {
    const match = byCcn3.get(f.id);
    const fallbackName = match ? match.name.common : f.properties.name;
    return {
      id: f.id,
      name: fallbackName,
      names: match
        ? {
            en: match.name.common,
            it: match.translations.ita?.common ?? fallbackName,
            fr: match.translations.fra?.common ?? fallbackName,
            de: match.translations.deu?.common ?? fallbackName,
            es: match.translations.spa?.common ?? fallbackName,
          }
        : { en: fallbackName, it: fallbackName, fr: fallbackName, de: fallbackName, es: fallbackName },
      d: pathGen(f),
      cca2: match ? match.cca2 : null,
      flag: match ? match.flag : "",
      continent: match ? match.region : "Other",
    };
  })
  .filter((c) => !!c.d);

const out = { width: WIDTH, height: HEIGHT, countries };

fs.writeFileSync(
  path.join(__dirname, "..", "assets", "countries.json"),
  JSON.stringify(out)
);

const continents = new Set(countries.map((c) => c.continent));
console.log(`Generated ${countries.length} country paths across continents: ${Array.from(continents).join(", ")}`);
