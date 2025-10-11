declare module "ioredis" {
  export default class IORedis {
    constructor(connection: string, options?: Record<string, unknown>);
    waitUntilReady?(): Promise<void>;
    quit(): Promise<void>;
  }
}
