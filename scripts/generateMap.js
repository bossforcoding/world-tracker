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
    const bounds = pathGen.bounds(f);
    const [[bx0, by0], [bx1, by1]] = bounds;
    const bboxWidth = bx1 - bx0;
    const bboxHeight = by1 - by0;
    // Antimeridian-straddling countries (Fiji...) get a bogus wide bbox and
    // an unreliable centroid; keep them unlabeled rather than mislabeled.
    const spansAntimeridian = bboxWidth > WIDTH * 0.5;
    const [cx, cy] = spansAntimeridian ? [null, null] : pathGen.centroid(f);
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
      cx: Number.isFinite(cx) ? cx : null,
      cy: Number.isFinite(cy) ? cy : null,
      bboxWidth,
      bboxHeight,
    };
  })
  .filter((c) => !!c.d);

// Bounding box per continent (in the same 0-960 / 0-500 path coordinate
// space) so the app can zoom the map to frame just one continent.
const continentBounds = {};
for (const f of geo.features) {
  if (!f.id || !f.properties || f.properties.name === "Antarctica") continue;
  const match = byCcn3.get(f.id);
  const continent = match ? match.region : "Other";
  const d = pathGen(f);
  if (!d) continue;
  const bounds = pathGen.bounds(f);
  const [[x0, y0], [x1, y1]] = bounds;
  if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) continue;
  // Countries straddling the antimeridian (e.g. Fiji) report a bogus
  // near-full-width bbox in this projection — skip them for framing
  // purposes; they still render normally on the map itself.
  if (x1 - x0 > WIDTH * 0.5) continue;
  const existing = continentBounds[continent];
  if (!existing) {
    continentBounds[continent] = { minX: x0, minY: y0, maxX: x1, maxY: y1 };
  } else {
    existing.minX = Math.min(existing.minX, x0);
    existing.minY = Math.min(existing.minY, y0);
    existing.maxX = Math.max(existing.maxX, x1);
    existing.maxY = Math.max(existing.maxY, y1);
  }
}

const out = { width: WIDTH, height: HEIGHT, countries, continentBounds };

fs.writeFileSync(
  path.join(__dirname, "..", "assets", "countries.json"),
  JSON.stringify(out)
);

const continents = new Set(countries.map((c) => c.continent));
console.log(`Generated ${countries.length} country paths across continents: ${Array.from(continents).join(", ")}`);
