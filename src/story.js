/* Prototype B: one product, one story. Ask -> not documented -> expert answers once -> ask again -> gaps found. */
Live.mountStory = function mountStory() {
  const {E, request, refreshState, task, error, sourceList, setup} = Live._internals;
  setup({versions: false, resetLabel: 'Reset demo'});

  const views = {ask: $('#viewAsk'), inbox: $('#viewInbox'), gaps: $('#viewGaps')};
  const FOLLOW_UP = 'Can I raise the payments-retry limit from 3 to 5?';
  const UNDOCUMENTED = 'Why does payments-retry stop after three retries?';
  const PERSONA = {
    ask: ['S', "<b>You're Sam, a new backend engineer on your first day at Corvex Payments.</b> Your first ticket: customers see failed payments, so raise payments-retry from 3 to 5 retries."],
    inbox: ['MC', "<b>You're Maria Chen, the payments expert everyone asks.</b> Synaptiq only sends you what the documentation can't answer, with the evidence attached."],
    gaps: ['', "<b>Nobody asked anything.</b> Synaptiq reviewed recent work on the Bluewater account and found decisions nobody wrote down."],
  };
  const STEPS = [
    ['ask', 'Ask a documented question'],
    ['ask', 'Ask what nobody wrote down'],
    ['inbox', 'Expert answers once'],
    ['ask', 'Ask again'],
    ['gaps', 'Gaps found early'],
  ];
  const done = new Set();
  let current = 'ask';

  /* ---------- story bar and navigation ---------- */
  const bar = $('#story');
  function renderSteps() {
    const next = STEPS.findIndex((_, i) => !done.has(i));
    bar.innerHTML = STEPS.map(([view, label], i) => {
      const state = done.has(i) ? 'done' : i === next ? 'now' : '';
      return `<button type="button" class="${state}" data-step="${i}" data-view="${view}"><span class="n">${done.has(i) ? TICK : i + 1}</span>${E(label)}</button>`;
    }).join('<span class="sep" aria-hidden="true"></span>');
    bar.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => show(b.dataset.view)));
  }
  function mark(i) { if (!done.has(i)) { done.add(i); renderSteps(); } }

  function show(name) {
    current = name;
    for (const [key, el] of Object.entries(views)) el.hidden = key !== name;
    $$('#storyNav [data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === name));
    const [who, text] = PERSONA[name];
    const avatar = $('#personaWho');
    avatar.innerHTML = who ? E(who) : LOGO;
    avatar.classList.toggle('is-ai', !who);
    $('#personaText').innerHTML = text;
    $('#restart').hidden = name !== 'ask';
    history.replaceState(null, '', location.pathname + location.search + '#' + name);
    if (name === 'inbox') inbox.render(true);
    if (name === 'gaps' && !gaps.loaded) gaps.scan();
    if (name === 'ask') setTimeout(() => $('#askInput').focus(), 50);
  }
  $$('#storyNav [data-nav]').forEach((a) => (a.onclick = (e) => { e.preventDefault(); show(a.dataset.nav); }));

  /* ---------- 1. Ask (Sam, the new engineer) ---------- */
  const ask = (() => {
    const thread = $('#thread'), input = $('#askInput'), button = $('#askBtn'), work = $('#workAsk'), chips = $('#chips');
    let busy = false;
    function suggest(list) {
      chips.innerHTML = list.map((q) => `<button type="button" data-q="${E(q)}">${E(q)}</button>`).join('');
      chips.querySelectorAll('[data-q]').forEach((b) => (b.onclick = () => run(b.dataset.q)));
    }
    function start() {
      thread.innerHTML = `<div class="empty"><h1>What do you need to know?</h1><p>Ask anything about how Corvex works. Synaptiq answers from company knowledge with its sources, and says so when something was never written down.</p><div class="suggest"><button data-question="How do I run payments-retry tests locally?">How do I run payments-retry tests locally?</button><button data-question="Why does payments-retry stop after three retries?">Why does payments-retry stop after three retries?</button></div></div>`;
      thread.querySelectorAll('[data-question]').forEach((b) => (b.onclick = () => run(b.dataset.question)));
      chips.replaceChildren();
      input.value = '';
    }
    async function run(question) {
      if (busy || !question.trim()) return;
      busy = true; button.disabled = true; input.disabled = true;
      thread.querySelector('.empty')?.remove();
      const q = document.createElement('div'); q.className = 'q'; q.textContent = question; thread.appendChild(q);
      const a = document.createElement('div'); a.className = 'a';
      a.innerHTML = `<div class="a-mark">${LOGO}</div><div class="a-body"><p class="live-pending" role="status">Reading company knowledge…</p></div>`;
      thread.appendChild(a);
      const body = a.querySelector('.a-body');
      scrollDown(work);
      try {
        const r = await request('/api/ask', {question});
        await refreshState().catch(() => {});
        const verified = r.status === 'answered' ? r.sources.find((s) => s.id.startsWith('answer-')) : null;
        const pill = verified
          ? `<span class="pill ok verified">Verified by ${E(verified.owner)}</span>`
          : r.status === 'answered' ? '<span class="pill ok">Sources found</span>' : '<span class="pill gap">Not documented</span>';
        const title = verified ? 'Answer from company memory' : r.status === 'answered' ? 'Answer from company knowledge' : 'Nobody documented this yet';
        const expert = r.status === 'missing'
          ? `<div class="expert"><div class="who"><strong>${E(r.expert.name)}</strong><span>${E(r.expert_reason)}</span></div><button class="btn primary" data-route>Ask ${E(r.expert.name.split(' ')[0])}</button></div>`
          : '';
        body.innerHTML = `<article class="kcard${verified ? ' is-verified' : ''}"><div class="kcard-head"><h3>${title}</h3>${pill}</div><div class="kcard-body"><p class="lead live-answer">${E(r.answer)}</p>${sourceList(r.sources)}${expert}</div></article>`;
        if (verified) { mark(3); suggest([]); }
        else if (r.status === 'answered') { mark(0); if (!done.has(1)) suggest([UNDOCUMENTED]); }
        else { mark(1); suggest([]); }
        const route = body.querySelector('[data-route]');
        if (route) route.onclick = () => task(route, async () => {
          await request('/api/route', {question, expert_id: r.expert.id, evidence: r.answer});
          const first = r.expert.name.split(' ')[0];
          route.closest('.expert').outerHTML = `<div class="routed"><p class="saved-note">${TICK}Sent to ${E(first)}'s Expert Inbox with the evidence.</p><button class="btn primary" type="button" data-open-inbox>Open ${E(first)}'s Expert Inbox →</button></div>`;
          body.querySelector('[data-open-inbox]').onclick = () => show('inbox');
          inbox.count();
        });
      } catch (err) {
        body.replaceChildren(); error(body, err);
        const retry = document.createElement('button'); retry.className = 'btn'; retry.textContent = 'Retry question'; retry.onclick = () => run(question); body.appendChild(retry);
      } finally {
        busy = false; button.disabled = false; input.disabled = false; scrollDown(work);
        if (current === 'ask') input.focus();
      }
    }
    $('#ask').onsubmit = (e) => { e.preventDefault(); const q = input.value.trim(); if (!q || busy) return; input.value = ''; run(q); };
    $('#restart').onclick = () => { if (!busy) start(); };
    start();
    return {suggest, run, prefill: (q) => { input.value = q; }};
  })();

  /* ---------- 2. Expert Inbox (Maria) ---------- */
  const inbox = (() => {
    const view = $('#inboxView');
    const drafts = {}, typed = {}, drafting = new Set();
    let selected = null, fingerprint = '', state = null;
    const expertName = (s, id) => s.experts.find((x) => x.id === id)?.name || 'the expert';
    async function count() {
      try { state = await refreshState(); } catch { return; }
      const n = state.questions.filter((q) => q.status === 'pending').length;
      $('#inboxCount').textContent = n;
      $('#inboxCount').hidden = !n;
    }
    async function draft(q) {
      if (drafts[q.id] !== undefined || drafting.has(q.id)) return;
      drafting.add(q.id);
      const note = view.querySelector('#draftNote');
      if (note) note.innerHTML = '<span class="live-pending">Synaptiq is drafting an answer from the evidence…</span>';
      try {
        const r = await request('/api/draft', {id: q.id});
        drafts[q.id] = r.draft || r.answer || '';
      } catch { drafts[q.id] = ''; }
      drafting.delete(q.id);
      if (selected === q.id) fill(q);
    }
    function fill(q) {
      const box = view.querySelector('#expertAnswer'), note = view.querySelector('#draftNote');
      if (!box) return;
      if (!typed[q.id] && drafts[q.id]) { box.value = drafts[q.id]; typed[q.id] = drafts[q.id]; }
      if (note) note.innerHTML = drafts[q.id]
        ? 'Drafted by Synaptiq from the evidence. Replace each <b>[Confirm: …]</b> with what only you know.'
        : drafts[q.id] === '' ? 'Add what only you know: the reason, and when it can change.' : '';
    }
    async function render(force = false) {
      const editing = document.activeElement?.id === 'expertAnswer';
      if (editing && !force) return;
      try {
        const s = state = await refreshState();
        const key = JSON.stringify([s.questions, s.documents.map((d) => d.id)]);
        if (!force && key === fingerprint) return;
        fingerprint = key;
        const pending = s.questions.filter((q) => q.status === 'pending');
        const published = s.questions.filter((q) => q.status === 'published');
        $('#inboxCount').textContent = pending.length; $('#inboxCount').hidden = !pending.length;
        selected = pending.some((q) => q.id === selected) ? selected : pending[0]?.id;
        const q = pending.find((x) => x.id === selected);
        view.innerHTML = `<section class="ledger"><div><b>${pending.length}</b><span>questions waiting for you</span></div><div><b>${published.length}</b><span>answers you published</span></div><div><b>${s.documents.length}</b><span>sources in company memory</span></div></section>${q ? `<div class="panes"><section class="list"><div class="list-head">Sent to you by Synaptiq</div>${pending.map((i) => `<button class="item" data-select="${E(i.id)}" aria-current="${i.id === selected}"><span class="q">${E(i.question)}</span><span class="meta">For ${E(expertName(s, i.expert))} · not documented</span></button>`).join('')}</section><section class="detail"><div class="d-head"><span class="pill gap">Needs your expertise</span><h2>${E(q.question)}</h2></div><div class="d-body"><p class="k">Assigned to ${E(expertName(s, q.expert))}. Synaptiq checked the docs, code and tickets first.</p><details open><summary>What Synaptiq already found</summary><p class="live-answer">${E(q.evidence)}</p></details><label class="field">Your answer<textarea id="expertAnswer" placeholder="Write the missing answer in your own words…">${E(typed[q.id] || '')}</textarea></label><p class="k draft-note" id="draftNote"></p><label class="field">Applies to<input id="answerScope" value="payments-retry only"></label><button class="btn primary" id="publishLive">Approve and save to company memory</button><div id="publishFeedback" aria-live="polite"></div></div></section></div>` : `<section class="detail done-state"><h2>Nothing waiting for you</h2><p>When Sam asks something the documentation doesn't answer, Synaptiq sends it here with the evidence.</p><button class="btn primary" type="button" data-go-ask>Go to Sam's view</button></section>`}`;
        const lib = document.createElement('section'); lib.className = 'live-library';
        lib.innerHTML = `<div class="row" style="justify-content:space-between"><h2>Saved to company memory</h2><span class="pill ok">${published.length} answered once</span></div><p class="k">Everyone can now reuse these answers. Nobody has to ask you again.</p>${published.length ? published.map((i) => `<details class="live-published"><summary>${E(i.question)}</summary><p class="k">${E(expertName(s, i.expert))} · ${E(s.documents.find((d) => d.id === 'answer-' + i.id)?.text.match(/Scope: ([^\n]+)/)?.[1] || 'Company knowledge')}</p><p class="live-answer">${E(i.answer)}</p></details>`).join('') : '<p class="k">Your first answer will appear here.</p>'}`;
        view.appendChild(lib);
        view.querySelector('[data-go-ask]')?.addEventListener('click', () => show('ask'));
        view.querySelectorAll('[data-select]').forEach((b) => (b.onclick = () => { selected = b.dataset.select; render(true); }));
        if (!q) return;
        const answer = view.querySelector('#expertAnswer');
        answer.oninput = () => { typed[q.id] = answer.value; };
        fill(q);
        if (!typed[q.id]) draft(q);
        const publish = view.querySelector('#publishLive');
        publish.onclick = () => task(publish, async () => {
          const feedback = view.querySelector('#publishFeedback'); feedback.replaceChildren();
          if (answer.value.trim().length < 5) { error(feedback, Error('Write your answer first.')); answer.focus(); return; }
          if (/\[Confirm:/i.test(answer.value)) { error(feedback, Error('Replace each [Confirm: …] with the real answer first.')); answer.focus(); return; }
          try {
            await request('/api/publish', {id: q.id, answer: answer.value, scope: view.querySelector('#answerScope').value});
            delete typed[q.id];
            mark(2);
            toast('Saved to company memory. Everyone can reuse it now.');
            await render(true);
            const note = document.createElement('div'); note.className = 'routed';
            note.innerHTML = `<p class="saved-note">${TICK}Answer saved. Sam, and everyone after him, gets it without asking you.</p><button class="btn primary" type="button">Back to Sam: ask again →</button>`;
            note.querySelector('button').onclick = () => { ask.suggest([FOLLOW_UP]); ask.prefill(FOLLOW_UP); show('ask'); };
            view.prepend(note);
          } catch (e) { error(feedback, e); }
        });
      } catch (err) { if (!view.querySelector('#expertAnswer')) { view.replaceChildren(); error(view, err); } }
    }
    setInterval(() => { if (current === 'inbox' && !document.hidden) render(); }, 4000);
    return {render, count};
  })();

  /* ---------- 3. Gaps found before anyone asks ---------- */
  const gaps = (() => {
    const root = $('#gapsResult'), stamp = $('#gapsStamp'), again = $('#scanAgain');
    const TITLES = ['What changed', 'Why', 'People who know', 'Open gaps'];
    let busy = false;
    function sections(text) {
      const blocks = []; let cur = null;
      for (const line of text.replace(/\*\*/g, '').replace(/(?:^|\s)(What changed|Why|People who know|Open gaps)\s*:/gi, '\n$1:').split('\n')) {
        const m = line.match(/^\s*(?:#{1,4}\s*)?(What changed|Why|People who know|Open gaps)\s*:?\s*(.*)$/i);
        if (m) { cur = {title: TITLES.find((t) => t.toLowerCase() === m[1].toLowerCase()), lines: [m[2]]}; blocks.push(cur); }
        else if (cur) cur.lines.push(line);
      }
      return blocks;
    }
    function guessExpert(text, experts) {
      return experts.find((x) => text.includes(x.name) || text.includes(x.name.split(' ')[0])) || experts.find((x) => x.id === 'jamie') || experts[0];
    }
    async function scan() {
      if (busy) return; busy = true; gaps.loaded = true; again.disabled = true;
      root.innerHTML = '<p class="live-pending" role="status">Reviewing recent PRs, tickets and account history…</p>';
      stamp.textContent = 'Scanning'; stamp.className = 'pill plain';
      try {
        const r = await request('/api/brief', {});
        const s = await refreshState().catch(() => ({experts: []}));
        const blocks = sections(r.answer || '');
        let list = Array.isArray(r.gaps) && r.gaps.length ? r.gaps : [];
        if (!list.length) {
          const open = blocks.find((b) => b.title === 'Open gaps');
          const lines = open ? open.lines.join('\n').split(/\n+|(?:^|\s)[-•]\s+/).map((x) => x.replace(/^[\s\-•*\d.)]+/, '').trim()).filter((x) => x.length > 12) : [];
          list = lines.slice(0, 4).map((text) => ({question: text, reason: '', expert: guessExpert(text, s.experts || [])}));
        }
        const context = blocks.filter((b) => b.title !== 'Open gaps');
        root.innerHTML = `${list.length ? `<div class="gap-list">${list.map((g, i) => `<article class="gap-card"><div class="row" style="justify-content:space-between"><span class="pill gap">Not documented</span><span class="k">Found without a question</span></div><h3>${E(g.question)}</h3>${g.reason ? `<p class="k">${E(g.reason)}</p>` : ''}${g.expert ? `<div class="expert"><div class="who"><strong>${E(g.expert.name)}</strong><span>${E(g.expert.domain || 'Knows this area')}</span></div><button class="btn primary" type="button" data-gap="${i}">Ask ${E(g.expert.name.split(' ')[0])}</button></div>` : ''}</article>`).join('')}</div>` : `<p class="k">No open gaps found right now.</p>`}${context.length ? `<details class="live-brief-evidence"><summary>What Synaptiq reviewed</summary><div class="live-brief-sections">${context.map((b) => `<section class="live-brief-section"><h3>${E(b.title)}</h3><p class="live-answer">${E(b.lines.join('\n').trim())}</p></section>`).join('')}</div>${sourceList(r.sources || [])}</details>` : ''}`;
        root.querySelectorAll('[data-gap]').forEach((b) => (b.onclick = () => task(b, async () => {
          const g = list[+b.dataset.gap];
          await request('/api/route', {question: g.question, expert_id: g.expert.id, evidence: g.reason || r.answer});
          b.closest('.expert').outerHTML = `<div class="routed"><p class="saved-note">${TICK}Sent to ${E(g.expert.name.split(' ')[0])}'s Expert Inbox before anyone got stuck.</p><button class="btn quiet" type="button" data-open-inbox>Open the Expert Inbox →</button></div>`;
          root.querySelectorAll('[data-open-inbox]').forEach((x) => (x.onclick = () => show('inbox')));
          inbox.count();
        })));
        $('#gapCount').textContent = list.length; $('#gapCount').hidden = !list.length;
        stamp.textContent = 'Updated ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}); stamp.className = 'pill ok';
        mark(4);
      } catch (e) {
        root.replaceChildren(); error(root, e); stamp.textContent = 'Retry available'; stamp.className = 'pill gap';
      } finally { busy = false; again.disabled = false; }
    }
    again.onclick = scan;
    return {scan, loaded: false};
  })();

  renderSteps();
  const first = (location.hash || '#ask').slice(1);
  show(views[first] ? first : 'ask');
  inbox.count();
  window.addEventListener('workspace-connected', () => { inbox.count(); if (current === 'inbox') inbox.render(true); });
};
