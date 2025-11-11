import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ITimedEvents from '@dispatcher/interfaces/ITimedEvents';
import SegmentDownloaderManager from '@downloader/segment/segmentDownloaderManager';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import EContentType from '@parser/manifest/enum/EContentType';
import TimelineManager from '@timeline/timelineManager';
import getMimeCodec from '@utils/getMimeCodec';

import AVBuffer from './avBuffer';
import TextBuffer from './textBuffer';

class BufferManager {
  private _logger: Logger = new Logger(ELogType.BUFFER);
  private _videoBuffer: AVBuffer | null = null;
  private _audioBuffer: AVBuffer | null = null;
  private _textBuffer: TextBuffer | null = null;

  private _shouldWaitLicense: boolean;

  constructor(
    private _videoElement: HTMLVideoElement,
    private _mediaSource: MediaSource,
    private _segmentDownloaderManager: SegmentDownloaderManager,
    private _timelineManager: TimelineManager,
    private _minBufferTime: number,
    hasContentProtection: boolean
  ) {
    this._shouldWaitLicense = hasContentProtection;
    this.addListeners();
  }

  private get isLast(): boolean {
    // we are not going to consider textBuffer here
    return Boolean(this._videoBuffer?.isLast && this._audioBuffer?.isLast);
  }

  private get updating(): boolean {
    return Boolean(this._videoBuffer?.updating || this._audioBuffer?.updating);
  }

  private addListeners(): void {
    Dispatcher.on(EEvent.ACTIVE_REPRESENTATION_CHANGE, this.onActiveRepresentationChange);
    Dispatcher.on(EEvent.BUFFER_UPDATE, this.onBufferUpdate);
    Dispatcher.on(EEvent.EME_READY, this.onEmeReady);
    Dispatcher.on(EEvent.SEGMENT_READY, this.onSegmentReady);
    Dispatcher.on(EEvent.TIME_UPDATE, this.onTimeUpdate);
  }

  private removeListeners(): void {
    Dispatcher.off(EEvent.ACTIVE_REPRESENTATION_CHANGE, this.onActiveRepresentationChange);
    Dispatcher.off(EEvent.BUFFER_UPDATE, this.onBufferUpdate);
    Dispatcher.off(EEvent.EME_READY, this.onEmeReady);
    Dispatcher.off(EEvent.SEGMENT_READY, this.onSegmentReady);
    Dispatcher.off(EEvent.TIME_UPDATE, this.onTimeUpdate);
  }

  private onEmeReady = (emeReadyEvent: ITimedEvents[EEvent.EME_READY]): void => {
    const {currentTime} = emeReadyEvent.detail;
    this._shouldWaitLicense = false;
    this.feedBuffers(currentTime);
  };

  private onActiveRepresentationChange = (
    activeRepresentationChangeEvent: ITimedEvents[EEvent.ACTIVE_REPRESENTATION_CHANGE]
  ): void => {
    const {contentType, mimeType, codecs} = activeRepresentationChangeEvent.detail;
    switch (contentType) {
      case EContentType.VIDEO:
        if (!this._videoBuffer) {
          this._videoBuffer = new AVBuffer(
            this._mediaSource,
            this._segmentDownloaderManager,
            this._minBufferTime,
            contentType,
            getMimeCodec(mimeType, codecs)
          );
        }
        break;
      case EContentType.AUDIO:
        if (!this._audioBuffer) {
          this._audioBuffer = new AVBuffer(
            this._mediaSource,
            this._segmentDownloaderManager,
            this._minBufferTime,
            contentType,
            getMimeCodec(mimeType, codecs)
          );
        }
        break;
      case EContentType.TEXT:
        if (!this._textBuffer) {
          this._textBuffer = new TextBuffer(
            this._videoElement,
            this._segmentDownloaderManager,
            this._minBufferTime,
            codecs
          );
        }
        break;
    }
  };

