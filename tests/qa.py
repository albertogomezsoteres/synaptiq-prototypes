"""Click through each prototype in a real browser and save screenshots.
Usage: python tests/qa.py a|b|c [--mobile] [--dark]
"""
import pathlib
import sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
which = sys.argv[1]
mobile = "--mobile" in sys.argv
dark = "--dark" in sys.argv
OUT = pathlib.Path(sys.argv[sys.argv.index("--out") + 1]) if "--out" in sys.argv else ROOT / "tests" / "shots"
OUT.mkdir(parents=True, exist_ok=True)
tag = which + ("-m" if mobile else "") + ("-d" if dark else "")
errors = []


def shot(page, name):
    page.screenshot(path=str(OUT / f"{tag}-{name}.png"), full_page=False)


def flow_a(p):
    shot(p, "0-start")
    p.click("text=How do I run the payments-retry tests locally?")
    p.wait_for_selector("text=Used by", state="visible")
    p.wait_for_timeout(400)
    shot(p, "1-setup")
    p.click(".chips >> text=Why does payments-retry only retry 3 times?")
    p.wait_for_selector("[data-ask]", state="visible")
    p.wait_for_timeout(400)
    shot(p, "2-gap")
    p.click("[data-ask]")
    p.wait_for_timeout(300)
    shot(p, "3-draft")
    p.click("[data-send]")
    p.click("[data-skip]")
    p.wait_for_selector("text=Saved to company memory", state="visible", timeout=15000)
    p.wait_for_timeout(500)
    shot(p, "4-verified")
    p.click(".chips >> text=Why does payments-retry only retry 3 times?")
    p.wait_for_selector(".recap", state="visible")
    p.wait_for_timeout(500)
    shot(p, "5-reuse")
    p.click(".chips >> text=Which dashboard shows retry failures?")
    p.wait_for_selector("[data-recheck]", state="visible")
    p.click("[data-recheck]")
    p.wait_for_timeout(400)
    shot(p, "6-stale")
    p.fill("#askInput", "what is the meaning of life")
    p.press("#askInput", "Enter")
    p.wait_for_timeout(900)
    shot(p, "7-unknown")
    p.click("#restart")
    p.wait_for_timeout(300)
    assert p.is_visible("text=Ask anything about how Corvex works")


def flow_b(p):
    shot(p, "0-start")
    p.click("[data-confirm]")
    p.wait_for_timeout(700)
    shot(p, "1-confirmed")
    p.click("[data-open='retry']")
    p.wait_for_timeout(300)
    p.click("[data-fill]")
    p.wait_for_timeout(200)
    p.click("[data-suggest]")
    p.wait_for_timeout(200)
    shot(p, "2-edit")
    p.click("[data-publish]")
    p.wait_for_timeout(700)
    shot(p, "3-published")
    p.click("[data-open='delete']")
    p.wait_for_timeout(300)
    shot(p, "4-risk")
    p.click("[data-personal]")
    p.wait_for_timeout(300)
    p.click("[data-reply]")
    p.wait_for_timeout(700)
    shot(p, "5-done")
    p.click("[data-open='notme']")
    p.wait_for_timeout(300)
    p.click("[data-notme]")
    p.wait_for_timeout(300)
    p.click("[data-redirect]")
    p.wait_for_timeout(600)
    shot(p, "6-redirect")
    p.click("[data-tab='settings']")
    p.wait_for_timeout(300)
    shot(p, "7-settings")
    p.click("#restart")
    p.wait_for_timeout(300)


def flow_c(p):
    shot(p, "0-start")
    p.click("[data-open-account]")
    p.wait_for_selector("[data-gap-ask]", state="visible", timeout=15000)
    p.wait_for_timeout(500)
    shot(p, "1-briefing")
    p.click("[data-decide='remove']")
    p.wait_for_timeout(400)
    shot(p, "2-early-decision")
    p.click("[data-gap-ask]")
    p.wait_for_timeout(300)
    p.click("[data-gap-send]")
    p.click("[data-skip]")
    p.wait_for_selector("text=Verified by Jamie Ortiz", state="visible", timeout=15000)
    p.wait_for_timeout(500)
    shot(p, "3-closed")
    p.click("[data-decide='keep']")
    p.wait_for_timeout(600)
    shot(p, "4-decided")
    p.click("#restart")
    p.wait_for_timeout(300)


with sync_playwright() as pw:
    b = pw.chromium.launch()
    vp = {"width": 390, "height": 844} if mobile else {"width": 1366, "height": 860}
    ctx = b.new_context(viewport=vp, device_scale_factor=2 if mobile else 1, color_scheme="dark" if dark else "light",
                        is_mobile=mobile, has_touch=mobile)
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto((ROOT / "docs" / which / "index.html").as_uri() if which != "index" else (ROOT / "docs" / "index.html").as_uri())
    page.wait_for_timeout(600)
    {"a": flow_a, "b": flow_b, "c": flow_c, "index": lambda p: shot(p, "0")}[which](page)
    sw = page.evaluate("document.documentElement.scrollWidth > window.innerWidth")
    print("horizontal overflow:", sw)
    print("errors:", [e for e in errors if "fonts.g" not in e] or "none")
    b.close()
