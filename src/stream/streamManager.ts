import ABRManager from '@abr/abrManager';
import BufferManager from '@buffer/bufferManager';
import {Config} from '@config/config';
import IStreamConfig from '@config/interfaces/IStreamConfig';
import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ITimedEvents from '@dispatcher/interfaces/ITimedEvents';
import SegmentDownloaderManager from '@downloader/segment/segmentDownloaderManager';
import EMEManager from '@eme/emeManager';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import EContentType from '@parser/manifest/enum/EContentType';
import IManifest from '@parser/manifest/interfaces/IManifest';
import EPlayerState from '@state/enum/EPlayerState';
import ISeekableRange from '@timeline/interfaces/ISeekableRange';
import TimelineManager from '@timeline/timelineManager';

import PeriodStream from './period/periodStream';

class StreamManager {
  private _logger: Logger = new Logger(ELogType.STREAM);
  private _periodStreams: Array<PeriodStream> = [];
  private _emeManager: EMEManager | null = null;
  private _timelineManager: TimelineManager;
  private _segmentDownloaderManager: SegmentDownloaderManager;
  private _bufferManager: BufferManager;
  private _streamConfig: Required<IStreamConfig> = {
    ...Config.stream
  };
  private _init: Record<EContentType, boolean> = {
    [EContentType.VIDEO]: false,
    [EContentType.AUDIO]: false,
    [EContentType.TEXT]: false
  };

  constructor(
    private _videoElement: HTMLVideoElement,
    private _abrManager: ABRManager,
    private _mediaSource: MediaSource,
    private _manifest: IManifest
  ) {
    this.addListeners();

    const hasContentProtection: boolean = this._manifest.contentProtections.length > 0;
    this._timelineManager = new TimelineManager(this._videoElement, this._manifest);
    this._segmentDownloaderManager = new SegmentDownloaderManager();
    this._bufferManager = new BufferManager(
      this._videoElement,
      this._mediaSource,
      this._segmentDownloaderManager,
      this._timelineManager,
      this._manifest.minBufferTime,
      hasContentProtection
    );
    if (hasContentProtection) {
      this._emeManager = new EMEManager(this._videoElement, this._manifest.contentProtections);
      this._emeManager.init();
    }

    this.init();
    this.createPeriodStreams();
    this._segmentDownloaderManager.downloadNextSegment();
  }

  private init(): void {
    const {start, end} = this.getSeekableRange();
    this._mediaSource.duration = end;

    const {startingPosition} = this._streamConfig;
    if (startingPosition === null || startingPosition < start || startingPosition > end) {
      this._streamConfig.startingPosition = this._timelineManager.isLive ? end : 0;
    }

    if (this._streamConfig.startingPosition) {
      this._videoElement.currentTime = this._streamConfig.startingPosition;
      Dispatcher.emit({
        name: EEvent.TIME_UPDATE
      });
    }

    this._videoElement.autoplay = Config.stream.autoplay;
  }

  private addListeners(): void {
    Dispatcher.on(EEvent.ACTIVE_ADAPTATION_CHANGE, this.onActiveAdaptationChange);
    Dispatcher.on(EEvent.CHOOSE_REPRESENTATION, this.onChooseRepresentation);
    Dispatcher.on(EEvent.PLAYER_STATE_CHANGE, this.onPlayerStateChange);
  }

  private removeListeners(): void {
    Dispatcher.off(EEvent.ACTIVE_ADAPTATION_CHANGE, this.onActiveAdaptationChange);
    Dispatcher.off(EEvent.CHOOSE_REPRESENTATION, this.onChooseRepresentation);
    Dispatcher.off(EEvent.PLAYER_STATE_CHANGE, this.onPlayerStateChange);
  }

  private onActiveAdaptationChange = (
    activeAdaptationChangeEvent: ITimedEvents[EEvent.ACTIVE_ADAPTATION_CHANGE]
  ): void => {
    const {contentType, lang} = activeAdaptationChangeEvent.detail;
    if (contentType === EContentType.TEXT && lang === null) {
      this._segmentDownloaderManager.reset(contentType);
      this._bufferManager.clearBuffer(contentType);
    }
  };