  private onBufferUpdate = (bufferUpdateEvent: ITimedEvents[EEvent.BUFFER_UPDATE]): void => {
    if (!this._audioBuffer || !this._videoBuffer) return;

    const {contentType, currentTime} = bufferUpdateEvent.detail;
    this.feedBuffer(contentType, currentTime);

    // we are not going to consider textBuffer here
    if (contentType === EContentType.TEXT) return;

    const {sourceBuffer: videoSourceBuffer} = this._videoBuffer;
    const {sourceBuffer: audioSourceBuffer} = this._audioBuffer;

    Dispatcher.emit({
      name: EEvent.BUFFERS_UPDATE,
      videoBuffered: videoSourceBuffer.buffered,
      audioBuffered: audioSourceBuffer.buffered
    });

    const videoBufferRange: [number, number] | undefined = this.getBufferRange(
      EContentType.VIDEO,
      currentTime
    );
    const audioBufferRange: [number, number] | undefined = this.getBufferRange(
      EContentType.AUDIO,
      currentTime
    );
    if (!videoBufferRange || !audioBufferRange) return;

    const bufferEnd: number = Math.max(videoBufferRange[1], audioBufferRange[1]);

    if (
      !this._timelineManager.isLive &&
      this.isLast &&
      !this.updating &&
      this._mediaSource.readyState === 'open' &&
      bufferEnd === this._timelineManager.getSeekableRange().end
    ) {
      this._logger.info('Media Source end of stream');
      this._mediaSource.endOfStream();
    }
  };

  private onSegmentReady = (segmentReadyEvent: ITimedEvents[EEvent.SEGMENT_READY]): void => {
    const {contentType, currentTime} = segmentReadyEvent.detail;
    this.feedBuffer(contentType, currentTime);
  };

  private onTimeUpdate = (timeUpdateEvent: ITimedEvents[EEvent.TIME_UPDATE]): void => {
    const {currentTime} = timeUpdateEvent.detail;
    this.feedBuffers(currentTime);
  };

  private feedBuffer = (contentType: EContentType, currentTime: number): void => {
    if (this._shouldWaitLicense) return;
    switch (contentType) {
      case EContentType.VIDEO:
        this._videoBuffer?.feedBuffer(currentTime);
        break;
      case EContentType.AUDIO:
        this._audioBuffer?.feedBuffer(currentTime);
        break;
      case EContentType.TEXT:
        this._textBuffer?.feedBuffer(currentTime);
        break;
    }
  };

  private feedBuffers(time: number): void {
    this.feedBuffer(EContentType.VIDEO, time);
    this.feedBuffer(EContentType.AUDIO, time);
    this.feedBuffer(EContentType.TEXT, time);
  }

  public clearBuffer(contentType: EContentType, startTime?: number, endTime?: number): void {
    switch (contentType) {
      case EContentType.VIDEO:
        this._videoBuffer?.clearBuffer(startTime, endTime);
        break;
      case EContentType.AUDIO:
        this._audioBuffer?.clearBuffer(startTime, endTime);
        break;
      case EContentType.TEXT:
        this._textBuffer?.clearBuffer(startTime, endTime);
        break;
    }
  }

  public clearBuffers(): void {
    this._videoBuffer?.clearBuffer();
    this._audioBuffer?.clearBuffer();
    this._textBuffer?.clearBuffer();
  }

  public getBufferRange(contentType: EContentType, currentTime: number): [number, number] | undefined {
    switch (contentType) {
      case EContentType.VIDEO:
        return this._videoBuffer?.getBufferRange(currentTime);
      case EContentType.AUDIO:
        return this._audioBuffer?.getBufferRange(currentTime);
      case EContentType.TEXT:
        return this._textBuffer?.getBufferRange(currentTime);
    }
  }

  public destroy(): void {
    this._logger.info(`Destroying Buffer manager`);
    this.removeListeners();

    this._videoBuffer?.destroy();
    this._videoBuffer = null;
    this._audioBuffer?.destroy();
    this._audioBuffer = null;
    this._textBuffer?.destroy();
    this._textBuffer = null;
  }
}

export default BufferManager;
