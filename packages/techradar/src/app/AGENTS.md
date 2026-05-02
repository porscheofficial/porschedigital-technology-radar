# `src/app/` — App Router (sitemap only)

This directory is **intentionally minimal**. The project uses the Pages Router for routes; App Router is hybrid-enabled for one purpose: sitemap generation.

## Rules

- **The only route file allowed here is `sitemap.ts`.** No `page.tsx`, no `layout.tsx`, no `route.ts`. Adding any of these breaks the static-export contract and creates a parallel routing surface.
- Test files under `__tests__/` are allowed.

(Checked: `.dependency-cruiser.cjs` → `app-router-only-sitemap`, plus `architecture.test.ts` → `app-router-only-sitemap`.)

## Shape

```ts
// src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { getItems } from "@/lib/data";

export default function sitemap(): MetadataRoute.Sitemap {
  return [/* ... */];
}
```

## Why

Next.js permits Pages and App Router to coexist. Keeping App Router scoped to `sitemap.ts` lets us use the App-only `MetadataRoute.Sitemap` API without fragmenting the routing model. If you need a new route, add it under `src/pages/` instead.
