const fs = require("fs");
const path = require("path");
const { geoMercator, geoPath, geoCentroid } = require("d3-geo");
const { topology } = require("topojson-server");
const { presimplify, simplify } = require("topojson-simplify");
const { feature, merge } = require("topojson-client");

const RAW_PATH = path.join(__dirname, "data", "admin1-raw.geojson");
const OUT_PATH = path.join(__dirname, "..", "assets", "regions.json");
const SIZE = 480;
// Weight is a minimum point-removal area in steradians (from presimplify),
// NOT a 0-1 tolerance — typical values are ~1e-4 to 1e-7. A too-large weight
// (e.g. 0.15) collapses rings to near-nothing and produces degenerate,
// whole-viewport-filling paths out of d3-geo's clipping.
const SIMPLIFY_WEIGHT = 0.0005;

const raw = JSON.parse(fs.readFileSync(RAW_PATH, "utf8"));

const topo = topology({ regions: raw });
const topoGeometries = topo.objects.regions.geometries; // index-aligned with `raw.features`

// Natural Earth's admin-1 layer is province-level (not the constitutional
// "region" level) for some countries — e.g. Italy's 110 provinces instead of
// its 20 regioni, France's 101 départements instead of 18 régions. Each such
// feature also carries a `region`/`region_cod` property naming its parent
// region. Where that grouping is present and coarser than the raw feature
// count, dissolve provinces into their region using the shared topology
// (`merge` drops the internal shared edges) so we show the level people
// actually expect.
function dissolveToRegionLevel(rawFeatures) {
  const withCode = rawFeatures.filter(
    (f) => f.properties.region_cod && f.properties.region_cod !== "-99"
  );
  if (withCode.length < rawFeatures.length) return rawFeatures;
  const distinctCodes = new Set(withCode.map((f) => f.properties.region_cod));
  if (distinctCodes.size >= rawFeatures.length || distinctCodes.size <= 1) return rawFeatures;

  const byCode = new Map();
  rawFeatures.forEach((f) => {
    const code = f.properties.region_cod;
    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push(f);
  });

  const dissolved = [];
  for (const [code, group] of byCode) {
    const geoms = group.map((f) => topoGeometries[f.__index]);
    // merge() resolves topology arcs into plain coordinates; for a lone
    // feature (no dissolving needed) do the same via feature() instead of
    // passing the raw arc-indexed topology geometry straight through.
    const mergedGeometry = geoms.length > 1 ? merge(topo, geoms) : feature(topo, geoms[0]).geometry;
    dissolved.push({
      type: "Feature",
      properties: {
        adm1_code: code,
        name: group[0].properties.region || group[0].properties.name,
        iso_a2: group[0].properties.iso_a2,
      },
      geometry: mergedGeometry,
    });
  }
  return dissolved;
}

// Projections are always fit against this unsimplified geometry: simplifying
// first and fitting against that can degenerate tiny countries (Vatican) to a
// single repeated point, which sends fitSize's scale to Infinity/NaN.
const rawGeoAll = feature(topo, topo.objects.regions);
rawGeoAll.features.forEach((f, i) => {
  f.__index = i;
});

const rawByCountryForDissolve = new Map();
for (const f of rawGeoAll.features) {
  const cca2 = f.properties.iso_a2;
  if (!cca2 || cca2 === "-99") continue;
  if (!rawByCountryForDissolve.has(cca2)) rawByCountryForDissolve.set(cca2, []);
  rawByCountryForDissolve.get(cca2).push(f);
}

const rawGeo = {
  type: "FeatureCollection",
  features: Array.from(rawByCountryForDissolve.values()).flatMap(dissolveToRegionLevel),
};

const presimplified = presimplify(topo);
const simplified = simplify(presimplified, SIMPLIFY_WEIGHT);
const simplifiedGeo = feature(simplified, simplified.objects.regions);
const simplifiedByAdm1 = new Map(simplifiedGeo.features.map((f) => [f.properties.adm1_code, f]));

function hasArea(f) {
  if (!f || !f.geometry) return false;
  const coords = JSON.stringify(f.geometry.coordinates);
  // Degenerate simplification collapses a ring to one repeated point.
  return new Set(f.geometry.coordinates.flat(3)).size > 2 && coords.length > 20;
}

const byCountry = new Map();
for (const f of rawGeo.features) {
  const cca2 = f.properties.iso_a2;
  if (!cca2 || cca2 === "-99") continue;
  // A handful of minor-island features in this dataset carry no name at all
  // in any language (e.g. an unnamed Russian arctic island) — untrackable
  // and not worth surfacing as a region.
  if (!f.properties.name) continue;
  if (!byCountry.has(cca2)) byCountry.set(cca2, []);
  byCountry.get(cca2).push(f);
}

const LON_LAT_THRESHOLD = 35; // degrees; drops overseas territories (Alaska, French Guiana, Hawaii...)

function lonDelta(a, b) {
  let d = Math.abs(a - b);
  if (d > 180) d = 360 - d;
  return d;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Distant overseas territories (Alaska, Hawaii, French Guiana, Reunion...) blow up
// the per-country fitSize bounding box, shrinking the mainland to a speck.
// Anchor on the median centroid (robust to a few far-flung outliers, unlike
// picking the largest-area region — Alaska itself is the largest US region).
function keepMainland(features) {
  if (features.length <= 2) return features;
  const centroids = features.map((f) => geoCentroid(f));
  const anchorLon = median(centroids.map((c) => c[0]));
  const anchorLat = median(centroids.map((c) => c[1]));
  const kept = features.filter((f, i) => {
    const [lon, lat] = centroids[i];
    return lonDelta(lon, anchorLon) <= LON_LAT_THRESHOLD && Math.abs(lat - anchorLat) <= LON_LAT_THRESHOLD;
  });
  return kept.length > 0 ? kept : features;
}

const out = {};
let skipped = 0;

for (const [cca2, allFeatures] of byCountry) {
  const features = keepMainland(allFeatures);
  const collection = { type: "FeatureCollection", features };
  const projection = geoMercator().fitSize([SIZE, SIZE], collection);
  const pathGen = geoPath(projection);

  const regions = features
    .map((rawFeature) => {
      const adm1 = rawFeature.properties.adm1_code;
      const simplifiedFeature = simplifiedByAdm1.get(adm1);
      const useSimplified = hasArea(simplifiedFeature);
      const d = pathGen(useSimplified ? simplifiedFeature : rawFeature);
      if (!d || !/\d/.test(d)) return null;
      return {
        id: adm1,
        name: rawFeature.properties.name,
        d,
      };
    })
    .filter(Boolean);

  if (regions.length > 0) {
    // Persist the fitted projection so other generation scripts (cities) can
    // project raw lat/lon into this exact same per-country coordinate space.
    out[cca2] = {
      width: SIZE,
      height: SIZE,
      regions,
      projection: {
        scale: projection.scale(),
        translate: projection.translate(),
      },
    };
  } else {
    skipped += 1;
  }
}

fs.writeFileSync(OUT_PATH, JSON.stringify(out));

const totalRegions = Object.values(out).reduce((sum, c) => sum + c.regions.length, 0);
console.log(
  `Generated regions for ${Object.keys(out).length} countries, ${totalRegions} regions total (${skipped} countries skipped).`
);
