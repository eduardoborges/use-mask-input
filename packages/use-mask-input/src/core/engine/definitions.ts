import type { MaskDefinition } from './types';

/**
 * Definitions every mask starts with. This object is the prototype registry
 * itself: `extendDefinitions` merges into it.
 */
export const definitions: Record<string, MaskDefinition> = {
  9: {
    validator: '\\p{N}',
    definitionSymbol: '*',
  },
  a: {
    validator: '\\p{L}',
    definitionSymbol: '*',
  },
  '*': {
    validator: '[\\p{L}\\p{N}]',
  },
};
