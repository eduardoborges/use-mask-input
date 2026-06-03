import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import { useEffect } from 'react';

const SITE = 'https://use-mask-input.eduardoborges.dev';

type ModelContext = {
  registerTool: (tool: {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    execute: (input: Record<string, unknown>) => Promise<unknown>;
  }) => { unregister?: () => void } | void;
};

function getModelContext(): ModelContext | undefined {
  if (!ExecutionEnvironment.canUseDOM) return undefined;
  return (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
}

export default function WebMcpTools(): null {
  useEffect(() => {
    const modelContext = getModelContext();
    if (!modelContext?.registerTool) return undefined;

    const cleanups: Array<() => void> = [];

    const register = (
      name: string,
      description: string,
      inputSchema: Record<string, unknown>,
      execute: (input: Record<string, unknown>) => Promise<unknown>,
    ): void => {
      const result = modelContext.registerTool({ name, description, inputSchema, execute });
      if (result && typeof result === 'object' && typeof result.unregister === 'function') {
        cleanups.push(result.unregister);
      }
    };

    register(
      'list_documentation_links',
      'Returns canonical URLs for use-mask-input documentation and agent discovery files.',
      {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      async () => ({
        intro: `${SITE}/intro`,
        apiReference: `${SITE}/api-reference`,
        llmTxt: `${SITE}/llm.txt`,
        llmFullTxt: `${SITE}/llm-full.txt`,
        apiCatalog: `${SITE}/.well-known/api-catalog`,
        agentSkills: `${SITE}/.well-known/agent-skills/index.json`,
        robotsTxt: `${SITE}/robots.txt`,
      }),
    );

    register(
      'search_documentation',
      'Suggests documentation paths by topic keyword (static routing hints, not a live search index).',
      {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Topic such as cpf, hook-form, antd, tanstack' },
        },
        required: ['query'],
        additionalProperties: false,
      },
      async ({ query }) => {
        const q = String(query ?? '').toLowerCase();
        const routes: Record<string, string> = {
          intro: '/intro',
          api: '/api-reference',
          'api-reference': '/api-reference',
          cpf: '/tutorial-basics/alias-mask',
          cnpj: '/tutorial-basics/alias-mask',
          mask: '/tutorial-basics/static-mask',
          hook: '/intro',
          'hook-form': '/intro',
          antd: '/antd',
          tanstack: '/tanstack-form',
          shadcn: '/shadcn',
        };
        const match = Object.entries(routes).find(([key]) => q.includes(key));
        return {
          query: q,
          url: match ? `${SITE}${match[1]}` : `${SITE}/intro`,
        };
      },
    );

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
