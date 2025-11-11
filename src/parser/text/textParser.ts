import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import EErrorCode from '@error/enum/EErrorCode';
import EErrorSeverity from '@error/enum/EErrorSeverity';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';

import ETextCodecs from './enum/ETextCodecs';
import IParser from './interfaces/IParser';
import TtmlParser from './ttml/parser';
import WebVTTParser from './webvtt/parser';

class TextParser {
  private _logger: Logger = new Logger(ELogType.PARSER);
  private _parser: IParser | null = null;

  constructor(codecs: string) {
    if (codecs === ETextCodecs.STPP || codecs === ETextCodecs.STPP_TTML) {
      this._parser = new TtmlParser();
    } else if (codecs === ETextCodecs.WEBVTT) {
      this._parser = new WebVTTParser();
    } else {
      const message: string = 'Text track not supported';
      this._logger.error(message);
      Dispatcher.emit({
        name: EEvent.TAPE_ERROR,
        message,
        code: EErrorCode.TEXT_TRACK_NOT_SUPPORTED,
        severity: EErrorSeverity.FATAL
      });
    }
  }

  get parser(): IParser | null {
    return this._parser;
  }

  public destroy(): void {
    this._logger.info('Destroying Text Parser');

    this._parser?.destroy();
    this._parser = null;
  }
}

export default TextParser;
