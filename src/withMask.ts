import Inputmask from 'inputmask';

const withFinalFormMask = (
  mask: Inputmask.Options['mask'],
  options?: Inputmask.Options,
) => (input: HTMLElement | HTMLInputElement | null) => {
  //
  const maskInput = Inputmask({
    mask,
    ...options,
  });

  if (input) {
    maskInput.mask(input);
  }

  return input;
};

export default withFinalFormMask;
