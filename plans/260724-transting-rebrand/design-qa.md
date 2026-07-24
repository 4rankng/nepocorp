# TransTing design QA

- Source visual truth: `/Users/dev/.codex/attachments/15f44052-666d-4104-82b4-ffc823ce7a62/image-1.png`
- Sidebar defect reference: `/var/folders/8j/qs8k8y3n1hlfbl4q20k0hgjh0000gn/T/codex-clipboard-bbb1b410-9c3a-4f38-b167-6664567e05ef.png`
- Source dimensions: 1536 × 1024 px
- Implementation target: `http://localhost:7173/dashboard`
- Implementation screenshot: unavailable
- Intended viewports: 1440 × 900 desktop; 390 × 844 mobile
- CSS size and density normalization: not available because browser capture was blocked
- State: authenticated administrator (`admin`) on `/dashboard`

## Evidence

- The source brand board was opened and inspected.
- Generated asset checks were completed for the 192 × 192 app mark and 16 × 16 favicon. The road/arrow mark remains recognizable at both sizes and follows the source navy, blue, green, and white direction.
- The sidebar-specific mark was regenerated without the nested navy tile, converted to transparent PNG, and checked against an emerald background. The header descriptor was shortened and allowed to wrap within its flex column instead of overflowing the 248 px shell.
- The running local server returned HTTP 200 for `/dashboard` and `/manifest.json`; the served shell contains the TransTing title, Vietnamese tagline, and new PWA asset references.
- The implementation could not be opened in the in-app browser because enterprise network policy rejected access to `http://localhost:7173`.
- No browser-policy workaround or alternate browser surface was attempted.

## Required fidelity surfaces

- Fonts and typography: Be Vietnam Pro is preserved; rendered hierarchy and wrapping could not be captured.
- Spacing and layout rhythm: existing login/sidebar footprints were preserved; desktop and mobile rendering could not be captured.
- Colors and visual tokens: the user-directed deep emerald sidebar and primary CTA tokens are implemented, with transport blue retained in the mark and signal green as an accent; semantic success/info tokens remain unchanged.
- Image quality and asset fidelity: generated PWA assets exist at 16, 32, 180, 192, 512, and 1024 px; a separate transparent sidebar mark exists at 192 and 1024 px and remains recognizable against the emerald shell.
- Copy and content: approved Vietnamese copy is present and guarded by the brand contract check.

## Findings

- [P1] Browser-rendered evidence is unavailable.
  - Location: login, authenticated dashboard, desktop and mobile states.
  - Evidence: localhost navigation was rejected by enterprise browser policy.
  - Impact: responsive layout, primary interactions, and console cleanliness cannot be visually certified.
  - Fix: open the already-running local app in an allowed browser environment and capture the login plus authenticated dashboard at the intended viewports.

## Comparison history

- Pass 1: source image opened; generated logo and favicon inspected.
- Implementation comparison: blocked before capture, so no valid full-view or focused-region comparison exists.

## Primary interactions and console

- Login submission: not browser-tested.
- Sidebar navigation and collapse behavior: not browser-tested.
- Dashboard actions: not browser-tested.
- Console errors: not checked because the page could not be opened.

## Implementation checklist

- [x] Reference-aligned TransTing asset produced and installed.
- [x] Sidebar-specific transparent mark produced and the reported brand-header overflow fixed in source.
- [x] Vietnamese brand copy centralized and applied.
- [x] Static PWA, notification, title, onboarding, assistant, and export identities updated.
- [x] Focused tests, full tests, UI contract, lint, build, and diff checks passed.
- [ ] Capture and compare desktop/mobile browser states in an allowed environment.

final result: blocked
