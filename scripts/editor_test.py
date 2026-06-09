import sys, time
from playwright.sync_api import sync_playwright

TOKEN = sys.argv[1]
URL = "http://localhost:3000/projects/demo/templates/demo-card"
OUT = "scripts/out"

def drag(page, box, x0, y0, x1, y1):
    page.mouse.move(box["x"] + x0, box["y"] + y0)
    page.mouse.down()
    page.mouse.move(box["x"] + x1, box["y"] + y1, steps=12)
    page.mouse.up()
    time.sleep(0.3)

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1400, "height": 1000})
    ctx.add_cookies([{
        "name": "session", "value": TOKEN,
        "domain": "localhost", "path": "/",
    }])
    errors = []
    page = ctx.new_page()
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(URL, wait_until="domcontentloaded")
    cv = page.get_by_test_id("editor-canvas")
    cv.wait_for(state="visible", timeout=30000)
    cv.scroll_into_view_if_needed()
    time.sleep(0.6)
    page.screenshot(path=f"{OUT}/editor-1-initial.png")

    def box():
        b = cv.bounding_box()
        return b

    # add a text layer by drawing (coords relative to canvas box)
    page.get_by_role("button", name="+ Text").click()
    b = box(); drag(page, b, b["width"]*0.08, b["height"]*0.10, b["width"]*0.70, b["height"]*0.24)
    page.screenshot(path=f"{OUT}/editor-2-text.png")

    # add an image layer by drawing
    page.get_by_role("button", name="+ Image").click()
    b = box(); drag(page, b, b["width"]*0.55, b["height"]*0.45, b["width"]*0.85, b["height"]*0.75)
    page.screenshot(path=f"{OUT}/editor-3-image.png")

    # move the selected image layer left
    b = box(); drag(page, b, b["width"]*0.70, b["height"]*0.60, b["width"]*0.30, b["height"]*0.55)
    page.screenshot(path=f"{OUT}/editor-4-moved.png")

    # save
    page.get_by_role("button", name="Save").click()
    page.wait_for_selector("text=Saved.", timeout=8000)
    page.screenshot(path=f"{OUT}/editor-5-saved.png")

    # report layer rows in panel
    panel_text = page.locator("aside, div").filter(has_text="Layers").first
    print("CONSOLE_ERRORS:", errors[:10])
    print("SAVED_VISIBLE:", page.locator("text=Saved.").count() > 0)
    browser.close()
