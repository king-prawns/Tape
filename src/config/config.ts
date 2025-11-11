import ELogLevel from '@logger/enum/ELogLevel';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';

import IAbrConfig from './interfaces/IAbrConfig';
import IBufferConfig from './interfaces/IBufferConfig';
import ICdnConfig from './interfaces/ICdnConfig';
import IEMEConfig from './interfaces/IEmeConfig';
import ILoggerConfig from './interfaces/ILoggerConfig';
import IStreamConfig from './interfaces/IStreamConfig';
import ITapeConfig from './interfaces/ITapeConfig';
import IXhrConfig from './interfaces/IXhrConfig';

class ConfigSingleton {
  private _logger: Logger = new Logger(ELogType.CONFIG);

  private _config: Required<ITapeConfig> = {
    abr: {
      switchInterval: 2000,
      minBandwidth: 0
    },
    buffer: {
      bufferAhead: 60,
      bufferBehind: 30,
      bufferOnSwitch: 5
    },
    cdn: {
      cdns: []
    },
    eme: {
      keySystem: null,
      videoRobustness: [],
      audioRobustness: [],
      licenceServer: '',
      serverCertificate: null
    },
    logger: {
      enabled: false,
      level: ELogLevel.WARN,
      include: [],
      exclude: []
    },
    stream: {
      autoplay: false,
      preferredAudioLanguage: '',
      preferredTextLanguage: null,
      preferredVideoQuality: null,
      startingPosition: null
    },
    xhr: {
      retry: 3,
      timeout: 15000
    }
  };

  public get abr(): Required<IAbrConfig> {
    return this._config.abr as Required<IAbrConfig>;
  }

  public get buffer(): Required<IBufferConfig> {
    return this._config.buffer as Required<IBufferConfig>;
  }

  public get cdn(): Required<ICdnConfig> {
    return this._config.cdn as Required<ICdnConfig>;
  }

  public get eme(): Required<IEMEConfig> {
    return this._config.eme as Required<IEMEConfig>;
  }

  public get logger(): Required<ILoggerConfig> {
    return this._config.logger as Required<ILoggerConfig>;
  }

  public get stream(): Required<IStreamConfig> {
    return this._config.stream as Required<IStreamConfig>;
  }

  public get xhr(): Required<IXhrConfig> {
    return this._config.xhr as Required<IXhrConfig>;
  }

  public update(config: ITapeConfig): void {
    if (config.abr) {
      this._config.abr = Object.assign(this._config.abr, config.abr);
    }

    if (config.buffer) {
      this._config.buffer = Object.assign(this._config.buffer, config.buffer);
    }

    if (config.cdn) {
      this._config.cdn = Object.assign(this._config.cdn, config.cdn);
    }

    if (config.eme) {
      this._config.eme = Object.assign(this._config.eme, config.eme);
    }

    if (config.logger) {
      this._config.logger = Object.assign(this._config.logger, config.logger);
    }

    if (config.stream) {
      this._config.stream = Object.assign(this._config.stream, config.stream);
    }

    if (config.xhr) {
      this._config.xhr = Object.assign(this._config.xhr, config.xhr);
    }

    this._logger.info('Tape config:', this._config);
  }
}

export const Config: ConfigSingleton = new ConfigSingleton();
