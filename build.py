"""Build the site into docs/ for GitHub Pages.

Each page in src/ gets the shared stylesheet and script inlined, so every
page in docs/ is a single self-contained HTML file with no build step needed
to host it.
"""
import pathlib

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
CSS = (SRC / "shared.css").read_text()
JS = (SRC / "shared.js").read_text()

PAGES = {"index": "index.html", "a": "a.html", "b": "b.html", "c": "c.html"}
HEAD = (
    '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    '<meta name="description" content="Synaptiq: three interactive prototypes for closing knowledge gaps in engineering teams.">\n'
    '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 28 28%27%3E%3Cpath d=%27M6.5 20.5C10.5 12 17 16.5 21.5 7.5%27 fill=%27none%27 stroke=%27%230a7468%27 stroke-width=%272.4%27 stroke-linecap=%27round%27/%3E%3Ccircle cx=%276.5%27 cy=%2720.5%27 r=%273.8%27 fill=%27%230a7468%27/%3E%3Ccircle cx=%2721.5%27 cy=%277.5%27 r=%273.8%27 fill=%27%230a7468%27/%3E%3C/svg%3E">\n'
)


def render(text, links):
    text = text.replace("/*SHARED_CSS*/", CSS).replace("//SHARED_JS", JS)
    for key, val in links.items():
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
