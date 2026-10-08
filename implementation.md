GT7 Driver Decal Generator

1. Goal

Build a modern web application for generating Gran Turismo 7-compatible driver decals from:

* Country flag
* Driver name
* Name format
* Vector font
* Layout/composition

The application must generate the final decal as an SVG, validate its UTF-8 size against GT7’s 15 KB limit, and allow the user to download the resulting file.

The first implementation will use the latest available Angular, but the application must be structured so the core decal engine can later be reused by:

* React
* Vue
* Vanilla Web App
* PWA
* Potentially a native desktop/mobile application

The UI should have a polished GT7-inspired motorsport aesthetic, without directly copying Gran Turismo assets.

⸻

2. Architecture

Use a layered architecture:

┌──────────────────────────────────────────────┐
│                  Angular UI                  │
│                                              │
│ Components / Pages / Forms / Preview         │
└───────────────────────┬──────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────┐
│                Application Layer             │
│                                              │
│ DecalGenerator                               │
│ NameFormatter                                │
│ DecalConfiguration                           │
└───────────────────────┬──────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────┐
│                    Core                      │
│                                              │
│ FlagService                                  │
│ FontService                                  │
│ DecalComposer                                │
│ SvgRenderer                                  │
│ SvgOptimizer                                 │
│ SizeValidator                                │
└───────────────────────┬──────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────┐
│                    Assets                    │
│                                              │
│ Flags                                        │
│ Fonts                                        │
│ Layout definitions                            │
└──────────────────────────────────────────────┘

The Core layer must not depend on Angular.

⸻

3. Technology Stack

Frontend

* Latest stable Angular
* TypeScript
* Angular Signals for UI state
* Standalone components
* Angular Router
* Reactive Forms
* CSS / SCSS
* SVG for preview rendering

Avoid coupling the business logic to Angular services.

Build

Use the standard Angular CLI/build system.

Suggested project:

gt7-decal-generator/

⸻

4. Project Structure

Prefer a structure that clearly separates Angular from the decal engine.

src/
├── app/
│
│   ├── features/
│   │   └── decal-generator/
│   │       ├── components/
│   │       │   ├── decal-editor/
│   │       │   ├── country-selector/
│   │       │   ├── name-editor/
│   │       │   ├── font-selector/
│   │       │   ├── layout-selector/
│   │       │   ├── decal-preview/
│   │       │   └── decal-size-indicator/
│   │       │
│   │       └── decal-generator-page.ts
│   │
│   ├── shared/
│   │   ├── components/
│   │   └── pipes/
│   │
│   └── app.routes.ts
│
├── core/
│   ├── flags/
│   │   ├── flag.ts
│   │   ├── flag-service.ts
│   │   └── flag-repository.ts
│   │
│   ├── fonts/
│   │   ├── font.ts
│   │   ├── glyph.ts
│   │   ├── font-service.ts
│   │   ├── font-loader.ts
│   │   └── font-importer.ts
│   │
│   ├── composition/
│   │   ├── decal-composer.ts
│   │   ├── decal-layout.ts
│   │   └── layouts/
│   │
│   ├── svg/
│   │   ├── svg-renderer.ts
│   │   ├── svg-optimizer.ts
│   │   └── svg-size-validator.ts
│   │
│   ├── names/
│   │   └── name-formatter.ts
│   │
│   └── decal/
│       ├── decal-generator.ts
│       └── decal.ts
│
└── assets/
    ├── flags/
    └── fonts/

⸻

5. Flag Service

Create a framework-independent flag abstraction.

interface Flag {
  countryCode: string;
  name: string;
  width: number;
  height: number;
  elements: SvgElement[];
}

Service:

interface FlagService {
  get(countryCode: string): Flag;
  getAll(): Flag[];
}

Example:

const flag = flagService.get('BR');

Requirements

The flag library should initially contain all supported countries.

Flags should be:

* Vector
* Pre-optimized
* Stored locally
* Simple enough to keep generated decals small
* Independent of Angular

Do not embed raster images.

⸻

6. Font Service

The font service converts text into reusable vector glyphs.

interface Glyph {
  character: string;
  path: string;
  width: number;
  height: number;
  advanceWidth: number;
  x: number;
  y: number;
}

A generated text result:

