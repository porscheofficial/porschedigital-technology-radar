export class ScaffoldError extends Error {
  readonly fix: string;
  readonly cause?: unknown;

  constructor(message: string, fix: string, cause?: unknown) {
    super(message);
    this.name = "ScaffoldError";
    this.fix = fix;
    this.cause = cause;
  }
}
