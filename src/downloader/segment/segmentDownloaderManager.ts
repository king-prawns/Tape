import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ITimedEvents from '@dispatcher/interfaces/ITimedEvents';
import EErrorCode from '@error/enum/EErrorCode';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import EContentType from '@parser/manifest/enum/EContentType';
import ISegment from '@parser/manifest/interfaces/ISegment';

import ESegmentDownloaderStatus from './enum/ESegmentDownloaderStatus';
import IDataSegment from './interfaces/IDataSegment';
import SegmentDownloader from './segmentDownloader';

class SegmentDownloaderManager {
  private _logger: Logger = new Logger(ELogType.DOWNLOADER);
  private _status: ESegmentDownloaderStatus = ESegmentDownloaderStatus.IDLE;

  private _videoDownloader: SegmentDownloader = new SegmentDownloader(EContentType.VIDEO);
  private _audioDownloader: SegmentDownloader = new SegmentDownloader(EContentType.AUDIO);
  private _textDownloader: SegmentDownloader = new SegmentDownloader(EContentType.TEXT);

  constructor() {
    this.addListeners();
  }

  private addListeners(): void {
    Dispatcher.on(EEvent.BUFFERS_UPDATE, this.onBuffersUpdate);
    Dispatcher.on(EEvent.SEGMENT_READY, this.onSegmentReady);
    Dispatcher.on(EEvent.TAPE_ERROR, this.onTapeError);
  }

  private removeListeners(): void {
    Dispatcher.off(EEvent.BUFFERS_UPDATE, this.onBuffersUpdate);
    Dispatcher.off(EEvent.SEGMENT_READY, this.onSegmentReady);
    Dispatcher.off(EEvent.TAPE_ERROR, this.onTapeError);
  }

  private onBuffersUpdate = (_buffersUpdateEvent: ITimedEvents[EEvent.BUFFERS_UPDATE]): void => {
    this.downloadNextSegment();
  };

  private onSegmentReady = (_segmentReadyEvent: ITimedEvents[EEvent.SEGMENT_READY]): void => {
    this._status = ESegmentDownloaderStatus.IDLE;
    this.downloadNextSegment();
  };

  private onTapeError = (tapeErrorEvent: ITimedEvents[EEvent.TAPE_ERROR]): void => {
    const {code} = tapeErrorEvent.detail;
    if (code === EErrorCode.XHR_ABORT) {
      this._status = ESegmentDownloaderStatus.IDLE;
    }
  };

  private callDownloader(segmentDownloader: SegmentDownloader): void {
    if (segmentDownloader.shouldDownloadNext()) {
      this._status = ESegmentDownloaderStatus.DOWNLOADING;
      segmentDownloader.downloadNextSegment();
    }
  }

  public downloadNextSegment(): void {
    if (this._status === ESegmentDownloaderStatus.DOWNLOADING) return;
    const nextVideoSegment: ISegment | undefined = this._videoDownloader.getCurrentDataSegment();
    const nextAudioSegment: ISegment | undefined = this._audioDownloader.getCurrentDataSegment();
    const nextTextSegment: ISegment | undefined = this._textDownloader.getCurrentDataSegment();

    const sorted: Array<ISegment> = (
      [nextVideoSegment, nextAudioSegment, nextTextSegment].filter(
        (segment: ISegment | undefined) => segment !== undefined
      ) as Array<ISegment>
    ).sort((segmentA: ISegment, segmentB: ISegment) => segmentA.time - segmentB.time);

    if (!sorted.length) return;
    switch (sorted[0].contentType) {
      case EContentType.VIDEO:
        this.callDownloader(this._videoDownloader);
        break;
      case EContentType.AUDIO:
        this.callDownloader(this._audioDownloader);
        break;
      case EContentType.TEXT:
        this.callDownloader(this._textDownloader);
        break;
    }
  }

  public getReadyDataSegment(contentType: EContentType): IDataSegment | null {
    let dataSegment: IDataSegment | null = null;
    switch (contentType) {
      case EContentType.VIDEO:
        dataSegment = this._videoDownloader.getReadyDataSegment() ?? null;
        break;
      case EContentType.AUDIO:
        dataSegment = this._audioDownloader.getReadyDataSegment() ?? null;
        break;
      case EContentType.TEXT:
        dataSegment = this._textDownloader.getReadyDataSegment() ?? null;
        break;
    }

    this.downloadNextSegment();

    return dataSegment;
  }

  public reset(contentType: EContentType): void {
    switch (contentType) {
      case EContentType.VIDEO:
        this._videoDownloader.reset();
        break;
      case EContentType.AUDIO:
        this._audioDownloader.reset();
        break;
      case EContentType.TEXT:
        this._textDownloader.reset();
        break;
    }
  }

  public updateNextSegmentIndex(contentType: EContentType, time: number): void {
    switch (contentType) {
      case EContentType.VIDEO:
        this._videoDownloader.updateNextSegmentIndex(time);
        break;
      case EContentType.AUDIO:
        this._audioDownloader.updateNextSegmentIndex(time);
        break;
      case EContentType.TEXT:
        this._textDownloader.updateNextSegmentIndex(time);
        break;
    }
  }

  public updateNextSegmentsIndex(time: number): void {
    this._videoDownloader.updateNextSegmentIndex(time);
    this._audioDownloader.updateNextSegmentIndex(time);
    this._textDownloader.updateNextSegmentIndex(time);
  }

  public updateSegments(contentType: EContentType, segments: Array<ISegment>): void {
    switch (contentType) {
      case EContentType.VIDEO: {
        this._videoDownloader.updateSegments(segments);
        break;
      }
      case EContentType.AUDIO: {
        this._audioDownloader.updateSegments(segments);
        break;
      }
      case EContentType.TEXT: {
        this._textDownloader.updateSegments(segments);
        break;
      }
    }
  }

  public destroy(): void {
    this._logger.info('Destroying Segment downloader manager');
    this.removeListeners();

    this._status = ESegmentDownloaderStatus.IDLE;
    this._videoDownloader.destroy();
    this._audioDownloader.destroy();
    this._textDownloader.destroy();
  }
}

export default SegmentDownloaderManager;
