export const isServer = !(
  typeof window !== 'undefined'
  && window.document
  && window.document.createElement
);

export function flow(...funcs: Function[]): (...args: Function[]) => any {
  const { length } = funcs;
  return (...args: Function[]) => {
    let i = 0;
    let result = length ? funcs[i].apply(this, args) : args[0];
    while (++i < length) {
      if (funcs[i]) {
        result = funcs[i].call(this, result);
      }
    }
    return result;
  };
}
