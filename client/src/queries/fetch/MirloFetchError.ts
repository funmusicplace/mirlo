export class MirloFetchError extends Error {
  res: Response;

  constructor(res: Response, message?: string) {
    super(message);
    this.res = res;
  }

  get status() {
    console.log("getting status", this.res.status);
    return this.res.status;
  }
}
