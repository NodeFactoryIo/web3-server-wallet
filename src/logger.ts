import debug from "debug";

export interface ILogger<IReturn = void> {
  info(...params: any): IReturn;
  debug(...params: any): IReturn;
  error(...params: any): IReturn;
}

export class DefaultLogger implements ILogger {
  private infoLogger = debug("web3-server-wallet:INFO")
  private debugLogger = debug("web3-server-wallet:DEBUG")
  private errorLogger = debug("web3-server-wallet:ERROR")

  public info(message: string): void {
    this.infoLogger(message);
  }

  public debug(message: string): void {
    this.debugLogger(message);
  }

  public error(message: string): void {
    this.errorLogger(message);
  }
}

export const defaultLogger = new DefaultLogger();
