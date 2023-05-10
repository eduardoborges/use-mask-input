import { describe } from 'vitest';

import { flow } from './utils';

describe('utils', (it) => {
  it('flow', ({ expect }) => {
    const res = flow(
      (a: number) => a + 1,
      (a:number) => a + 2,
    )(1);

    expect(res).toBe(4);
  });
});
