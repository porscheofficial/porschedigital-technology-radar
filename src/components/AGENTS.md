# `src/components/` — React Components

## Folder shape (mandatory)

Every component lives in its own folder:

```
ComponentName/
  ComponentName.tsx
  ComponentName.module.scss
  __tests__/
    ComponentName.test.tsx
```

(Checked: `architecture.test.ts` → `component-folder-shape`. The auto-generated `Icons/` folder is exempt.)

## Rules

- **SCSS Modules only.** No CSS-in-JS (`styled-components`, `@emotion`). (Checked: `.dependency-cruiser.cjs` → `no-css-in-js`.)
- **Class names via `cn()`** from `@/lib/utils` (clsx wrapper), not template-string concatenation.
- **Prefer Porsche Design System** (`@porsche-design-system/components-react`) primitives where applicable. PDS web components render as their tag names in jsdom (e.g., `<p-heading>`) — assert against tag names in tests.
- **`dangerouslySetInnerHTML` is FORBIDDEN** outside of `SafeHtml/SafeHtml.tsx`. All untrusted/markdown HTML must flow through `<SafeHtml html={...} />`. (Checked: `eslint.config.mjs` → `no-restricted-syntax` for `JSXAttribute[name.name="dangerouslySetInnerHTML"]`. SafeHtml.tsx is the sole exemption.)
- **All `href` and `src` literals starting with `/` MUST go through `assetUrl()`** from `@/lib/utils`, **EXCEPT** for `<Link>` (next/link) hrefs and `useRouter().push()` targets. Next.js auto-prepends `basePath` to those, so wrapping with `assetUrl()` would double the prefix in production. Use bare paths inside `<Link>` (`href="/foo"` or `href={`/${id}`}`); use `assetUrl()` for raw `<a>`, `<img>`, PDS components (`PCrest`, `PLinkPure`, `PLinkTile`), and any other non-Next-aware element. (Checked: `eslint.config.mjs` — `no-restricted-syntax` exempts `<Link>` and additionally forbids `assetUrl()` calls inside `<Link>` href to prevent regression.)
- **No `next/image`** — static export + user-provided URLs. Use plain `<img>`. (Checked: `.dependency-cruiser.cjs` → `no-next-image`.)
- **No `as any`, `@ts-ignore`, `@ts-expect-error`.** Use `unknown` and narrow. (Checked: `eslint.config.mjs`.)

## Imports

- Use the `@/*` path alias, never deep relative paths like `../../../lib/...`. (Checked: `.dependency-cruiser.cjs` → `no-deep-relative-imports` (warn).)
- Auto-generated icons live in `Icons/` — never edit by hand. Run `npm run build:icons` to rebuild from `src/icons/`.

## Anatomy

```tsx
import { cn } from "@/lib/utils";
import styles from "./MyThing.module.scss";

type Props = { label: string; active?: boolean };

export function MyThing({ label, active }: Props) {
  return <div className={cn(styles.root, active && styles.active)}>{label}</div>;
}
```
