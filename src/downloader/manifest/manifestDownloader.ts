import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ITimedEvents from '@dispatcher/interfaces/ITimedEvents';
import EErrorCode from '@error/enum/EErrorCode';
import EErrorSeverity from '@error/enum/EErrorSeverity';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import IManifest from '@parser/manifest/interfaces/IManifest';
import ManifestParser from '@parser/manifest/manifestParser';
import ERequestType from '@xhr/enum/ERequestType';
import {Xhr} from '@xhr/xhr';

class ManifestDownloader {
  private _logger: Logger = new Logger(ELogType.DOWNLOADER);
  private _manifestParser: ManifestParser;
  private _fetchTimeout: number = 0;

  constructor(private _manifestUrl: string) {
    this._manifestParser = new ManifestParser(_manifestUrl);

    this.addListeners();
  }

  private addListeners(): void {
    Dispatcher.on(EEvent.HTTP_RESPONSE, this.onHttpResponse);
  }

  private removeListeners(): void {
    Dispatcher.off(EEvent.HTTP_RESPONSE, this.onHttpResponse);
  }

  private onHttpResponse = (httpResponseEvent: ITimedEvents[EEvent.HTTP_RESPONSE]): void => {
    const {requestType} = httpResponseEvent.detail;
    if (requestType !== ERequestType.MANIFEST) return;

    const {parser} = this._manifestParser;
    if (!parser) return;

    const {data} = httpResponseEvent.detail;

    try {
      const before: number = performance.now();
      const manifest: IManifest = parser.parse(data as string);
      const timeMs: number = performance.now() - before;

      this._logger.log(`Manifest parsed in ${timeMs.toFixed(2)}ms`);
      this._logger.debug(manifest);

      Dispatcher.emit({
        name: EEvent.MANIFEST_READY,
        manifest
      });

      if (manifest.minimumUpdatePeriod) {
        this._fetchTimeout = window.setTimeout(() => {
          this.fetch();
        }, manifest.minimumUpdatePeriod * 1000);
      }
    } catch (e) {
      const message: string = 'Error parsing manifest';
      this._logger.error(message);
      Dispatcher.emit({
        name: EEvent.TAPE_ERROR,
        message,
        code: EErrorCode.PARSER,
        severity: EErrorSeverity.FATAL
      });
    }
  };

  public fetch(): void {
    Xhr.request(this._manifestUrl, ERequestType.MANIFEST, {
      responseType: 'text'
    });
  }

  public destroy(): void {
    this._logger.info('Destroying Manifest downloader');
    this.removeListeners();

    this._manifestParser.destroy();
    window.clearTimeout(this._fetchTimeout);
    this._fetchTimeout = 0;
  }
}

export default ManifestDownloader;
