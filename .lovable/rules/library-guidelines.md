# Scout Hub — Guidelines

## Components

The design system exports these components — import them from `@ws-36e91b308731a72ee9a6/963f4a57-03a9-403a-ba3f-b2413d9a58a6` and compose them before building anything from scratch:

`AppShell`, `AuthProvider`, `BudgetsAdmin`, `ChangeLogAdmin`, `CommandDialog`, `CommandEmpty`, `CommandGroup`, `CommandInput`, `CommandItem`, `CommandList`, `CommandSeparator`, `CommandShortcut`, `Command`, `Constants`, `DialogClose`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogOverlay`, `DialogPortal`, `DialogTitle`, `DialogTrigger`, `Dialog`, `GroupHeader`, `HistoryList`, `ImageCropDialog`, `LectureLibraryAdmin`, `PatrolCompetition`, `PlanningAdmin`, `PublicNav`, `QRScanner`, `ReportsCenter`, `TopBar`, `TreasuryAdmin`, `UnifiedAttendanceAdmin`, `UnlinkLeadersCard`

Per-component details (import stanzas, props, variants, examples) live in `.lovable/rules/libraries/{slug}/components.md` — on disk, not auto-loaded. Read that file or the component source when the name alone isn't enough.

## Theme Files

The design system's theme is delivered through the following files. The author's original source files carry the full wiring the design system needs — variable declarations, framework-specific directives, provider objects, etc. — and are the canonical import target.

- `@ws-36e91b308731a72ee9a6/963f4a57-03a9-403a-ba3f-b2413d9a58a6/styles.css` (source — preferred import)
- `@ws-36e91b308731a72ee9a6/963f4a57-03a9-403a-ba3f-b2413d9a58a6/dist/tokens.css` (auto-generated flat list of CSS custom properties — a raw-values fallback only; does NOT carry framework-specific wiring that the source files above provide)

