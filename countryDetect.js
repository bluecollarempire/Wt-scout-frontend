// countryDetect.js — frontend country lookup for the SiteScout pay page.
// Standalone, offline, no network calls. Determines whether a lat/lng is
// in Canada ("CA"), the United States ("US"), or neither ("OTHER").
//
// This is the SAME logic as the backend lib/countryDetect.js (same border
// polylines, same rules) so the map display and the backend routing agree.
// The backend is still authoritative: it re-detects from the coordinates
// and routes by that, logging a warning if the frontend value disagrees.
//
// Usage in index.html:
//   <script src="countryDetect.js"></script>
//   const country = SiteScoutCountry.detectCountry(lat, lng); // "CA" | "US" | "OTHER"
//
// Display strings (see COUNTRY_LABELS below):
//   CA    -> "Scanning Canada — Yukon MINFILE + BC MINFILE gold records"
//   US    -> "Scanning the United States — USGS MRDS gold records"
//   OTHER -> "Outside US/Canada coverage — gold records are not available for this location"
(function (root) {
  "use strict";

  // Canada–US border, west to east: [lng, border latitude]
  var CA_BORDER_POINTS = [
    [-125, 49], [-110, 49], [-95, 49],
    [-92, 48.5], [-90, 47.5], [-88, 47], [-85, 46],
    [-84, 44.5], [-83.5, 43.2], [-83, 42.35], [-82, 41.9],
    [-80, 43], [-79, 43.5],
    [-76, 44], [-75, 45], [-72, 45], [-70, 45], [-67, 45]
  ];

  // US–Mexico border, west to east: [lng, border latitude]
  var MX_BORDER_POINTS = [
    [-117.03, 32.53], [-115.5, 32.6], [-114.8, 32.5], [-110.9, 31.33],
    [-109.5, 31.33], [-106.4, 31.78], [-103.0, 30.0], [-100.9, 29.4],
    [-99.5, 27.5], [-97.15, 25.96]
  ];

  function borderLatitudeAtLng(points, lng) {
    if (lng <= points[0][0]) return points[0][1];
    var last = points[points.length - 1];
    if (lng >= last[0]) return last[1];
    for (var i = 0; i < points.length - 1; i++) {
      var x0 = points[i][0], y0 = points[i][1];
      var x1 = points[i + 1][0], y1 = points[i + 1][1];
      if (lng >= x0 && lng <= x1) {
        var t = (lng - x0) / (x1 - x0);
        return y0 + t * (y1 - y0);
      }
    }
    return points[0][1];
  }

  function detectCountry(lat, lng) {
    if (typeof lat !== "number" || typeof lng !== "number" ||
        !isFinite(lat) || !isFinite(lng)) return "OTHER";
    // Outside North America entirely.
    if (lat < 18.9 || lat > 83.1 || lng < -179 || lng > -52) return "OTHER";
    // Hawaii (US).
    if (lat >= 18.9 && lat <= 22.3 && lng >= -160.5 && lng <= -154.8) return "US";
    // Alaska (US): mainland west of -141, plus the panhandle.
    if (lat >= 51 && lat <= 71.5) {
      if (lng <= -141) return "US";
      if (lng > -141 && lng <= -130 && lat >= 54 && lat <= 60) return "US";
      if (lng > -141) return "CA";
      return "US";
    }
    // Mexico: below the US–Mexico border line (lng -117 to -97.15).
    if (lng >= -117.03 && lng <= -97.15) {
      if (lat < borderLatitudeAtLng(MX_BORDER_POINTS, lng)) return "OTHER";
    }
    // Canada–US border: above the line is Canada, below is the US.
    var borderLat = borderLatitudeAtLng(CA_BORDER_POINTS, lng);
    if (lat > borderLat) return "CA";
    if (lat < borderLat) return "US";
    return "CA"; // exactly on the line
  }

  // Customer-facing line shown under the map before purchase.
  var COUNTRY_LABELS = {
    CA: "Scanning Canada — Yukon MINFILE + BC MINFILE gold records",
    US: "Scanning the United States — USGS MRDS gold records",
    OTHER: "Outside US/Canada coverage — gold records are not available for this location"
  };

  function countryLabel(country) {
    return COUNTRY_LABELS[country] || COUNTRY_LABELS.OTHER;
  }

  var api = { detectCountry: detectCountry, countryLabel: countryLabel };
  // Browser global.
  root.SiteScoutCountry = api;
  // Node (lets the same file be unit-tested with node --check / require).
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
