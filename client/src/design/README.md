# 🏛️ BHARAT-OS: SOVEREIGN DESIGN GOVERNANCE SYSTEM

This directory is the **single source of truth** for all visual design decisions across the BharatOS commerce platform.

## Architecture

```
design/
├── tokens.ts          # 🎯 Central design tokens (spacing, radii, shadows, surfaces)
├── typography.ts      # 📝 Typography governance (semantic hierarchy)
├── spacing.ts         # 📐 Spacing scale + gap rhythm
├── motion.ts          # 🎬 Motion governance (durations, easings)
├── surfaces.ts        # 💎 Surface elevation rules
├── breakpoints.ts     # 📱 Responsive breakpoint system
├── grid.ts            # 🔲 Commerce grid governance
├── media.ts           # 🖼️ Media intelligence layer
├── accessibility.ts   # ♿ Accessibility hardening
└── index.ts           # 📦 Public API — re-exports all
```

## Rules

1. **NO random Tailwind drift** — All spacing/radius/typography must reference these tokens
2. **NO inline sizing chaos** — Use semantic tokens, not arbitrary values
3. **NO fragmented design decisions** — Modify tokens.ts, not individual components
4. **ALL components** must import from `@/design` for design decisions
