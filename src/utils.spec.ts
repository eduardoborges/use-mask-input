/* eslint-disable import/no-extraneous-dependencies */
import { describe } from 'vitest';
import { compose } from './utils';

describe('test use_mask_input', (test) => {
  test('test use-mask-input.flow', ({ expect }) => {
    const sum = compose(
      (x: number) => x + 1,
      (x: number) => x + 1,
    );
    expect(sum(1)).toBe(3);
  });
});
