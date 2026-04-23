# adhd-shared

Shared packages for the ADHDesigns app ecosystem. Each app (Cha(t)os, ControlledChaos, ChaosPatch, ChaosLimbă, ChaosLengua, Personal Context MCP, etc.) depends on these to keep UI themes, MCP server patterns, and Clerk+Neon plumbing consistent.

## Which package do I want?

| Package | What it does |
| --- | --- |
| [`@adhdesigns/ui`](./packages/ui) | Tailwind v4 + shadcn semantic-token themes (`brand.css`, `lab-notebook.css`). |
| [`@adhdesigns/mcp-kit`](./packages/mcp-kit) | Toolkit for building MCP servers on `@modelcontextprotocol/sdk` — tool definitions, HTTP/stdio transports, auth context, response formatters. |
| [`@adhdesigns/clerk`](./packages/clerk) | Clerk helpers for Next.js + Neon apps — middleware wrapper, JWT verification (including a Verifier shaped for mcp-kit), server-component helpers, and `syncClerkUserToNeon`. |

See each package's README for install, usage, and gotchas.

## Workspace layout

```
adhd-shared/
├── packages/
│   ├── ui/         # CSS-only, no build step
│   ├── mcp-kit/    # tsc build
│   └── clerk/      # tsc build
├── package.json
└── pnpm-workspace.yaml
```

- **pnpm** 10.17+ (workspace manager)
- **Node** 20+
- **TypeScript** 5.5+

## Dev workflow

```bash
pnpm install

pnpm -r build           # build every package
pnpm -r typecheck       # typecheck every package (tsc --noEmit)
pnpm -r clean           # remove dist/ from every package

# per-package
pnpm --filter @adhdesigns/mcp-kit smoke    # build + runtime smoke
pnpm --filter @adhdesigns/clerk smoke
pnpm --filter @adhdesigns/mcp-kit typecheck:examples
pnpm --filter @adhdesigns/clerk typecheck:examples
```

The `examples/` directories in `mcp-kit` and `clerk` hold compile-time smoke tests (`smoke-test.ts`) and a small runtime smoke (`runtime-smoke.mjs`) that exercise the public API so drift is caught here instead of in a consumer app.

## Publishing

Packages are `publishConfig.access: "restricted"` — not published to npm yet. Consumers depend via `workspace:*` inside the monorepo, or via git dep pointing at this repo.

Root scripts for when we do publish:

```bash
pnpm run ui:publish
pnpm run mcp-kit:publish
pnpm run clerk:publish
```

## Versioning

Each package is versioned independently. Root `package.json` stays at `0.0.0` — the working-tree version tags in git (`v0.3.0: add @adhdesigns/clerk package`) track the overall rollout.

## Contributing

- Match existing code style — arrow functions, explicit return types on exports, no silent error swallowing.
- Every change must pass `pnpm -r build` and `pnpm -r typecheck` before commit.
- Run the smoke tests for any package you touched.
- Commit format: `vX.Y.Z: brief description` (imperative mood). Bump the package's own version when its API changes.
