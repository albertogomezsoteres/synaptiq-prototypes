/* Synaptiq UI kit: shared helpers */
const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const wait = (ms) => new Promise((r) => setTimeout(r, REDUCED ? Math.min(ms, 60) : ms));
let RUN = 0; // increments on restart so pending async flows stop
const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const RESTART_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>';
const alive = (id) => id === RUN;

const LOGO = '<svg viewBox="0 0 28 28" aria-hidden="true"><path d="M6.5 20.5C10.5 12 17 16.5 21.5 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="6.5" cy="20.5" r="3.6" fill="currentColor"/><circle cx="21.5" cy="7.5" r="3.6" fill="currentColor"/><circle cx="14" cy="14.3" r="2" fill="var(--surface)" stroke="currentColor" stroke-width="1.7"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function toast(msg) {
  let box = $(".toasts");
  if (!box) { box = document.createElement("div"); box.className = "toasts"; box.setAttribute("role", "status"); document.body.appendChild(box); }
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = '<span class="dot">' + TICK + '</span><span>' + msg + '</span><span class="bar"></span>';
  box.appendChild(t);
  while (box.children.length > 2) box.firstElementChild.remove();
  setTimeout(() => { t.classList.add("leaving"); setTimeout(() => t.remove(), 320); }, 4200);
}

/* stream words into an element, keeping inline markup intact by revealing tokens */
async function stream(el, html, id, speed = 18) {
  el.classList.add("typing");
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  const words = [];
  (function walk(node, parent) {
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach((w) => { if (w) words.push({ parent, text: w }); });
      } else {
        const clone = n.cloneNode(false);
        words.push({ parent, node: clone });
        walk(n, clone);
      }
    });
  })(tmp, el);
  for (const w of words) {
    if (!alive(id)) return;
    if (w.node) w.parent.appendChild(w.node);
    else { w.parent.appendChild(document.createTextNode(w.text)); if (/\S/.test(w.text)) await wait(speed); }
  }
  el.classList.remove("typing");
}

/* animate a number change */
function countTo(el, to, suffix = "") {
  if (!el) return;
  const from = parseInt(el.textContent, 10) || 0;
  if (from === to) { el.textContent = to + suffix; return; }
  const t0 = performance.now(), dur = REDUCED ? 1 : 700;
  el.classList.add("bump");
  (function step(t) {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(from + (to - from) * e) + suffix;
    if (k < 1) requestAnimationFrame(step); else setTimeout(() => el.classList.remove("bump"), 500);
  })(t0);
}

/* "Try this" checklist in the rail */
function Checklist(root, steps) {
  let done = 0, just = -1;
  function render() {
    root.innerHTML = "<h4>Try this</h4><ol>" + steps.map((s, i) => {
      const cls = (i < done ? "done" : i === done ? "now" : "") + (i === just ? " just" : "");
      const mark = i < done ? TICK : String(i + 1);
      return '<li class="' + cls + '"><span class="tick" aria-hidden="true">' + mark + "</span><span>" + s + "</span></li>";
    }).join("") + "</ol>" + (done >= steps.length ? '<p class="finished">All steps done. Restart to run it again.</p>' : "");
  }
  render();
  return {
    complete(i) { if (i < done) return; just = i; done = i + 1; render(); },
    reset() { done = 0; just = -1; render(); },
    get step() { return done; },
  };
}

/* thinking steps; resolves after all are shown */
async function think(container, labels, id, each = 650) {
  const box = document.createElement("div");
  box.className = "thinking";
  container.appendChild(box);
  for (const l of labels) {
    if (!alive(id)) return box;
    const s = document.createElement("div");
    s.className = "step";
    s.innerHTML = '<span class="spin"></span><span>' + l + "</span>";
    box.appendChild(s);
    await wait(each);
    s.classList.add("done");
  }
  return box;
}

function scrollDown(el) {
  el.scrollTo({ top: el.scrollHeight, behavior: REDUCED ? "auto" : "smooth" });
  clearTimeout(el._sd);
  el._sd = setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: "auto" }), 420);
}
