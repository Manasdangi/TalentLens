/** Plain-text version of **bold** markup, for copying into a resume. */
export function stripBold(text: string) {
  return text.replace(/\*\*/g, '');
}
