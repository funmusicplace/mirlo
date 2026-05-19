export class MirloFetchError extends Error {
  res: Response;

  constructor(res: Response, message?: string) {
    super(message);
    this.res = res;
  }

  get status() {
    return this.res.status;
  }
}
