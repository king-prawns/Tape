import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import EErrorCode from '@error/enum/EErrorCode';
import EErrorSeverity from '@error/enum/EErrorSeverity';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';

import DashParser from './dash/parser';
import EExtension from './enum/EExtension';
import IParser from './interfaces/IParser';

class ManifestParser {
  private _logger: Logger = new Logger(ELogType.PARSER);
  private _parser: IParser | null = null;

  constructor(manifestUrl: string) {
    const {pathname, origin} = new URL(manifestUrl);
    const filename: string = this.getFilename(pathname);
    const fileExtension: string = this.getFileExstension(filename);
    const manifestBaseUrl: string = this.getBaseUrl(origin, pathname);

    switch (fileExtension) {
      case EExtension.MPD:
        this._parser = new DashParser(manifestBaseUrl);
        break;
      default: {
        const message: string = 'Manifest not supported';
        this._logger.error(message);
        Dispatcher.emit({
          name: EEvent.TAPE_ERROR,
          message,
          code: EErrorCode.MANIFEST_NOT_SUPPORTED,
          severity: EErrorSeverity.FATAL
        });
      }
    }
  }

  private getBaseUrl(origin: string, pathname: string): string {
    return origin + pathname.substring(0, pathname.lastIndexOf('/') + 1);
  }

  private getFilename(pathname: string): string {
    return pathname.split('/').pop() ?? '';
  }

  private getFileExstension(filename: string): string {
    return filename.split('.').pop() ?? '';
  }

  get parser(): IParser | null {
    return this._parser;
  }

  public destroy(): void {
    this._logger.info('Destroying Manifest Parser');

    this._parser?.destroy();
    this._parser = null;
  }
}

export default ManifestParser;
