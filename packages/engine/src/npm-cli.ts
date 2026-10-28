export interface NpmInvocation {
  command: string;
  args: string[];
  shell?: boolean;
}

/** Resolve npm without relying on cmd.exe's handling of .cmd files when the
 * current Node process was started by npm. */
export function resolveNpmInvocation(args: readonly string[]): NpmInvocation {
  const npmCliPath = process.env.npm_execpath;
  if (npmCliPath) {
    return { command: process.execPath, args: [npmCliPath, ...args] };
  }

  if (process.platform === 'win32') {
    return { command: 'npm.cmd', args: [...args], shell: true };
  }

  return { command: 'npm', args: [...args] };
}
