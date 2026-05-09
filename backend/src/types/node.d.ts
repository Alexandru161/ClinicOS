declare const process: {
  env: Record<string, string | undefined>;
  on(event: string, listener: (...args: never[]) => void): void;
  exit(code?: number): never;
};