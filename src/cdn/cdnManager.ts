import {Config} from '@config/config';
import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ITimedEvents from '@dispatcher/interfaces/ITimedEvents';
import EErrorCode from '@error/enum/EErrorCode';
import EErrorSeverity from '@error/enum/EErrorSeverity';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';

class CdnManager {
  private _logger: Logger = new Logger(ELogType.CDN);
  private _cdns: Array<string> = [];
  private _currentCdn: number = 0;

  constructor(manifestUrl: string) {
    Config.cdn.cdns.forEach((cdn: string) => {
      const cdnOrigin: string = this.getOrigin(cdn);
      this._cdns.push(cdnOrigin);
    });

    const manifestOrigin: string = this.getOrigin(manifestUrl);
    if (this._cdns.indexOf(manifestOrigin) < 0) {
      this._cdns.unshift(manifestOrigin);
    }

    this.addListeners();
  }

  private addListeners(): void {
    Dispatcher.on(EEvent.TAPE_ERROR, this.onError);
  }

  private removeListeners(): void {
    Dispatcher.off(EEvent.TAPE_ERROR, this.onError);
  }

  private onError = (tapeErrorEvent: ITimedEvents[EEvent.TAPE_ERROR]): void => {
    const {code} = tapeErrorEvent.detail;
    if (code === EErrorCode.XHR_RETRY) {
      this.next();
    }
  };

  private getCurrent(): string | null {
    return this._cdns[this._currentCdn] ?? null;
  }

  private getOrigin = (url: string): string => {
    const {origin} = new URL(url);

    return origin;
  };

  private next = (): void => {
    this._currentCdn++;

    const cdn: string | null = this.getCurrent();
    if (cdn) {
      this._logger.info('CDN change', cdn);
      Dispatcher.emit({
        name: EEvent.CDN_CHANGE,
        cdn
      });
    } else {
      const message: string = 'CDN exhausted';
      this._logger.error(message);
      Dispatcher.emit({
        name: EEvent.TAPE_ERROR,
        message,
        code: EErrorCode.CDN_EXHAUSTED,
        severity: EErrorSeverity.FATAL
      });
    }
  };

  public getUrl(url: string): string {
    const currentCdn: string | null = this.getCurrent();
    if (!currentCdn) return '';

    const origin: string = this.getOrigin(url);
    if (this._cdns.indexOf(origin) < 0) {
      return url;
    } else {
      const {pathname, search} = new URL(url);

      return `${currentCdn}${pathname}${search}`;
    }
  }

  public destroy(): void {
    this._logger.info('Destroying Cdn manager');
    this.removeListeners();
    this._cdns.length = 0;
    this._currentCdn = 0;
  }
}

export default CdnManager;
