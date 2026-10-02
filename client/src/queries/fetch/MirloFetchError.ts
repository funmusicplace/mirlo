export class MirloFetchError extends Error {
  res: Response;
  code?: string;

  constructor(res: Response, message?: string, code?: string) {
    super(message);
    this.res = res;
    this.code = code;
  }

  get status() {
    return this.res.status;
  }
}
