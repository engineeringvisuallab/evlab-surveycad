# EVLab SurveyCAD — Milestone 6 (Engineering Visual Lab)
Browser survey CAD for GitHub Pages. No server, Node, API key or account needed.

## Publish (GitHub Pages)
1. github.com → New repository → name `evlab-surveycad` → Public → Create.
2. Add file → Upload files → drag ALL files/folders from this project (index.html at the top level) → Commit.
3. Settings → Pages → Source: Deploy from a branch → Branch `main`, folder `/ (root)` → Save.
4. Wait ~1 min, open https://engineeringvisuallab.github.io/evlab-surveycad/ (replace owner if different).
5. To update: upload changed files with the same names (Add file → Upload files) and commit; hard-refresh (Ctrl+F5).
Locally, ES modules need a web server (double-clicking index.html will not work); Pages works as-is.

## Working in Milestone 1
CSV/TSV/TXT import with delimiter choice, header toggle, column mapping and preview; rejected rows and warnings are listed, never silently accepted. Duplicate IDs flagged red. Point table (search, sort), canvas (pan = drag, zoom = wheel, click select, Fit / key F), layers = feature codes (visibility), editable description/quality note, project name/units/CRS label/notes, save to IndexedDB (autosave + Ctrl+S + Recover last), JSON export/open, light/dark theme, cursor coordinates, units/CRS/scale in status bar.
Conventions: X=Easting, Y=Northing; azimuth clockwise from grid North, degrees (`src/core/geometry.js`, tested).

## Added in Milestone 2 (toolbar: Calculations…)
Inverse (distance, azimuth, quadrant bearing, dE/dN, slope distance, gradient), forward polar, boundary area/perimeter (shoelace), leveling (HI and Rise&Fall arithmetic checks, closing error), traverse closure + Bowditch adjustment with relative precision. Each shows its formula; results download as HTML or print to PDF. Input is typed one line per record; samples are pre-filled.
Limits: no angular misclosure, no transit rule, no leveling adjustment (closing error only), open traverse needs a known end point, results are not stored in the project, no CSV report export yet.

## Added in Milestone 3
CAD tools: Line, Polyline (double-click/Enter to finish), Text, distance Dim; snapping to survey points, vertices and midpoints (orange marker); select/delete CAD objects; Undo/Redo (Ctrl+Z/Y) for CAD objects and imports. Entities save with the project. Export: CSV points, GeoJSON (grid E/N, NOT lon/lat), DXF (POINT, LINE, LWPOLYLINE, TEXT; dimensions exported as LINE+TEXT, no native DIMENSION), SVG.
Limits: DXF output not verified in AutoCAD/Civil 3D (only structure-tested); no DXF import; no intersection snap or layer editing for CAD objects; undo does not cover description edits.

## Auto features (feature-code automation)
Toolbar **Auto features…**: reads each point's code and (1) draws point blocks (symbols: tree, pole, manhole, valve, hydrant, benchmark, control, culvert…), (2) joins coded points into polylines/polygons: road centreline (CL), road edges (RE, RE-L, RE-R), river bank (RV), canal bank (CN), drain (DR), embankment top/toe, fence, boundary, building, (3) puts chainage ticks and labels (0+020 style) on lines flagged for chainage, (4) lists warnings: unknown codes, one-point strings, duplicate vertices.
Rules are editable text and are saved in the project. String number follows the code (CL1, RE-L2); END or CLOSE ends/closes a string. Points join in ascending numeric Point ID (file order if IDs are not numeric). Re-running replaces only auto-generated objects; hand-drawn ones stay. Import has a column-order preset P,N,E,Z,D for total-station/GNSS exports.
DXF export now writes real BLOCK definitions + INSERT for each symbol, layers from rules (with colours), point numbers (PT-NO) and RL text (PT-RL), closed polylines.
Limits: raw instrument files (Leica GSI, Trimble JOB/DC, Topcon GTS) are not read, only text exports; no automatic centreline from two edges and no edge from centreline offset (nothing is invented); no curve fitting or smoothing; no cross-line intersection cleanup; chainage is along the drawn polyline (horizontal).

## Drawing sheets (toolbar: Sheet…)
Sheet sizes A4, A3, A2, A1, portrait or landscape. Scale = Fit (smallest standard scale that fits) or a chosen 1:N; paper mm = model units x (1000 or 304.8 for feet) / N. The sheet has a frame, coordinate grid ticks and labels, north arrow (grid north, not true north), scale bar, legend (drawing layers and point symbols in use), title block (title, project, drawing number, revision, scale, date, units/CRS) and a not-legally-verified note. Title, number, revision and settings are saved with the project.
Outputs: print preview in the dialog, Print / Save PDF (browser print dialog, choose "Save as PDF"), SVG download, PNG download at 96/150/300 dpi (capped at 8000 px on the long side).
Limits: one sheet per project (no multiple sheets or sheet views yet); the whole drawing is placed on the sheet (no cropping window); no rotated sheet view; legend is automatic; title-block layout is fixed; PNG of the on-screen canvas view is not provided, only PNG of the sheet.