interface GlyphRun {
  text: string;
  glyphs: Glyph[];
  width: number;
  height: number;
}

Service:

interface FontService {
  getFonts(): FontDefinition[];
  generate(
    text: string,
    font: FontDefinition
  ): GlyphRun;
}

⸻

7. Font Library

Fonts should be data-driven.

Example:

assets/fonts/
├── motorsport/
│   ├── font.json
│   └── metadata.json
│
├── gt-style/
│   ├── font.json
│   └── metadata.json
│
└── square/
    ├── font.json
    └── metadata.json

A font definition:

interface FontDefinition {
  id: string;
  name: string;
  unitsPerEm: number;
  ascender: number;
  descender: number;
  glyphs: Record<string, GlyphDefinition>;
  kerning?: Record<string, number>;
}

Adding a new built-in font should require no changes to the rendering engine.

The intended workflow is:

TTF / OTF
   ↓
Font conversion tool
   ↓
Glyph paths
   ↓
Optimization
   ↓
font.json
   ↓
Add to assets/fonts/

⸻

8. User Font Import

Implement this as a second-phase feature.

The user should be able to upload:

.ttf
.otf

The browser processes the font locally.

User Font
   ↓
Font Parser
   ↓
Glyph Outlines
   ↓
Internal FontDefinition
   ↓
FontService

No font needs to be uploaded to a server.

This keeps the application privacy-friendly and makes the SPA fully client-side.

The imported font does not become part of the final SVG.

Only the required glyph paths are included.

⸻

9. Name Formatting

Create a dedicated name formatter.

type NameMode =
  | 'initial'
  | 'full'
  | 'initial-last'
  | 'last';

Example:

format(
  'Guilherme Manucci',
  'initial'
);
// G
format(
  'Guilherme Manucci',
  'full'
);
// GUILHERME MANUCCI
format(
  'Guilherme Manucci',
  'initial-last'
);
// G MANUCCI
format(
  'Guilherme Manucci',
  'last'
);
// MANUCCI

The formatter should be independent of fonts and layouts.

⸻

10. Decal Composer

The composer combines:

* Flag
* GlyphRun
* Dimensions
* Layout
* Spacing
* Alignment

interface DecalComposition {
  flag?: Flag;
  glyphs: GlyphRun;
  width: number;
  height: number;
  gap: number;
  alignment: 'left' | 'center' | 'right';
}

Service:

interface DecalComposer {
  compose(
    input: DecalComposition
  ): ComposedDecal;
}

⸻

11. Layout System

Layouts should be extensible.

Initial layouts:

Horizontal
Vertical
Flag + Text
Text + Flag
Flag Above Text

Eventually:

Flag + Initial
Flag + Number + Name
Initial + Last Name
Number + Name + Flag

Represent layouts independently from the UI.

Example:

interface DecalLayout {
  id: string;
  name: string;
  compose(input: LayoutInput): ComposedDecal;
}

This means adding a layout does not require modifying the core generator.

⸻

12. SVG Renderer

The composer should produce a geometry/composition model.

The renderer converts that model to SVG.

interface SvgRenderer {
  render(decal: ComposedDecal): string;
}

Example output:

<svg viewBox="0 0 500 120">
  ...
</svg>

The renderer should:

* Use paths instead of text
* Use vector geometry
* Avoid embedded fonts
* Avoid raster images
* Use <defs> and <use> where beneficial
* Remove unnecessary metadata
* Keep coordinates compact

⸻

13. SVG Optimization

Add an optimization stage:

Composition
     ↓
SVG Renderer
     ↓
SVG Optimizer
     ↓
UTF-8 byte count

Optimization should include:

* Remove unnecessary attributes
* Remove metadata
* Remove whitespace
* Reduce coordinate precision
* Simplify paths
* Reuse repeated geometry where practical
* Remove unnecessary groups
* Minify SVG

The final size must be calculated using:

const bytes =
  new TextEncoder().encode(svg).length;

Do not use JavaScript string .length as the file-size calculation.

⸻

14. GT7 Size Validation

GT7’s maximum should be treated as:

const GT7_MAX_BYTES = 15 * 1024;

Use an internal safety target:

const TARGET_BYTES = 12 * 1024;

UI:

