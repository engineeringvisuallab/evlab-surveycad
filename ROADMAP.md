# EVLab SurveyCAD roadmap: from modern survey data to CAD

Goal: take whatever the survey equipment produces and turn it into a finished, checked CAD drawing with as little manual drafting as possible.
Status key: DONE = built and unit-tested (not yet field-tested in a real browser by the author), PARTLY = a first version exists, TODO = not built.

## Stage 0: Verify what exists (do first)
- Run the app in real browsers (Chrome, Edge, Firefox, a phone) and walk through every test checklist from Milestones 1 to 6. Fix whatever breaks. TODO
- Test with 3 to 5 real jobs from your own work (road, drain, river/canal, plot, water supply) and note every manual fix needed. These notes drive the order of the stages below. TODO
- Automated browser tests (Playwright) so every future change is checked automatically. TODO

## Stage 1: Get the data in (input)
1. Text exports PNEZD / PENZD with feature codes: DONE.
2. DXF import (POINT, LINE, LWPOLYLINE, POLYLINE, TEXT, MTEXT, CIRCLE, ARC) with an "unsupported entities" report: DONE. Still missing: HATCH, SPLINE, ELLIPSE, INSERT blocks, DIMENSION, text rotation, unit conversion, layer linetypes.
3. Instrument files: Leica GSI, Trimble JobXML and LandXML points: PARTLY (readers exist, tested only on hand-built files, not on real instrument files). Trimble DC/JOB, Topcon and Sokkia exports, Leica IDX, LandXML lines/surfaces: TODO.
4. Raw observations (angle, distance, heights, backsight, prism height, scale/atmosphere) reduced to coordinates inside the app, with station setups and side shots: TODO.
5. GNSS/RTK: coordinate system transformation with Proj4js, ellipsoidal to orthometric height (geoid model), local site calibration (2D Helmert): TODO. The Bangladesh grid definition must be confirmed with the national survey authority before use.
6. Drone and scanner data: LAS/LAZ point clouds, GeoTIFF DEM, georeferenced orthophoto as a background image, with thinning for large files: TODO.
7. GIS/other: Shapefile, KML, GeoJSON import with CRS handling (export exists): TODO.

## Stage 2: Check and clean the data (quality)
1. Duplicate IDs, missing values, invalid rows: DONE. Near-duplicate points, RL spikes, outliers and gross-error flags: TODO.
2. Traverse closure and Bowditch: DONE. Angular misclosure, transit rule, least-squares network adjustment with residuals: TODO.
3. Leveling field book and closing error: DONE. Leveling adjustment: TODO.
4. Control point manager (known/fixed points, accuracy class), raw vs processed data kept separate: PARTLY.
5. One-page data audit report for each import: TODO.

## Stage 3: Automatic drafting (the draftsman's work)
1. Feature-code rules, point blocks, strings for road centreline, road edge, river, canal, drain, embankment, boundary, building, chainage labels: DONE.
2. Rule sets that can be saved, shared and loaded per client or project standard; layer colours, linetypes (dashed, centreline), text styles, hatches, a larger symbol library: PARTLY (rules are editable text; no linetypes or hatches).
3. Smarter linework: curves from 3-point codes, closing and joining rules, trim, extend, fillet, intersection clean-up, centreline from two surveyed edges only as a clearly marked suggestion: TODO.
4. Automatic annotation: bearing and distance on boundary lines, area labels, spot-level placement without overlaps, contour labels along the line, leader lines, coordinate schedules: TODO.
5. Alignment with arcs, chainage, setting-out tables, offsets: DONE (no spirals). Spirals and vertical curves: TODO.
6. Window select, move, copy, rotate, offset: DONE. Mirror, array, trim, extend, snap to intersection and perpendicular: TODO.

## Stage 4: Surfaces and engineering outputs
1. TIN with breaklines and boundary, contours, spot levels, elevation colours, profile, cross-sections: DONE.
2. Design levels, cut/fill by average end area with a simple template: DONE. Surface-to-surface volumes, mass-haul diagram, superelevation, vertical curves, corridor templates, drainage and pipe longitudinal sections, catchment and flow direction: TODO.
3. Water-supply asset model (pipes, valves, chambers, hydrants, DMA boundaries) with attributes and schedules: TODO (layers and symbols exist, no attributes).

## Stage 5: Output (drawing production)
1. One drawing sheet (A4 to A1), title block, north arrow, scale bar, legend, print/PDF/SVG/PNG: DONE.
2. Several sheets and viewports on one project, plan-and-profile sheets, cross-section sheets, templates, batch export: TODO.
3. DXF with arcs (bulge), linetypes, text styles, native dimensions, attributes on blocks: PARTLY. LandXML and Shapefile export, GeoJSON reprojected to longitude/latitude: TODO. DWG needs an external converter and cannot be done in the browser alone.

## Stage 6: Platform and quality
- Large data speed (background workers, spatial index), multi-project storage, installable offline app (PWA), keyboard and touch use, user manual and sample jobs: TODO.
- Show/hide panels (toolbar, left, right, log, focus mode): DONE.

## Suggested order
Stage 0, then DXF import, then instrument file readers plus observation reduction and CRS transformation, then rule-set library with smarter linework and annotation, then multi-sheet production and LandXML/Shapefile, then point clouds/DEM and network adjustment.
