import ABRManager from '@abr/abrManager';
import IStreamConfig from '@config/interfaces/IStreamConfig';
import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ITimedEvents from '@dispatcher/interfaces/ITimedEvents';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import EContentType from '@parser/manifest/enum/EContentType';
import IPeriod from '@parser/manifest/interfaces/IPeriod';
import EPlayerState from '@state/enum/EPlayerState';

import AdaptationStream from '../adaptation/adaptationStream';

class PeriodStream {
  private _logger: Logger = new Logger(ELogType.STREAM);
  private _videoAdaptationStream: AdaptationStream | null = null;
  private _audioAdaptationStream: AdaptationStream | null = null;
  private _textAdaptationStream: AdaptationStream | null = null;
  private _isActive: boolean = false;

  constructor(
    videoElement: HTMLVideoElement,
    private _abrManager: ABRManager,
    private _streamConfig: Required<IStreamConfig>,
    private _period: IPeriod
  ) {
    this.addListeners();

    this._logger.debug('Period', {id: this._period.id});
    this.createAdaptationStreams();
    this.setActivePeriod(videoElement.currentTime);
  }

  private addListeners(): void {
    Dispatcher.on(EEvent.PLAYER_STATE_CHANGE, this.onPlayerStateChange);
    Dispatcher.on(EEvent.TIME_UPDATE, this.onTimeUpdate);
  }

  private removeListeners(): void {
    Dispatcher.off(EEvent.PLAYER_STATE_CHANGE, this.onPlayerStateChange);
    Dispatcher.off(EEvent.TIME_UPDATE, this.onTimeUpdate);
  }

  private onPlayerStateChange = (playerStateChangeEvent: ITimedEvents[EEvent.PLAYER_STATE_CHANGE]): void => {
    const {playerState, currentTime} = playerStateChangeEvent.detail;
    switch (playerState) {
      case EPlayerState.SEEKING:
        this.setActivePeriod(currentTime);
        break;
    }
  };

  private onTimeUpdate = (timeUpdateEvent: ITimedEvents[EEvent.TIME_UPDATE]): void => {
    const {currentTime} = timeUpdateEvent.detail;
    this.setActivePeriod(currentTime);
  };

  private emitActivePeriodChange(): void {
    const {id, start, duration} = this._period;
    this._logger.info(`Active period`, {id, start, duration});
    Dispatcher.emit({
      name: EEvent.ACTIVE_PERIOD_CHANGE,
      id
    });
  }

  private setActivePeriod(time: number): void {
    const periodEnd: number = this._period.start + this._period.duration;
    const isWithinPeriod: boolean = this._period.start <= time && time <= periodEnd;

    if (isWithinPeriod === this._isActive) return;
    if (isWithinPeriod) {
      this.emitActivePeriodChange();
    }
    this._isActive = isWithinPeriod;
    this.setActiveAdaptationStreams();
  }

  private createAdaptationStream(contentType: EContentType): void {
    switch (contentType) {
      case EContentType.VIDEO:
        this._videoAdaptationStream = new AdaptationStream(
          this._abrManager,
          this._streamConfig,
          this._period.video,
          contentType
        );
        break;
      case EContentType.AUDIO:
        this._audioAdaptationStream = new AdaptationStream(
          this._abrManager,
          this._streamConfig,
          this._period.audio,
          contentType
        );
        break;
      case EContentType.TEXT:
        this._textAdaptationStream = new AdaptationStream(
          this._abrManager,
          this._streamConfig,
          this._period.text,
          contentType
        );
        break;
    }
  }

  private createAdaptationStreams(): void {
    this.createAdaptationStream(EContentType.VIDEO);
    this.createAdaptationStream(EContentType.AUDIO);
    this.createAdaptationStream(EContentType.TEXT);
  }

  private destroyAdaptationStream(contentType: EContentType): void {
    switch (contentType) {
      case EContentType.VIDEO:
        this._videoAdaptationStream?.destroy();
        this._videoAdaptationStream = null;
        break;
      case EContentType.AUDIO:
        this._audioAdaptationStream?.destroy();
        this._audioAdaptationStream = null;
        break;
      case EContentType.TEXT:
        this._textAdaptationStream?.destroy();
        this._textAdaptationStream = null;
        break;
    }
  }

  private destroyAdaptationStreams(): void {
    this.destroyAdaptationStream(EContentType.VIDEO);
    this.destroyAdaptationStream(EContentType.AUDIO);
    this.destroyAdaptationStream(EContentType.TEXT);
  }

  private setActiveAdaptationStream(contentType: EContentType): void {
    switch (contentType) {
      case EContentType.VIDEO:
        this._videoAdaptationStream?.setActive(this._isActive);
        break;
      case EContentType.AUDIO:
        this._audioAdaptationStream?.setActive(this._isActive);
        break;
      case EContentType.TEXT:
        this._textAdaptationStream?.setActive(this._isActive);
        break;
    }
  }

  private setActiveAdaptationStreams(): void {
    this.setActiveAdaptationStream(EContentType.VIDEO);
    this.setActiveAdaptationStream(EContentType.AUDIO);
    this.setActiveAdaptationStream(EContentType.TEXT);
  }

  public updateStreamConfig(contentType: EContentType, streamConfig: Required<IStreamConfig>): void {
    this._streamConfig = {...streamConfig};
    this.destroyAdaptationStream(contentType);
    this.createAdaptationStream(contentType);
    this.setActiveAdaptationStream(contentType);
  }

  public destroy(): void {
    this._logger.info('Destroying period stream', {id: this._period.id});
    this.removeListeners();

    this.destroyAdaptationStreams();
    this._isActive = false;
  }
}

export default PeriodStream;
