# `src/hooks/` — React Hooks

Custom React hooks for the TechRadar UI.

## Modules

| File | Role |
| --- | --- |
| `useKeyboardShortcut.ts` | Keyboard shortcut binding. |
| `useRadarTooltip.ts` | Manages tooltip positioning, visibility, and RAF-based animation. Shared between Radar and SegmentRadar. |
| `useSpotlightActions.ts` | Spotlight/search actions management. |

## Rules

- **Client-only:** These hooks are used in client components (`"use client"`).
- **Pure logic:** Hooks manage state and side effects, not DOM elements directly, though they may return refs.
- **Single responsibility:** Each hook focuses on one specific interaction pattern or data flow.

## Type Cast Exemptions

- **Test Doubles:** While type casting (`as any`, `as unknown as T`) is banned in production code, using `as unknown as T` is explicitly **permitted in test files** (`__tests__/`) for constructing mock, stub, or spy objects. The ESLint config deliberately exempts test files from the no-cast rule to simplify test setup without requiring exhaustive type coverage on partial mock objects.

## Tests

Tests live in the `__tests__/` subfolder alongside the hooks (`src/hooks/__tests__/{name}.test.ts`).
