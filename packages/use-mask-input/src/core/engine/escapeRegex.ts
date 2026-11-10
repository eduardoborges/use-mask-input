const REGEX_SPECIAL_CHARACTERS = /[/.*+?|()[\]{}\\$^]/g;

/** Escapes every character that has a meaning in a regular expression. */
export function escapeRegex(str: string): string {
  return str.replace(REGEX_SPECIAL_CHARACTERS, '\\$&');
}
