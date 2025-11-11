import CdnManager from '@cdn/cdnManager';
import {Config} from '@config/config';
import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ITimedEvents from '@dispatcher/interfaces/ITimedEvents';
import EErrorCode from '@error/enum/EErrorCode';
import EErrorSeverity from '@error/enum/EErrorSeverity';
import ITapeError from '@error/interfaces/ITapeError';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';

import ERequestType from './enum/ERequestType';
import IXhrOptions from './interfaces/IXhrOptions';
import IXhrRequest from './interfaces/IXhrRequest';

class XhrSingleton {
  private _logger: Logger = new Logger(ELogType.XHR);
  private _requests: Map<string, IXhrRequest> = new Map();
  private _cdnManager: CdnManager | null = null;

  set cdnManager(cdnManager: CdnManager) {
    this._cdnManager = cdnManager;
  }

  private addListeners(): void {
    Dispatcher.on(EEvent.CDN_CHANGE, this.onCdnChange);
    window.addEventListener('online', this.onOnline);
  }

  private removeListeners(): void {
    Dispatcher.off(EEvent.CDN_CHANGE, this.onCdnChange);
    window.removeEventListener('online', this.onOnline);
  }

  private onOnline = (): void => {
    this._requests.forEach((xhrRequest: IXhrRequest, url: string) => {
      this.request(url, xhrRequest.requestType, xhrRequest.options);
    });
  };

  private onCdnChange = (_cdnChangeEvent: ITimedEvents[EEvent.CDN_CHANGE]): void => {
    this._requests.forEach((xhrRequest: IXhrRequest, url: string) => {
      this.request(url, xhrRequest.requestType, xhrRequest.options);
    });
  };

  private onAbort(url: string): void {
    const error: ITapeError = {
      message: `Abort ${url}`,
      code: EErrorCode.XHR_ABORT,
      severity: EErrorSeverity.WARN
    };
    this.onError(error);
  }

  private onError(error: ITapeError): void {
    if (error.severity === EErrorSeverity.WARN) {
      this._logger.warn(error.message);
    } else {
      this._logger.error(error.message);
    }

    Dispatcher.emit({
      name: EEvent.TAPE_ERROR,
      ...error
    });
  }

  public init(): void {
    this.addListeners();
  }

  public request(url: string, requestType: ERequestType, options?: IXhrOptions): void {
    const doRequest = (retry: number): void => {
      if (!this._cdnManager) return;

      if (retry <= 0) {
        const message: string = `Max(${Config.xhr.retry}) retry reached | ${requestType} | ${url}`;
        if (requestType === ERequestType.LICENSE) {
          const error: ITapeError = {
            message,
            code: EErrorCode.LICENSE_REQUEST_FAILED,
            severity: EErrorSeverity.FATAL
          };

          this.onError(error);
        } else {
          const error: ITapeError = {
            message,
            code: EErrorCode.XHR_RETRY,
            severity: EErrorSeverity.ERROR
          };

          this.onError(error);
        }

        return;
      }

      const xhr: XMLHttpRequest = new XMLHttpRequest();
      xhr.responseType = options?.responseType || 'arraybuffer';
      xhr.timeout = Config.xhr.timeout;

      this._requests.set(url, {
        requestType,
        xhr,
        options
      });

      const before: number = performance.now();
      const method: string = options?.method || 'GET';
      const actualUrl: string = this._cdnManager.getUrl(url);
      xhr.open(method, actualUrl, true);

      const message: string = `${method} | ${xhr.responseType} | ${actualUrl}`;
      this._logger.debug(`Request: ${message}`);

      xhr.onload = (): void => {
        const timeMs: number = performance.now() - before;
        if (xhr.status >= 200 && xhr.status < 300) {
          this._requests.delete(url);
          const message: string = `${xhr.status} | ${timeMs.toFixed(2)}ms | ${actualUrl}`;
          this._logger.debug(`Response: ${message}`);

          const contentLength: string | null = xhr.getResponseHeader('content-length');
          let bytes: number = contentLength ? +contentLength : 0;
          if (!bytes && requestType === ERequestType.MANIFEST) {
            bytes = xhr.response.length;
          }

          Dispatcher.emit({
            name: EEvent.HTTP_RESPONSE,
            url: actualUrl,
            requestType,
            data: xhr.response,
            timeMs,
            bytes
          });
        } else {
          const error: ITapeError = {
            message: `Generic error ${xhr.status} | ${actualUrl}`,
            code: EErrorCode.XHR_LOAD,
            severity: EErrorSeverity.ERROR
          };
          this.onError(error);

          doRequest(retry - 1);
        }
      };

      xhr.onerror = (): void => {
        if (!navigator.onLine) {
          const error: ITapeError = {
            message: `Network error | ${actualUrl}`,
            code: EErrorCode.XHR_NETWORK,
            severity: EErrorSeverity.ERROR
          };
          this.onError(error);
        } else {
          const error: ITapeError = {
            message: `Unknown error ${xhr.status} | ${actualUrl}`,
            code: EErrorCode.XHR_UNKNOWN,
            severity: EErrorSeverity.ERROR
          };
          this.onError(error);
          doRequest(retry - 1);
        }
      };

      xhr.onabort = (): void => {
        this.onAbort(actualUrl);
      };

      xhr.ontimeout = (): void => {
        const error: ITapeError = {
          message: `Timeout after ${Config.xhr.timeout} | ${actualUrl}`,
          code: EErrorCode.XHR_TIMEOUT,
          severity: EErrorSeverity.ERROR
        };
        this.onError(error);

        doRequest(retry - 1);
      };

      xhr.send(options?.body);
      Dispatcher.emit({
        name: EEvent.HTTP_REQUEST,
        url: actualUrl,
        requestType
      });
    };

    doRequest(Config.xhr.retry);
  }

  private abortAll(): void {
    this._requests.forEach((xhrRequest: IXhrRequest) => {
      xhrRequest.xhr.abort();
    });
  }

  public abort(requestType: ERequestType): void {
    this._requests.forEach((xhrRequest: IXhrRequest, url: string) => {
      if (xhrRequest.requestType === requestType) {
        if (!navigator.onLine) {
          this.onAbort(url);
        } else {
          xhrRequest.xhr.abort();
        }
        this._requests.delete(url);
      }
    });
  }

  public destroy(): void {
    this._logger.info('Destroying Xhr');
    this.removeListeners();
    this.abortAll();
    this._requests.clear();
    this._cdnManager = null;
  }
}

export const Xhr: XhrSingleton = new XhrSingleton();
