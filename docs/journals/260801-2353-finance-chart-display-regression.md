---
title: Finance chart display regression
date: 2026-08-01 23:53
status: resolved
component: frontend finance page
---

# Finance chart display regression

## Context

The finance page's "Top xe theo lợi nhuận" display was breaking under real data shape and real viewport pressure. The old SVG chart assumed a fixed 280px canvas, a 65-unit label column, and bar math that only looked correct until July's font increase and longer labels pushed it past the edge.

## What Happened

We shipped a chart that looked compact on paper and then fell apart when the finance page rendered it with actual truck names, mixed profit values, and narrow screens. The old implementation squeezed label, bar, and value into one hard-coded SVG layout. That worked only as long as the label width stayed obedient and the chart never had to admit that profits can go negative.

The fix moved the whole block out of the brittle SVG math and into a semantic row layout with separate cells for label, track, and value. The page root also needed an explicit finance-page scope so the chart-specific styles were actually isolated instead of relying on incidental inherited layout behavior.

## The Brutal Truth

This was a classic self-inflicted UI regression: we treated a financial visualization like a decorative SVG instead of a real data component. The result was cramped labels, fragile positioning, and a chart that lied by omission whenever the data or font size changed. It is annoying because the failure was predictable and avoidable.

## Technical Details

- The broken chart used hard-coded SVG geometry: `280` viewBox width, `65` label units, and bar positioning derived from that fixed canvas.
- A July font increase made the original 65-unit label column too small for full plate strings.
- The new implementation renders a `TopTruckProfitChart` with a `finance-top-trucks` row grid: label, track, and value are now separate cells.
- Negative profit now uses signed zero-axis behavior instead of collapsing everything into one direction.
- The finance page root now carries a dedicated `finance-page` class so the new chart styles are scoped and predictable.
- Verification covered `257` tests plus build, typecheck, and lint, and responsive checks at `320`, `375`, `390`, `768`, and `1440` widths with `8-10px` gaps and zero horizontal overflow.

## Root Cause Analysis

The root cause was twofold: we hard-coded layout math into an SVG that should have been driven by content flow, and we never scoped the finance-page styles tightly enough to keep the chart isolated from page-wide layout drift. The fixed `65`-unit column and the July font change exposed the same underlying mistake: the component depended on accidental fit instead of explicit layout rules.

## Decisions

- Replace the SVG bar chart with a semantic label/track/value grid.
- Preserve full plate strings and full VND values instead of truncating them to fit a canvas.
- Keep negative profit visibly signed and anchored to a shared zero axis.
- Scope the styling under the finance page root instead of letting the chart freeload on global page behavior.

## Verification Evidence

- `257` tests passed.
- Build, typecheck, and lint passed.
- Responsive checks passed at `320`, `375`, `390`, `768`, and `1440` widths.
- The chart held `8-10px` spacing and did not produce horizontal overflow.

## Lessons Learned

If the component has to explain real financial data, it does not get to pretend the canvas is fixed forever. Hard-coded chart geometry is a debt magnet, and font changes are enough to expose it. We should default to content-driven layout first, SVG second, and always assume narrow screens will punish sloppy assumptions.

## Next Steps

The code is still uncommitted and not deployed. It needs a proper commit, then deployment validation in the target environment before anyone treats this regression as closed.
