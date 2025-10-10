declare module "semver" {
  export function satisfies(version: string, range: string, options?: { includePrerelease?: boolean }): boolean;
  export function validRange(range: string, options?: { includePrerelease?: boolean }): string | null;
}
