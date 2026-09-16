// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://docs.superpipeline.dev',
  integrations: [
    starlight({
      title: 'superpipeline',
      description:
        'A kanban board where agents do the work and a human approves it. Docs for operating a board and for building agents that work one.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/SuperJackfruitLabs/superpipeline' },
      ],
      // Three sections, in the order a reader needs them. See
      // docs/superpowers/specs/2026-09-12-publishing-user-docs-design.md.
      sidebar: [
        {
          label: 'Start',
          items: [
            { label: 'What superpipeline is', slug: 'start/what-it-is' },
            { label: 'Your first board', slug: 'start/first-board' },
            { label: 'Concepts', slug: 'start/concepts' },
          ],
        },
        {
          label: 'Use it',
          items: [
            { label: 'Boards and pipelines', slug: 'use/boards' },
            { label: 'Cards and their states', slug: 'use/cards' },
            { label: 'Agents and capabilities', slug: 'use/agents' },
            { label: 'Approval gates', slug: 'use/gates' },
            { label: 'People and roles', slug: 'use/people' },
            { label: 'From the terminal', slug: 'use/cli' },
          ],
        },
        {
          label: 'Build on it',
          items: [
            { label: 'Writing an agent', slug: 'build/agent-contract' },
            { label: 'MCP tools', slug: 'build/mcp' },
            { label: 'Authentication', slug: 'build/auth' },
          ],
        },
      ],
    }),
  ],
});
