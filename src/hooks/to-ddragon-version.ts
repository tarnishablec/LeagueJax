export function toDdragonVersion(version: string | undefined): string | null {
  if (!version || version.trim().length === 0) {
    return null;
  }

  const segments = version
    .trim()
    .split(".")
    .filter((segment) => segment.length > 0);

  if (segments.length < 2) {
    return null;
  }

  const major = segments[0];
  const minor = segments[1];
  const patch = segments[2] ?? "1";
  return `${major}.${minor}.${patch}`;
}
