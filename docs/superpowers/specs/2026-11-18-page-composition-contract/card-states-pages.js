/* Card states for the composition contract: one composition, the state block swaps per state. Needs helpers.js. */
window.ROUNDS = window.ROUNDS || {};
(() => {
  const STAGES = ['Proposed', 'Shaped', 'Planned', 'Building', 'Reviewing', 'Approved', 'Done'];
  const trackFor = (v, cur, needs) => track(v, STAGES.map((name, i) => ({ name, n: i <= cur ? 1 : 0, ct: i < cur ? 'done' : (i === cur ? (needs ? 'you · 10 h' : 'builder-bo · 2 h') : 'next'), needs: i === cur && needs })), cur);
  const head = (v, stage) => `<div class="cardhead"><p class="crumb">Planning &amp; Roadmap · ${stage} · card 4854</p><h1>Protect release tags on every product repo</h1><div class="tools">${btn(v, 'Open in new window', 'tool')}${btn(v, 'Close', 'tool')}</div></div>`;
  const facts = () => `<dl class="facts"><div><dt>Owner</dt><dd>Rakesh</dd></div><div><dt>Priority</dt><dd>P1</dd></div><div><dt>Labels</dt><dd>estate, release</dd></div><div><dt>Due</dt><dd>none</dd></div><div><dt>Attempt</dt><dd>5 of 5</dd></div><div><dt>Asked by</dt><dd>Rakesh</dd></div></dl>`;
  const brief = (v) => `<section class="group">${sh(v, 1, 'The brief')}<p>Only superlibrary and supermessage have the v* tag ruleset. Apply the estate release tag ruleset to agentpod, salaam, accounts and superwitness, and protect v* tags on the forge for the forge-primary repos.</p></section>`;
  const produced = (v, n) => `<section class="group">${sh(v, 2, `What attempt ${n} produced`, '1 document · 3 criteria')}
    <div class="artifact"><div><p class="t">Protect v* release tags on every product repository — implementation specification</p><p class="meta">version 1 · SuperLibrary · 10 h ago</p></div>${btn(v, 'Open', 'secondary')}</div>
    <ul class="checklist"><li><span class="k">AC-01</span><span>Fixed host split: the inventory names exactly the GitHub-primary repos and the forge-primary ones.</span></li><li><span class="k">AC-02</span><span>Every product repo refuses a v* tag push from anyone but the operator.</span></li><li><span class="k">AC-03</span><span>The push mirror from forge to GitHub still succeeds after the ruleset.</span></li></ul></section>`;
  const tail = (v) => `${disc(v, 'Conversation and history', '12 entries · last 10 h ago', '<p class="meta">Attempt 5 finished · attempt 4 sent back from Reviewing · …</p>', false)}${disc(v, 'Raw data', 'JSON', '<p class="meta">{ "acceptance": [ … ] }</p>', false)}`;
  const field = (v, label, ph, rows) => `<label class="vk-field"><span class="vk-field__label">${label}</span><textarea class="vk-field__input vk-field__input--textarea" rows="${rows}" placeholder="${ph}"></textarea></label>`;
  const choice = (v, name, opts) => `<div class="choices">${opts.map(([l, d, on]) => `<label class="vk-choice vk-choice--pick"><input class="vk-choice__input" type="radio" name="${name}"${on ? ' checked' : ''}><span class="vk-choice__mark"></span><span class="vk-choice__text"><span class="vk-choice__label">${l}</span><span class="vk-choice__desc">${d}</span></span></label>`).join('')}</div>`;

  const STATE = {
    gate: (v) => `<div class="state panel" data-section="state"><div><p><b>keeper-karen asks you to approve attempt 5.</b> It finished 10 hours ago and produced one document. Approving moves the card to Done.</p>
      ${choice(v, 'gate', [['Approve', 'The work is done; move the card on.', true], ['Request changes', 'Send it back to Building with a note the agent will read.', false]])}
      ${field(v, 'Note to the agent (optional)', 'What to change, if anything', 2)}
      ${disc(v, 'What you are signing', 'subject sha256 · 2 artifacts', '<p class="meta">spec v1 · test(api): pin immutable approval subject binding · digest 1c1fcc…874e</p>', false)}</div>
      <div class="act">${btn(v, 'Approve', 'primary', false)}${btn(v, 'Move', 'secondary', false)}</div></div>`,
    question: (v) => `<div class="state panel" data-section="state"><div><p><b>scout-sam asks:</b> Which repos should the ruleset cover first, the forge-primary ones or the GitHub-primary ones?</p>
      ${choice(v, 'q', [['Forge-primary first', 'treaty, superpipeline, superexchange, superdispatch, supertoolkit', true], ['GitHub-primary first', 'agentpod, salaam, accounts, superwitness', false]])}
      ${field(v, 'Or answer in your own words', 'Say what the agent should do', 2)}</div>
      <div class="act">${btn(v, 'Answer', 'primary', false)}${btn(v, 'Move', 'secondary', false)}</div></div>`,
    stopped: (v) => `<div class="state panel" data-section="state"><div><p><b>builder-bo stopped in Building</b> after attempt 3: the tests failed twice, the second time on the push mirror. It will read your note before it tries again.</p>
      ${field(v, 'Note for the next attempt', 'What to do differently', 2)}</div>
      <div class="act">${btn(v, 'Resume', 'primary', false)}${btn(v, 'Move', 'secondary', false)}</div></div>`,
    done: (v) => `<div class="state panel" data-section="state"><div><p><b>Shipped by builder-bo on 14 November.</b> Nothing to do. The document it produced is below.</p></div><div class="act">${btn(v, 'Move', 'secondary', false)}</div></div>`,
    archived: (v) => `<div class="state panel" data-section="state"><div><p><b>Archived on 2 October.</b> Agents cannot claim it and it leaves the board. Restore it to bring it back to Done.</p></div><div class="act">${btn(v, 'Restore', 'primary', false)}</div></div>`,
    loading: (v) => `<div class="state panel" data-section="state" aria-busy="true"><div><p class="meta">Loading the card…</p><span class="vk-skeleton" style="width:70%"></span><span class="vk-skeleton" style="width:45%"></span></div></div>`,
    error: (v) => `<div class="vk-notice vk-notice--error" role="alert"><span class="vk-notice__icon">⊗</span><div><p class="vk-notice__title">Could not load the card.</p><p>The service did not answer. Nothing was lost.</p></div>${btn(v, 'Try again', 'secondary')}</div>`
  };
  const META = {
    gate: ['Decision pending', 5, true, 'Approved', 'The decision panel replaces the state sentence: what is asked, the two options, a note, and what you sign behind a disclosure. The brief and the produced work stay below.'],
    question: ['Question pending', 4, true, 'Shaped', 'The question panel: the agent\'s question as a sentence, its options as choices, or a free answer. Answer is the one primary.'],
    stopped: ['Stopped', 3, true, 'Building', 'Why it stopped in one sentence, a note field the agent will read, Resume as the primary and Move beside it.'],
    done: ['Done', 6, false, 'Done', 'No panel: one sentence says who shipped it and when. Nothing to do; the produced work is below.'],
    archived: ['Archived', 6, false, 'Done', 'An archived card says so in one sentence with Restore as the only action; the rest of the card stays readable.'],
    loading: ['Loading', 5, true, 'Approved', 'The head and the track draw at once from the board snapshot; the state block waits, says what it waits for, and after 8 s says the server is slow and offers Try again.'],
    error: ['Error', 5, true, 'Approved', 'A load that fails says what happened and offers Try again; the head and track stay so the person knows which card this is.']
  };
  const card = (v, key, wide) => {
    const [label, cur, needs, stage, note] = META[key];
    const body = key === 'error' ? STATE.error(v) : STATE[key](v);
    return `${head(v, stage)}<div class="body" style="padding-top:16px">${trackFor(v, cur, needs)}${body}${key === 'loading' ? '' : facts()}${key === 'loading' ? '' : brief(v)}${key === 'loading' || key === 'question' ? '' : produced(v, cur === 3 ? 3 : 5)}${key === 'loading' ? '' : tail(v)}</div>`;
  };
  const rules = (key) => `<b>${META[key][0]}:</b> ${META[key][4]}`;
  const pages = {};
  for (const key of Object.keys(META)) pages['card-' + key] = { title: 'Card · ' + META[key][0], rules: rules(key), render: (v) => card(v, key) };
  pages['card-phone'] = { title: 'Card · phone sheet', rules: '<b>Phone (390px):</b> the same composition stacks: head, track (scrolls sideways if it must), the state block, facts in two columns, the brief, the produced work, the disclosures. Tools sit under the title.', render: (v) => card(v, 'gate'), phone: true };
  window.ROUNDS.cardStates = pages;
})();
