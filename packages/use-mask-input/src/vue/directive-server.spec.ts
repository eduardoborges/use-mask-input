/* eslint-disable import-x/no-extraneous-dependencies */
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, defineComponent, h, withDirectives } from 'vue';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

import vMaskInput from './directive';

/**
 * SSR contract: rendering a template that uses `v-mask-input` must produce
 * markup without throwing, and without Vue warning about an unhandled custom
 * directive — which is what `getSSRProps` exists to prevent.
 */
describe('v-mask-input server-side', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the input without throwing and without warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const App = defineComponent({
      render: () => withDirectives(h('input'), [[vMaskInput, 'cpf']]),
    });

    const html = await renderToString(createSSRApp(App));

    expect(html).toContain('<input');
    expect(warn).not.toHaveBeenCalledWith(
      expect.stringContaining('directive'),
      expect.anything(),
    );
  });

  it('contributes no props to the rendered markup', () => {
    expect(vMaskInput.getSSRProps?.({} as never, {} as never)).toEqual({});
  });
});
