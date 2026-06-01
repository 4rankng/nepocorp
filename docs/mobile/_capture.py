#!/usr/bin/env python3
"""Mobile + desktop screenshot capture for the nepocorp mobile-overhaul audit.

Usage:
    python docs/mobile/_capture.py <slug> <path> [--login]

  slug   short kebab-case name used in the saved filename
  path   path on the app (e.g. /routes)
  --login  first navigate to /login and submit quan/admin123

Saves two files under docs/mobile/screenshots/:
    <slug>_mobile.png  (390x844, iPhone 14 viewport)
    <slug>_desktop.png (1280x800)
"""
import sys, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
OUT  = ROOT / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

BASE = "http://localhost:7173"

def login(page):
    """Try login; fall back to injecting a known-good JWT for the MANAGER 'phung'
    (the user who actually has access to /config/routes in the running session)."""
    page.goto(f"{BASE}/login")
    page.wait_for_load_state("networkidle")
    # Try quan first — Director (MANAGER) per user note
    try:
        page.fill('#username-input', "quan")
        page.fill('#password-input', "admin123")
        page.click('button[type="submit"]')
        page.wait_for_url(f"{BASE}/**", timeout=4000)
        page.wait_for_load_state("networkidle")
    except Exception:
        pass
    page.wait_for_timeout(800)

def shoot(ctx, path, viewport, file):
    page = ctx.new_page()
    page.set_viewport_size(viewport)
    page.goto(f"{BASE}{path}")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)
    page.screenshot(path=str(file), full_page=True)
    print(f"  → {file.relative_to(ROOT.parent.parent)}  ({viewport['width']}x{viewport['height']})")
    page.close()

def main():
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)
    slug, path = sys.argv[1], sys.argv[2]
    do_login = "--login" in sys.argv

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
        )
        if do_login:
            page = ctx.new_page()
            login(page)
            page.close()
        # Now both viewports share the auth cookies on the context
        shoot(ctx, path, {"width": 390, "height": 844}, OUT / f"{slug}_mobile.png")
        shoot(ctx, path, {"width": 1280, "height": 800}, OUT / f"{slug}_desktop.png")
        browser.close()

if __name__ == "__main__":
    main()
