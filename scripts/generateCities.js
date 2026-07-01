const fs = require("fs");
const path = require("path");
const { geoMercator } = require("d3-geo");
const allCities = require("all-the-cities");
const regions = require("../assets/regions.json");

const MAX_TOP_BY_POPULATION = 30;
const MAX_PPLA2_PER_COUNTRY = 150;
// GeoNames feature codes: PPLC = national capital, PPLA = seat of a first-order
// admin division (region/state capital), PPLA2 = seat of a second-order admin
// division (province/department capital, i.e. "capoluogo di provincia").
// Including these regardless of population is what actually gets every
// provincial capital in, instead of just the ones big enough to rank in the
// national top-N.

function parsePathRings(d) {
  const cleaned = d.replace(/Z/g, "");
  const tokens = cleaned.match(/[ML][-\d.]+,[-\d.]+/g) || [];
  const rings = [];
  let current = [];
  for (const tok of tokens) {
    const type = tok[0];
    const [x, y] = tok.slice(1).split(",").map(Number);
    if (type === "M") {
      if (current.length > 2) rings.push(current);
      current = [[x, y]];
    } else {
      current.push([x, y]);
    }
  }
  if (current.length > 2) rings.push(current);
  return rings;
}

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function ringCenter(ring) {
  let sx = 0;
  let sy = 0;
  for (const [x, y] of ring) {
    sx += x;
    sy += y;
  }
  return [sx / ring.length, sy / ring.length];
}

const byCountry = new Map();
for (const c of allCities) {
  if (!c.country) continue;
  // A handful of GeoNames entries are dioceses/districts mistagged as populated
  // places rather than actual cities.
  if (/\bdiocese\b/i.test(c.name)) continue;
  if (!byCountry.has(c.country)) byCountry.set(c.country, []);
  byCountry.get(c.country).push(c);
}

const out = {};

for (const [cca2, cities] of byCountry) {
  const countryRegion = regions[cca2];
  if (!countryRegion) continue;

  // Reconstruct the exact same projection used to generate this country's
  // region paths, so city markers land in the same coordinate space.
  const projection = geoMercator()
    .scale(countryRegion.projection.scale)
    .translate(countryRegion.projection.translate);

  const regionShapes = countryRegion.regions.map((r) => {
    const rings = parsePathRings(r.d);
    return { id: r.id, rings, center: rings.length ? ringCenter(rings[0]) : [countryRegion.width / 2, countryRegion.height / 2] };
  });

  function findRegionId(x, y) {
    for (const region of regionShapes) {
      const inside = region.rings.reduce((count, ring) => count + (pointInRing(x, y, ring) ? 1 : 0), 0);
      if (inside % 2 === 1) return region.id;
    }
    if (regionShapes.length === 0) return null;
    // Fallback for points that miss every polygon (simplification can shift a
    // boundary a pixel or two): snap to the nearest region's centroid.
    let best = regionShapes[0];
    let bestDist = Infinity;
    for (const region of regionShapes) {
      const dx = region.center[0] - x;
      const dy = region.center[1] - y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = region;
      }
    }
    return best.id;
  }

  const sorted = [...cities].sort((a, b) => (b.population || 0) - (a.population || 0));
  const topByPopulation = sorted.slice(0, MAX_TOP_BY_POPULATION);

  // PPLA2 means "second-order admin division seat", but that division isn't
  // always province-sized: in the US, Romania, Mexico... it's the county/
  // municipality level, and including all of them would dump thousands of
  // entries into one country. Keep PPLA2 only where it stays at a plausible
  // province scale; otherwise fall back to PPLA (region/state capitals).
  const ppla2 = cities.filter((c) => c.featureCode === "PPLA2");
  const adminSeats = cities.filter((c) => {
    if (c.featureCode === "PPLC" || c.featureCode === "PPLA") return true;
    return c.featureCode === "PPLA2" && ppla2.length <= MAX_PPLA2_PER_COUNTRY;
  });

  const candidates = [...topByPopulation, ...adminSeats];

  const seen = new Set();
  const list = [];
  for (const c of candidates) {
    if (seen.has(c.cityId)) continue;
    seen.add(c.cityId);
    const [x, y] = projection([c.loc.coordinates[0], c.loc.coordinates[1]]);
    // Skip cities that fall outside this country's rendered viewBox (e.g.
    // overseas territories dropped from the mainland-only region map).
    if (x < 0 || x > countryRegion.width || y < 0 || y > countryRegion.height) continue;
    list.push({
      id: String(c.cityId),
      name: c.name,
      x,
      y,
      population: c.population || 0,
      capital: c.featureCode === "PPLC",
      regionId: findRegionId(x, y),
    });
  }
  list.sort((a, b) => b.population - a.population);

  if (list.length > 0) out[cca2] = list;
}

fs.writeFileSync(path.join(__dirname, "..", "assets", "cities.json"), JSON.stringify(out));

const totalCities = Object.values(out).reduce((sum, arr) => sum + arr.length, 0);
const withRegion = Object.values(out).reduce(
  (sum, arr) => sum + arr.filter((c) => c.regionId).length,
  0
);
console.log(
  `Generated cities for ${Object.keys(out).length} countries, ${totalCities} cities total (${withRegion} matched to a region).`
);
