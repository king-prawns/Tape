import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import EManifestType from '@parser/manifest/enum/EManifestType';
import IManifest from '@parser/manifest/interfaces/IManifest';

import ISeekableRange from './interfaces/ISeekableRange';

class TimelineManager {
  private _logger: Logger = new Logger(ELogType.TIMELINE);
  private _maxKnownTime: number = 0;

  constructor(private _videoElement: HTMLVideoElement, private _manifest: IManifest) {
    if (!this.isLive) {
      this.emitSeekableRange();
    }
  }

  public get isLive(): boolean {
    return this._manifest.type === EManifestType.DYNAMIC;
  }

  private emitSeekableRange(): void {
    const seekableRange: ISeekableRange = this.getSeekableRange();
    this._logger.debug('Seekable range', seekableRange);
    Dispatcher.emit({
      name: EEvent.SEEKABLE_RANGE_CHANGE,
      seekableRange
    });
  }

  private getDuration(): number {
    if (this.isLive) {
      return this._manifest.publishTime - this._manifest.availabilityStartTime;
    } else {
      return this._manifest.mediaPresentationDuration;
    }
  }

  public getLiveEdge(): number {
    const {end} = this.getSeekableRange();

    // conservative approach
    return end - this._manifest.minBufferTime * 1.5;
  }

  public getSeekableRange(): ISeekableRange {
    let start: number;
    let end: number;

    if (this.isLive) {
      const duration: number = this._maxKnownTime ? this._maxKnownTime : this.getDuration();
      start = duration - this._manifest.timeShiftBufferDepth;
      end = duration;
    } else {
      start = 0;
      end = this._videoElement.duration ? this._videoElement.duration : this.getDuration();
    }

    return {
      start,
      end,
      availabilityStartTime: this._manifest.availabilityStartTime
    };
  }

  public updateMaxKnownTime(maxKnownTime: number): void {
    if (maxKnownTime > this._maxKnownTime) {
      this._maxKnownTime = maxKnownTime;
      this.emitSeekableRange();
    }
  }

  public updateManifest(manifest: IManifest): void {
    this._manifest = manifest;
  }

  public destroy(): void {
    this._logger.info('Destroying Timeline manager');
    this._maxKnownTime = 0;
  }
}

export default TimelineManager;