8.4 KB / 15 KB
████████░░░░░░░░
GT7 READY ✓

States:

Safe

< 12 KB
GT7 READY

Warning

12–15 KB
GT7 COMPATIBLE — LOW MARGIN

Invalid

> 15 KB
DECAL TOO LARGE

The download button should be disabled when the SVG exceeds the limit.

⸻

15. Main User Experience

The main page should be a single decal studio.

Suggested layout:

┌───────────────────────────────────────────────────────┐
│  GT7 DECAL STUDIO                                     │
├───────────────────────────┬───────────────────────────┤
│                           │                           │
│  DRIVER                   │                           │
│                           │                           │
│  Country                  │                           │
│  [ 🇧🇷 Brazil          ▼ ]│                           │
│                           │       DECAL PREVIEW       │
│  Name                     │                           │
│  [ Guilherme Manucci   ]  │                           │
│                           │       🇧🇷 G MANUCCI       │
│  Format                   │                           │
│  [ Initial + Last      ▼ ]│                           │
│                           │                           │
│  Font                     │                           │
│  [ Motorsport         ▼ ] │                           │
│                           │                           │
│  Layout                   │                           │
│  [ Flag + Name        ▼ ] │                           │
│                           │                           │
│  [ Advanced Options ]     │                           │
│                           │                           │
├───────────────────────────┴───────────────────────────┤
│  SVG SIZE: 8.4 KB / 15 KB                 ✓ READY     │
│                                                       │
│                    [ DOWNLOAD SVG ]                   │
└───────────────────────────────────────────────────────┘

⸻

16. GT7-Inspired Visual Design

The design should feel like a modern motorsport telemetry/configuration interface.

Use:

* Dark background
* Strong contrast
* White typography
* Red/orange accent
* Thin borders
* Technical labels
* Compact controls
* Large decal preview
* Motorsport-inspired typography
* Subtle grid/track-line elements

Avoid directly copying Gran Turismo logos, icons, or copyrighted UI assets.

The application should feel like:

Motorsport
+
Telemetry
+
Garage
+
Modern racing game UI

rather than simply looking like a generic form.

⸻

17. Responsive Design

Desktop:

Controls | Preview

Mobile:

Preview
────────
Country
Name
Format
Font
Layout
────────
Download

The preview should always remain prominent.

The application should work well on:

* Desktop
* Tablet
* iPhone
* Android

⸻

18. Angular State

Use Signals for the editor state.

Conceptually:

const country = signal('BR');
const name = signal('Guilherme Manucci');
const nameMode =
  signal<NameMode>('initial-last');
const selectedFont =
  signal('motorsport');
const selectedLayout =
  signal('horizontal');

Then derive:

const formattedName = computed(() =>
  nameFormatter.format(
    name(),
    nameMode()
  )
);

and:

const decal = computed(() =>
  decalGenerator.generate({
    country: country(),
    text: formattedName(),
    font: selectedFont(),
    layout: selectedLayout()
  })
);

The preview becomes a pure consequence of application state.

⸻

19. DecalGenerator Facade

Expose one high-level API to the Angular application.

interface DecalGenerator {
  generate(
    request: DecalRequest
  ): GeneratedDecal;
}

Example:

const result =
  decalGenerator.generate({
    country: 'BR',
    name: 'Guilherme Manucci',
    nameMode: 'initial-last',
    font: 'motorsport',
    layout: 'horizontal'
  });

Result:

interface GeneratedDecal {
  svg: string;
  width: number;
  height: number;
  sizeBytes: number;
  valid: boolean;
}

Angular should ideally know only about this facade.

This is what makes the application easy to port later.

⸻

20. Testing Strategy

The core engine should have extensive unit tests.

Flag tests

get('BR') → Brazil flag
get('JP') → Japan flag
unknown country → error

Font tests

"A" → glyph
"ABC" → three glyphs
repeated characters → correct positioning

Name tests

Guilherme Manucci → G
Guilherme Manucci → GUILHERME MANUCCI
Guilherme Manucci → G MANUCCI
Guilherme Manucci → MANUCCI

Composition tests

Verify:

* dimensions
* spacing
* alignment
* flag positioning
* glyph positioning

SVG tests

Verify:

