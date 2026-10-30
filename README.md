# EVLab SurveyCAD — Milestone 3 complete (Engineering Visual Lab)
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
Limits: DXF output not verified in AutoCAD/Civil 3D (only structure-tested); no DXF import; no move/copy/rotate/offset, window select, intersection snap or layer editing for CAD objects; undo does not cover description edits.

## Auto features (feature-code automation)
Toolbar **Auto features…**: reads each point's code and (1) draws point blocks (symbols: tree, pole, manhole, valve, hydrant, benchmark, control, culvert…), (2) joins coded points into polylines/polygons: road centreline (CL), road edges (RE, RE-L, RE-R), river bank (RV), canal bank (CN), drain (DR), embankment top/toe, fence, boundary, building, (3) puts chainage ticks and labels (0+020 style) on lines flagged for chainage, (4) lists warnings: unknown codes, one-point strings, duplicate vertices.
Rules are editable text and are saved in the project. String number follows the code (CL1, RE-L2); END or CLOSE ends/closes a string. Points join in ascending numeric Point ID (file order if IDs are not numeric). Re-running replaces only auto-generated objects; hand-drawn ones stay. Import has a column-order preset P,N,E,Z,D for total-station/GNSS exports.
DXF export now writes real BLOCK definitions + INSERT for each symbol, layers from rules (with colours), point numbers (PT-NO) and RL text (PT-RL), closed polylines.
Limits: raw instrument files (Leica GSI, Trimble JOB/DC, Topcon GTS) are not read, only text exports; no automatic centreline from two edges and no edge from centreline offset (nothing is invented); no curve fitting or smoothing; no cross-line intersection cleanup; chainage is along the drawn polyline (horizontal).

## Drawing sheets (toolbar: Sheet…)
Sheet sizes A4, A3, A2, A1, portrait or landscape. Scale = Fit (smallest standard scale that fits) or a chosen 1:N; paper mm = model units x (1000 or 304.8 for feet) / N. The sheet has a frame, coordinate grid ticks and labels, north arrow (grid north, not true north), scale bar, legend (drawing layers and point symbols in use), title block (title, project, drawing number, revision, scale, date, units/CRS) and a not-legally-verified note. Title, number, revision and settings are saved with the project.
Outputs: print preview in the dialog, Print / Save PDF (browser print dialog, choose "Save as PDF"), SVG download, PNG download at 96/150/300 dpi (capped at 8000 px on the long side).
Limits: one sheet per project (no multiple sheets or sheet views yet); the whole drawing is placed on the sheet (no cropping window); no rotated sheet view; legend is automatic; title-block layout is fixed; PNG of the on-screen canvas view is not provided, only PNG of the sheet.

## Not implemented yet
Menus beyond the toolbar, TIN/contours, profiles, DXF import, CRS transformation (CRS is a label only), coordinate editing, bulk edit. Changing Units only relabels; it does not convert values.

## Tests
`node tests/geometry.test.js` and `node tests/calc.test.js` and `node tests/export.test.js` and `node tests/feature.test.js` and `node tests/sheet.test.js` (needs Node only for developers; not needed to run the app).