  private onChooseRepresentation = (
    chooseRepresentationEvent: ITimedEvents[EEvent.CHOOSE_REPRESENTATION]
  ): void => {
    const {
      representation: {segments, contentType, periodId},
      currentTime
    } = chooseRepresentationEvent.detail;
    this._segmentDownloaderManager.updateSegments(contentType, segments);

    const lastPeriodId: string = this._manifest.periods[this._manifest.periods.length - 1].id;

    if (periodId === lastPeriodId) {
      if (!this._init[contentType]) {
        this._init[contentType] = true;

        const [, bufferEnd] = this._bufferManager.getBufferRange(contentType, currentTime) ?? [0, 0];

        const time: number = Math.max(bufferEnd, currentTime);
        this._segmentDownloaderManager.updateNextSegmentIndex(contentType, time);

        if (this._timelineManager.isLive) {
          this._timelineManager.updateMaxKnownTime(segments[segments.length - 1].time);
        }
      } else {
        // ABR
        let time: number = currentTime;
        if (contentType === EContentType.VIDEO) {
          const [, videoBufferEnd] = this._bufferManager.getBufferRange(contentType, currentTime) ?? [0, 0];

          const bufferOnSwitch: number = Math.max(
            Config.buffer.bufferOnSwitch,
            this._manifest.maxSegmentDuration
          );
          if (videoBufferEnd - currentTime > bufferOnSwitch) {
            time = currentTime + bufferOnSwitch;
          } else {
            time = Math.max(videoBufferEnd, currentTime);
          }
        }

        this._segmentDownloaderManager.updateNextSegmentIndex(contentType, time);
        this._segmentDownloaderManager.downloadNextSegment();
        this._bufferManager.clearBuffer(contentType, time);
      }
    }
  };

  private onPlayerStateChange = (playerStateChangeEvent: ITimedEvents[EEvent.PLAYER_STATE_CHANGE]): void => {
    const {playerState, currentTime} = playerStateChangeEvent.detail;
    switch (playerState) {
      case EPlayerState.SEEKING:
        {
          this.onSeeking(EContentType.VIDEO, currentTime);
          this.onSeeking(EContentType.AUDIO, currentTime);
          this.onSeeking(EContentType.TEXT, currentTime);
          this._segmentDownloaderManager.downloadNextSegment();
        }
        break;
    }
  };

  private onSeeking(contentType: EContentType, currentTime: number): void {
    const bufferRange: [number, number] | undefined = this._bufferManager.getBufferRange(
      contentType,
      currentTime
    );
    if (!bufferRange) return;

    if (!bufferRange[0] && !bufferRange[1]) {
      this._logger.log(`Seeking without ${contentType} buffer`);
      this._segmentDownloaderManager.updateNextSegmentIndex(contentType, currentTime);
      this._bufferManager.clearBuffer(contentType);
    } else {
      this._logger.log(`Seeking within ${contentType} buffer`);
    }
  }

  private createPeriodStreams(): void {
    for (let i: number = 0; i < this._manifest.periods.length; i++) {
      this._periodStreams.push(
        new PeriodStream(this._videoElement, this._abrManager, this._streamConfig, this._manifest.periods[i])
      );
    }
  }

  public getLiveEdge(): number {
    return this._timelineManager.getLiveEdge();
  }

  public getSeekableRange(): ISeekableRange {
    return this._timelineManager.getSeekableRange();
  }

  public updateManifest(manifest: IManifest): void {
    if (!this._timelineManager.isLive) return;

    for (let i: number = 0; i < this._periodStreams.length; i++) {
      this._periodStreams[i].destroy();
    }
    this._init = {
      [EContentType.VIDEO]: false,
      [EContentType.AUDIO]: false,
      [EContentType.TEXT]: false
    };
    this._periodStreams.length = 0;
    this._manifest = manifest;
    this._timelineManager.updateManifest(manifest);
    this.createPeriodStreams();
  }

  public updateStreamPreference(contentType: EContentType, value: string | number | null): void {
    switch (contentType) {
      case EContentType.VIDEO:
        this._streamConfig.preferredVideoQuality = value as number | null;
        break;
      case EContentType.AUDIO:
        this._streamConfig.preferredAudioLanguage = value as string;
        break;
      case EContentType.TEXT:
        this._streamConfig.preferredTextLanguage = value as string;
        break;
    }

    for (let i: number = 0; i < this._periodStreams.length; i++) {
      this._periodStreams[i].updateStreamConfig(contentType, this._streamConfig);
    }
  }

  public destroy(): void {
    this._logger.info('Destroying Stream manager');
    this.removeListeners();

    this._periodStreams.length = 0;
    this._emeManager?.destroy();
    this._emeManager = null;
    this._timelineManager.destroy();
    this._segmentDownloaderManager.destroy();
    this._bufferManager.destroy();
    this._streamConfig = {
      ...Config.stream
    };
    this._init = {
      [EContentType.VIDEO]: false,
      [EContentType.AUDIO]: false,
      [EContentType.TEXT]: false
    };
  }
}

export default StreamManager;
