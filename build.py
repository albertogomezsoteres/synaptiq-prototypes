"""Build the site into docs/ for GitHub Pages.

Each page in src/ gets the shared stylesheet and script inlined, so every
page in docs/ is a single self-contained HTML file with no build step needed
to host it.
"""
import base64
import pathlib

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
CSS = (SRC / "shared.css").read_text()
JS = (SRC / "shared.js").read_text()
ASSETS = ROOT / "assets"


def data_uri(name):
    return "data:image/png;base64," + base64.b64encode((ASSETS / name).read_bytes()).decode()


IMAGES = {"mark": data_uri("mark.png"), "wordmark": data_uri("wordmark.png")}

PAGES = {"index": "index.html", "a": "a.html", "b": "b.html", "c": "c.html"}
HEAD = (
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    '<meta name="description" content="Synaptiq: three interactive prototypes for closing knowledge gaps in engineering teams.">\n'
    '<meta name="theme-color" content="#072548">\n'
    f'<link rel="icon" type="image/png" href="{data_uri("favicon.png")}">\n'
)


def render(text, links):
    text = text.replace("/*SHARED_CSS*/", CSS).replace("//SHARED_JS", JS)
    for key, val in {**IMAGES, **links}.items():
        text = text.replace("{{" + key.upper() + "}}", val)
    return text


def build_page(key, links):
    src = (SRC / PAGES[key]).read_text()
    page = render(src, links)
    split = page.index("</style>") + len("</style>")
    return HEAD + page[:split] + "\n</head>\n<body>\n" + page[split:] + "\n</body>\n</html>\n"


if __name__ == "__main__":
    for key in PAGES:
        links = {"home": "./", "a": "a/", "b": "b/", "c": "c/"} if key == "index" else {"home": "../", "a": "../a/", "b": "../b/", "c": "../c/"}
        out = ROOT / "docs" / ("index.html" if key == "index" else f"{key}/index.html")
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(build_page(key, links))
        print("built", out.relative_to(ROOT))