## Surface, contours, profile, cross-sections (toolbar: Surface…)
TIN: Delaunay triangulation (Bowyer-Watson, own implementation, tested for the empty-circle property) from points with RL. Codes in the "exclude" list (trees, poles, buildings...) are not used as ground. Duplicate XY points are ignored with a warning; fewer than 3 points or collinear data give an error. Optional boundary (a closed polyline) and maximum triangle edge length remove triangles that span gaps or lie outside; without either, the TIN edge follows the convex hull and a warning says so. Levels inside triangles are linear interpolation; nothing is extrapolated.
Contours: from the TIN at a chosen interval; major contours every N and optional labels; drawn on layers CONTOUR-MINOR / CONTOUR-MAJOR. Optional TIN edges (layer TIN) and spot-level text (SPOT-LEVEL). Regenerating replaces only surface-generated objects. Everything exports to DXF/SVG/sheets with the rest of the drawing.
Profile: pick an open polyline (e.g. the road centreline), interval and start chainage; table of chainage, E, N, RL, delta RL and gradient % plus a profile plot with independent horizontal and vertical scales. Cross-sections: left/right offsets (negative = left of travel direction, positive = right) at each station, plotted and exported as a station-wise CSV. All levels are labelled "interpolated (TIN)"; stations outside the TIN have no level.
Limits: the profile plot is a screen/report SVG, not yet placed on a drawing sheet; the O(n^2) triangulation is slow above a few thousand points.

## Milestone 5: breaklines, colouring, design levels, cut/fill
Breaklines: drawing polylines on the layers listed in "Breakline layers" (default ROAD-EDGE, RIVER-BANK, CANAL-BANK, EMB-TOP, EMB-TOE, DRAIN) are forced into the TIN as edges (edge flipping, Sloan method). A breakline vertex must be a surface point (same E,N); other surface points lying on a segment split it. Segments that cannot be enforced (crossing breaklines, outside the TIN) or whose vertex is not a surface point are skipped and reported. Triangle edges are not re-optimised to Delaunay after enforcement.
Elevation colouring: "colour by elevation" fills each triangle by mean RL class (2-12 classes, green to brown) on layer TIN-COLOUR; the class ranges are listed. Fills export to DXF (3DFACE), SVG and drawing sheets.
Design levels: type "chainage,RL" lines (metres). Levels are linear between the lines and there is no extrapolation outside them. The profile then shows the design line (blue dashed) and a "Ground - design" column (positive = cut, negative = fill).
Cut/fill volumes (Cut / fill volumes button): for each station the ground section is compared with a simple template: flat formation of the given width at design level, then cut and fill side slopes (H:1) that run to daylight. Volume = average end area between consecutive stations. Sections that leave the TIN, find no daylight within the max offset, or have no design level are skipped and flagged, never estimated.
Limits: no crossfall, superelevation, pavement layers, topsoil strip, drains or shrink/swell; average end area (no prismoidal correction); no surface-to-surface (TIN to TIN) volumes; no mass-haul; design levels are straight grades between your points (no vertical curves); cross-section plots do not show the design template.

## Milestone 6: alignment, setting-out, intersections, edit tools
**Alignment…**: enter PIs as `E,N,R` lines (R = circular curve radius). The tool builds tangents and fillet arcs (T = R tan(Δ/2), L = R·Δ), checks that tangents fit on each leg, and gives a setting-out table at your interval plus TC/CT points, with tangent azimuth, bearing and coordinates at chosen offsets (positive = right of the chainage direction, negative = left). "Draw alignment" adds the centreline with chainage ticks and TC/CT labels (layers ALIGNMENT, ALIGN-CH) and it can be chosen as the profile/cross-section alignment. "Locate points" gives chainage and offset for point IDs or typed E,N, flagging points beyond the alignment ends. CSV and HTML report downloads.
**Calculations…** now also has line-line and line-circle intersections (reports whether the point lies inside the segments).
**Edit tools:** Window select (drag a box; fully-inside objects; Shift+drag pans), Move (dE,dN), Copy, Rotate (degrees clockwise, optional centre), Offset (mitred, positive = right of drawing direction) and Delete work on the selection. Survey points are never moved. Auto-generated objects (features, surface, alignment) are skipped: regenerate them instead. All are undoable.
Limits: circular curves only (no spirals, compound curves need tangents that fit); no vertical curves; arcs are drawn and exported as polylines (no DXF bulge arcs); alignment chainage in the profile tool follows the drawn polyline, which differs from the true arc length by a few millimetres at most; no intersection snap; window select counts only objects fully inside the box; no trim, extend or fillet tools.

## Not implemented yet
Menus beyond the toolbar, TIN/contours, profiles, DXF import, CRS transformation (CRS is a label only), coordinate editing, bulk edit. Changing Units only relabels; it does not convert values.

## Tests
`node tests/geometry.test.js` and `node tests/calc.test.js` and `node tests/export.test.js` and `node tests/feature.test.js` and `node tests/sheet.test.js` and `node tests/surface.test.js` and `node tests/volume.test.js` and `node tests/alignment.test.js` (needs Node only for developers; not needed to run the app).
