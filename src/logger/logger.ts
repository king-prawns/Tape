/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */

import {Config} from '@config/config';

import ELogLevel from './enum/ELogLevel';
import ELogType from './enum/ELogType';

type noop = () => void;

class Logger {
  constructor(private _logType: ELogType) {}

  private shouldLog(logLevel: ELogLevel): boolean {
    if (!Config.logger.enabled) return false;
    if (Config.logger.exclude.includes(this._logType)) return false;

    if (Config.logger.include.length === 0 || Config.logger.include.includes(this._logType)) {
      return logLevel >= Config.logger.level;
    }

    return false;
  }

  private get prefix(): string {
    return `[${this._logType}]`;
  }

  private noop(): noop {
    return () => void 0;
  }

  private send<T>(callback: T, logLevel: ELogLevel): T | noop {
    if (this.shouldLog(logLevel)) {
      return callback;
    }

    return this.noop();
  }

  public get debug(): typeof console.debug | noop {
    return this.send(console.debug.bind(window.console, this.prefix), ELogLevel.DEBUG);
  }

  public get log(): typeof console.log | noop {
    return this.send(console.log.bind(window.console, this.prefix), ELogLevel.LOG);
  }

  public get info(): typeof console.info | noop {
    return this.send(console.info.bind(window.console, this.prefix), ELogLevel.INFO);
  }

  public get warn(): typeof console.warn | noop {
    return this.send(console.warn.bind(window.console, this.prefix), ELogLevel.WARN);
  }

  public get error(): typeof console.error | noop {
    return this.send(console.error.bind(window.console, this.prefix), ELogLevel.ERROR);
  }
}

export default Logger;
