/**
 * Parse CSS custom properties from a raw CSS string.
 * Extracts all --variable: value declarations from :root or any context.
 */
export function parseCssCustomProperties(css: string): Record<string, string> {
  const props: Record<string, string> = {};
  const propRegex = /(--[\w-]+)\s*:\s*([^;]+)/g;
  let match: RegExpExecArray | null;
  while ((match = propRegex.exec(css)) !== null) {
    props[match[1]!] = match[2]!.trim();
  }
  return props;
}
