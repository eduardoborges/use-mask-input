export function flow(...funcs: Array<Function>) : Function {
  const { length } = funcs;
  let index = length;
  while (index--) {
    if (typeof funcs[index] !== 'function') {
      throw new TypeError('Expected a function');
    }
  }
  return (...args: Array<Function>) => {
    let i = 0;
    let result = length ? funcs[i].apply(this, args) : args[0];
    while (++i < length) {
      result = funcs[i].call(this, result);
    }
    return result;
  };
}
