/* Inbox tabs for the composition contract. Needs helpers.js. */
window.ROUNDS = window.ROUNDS || {};
(() => {
const head = (v, tab) => mast(v, '<span class="eyebrow">Superpipeline · Inbox</span>', btn(v, 'New card'))
  + (v === 'studio'
    ? `<div class="body" style="padding-top:8px"><div class="vk-hero vk-hero--studio" data-size="section" data-tone="needs"><div class="vk-hero__figure">18</div><div class="vk-hero__text"><p class="vk-hero__kicker">Across three boards · one running</p><h1 class="vk-hero__headline">Eighteen cards want you.</h1></div></div></div>`
    : `<div class="hero-row"><h1>${v === 'daylight' ? 'Working late, Rakesh? 18 cards want you.' : '18 cards want you.'}</h1><p class="lede">One review, one stopped agent, and 16 cards nobody is set up to work. One running.</p></div>`)
  + `<div class="body">${scope(v, [['All boards', 18, true, true], ['Planning & Roadmap', 13], ['Developer Experience', 3], ['Marketing & Community', 2], ['8 more', 0]])}
     <div class="tabsrow">${tabs(v, [['Needs you', 18, tab === 'needs'], ['Running', 1, tab === 'running'], ['Spend', '$4.20', tab === 'spend'], ['Activity', 548, tab === 'activity']])}<span class="ftoggle">${btn(v, 'Filter', 'ghost')}</span></div>`;

const PAGES = {
  running: {
    rules: '<b>Contract:</b> one row per running card: who is working it (face and name), the card, the stage, how long, the cost so far · the only verb is Open · a card that stops leaves this list and enters Needs you with motion · when nothing runs, one sentence says so and the headline already said it.',
    render(v) {
      return head(v, 'running') + `<section class="group">${sh(v, 1, 'Running', '1 card')}
        <div class="${v === 'daylight' ? 'daylight-rows' : ''}">
          <div class="rowline" data-row>${face(v, 'BB', 'working')}<div><p class="t">Make the docs checks required on every product repo</p><p class="meta">${state(v, 'working', 'Working')} builder-bo · Planning &amp; Roadmap · Shape · since 14:02 · 11 min</p></div><span class="cost">$4.20</span><div class="act">${btn(v, 'Open', 'quiet')}</div></div>
        </div></section>
        <p class="why">Agents on other boards appear here too; the board chip says which. Nothing else runs right now.</p></div><p class="foot">18 need you · 1 running · $4.20 in the last 7 days · synced 14:13</p>`;
    }
  },
  spend: {
    rules: '<b>Contract:</b> one figure (the window total), the cap beside it as words and one meter, then who spent it as a short list · one verb: Set a cap (or Change the cap) · the window is a quiet toggle (7 days / 5 hours) · no second total anywhere.',
    render(v) {
      return head(v, 'spend') + `<section class="group spend">${sh(v, 1, 'Spend', 'all boards · last 7 days')}
        <div class="big"><b>$4.20</b><span>of a $50.00 cap · 8%</span></div>
        <div class="vk-meter" role="img" aria-label="4 dollars 20 of 50"><span class="vk-meter__fill" style="width:8.4%"></span></div>
        <div class="groupact">${btn(v, 'Change the cap', 'secondary')}<span class="menu">${btn(v, 'Last 7 days', 'quiet')}</span></div>
        <div class="agents">
          <div class="rowline" data-row>${face(v, 'BB', 'working')}<span class="t">builder-bo</span><span class="cost">$4.20</span></div>
          <div class="rowline" data-row>${face(v, 'KK', 'needs')}<span class="t">keeper-karen</span><span class="cost">$0.00</span></div>
        </div>
        <p class="why">A card over its own cap shows in Needs you under Over budget; the cap here is the workspace's.</p>
      </section></div><p class="foot">18 need you · 1 running · $4.20 in the last 7 days · synced 14:13</p>`;
    }
  },
  activity: {
    rules: '<b>Contract:</b> one row per card with activity, newest first: an unread mark, the card, what happened last and when, and how many earlier entries fold under it · Unread only / Show all is one quiet toggle · 20 rows, then Show 20 more · a row that needs you links to its group in Needs you instead of repeating the buttons.',
    render(v) {
      const rows = [
        ['unread', 'Agents open PRs through SuperToolkit: forge done, GitHub App next', 'Still unclaimed after three days in Proposed.', '20:15', 3],
        ['unread', 'Protect release tags on every product repo', 'Review needed at Approved.', '16:45', 5],
        ['unread', 'Accounts UI: vibekit from npm', 'Still unclaimed after two days in Proposed.', '15:20', 1],
        ['read', 'Report disk usage on the build host: run df -h and report it, change nothing', 'Review needed at sign-off.', '16:26', 2],
        ['read', 'Gate in chat shows the linked artifact, pinned to its version', 'Sent back to Fix from Integrate: the second acceptance criterion is absent.', '07:47', 0],
      ];
      return head(v, 'activity') + `<section class="group act">${sh(v, 1, 'Activity', '548 · 129 unread')}
        <div class="groupact"><span class="menu">${btn(v, 'Unread only', 'ghost')}</span>${btn(v, 'Mark all read', 'quiet')}</div>
        <div class="${v === 'daylight' ? 'daylight-rows' : ''}">
        ${rows.map(([r, t, w, at, n]) => `<div class="rowline" data-row><span class="${r}" aria-hidden="true"></span><div><p class="t">${t}</p><p class="what">${w}${n ? ` · <button class="more">${n} earlier</button>` : ''}</p></div><span class="when">${at}</span></div>`).join('')}
        </div>
        <button class="more">Show 20 more</button>
      </section></div><p class="foot">18 need you · 1 running · $4.20 in the last 7 days · synced 14:13</p>`;
    }
  }
};
  for (const k of Object.keys(PAGES)) PAGES[k].title = 'Inbox · ' + k[0].toUpperCase() + k.slice(1);
  window.ROUNDS.inboxTabs = PAGES;
})();
