/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-unsafe-return */
export default function flow(...funcs: Function[]): Function {
  const { length } = funcs;
  let index = length;
  while (index > 0) {
    index -= 1;
    if (typeof funcs[index] !== 'function') {
      throw new TypeError('Expected a function');
    }
  }
  return (...args: Function[]) => {
    let i = 0;
    let result = length ? funcs[i].apply(this, args) : args[0];
    while (i + 1 < length) {
      i += 1;
      result = funcs[i].call(this, result);
    }
    return result;
  };
}