* valid SVG
* no <text>
* no embedded fonts
* no raster images
* deterministic output

GT7 tests

Every built-in combination should have:

size <= 15 KB

Ideally:

size <= 12 KB

⸻

21. Deterministic Generation

The same configuration should always generate the same SVG.

For:

Brazil
G MANUCCI
Motorsport Font
Horizontal Layout

the resulting SVG should be deterministic.

This makes testing and future caching easier.

⸻

22. Future API

Although the MVP should be entirely client-side, keep the domain API compatible with a future backend.

Possible future endpoint:

POST /api/decals

Request:

{
  "country": "BR",
  "name": "Guilherme Manucci",
  "nameMode": "initial-last",
  "font": "motorsport",
  "layout": "horizontal"
}

Response:

{
  "svg": "...",
  "sizeBytes": 8421,
  "valid": true
}

But do not build the backend initially.

The SPA should work offline after loading.

⸻

23. PWA

After the initial version works, turn the application into a PWA.

Cache:

* Flag library
* Font library
* Application shell
* Built-in layouts

Then the user can generate decals even without an internet connection.

⸻

24. Future Features

Possible future extensions:

Driver Profiles

Save:

Guilherme Manucci
🇧🇷
Preferred font
Preferred layout

Presets

GT7 Classic
Motorsport
Minimal
Driver Number
Country + Name

Driver Number

🇧🇷
99
G MANUCCI

Color customization

Allow:

* Text color
* Flag treatment
* Outline
* Shadow
* Background

while keeping the SVG within the size limit.

Decal transformations

* Scale
* Rotation
* Letter spacing
* Line spacing
* Flag size
* Flag/text gap

Community Fonts

Eventually allow a curated font library.

⸻

25. Implementation Phases

Phase 1 — Core

Build:

* FlagService
* FontService
* NameFormatter
* DecalComposer
* SvgRenderer
* SvgOptimizer
* SvgSizeValidator
* DecalGenerator

No Angular-specific code.

⸻

Phase 2 — Assets

Add:

* Country flags
* First 2–3 fonts
* Glyph conversion pipeline
* Asset validation

Create a build-time script that validates all assets.

⸻

Phase 3 — Angular UI

Build:

* Editor
* Country selector
* Name input
* Name mode selector
* Font selector
* Layout selector
* Preview
* Size indicator
* Download button

⸻

Phase 4 — Visual Polish

Implement the GT7-inspired design:

* Dark racing UI
* Responsive layout
* Animations
* Preview transitions
* Technical indicators
* Better typography

⸻

Phase 5 — Font Import

Add:

Upload TTF / OTF
        ↓
Parse
        ↓
Generate glyphs
        ↓
Generate decal

All locally in the browser.

⸻

Phase 6 — PWA

Add:

* Offline support
* Asset caching
* Installable application
* Mobile optimization

⸻

26. Definition of Done

The MVP is complete when a user can:

1. Open the application.
2. Select a country.
3. Enter their name.
4. Choose:
    * Initial
    * Full name
    * Initial + last name
    * Last name
5. Select a vector font.
6. Select a layout.
7. See the decal rendered instantly.
8. See the exact SVG size.
9. Receive a clear GT7 compatibility indicator.
10. Download the SVG.
11. Import the SVG into GT7’s decal system.
12. Use the decal on their car.

The generated SVG must never be downloadable when it exceeds the configured GT7 size limit.

⸻

27. Long-Term Architecture

The final conceptual architecture should remain:

                  ┌─────────────────────┐
                  │   Angular / React   │
                  │         UI          │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │  DecalGenerator     │
                  └──────────┬──────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
      FlagService       FontService      NameFormatter
            │                │
            ▼                ▼
       Flag Geometry      Glyph Geometry
            │                │
            └────────┬───────┘
                     ▼
              DecalComposer
                     │
                     ▼
                SvgRenderer
                     │
                     ▼
               SvgOptimizer
                     │
                     ▼
              SizeValidator
                     │
             ┌───────┴───────┐
             ▼               ▼
          ≤ 15 KB          > 15 KB
             │               │
          Download         Reject

The key architectural principle is:

Angular is the UI. The decal engine is a standalone TypeScript library.

That gives us the freedom to replace Angular later without rewriting the actual GT7 decal generation logic.