// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sjlDocs from '@superjackfruitlabs/vibekit-docs';

export default defineConfig({
  site: 'https://docs.superpipeline.dev',
  integrations: [
    starlight({
      title: 'SuperPipeline',
      description:
        'A kanban board where agents do the work and a human approves it. Docs for operating a board and for building agents that work one.',
      // The suite's docs theme: vibekit's gold, the faces, the mark beside the name, the street,
      // status badges, the footers, the 404, the edit link and llms.txt. See
      // @superjackfruitlabs/vibekit-docs's README.
      plugins: [
        sjlDocs({
          product: 'superpipeline',
          status: 'lights on',
          // /llms.txt, /llms-full.txt and /llms-small.txt, for agents reading these docs.
          llms: {
            description:
              'SuperPipeline is a kanban board where agents do the work and a human approves it. A ' +
              'column can be owned by a capability rather than a person, and any agent holding that ' +
              'capability can claim a card sitting in it. A stage can carry an approval gate, where a ' +
              'card stops until somebody decides, and a stage can state what it must see before it ' +
              'believes a run finished; a completion that does not produce it parks the card on a ' +
              'person instead of advancing it. SuperPipeline stands alone as a board for your own ' +
              'agents and can optionally be linked to an AgentPod fleet. Agents work a board through ' +
              'the supi CLI or the MCP tools, both documented in full in the reference pages.',
          },
        }),
      ],
      favicon: '/favicon.svg',
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: 'https://superpipeline.dev/og.png' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: 'https://superpipeline.dev/og.png' } },
      ],
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/SuperJackfruitLabs/superpipeline' },
      ],
      // The suite's five groups, in the order a reader needs them (the four of
      // docs/superpowers/specs/2026-09-12-publishing-user-docs-design.md, plus Run it). No page
      // moved for this, so no URL changed.
      sidebar: [
        {
          label: 'Start',
          items: [
            { label: 'What SuperPipeline is', slug: 'start/what-it-is' },
            { label: 'Your first board', slug: 'start/first-board' },
            { label: 'Concepts', slug: 'start/concepts' },
            { label: 'Install on your phone', slug: 'start/install-on-your-phone' },
          ],
        },
        {
          label: 'Use it',
          items: [
            { label: 'Boards and pipelines', slug: 'use/boards' },
            { label: 'Cards and their states', slug: 'use/cards' },
            { label: 'Comments on a card', slug: 'use/comments' },
            { label: 'Planning work', slug: 'use/planning' },
            { label: 'Recurring cards', slug: 'use/recurring' },
            { label: 'Stage runbooks and completion', slug: 'use/runbooks' },
            { label: 'Agents and capabilities', slug: 'use/agents' },
            { label: 'Agents that plan', slug: 'use/autonomy' },
            { label: 'Approval gates', slug: 'use/gates' },
            { label: 'From the terminal', slug: 'use/cli' },
          ],
        },
        {
          label: 'Build on it',
          items: [
            { label: 'Writing an agent', slug: 'build/agent-contract' },
            { label: 'MCP tools', slug: 'build/mcp' },
            { label: 'Authentication', slug: 'build/auth' },
            { label: 'Events', slug: 'build/events' },
            { label: 'Services', slug: 'build/services' },
          ],
        },
        {
          label: 'Run it',
          items: [
            { label: 'People and roles', slug: 'use/people' },
            { label: 'Registering an agent', slug: 'use/register-an-agent' },
            { label: 'When a card gets stuck', slug: 'use/stuck-cards' },
          ],
        },
        // Generated pages: `reference/cli/*` from packages/cli/src/commands.ts, `reference/mcp-tools`
        // from the MCP server's registrations. Both are guarded in CI — see each generator.
        {
          label: 'Reference',
          items: [
            { label: 'supi CLI', items: [{ autogenerate: { directory: 'reference/cli' } }] },
            { label: 'MCP tools', slug: 'reference/mcp-tools' },
          ],
        },
      ],
    }),
  ],
});
