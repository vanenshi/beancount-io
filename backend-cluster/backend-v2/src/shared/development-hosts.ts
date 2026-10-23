/**
 * Hostname suffixes that only ever resolve on a developer machine:
 * OrbStack domains (`*.orb.local`), the reserved `.localhost` TLD, and the
 * reserved `.test` TLD. Callers honor them only outside production.
 */
const DEVELOPMENT_HOST_SUFFIXES = [".orb.local", ".localhost", ".test"];

/** Whether `hostname` sits under a developer-machine-only domain. */
export function isDevelopmentHostname(hostname: string): boolean {
  return DEVELOPMENT_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}
