#!/usr/bin/env bash
# Re-downloads the Natural Earth Admin-1 (states/provinces) source dataset.
# Source: nvkelso/natural-earth-vector, the canonical GeoJSON mirror of Natural Earth data.
set -euo pipefail
cd "$(dirname "$0")"
curl -sL "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson" -o admin1-raw.geojson
echo "Downloaded admin1-raw.geojson"
