export type MaskAPI = {
  format: (value: string) => string;
  bind: (input: Input) => () => void;
};

export type Input = HTMLInputElement | HTMLTextAreaElement | HTMLInputElement | null;

export type Pattern = string;

export type PatternOptions = {
  decimal: {
    symbol?: string;
    thousandSeparator?: string;
    decimalSeparator?: string;
  }
} | undefined;
