/* Shared live workspace. API credentials are held by server.py, never in this browser. */
const Live = (() => {
  const E = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let base = window.SYNAPTIQ_API_BASE || localStorage.getItem('synaptiq-api') || '';
  const incoming = new URLSearchParams(location.search).get('api');
  const validBase = s => { const u = new URL(s); if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost','127.0.0.1'].includes(u.hostname))) throw Error('Use an HTTPS backend URL.'); if (u.username || u.password || u.search || u.hash || u.pathname !== '/') throw Error('Enter only the backend origin, for example https://your-service.example.com'); return u.origin; };
  if (incoming) { try { base = validBase(incoming); localStorage.setItem('synaptiq-api', base); } catch {} }
  if (!base && ['localhost','127.0.0.1'].includes(location.hostname)) base = location.origin;
  let health = null, shared = null;
  const busyButtons = new Set();
  function endpoint(path) { if (!base) throw Error('Connect the hosted workspace using “Connect workspace” above.'); return base + path; }
  async function request(path, body) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 65000);
    try {
      const res = await fetch(endpoint(path), {method: body ? 'POST' : 'GET', headers: body ? {'Content-Type':'application/json'} : {}, body: body ? JSON.stringify(body) : undefined, signal: controller.signal});
      let data; try { data = await res.json(); } catch { throw Error('That URL is not the Synaptiq backend. Check the workspace connection.'); }
      if (!res.ok) throw Error(data.error || 'Request failed. Please retry.'); return data;
    } catch (err) { if (err.name === 'AbortError') throw Error('The server took too long. It may be waking up; please retry.'); if (err instanceof TypeError) throw Error('Could not reach the workspace. Check your connection and backend URL.'); throw err; }
    finally { clearTimeout(timer); }
  }
  function link(version) {
    const home = document.querySelector('.rail-foot a')?.getAttribute('href') || './';
    const url = new URL(home, location.href);
    url.search = ''; url.hash = '';
    if (version) url.pathname = url.pathname.replace(/\/?$/, '/') + version + '/';
    if (base) url.searchParams.set('api', base);
    return url.href;
  }
  function propagate() {
    document.querySelectorAll('a[href]').forEach(a => { try {const u = new URL(a.href); if (base && u.origin === location.origin && !a.getAttribute('href').startsWith('#') && !a.hasAttribute('download')) {u.searchParams.set('api',base); a.href=u.href;}} catch {} });
  }
  function error(container, err) { const p=document.createElement('p'); p.className='live-error'; p.setAttribute('role','alert'); p.textContent=err.message || String(err); container.appendChild(p); }
  async function task(button, work) { if (busyButtons.has(button)) return; busyButtons.add(button); button.disabled=true; try {await work();} catch(e) {toast(E(e.message));} finally {button.disabled=false; busyButtons.delete(button);} }
  const day = t => new Date(t*1000).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
  // Expert-approved answers get a "Verified by" badge and show where they apply.
  function sourceList(sources) { return sources.length ? `<ul class="trail">${sources.map(s=>`<li><span class="node"></span><span><b>${E(s.verified ? s.title.replace(/^Expert answer: /,'') : s.title)}</b>${s.verified?` <span class="pill ok verified">✓ Verified by ${E(s.owner)} · ${day(s.created)}</span>`:''}<br><span class="k">${s.verified?'Expert answer':E(s.owner)+' · added '+day(s.created)}${s.scope?` · Applies to: ${E(s.scope)}`:''}</span></span></li>`).join('')}</ul>` : ''; }
  // Questions routed from C start with this marker, so B and C can show where a gap came from.
  const C_MARKER = 'Flagged by Context Briefing (C).';
  async function refreshState() { shared=await request('/api/state'); return shared; }
  async function check() {
    const status=document.querySelector('#liveStatus');
    try {health=await request('/api/health'); status.textContent=health.ai_configured ? 'Live AI · shared workspace' : 'Workspace connected · AI key needed'; status.className='pill '+(health.ai_configured?'ok':'gap'); await refreshState();}
    catch(e) {status.textContent=base ? 'Workspace offline · reconnect' : 'Connect workspace to use live AI';status.className='pill gap';health=null;}
  }
  function setup() {
    const brand = document.querySelector('#brand');
    if (brand && !brand.innerHTML.trim()) brand.innerHTML = BRAND;
    const bar=document.createElement('div'); bar.className='live-bar';
    bar.innerHTML=`<span id="liveStatus" class="pill plain">Connecting workspace…</span><nav class="live-versions" aria-label="Switch prototype"><a href="${E(link('a'))}">A · Ask</a><a href="${E(link('b'))}">B · Expert</a><a href="${E(link('c'))}">C · Briefing</a></nav><div class="row"><button class="btn quiet" id="liveDocs" type="button">Company documents</button><button class="btn quiet" id="liveConnect" type="button">Connect workspace</button><button class="btn quiet" id="liveReset" type="button">Reset shared demo</button></div>`;
    const main=document.querySelector('.main') || document.querySelector('.page'); main.prepend(bar);
    document.querySelector('#liveConnect').onclick=connect;
    document.querySelector('#liveDocs').onclick=documents;
    document.querySelector('#liveReset').onclick=e=>task(e.currentTarget,async()=>{if(!confirm('Reset the shared demo for everyone? This removes uploaded documents, routed questions and expert answers. Seed documents stay.'))return; await request('/api/reset',{confirm:'RESET DEMO'});location.reload();});
    propagate(); check();
  }
  function dialog(title,html) {
    document.querySelector('#liveDialog')?.remove();const d=document.createElement('dialog');d.id='liveDialog';d.className='live-dialog';
    d.innerHTML=`<div class="row" style="justify-content:space-between"><h2>${E(title)}</h2><button class="btn quiet" type="button" data-close>Close</button></div><div class="live-dialog-body">${html}</div>`;
    document.body.appendChild(d);d.querySelector('[data-close]').onclick=()=>d.close();d.addEventListener('close',()=>d.remove());d.showModal();return d;
  }
  function connect() {
    const d=dialog('Connect your demo workspace',`<p>Enter the public URL of your hosted Synaptiq backend. All three versions use this same workspace. This field is for a URL, never an API key.</p><label>Backend URL<input id="backendUrl" type="url" placeholder="https://your-synaptiq-backend.example.com" value="${E(base)}"></label><button class="btn primary" id="saveBackend">Connect</button><p class="k">Use the same URL on another laptop, or share a version link after connecting.</p><div id="connectError"></div>`);
    d.querySelector('#saveBackend').onclick=e=>task(e.currentTarget,async()=>{const c=d.querySelector('#connectError');c.replaceChildren();try {const proposed=validBase(d.querySelector('#backendUrl').value.trim());const r=await fetch(proposed+'/api/health',{signal:AbortSignal.timeout(15000)});const data=await r.json();if(!r.ok||data.ok!==true)throw Error('This is not a Synaptiq backend.');base=proposed;localStorage.setItem('synaptiq-api',base);const u=new URL(location.href);u.searchParams.set('api',base);history.replaceState(null,'',u);propagate();await check();d.close();toast('Workspace connected.');window.dispatchEvent(new Event('workspace-connected'));}catch(err){error(c,err);}});
  }
  async function uploadFiles(files, output) {
    for (const file of files) {
      if(file.size>4*1024*1024) {error(output,Error(file.name+': choose a file under 4 MB.'));continue;}
      const p=document.createElement('p');p.textContent='Uploading '+file.name+'…';output.appendChild(p);
      try {const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(Error('Could not read file.'));reader.readAsDataURL(file);});await request('/api/upload',{name:file.name,data});p.textContent=file.name+' added to company knowledge. Ask your question again.';p.className='saved-note';}
      catch(e){p.className='live-error';p.textContent=file.name+': '+e.message;}
    }
    await refreshState().catch(()=>{});window.dispatchEvent(new Event('knowledge-updated'));
  }
  function uploadZone(container) {
    container.innerHTML=`<label class="live-drop" tabindex="0">Drop company files here, or <span>choose files</span><input type="file" multiple accept=".txt,.md,.csv,.json,.log,.docx,.pdf,.png,.jpg,.jpeg,.webp" hidden></label><p class="k live-hint">Text, Word, PDF, or a readable floor-plan image · up to 4 MB per file · fictional demo data only</p><div class="upload-feedback" aria-live="polite"></div>`;
    const zone=container.querySelector('.live-drop'), picker=zone.querySelector('input'), output=container.querySelector('.upload-feedback');let uploading=false;
    const run=async files=>{if(uploading)return;uploading=true;zone.classList.add('uploading');try{await uploadFiles(files,output);}catch(e){error(output,e);}finally{uploading=false;zone.classList.remove('uploading');picker.value='';}};
    picker.onchange=()=>run([...picker.files]);zone.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();picker.click();}};
    for(const name of ['dragenter','dragover'])zone.addEventListener(name,e=>{e.preventDefault();zone.classList.add('dragging');});
    zone.addEventListener('dragleave',()=>zone.classList.remove('dragging'));zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragging');run([...e.dataTransfer.files]);});
  }
  async function documents() {
    const d=dialog('Company knowledge',`<p>These documents and expert-approved answers are shared by A, B and C.</p><div id="docUpload"></div><div id="docList">Loading…</div>`);uploadZone(d.querySelector('#docUpload'));
    async function list(){try{const s=await refreshState();if(!d.isConnected)return;const root=d.querySelector('#docList');root.innerHTML=s.documents.map(doc=>`<article class="live-document"><b>${E(doc.title)}</b><p class="k">${E(doc.owner)}</p>${doc.mime==='text/plain'?`<details><summary>Read document</summary><pre>${E(doc.text)}</pre></details>`:'<p class="k">Visual document available to the model</p>'}${!doc.id.startsWith('seed-')&&!doc.id.startsWith('answer-')?`<button class="btn quiet" data-delete="${E(doc.id)}">Remove</button>`:''}</article>`).join('');root.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>task(b,async()=>{await request('/api/delete-document',{id:b.dataset.delete});await list();}));}catch(e){const root=d.querySelector('#docList');root.textContent=e.message;}}
    const changed=()=>list();window.addEventListener('knowledge-updated',changed);d.addEventListener('close',()=>window.removeEventListener('knowledge-updated',changed));await list();
  }
  function mountA(){
    setup();let busy=false;const thread=document.querySelector('#thread'),input=document.querySelector('#askInput'),button=document.querySelector('#askBtn'),work=document.querySelector('#work');
    document.querySelector('#try').innerHTML='<h4>Try this</h4><ol><li>Ask any company question.</li><li>Route missing knowledge to an expert in B.</li><li>Publish the answer in B, then ask again here.</li><li>Or upload a document and ask again.</li></ol>';
    document.querySelector('#restart').onclick=()=>{if(!busy)start();};
    document.querySelector('.nav').innerHTML=`<a class="on" href="#">Ask</a><a href="${link('b')}">Open expert inbox B</a><a href="${link('c')}">Context briefing C</a>`;
    const upload=document.createElement('div');upload.className='live-upload-inline';document.querySelector('.composer').prepend(upload);uploadZone(upload);
    function start(){thread.innerHTML='<div class="empty"><h1>What do you need to know?</h1><p>Ask freely. Synaptiq answers from company knowledge, shows its sources, and helps capture what nobody has written down.</p><div class="suggest"><button data-question="How do I run payments-retry tests locally?">How do I run payments-retry tests locally?</button><button data-question="Why does payments-retry stop after three retries?">Why does payments-retry stop after three retries?</button><button data-question="Where are the bathrooms in this office?">Where are the bathrooms in this office?</button></div></div>';thread.querySelectorAll('[data-question]').forEach(b=>b.onclick=()=>ask(b.dataset.question));document.querySelector('#chips').replaceChildren();input.value='';}
    async function ask(question){if(busy||!question.trim())return;busy=true;button.disabled=true;input.disabled=true;thread.querySelector('.empty')?.remove();const q=document.createElement('div');q.className='q';q.textContent=question;thread.appendChild(q);const a=document.createElement('div');a.className='a';a.innerHTML=`<div class="a-mark">${LOGO}</div><div class="a-body"><p class="live-pending" role="status">Reading current company knowledge…</p></div>`;thread.appendChild(a);const body=a.querySelector('.a-body');scrollDown(work);
      try{const r=await request('/api/ask',{question});const verified=r.status==='answered'&&r.sources.some(s=>s.verified);body.innerHTML=`<article class="kcard"><div class="kcard-head"><h3>${r.status==='answered'?'Answer from company knowledge':'Knowledge gap'}</h3><span class="pill ${r.status==='answered'?'ok':'gap'}">${verified?'Expert-verified':r.status==='answered'?'Sources found':'Not documented'}</span></div><div class="kcard-body"><p class="lead live-answer">${E(r.answer)}</p>${sourceList(r.sources)}${r.status==='missing'?`<div class="expert"><div class="who"><strong>${E(r.expert.name)}</strong><span>${E(r.expert_reason)}</span></div><button class="btn primary" data-route>Ask this expert</button></div>`:''}</div></article>`;
        const route=body.querySelector('[data-route]');if(route)route.onclick=()=>task(route,async()=>{await request('/api/route',{question,expert_id:r.expert.id,evidence:r.answer});route.textContent='Sent to expert inbox';const p=document.createElement('p');p.innerHTML=`<a class="btn primary" href="${E(link('b'))}" target="_blank" rel="noopener">Open B to answer it</a> <span class="k">Return here and ask again after publishing.</span>`;body.appendChild(p);});
      }catch(err){body.replaceChildren();error(body,err);const retry=document.createElement('button');retry.className='btn';retry.textContent='Retry question';retry.onclick=()=>ask(question);body.appendChild(retry);}finally{busy=false;button.disabled=false;input.disabled=false;input.focus();scrollDown(work);}}
    document.querySelector('#ask').onsubmit=e=>{e.preventDefault();const q=input.value.trim();if(!q||busy)return;input.value='';ask(q);};start();
  }
  function mountB(){
    setup();const view=document.querySelector('#view');let selected=null;let editing=false;let fingerprint='';
    // AI drafts, kept per question so the inbox refresh doesn't ask the model again.
    const drafts={};const drafting=new Set();
    async function fillDraft(id,box){
      if(id in drafts){if(!box.value)box.value=drafts[id];return;}
      const status=view.querySelector('#draftStatus');if(status)status.hidden=false;
      if(drafting.has(id))return;drafting.add(id);
      try{drafts[id]=(await request('/api/draft',{id})).draft;}
      catch(e){drafts[id]='';const s=view.querySelector('#draftStatus');if(s){s.hidden=false;s.className='live-error';s.textContent='Could not draft this one ('+e.message+') Write your answer below.';}return;}
      finally{drafting.delete(id);}
      const current=view.querySelector('#expertAnswer');if(selected===id&&current&&!current.value)current.value=drafts[id];
      const s=view.querySelector('#draftStatus');if(selected===id&&s)s.hidden=true;
    }
    document.querySelector('#try').innerHTML='<h4>Live expert workflow</h4><p>Questions routed from A and gaps sent from C appear here with a draft. Fill in what only you know, publish it, then ask A again.</p>';
    document.querySelector('#pageSub').textContent='Real questions from A and gaps spotted by C. Your published explanations become shared company knowledge.';
    document.querySelector('.tabs').innerHTML='<button class="btn" type="button" id="refreshInbox">Refresh inbox</button>';
    document.querySelector('#refreshInbox').onclick=e=>task(e.currentTarget,()=>render(true));document.querySelector('#restart').textContent='Refresh inbox';document.querySelector('#restart').onclick=()=>render(true);
    document.querySelector('.nav').innerHTML=`<a class="on" href="#">Expert inbox <span class="count" id="liveInboxCount">0</span></a><a href="${link('a')}">Ask Synaptiq A</a><a href="${link('c')}">Context briefing C</a>`;
    async function render(force=false){if(editing&&!force)return;try{const s=await refreshState();const key=JSON.stringify(s.questions);if(!force&&key===fingerprint)return;fingerprint=key;const pending=s.questions.filter(q=>q.status==='pending');document.querySelector('#liveInboxCount').textContent=pending.length;selected=pending.some(q=>q.id===selected)?selected:pending[0]?.id;const q=pending.find(q=>q.id===selected);view.innerHTML=`<section class="ledger"><div><b>${pending.length}</b><span>questions awaiting your expertise</span></div><div><b>${s.questions.filter(q=>q.status==='published').length}</b><span>answers actually published</span></div><div><b>${s.documents.length}</b><span>shared knowledge sources</span></div></section>${q?`<div class="panes"><section class="list"><div class="list-head">Questions for you</div>${pending.map(i=>`<button class="item" data-select="${E(i.id)}" aria-current="${i.id===selected}"><span class="q">${E(i.question)}</span><span class="meta">${E(s.experts.find(e=>e.id===i.expert)?.name)} · awaiting answer</span></button>`).join('')}</section><section class="detail"><div class="d-head"><div class="row"><span class="pill gap">Needs human expertise</span>${q.evidence.startsWith(C_MARKER)?'<span class="pill plain">From C · spotted before anyone asked</span>':'<span class="pill plain">From A · asked by an engineer</span>'}</div><h2>${E(q.question)}</h2></div><div class="d-body"><p class="k">Assigned to ${E(s.experts.find(e=>e.id===q.expert)?.name)}. You are playing this expert for the demo.</p><details><summary>What Synaptiq found</summary><p class="live-answer">${E(q.evidence.replace(C_MARKER,'').trim())}</p></details><label class="field"><span>Draft by Synaptiq <span class="k">· fill in each [Confirm: …], edit anything, then approve</span></span><textarea id="expertAnswer" placeholder="Synaptiq is drafting an answer from what it found…"></textarea></label><p class="live-pending" id="draftStatus" hidden>Synaptiq is drafting an answer from what it found…</p><label class="field">Applies to<input id="answerScope" value="Company knowledge" placeholder="For example: payments-retry only"></label><button class="btn primary" id="publishLive">Approve and publish to company memory</button><div id="publishFeedback" aria-live="polite"></div></div></section></div>`:`<section class="detail done-state"><h2>No unanswered questions</h2><p>Ask A something the documents don't explain and choose “Ask this expert,” or send an open gap from C. It will arrive here automatically.</p><a class="btn primary" href="${E(link('a'))}">Open A</a></section>`}`;
      view.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>{if(editing&&!confirm('Discard your unpublished draft?'))return;editing=false;selected=b.dataset.select;render(true);});
      const answer=view.querySelector('#expertAnswer');if(answer){answer.oninput=()=>editing=true;fillDraft(q.id,answer);}
      const publish=view.querySelector('#publishLive');if(publish)publish.onclick=()=>task(publish,async()=>{const feedback=view.querySelector('#publishFeedback');feedback.replaceChildren();try{if(/\[Confirm:/i.test(answer.value))throw Error('Replace each [Confirm: …] with what you know before publishing.');await request('/api/publish',{id:q.id,answer:answer.value,scope:view.querySelector('#answerScope').value});editing=false;await render(true);toast('Published. A and C can now use your answer.');const note=document.createElement('p');note.className='saved-note';note.innerHTML=`Answer saved. <a href="${E(link('a'))}">Return to A and ask again →</a>`;view.prepend(note);}catch(e){error(feedback,e);}});
    }catch(err){if(!view.querySelector('#expertAnswer')){view.replaceChildren();error(view,err);}}}
    window.addEventListener('focus',()=>render());window.addEventListener('workspace-connected',()=>render(true));setInterval(()=>{if(!document.hidden)render();},4000);render(true);
  }
  function mountC(){
    setup();document.querySelector('#try').innerHTML='<h4>Live context briefing</h4><ol><li>Generate the briefing.</li><li>Send an open gap to its expert.</li><li>Answer it in B.</li><li>Come back here: the gap shows as resolved.</li></ol>';
    const view=document.querySelector('#view');document.querySelector('#restart').textContent='Refresh briefing';document.querySelector('#restart').onclick=brief;
    document.querySelector('.nav').innerHTML=`<a class="on" href="#">Customer briefing</a><a href="${link('a')}">Ask Synaptiq A</a><a href="${link('b')}">Expert inbox B</a>`;
    let gaps=[];
    function intro(){view.innerHTML='<div class="page-h"><h1>Bluewater Logistics</h1><p>Your customer handoff, grounded in the current shared company knowledge.</p></div><section class="panel"><div class="panel-b"><p>See what changed, why it changed, who knows, and which decisions still need an explanation.</p><button class="btn primary" id="generateBrief">Generate current briefing</button><div id="briefResult" aria-live="polite"></div></div></section><section class="panel gap-track"><div class="panel-h"><h2>Gap tracker</h2><span class="k">Gaps sent from this briefing to experts</span></div><div class="panel-b" id="gapTrack"></div></section>';document.querySelector('#generateBrief').onclick=brief;}
    const expertName=(s,id)=>E(s.experts.find(e=>e.id===id)?.name||'the expert');
    // One card per open gap: why Synaptiq thinks it's a gap, and a button to send it to the expert.
    function gapCards(s){return gaps.map((g,i)=>{const sent=s.questions.find(q=>q.question===g.question);
      const action=!sent?`<button class="btn primary" type="button" data-gap="${i}">Ask ${E(g.expert.name)}</button>`:sent.status==='published'?`<span class="pill ok">Resolved by ${expertName(s,sent.expert)}</span>`:`<span class="pill plain">Waiting on ${expertName(s,sent.expert)}</span><a class="btn quiet" href="${E(link('b'))}" target="_blank" rel="noopener">Open B to answer it</a>`;
      return `<article class="gap-card"><b>${E(g.question)}</b><p class="k">Why this is a gap: ${E(g.reason)}</p><div class="row">${action}</div></article>`;}).join('');}
    // Every gap C has sent to an expert, with its status. Persists across briefings and page reloads.
    function tracker(s){const sent=s.questions.filter(q=>q.evidence.startsWith(C_MARKER));if(!sent.length)return '<p class="k">Nothing sent yet. Generate the briefing, then send an open gap to its expert.</p>';
      return sent.map(q=>`<article class="gap-card ${q.status==='published'?'done':''}"><div class="row">${q.status==='published'?`<span class="pill ok">Resolved by ${expertName(s,q.expert)}</span>`:`<span class="pill gap">Waiting on ${expertName(s,q.expert)}</span>`}</div><b>${E(q.question)}</b>${q.status==='published'?`<p class="live-answer">${E(q.answer)}</p>`:''}</article>`).join('')+(sent.some(q=>q.status==='published')?'<p class="k">Refresh the briefing to see resolved answers folded in.</p>':'');}
    async function update(){try{const s=await refreshState();const list=document.querySelector('#gapList'),track=document.querySelector('#gapTrack');
      const changed=(el,html)=>{if(el.dataset.html===html)return false;el.dataset.html=html;el.innerHTML=html;return true;};
      if(list&&changed(list,gapCards(s))){list.querySelectorAll('[data-gap]').forEach(b=>b.onclick=()=>task(b,async()=>{const g=gaps[b.dataset.gap];await request('/api/route',{question:g.question,expert_id:g.expert.id,evidence:C_MARKER+' '+g.reason});toast('Sent to '+E(g.expert.name)+"'s inbox.");await update();}));}
      if(track)changed(track,tracker(s));}catch(e){}}
    async function brief(){const b=document.querySelector('#generateBrief');if(b.disabled)return;b.disabled=true;const root=document.querySelector('#briefResult');root.innerHTML='<p class="live-pending">Reading current documents and expert answers…</p>';try{const r=await request('/api/brief',{});gaps=r.gaps||[];root.innerHTML=`<article class="live-brief"><p class="live-answer">${E(r.answer)}</p>${gaps.length?'<h3>Open gaps Synaptiq spotted</h3><div class="gap-list" id="gapList"></div>':''}<h3>Supporting sources</h3>${sourceList(r.sources)}<a class="btn" href="${E(link('a'))}">Ask a follow-up in A</a></article>`;await update();}catch(e){root.replaceChildren();error(root,e);}finally{b.disabled=false;b.textContent='Refresh from company knowledge';}}
    intro();update();window.addEventListener('focus',update);window.addEventListener('workspace-connected',update);setInterval(()=>{if(!document.hidden)update();},4000);
  }
  return {mountA,mountB,mountC,setup};
})();
