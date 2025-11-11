import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ITimedEvents from '@dispatcher/interfaces/ITimedEvents';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import EContentType from '@parser/manifest/enum/EContentType';
import EMimeType from '@parser/manifest/enum/EMimeType';
import ISegment from '@parser/manifest/interfaces/ISegment';
import ERequestType from '@xhr/enum/ERequestType';
import {Xhr} from '@xhr/xhr';

import IDataSegment from './interfaces/IDataSegment';

class SegmentDownloader {
  private _logger: Logger = new Logger(ELogType.DOWNLOADER);
  private _dataSegments: Array<IDataSegment> = [];
  private _readyDataSegments: Array<IDataSegment> = [];
  private _lastDataSegment: IDataSegment | null = null;

  private _nextSegmentIndex: number = 0;
  private _initSegmentIndex: number | null = null;

  private _DOWNLOAD_QUEUE: number = 4;

  constructor(private _contentType: EContentType) {
    this.addListeners();
  }

  private get requestType(): ERequestType {
    switch (this._contentType) {
      case EContentType.VIDEO:
        return ERequestType.VIDEO_SEGMENT;
      case EContentType.AUDIO:
        return ERequestType.AUDIO_SEGMENT;
      case EContentType.TEXT:
        return ERequestType.TEXT_SEGMENT;
    }
  }

  private addListeners(): void {
    Dispatcher.on(EEvent.HTTP_RESPONSE, this.onHttpResponse);
  }

  private removeListeners(): void {
    Dispatcher.off(EEvent.HTTP_RESPONSE, this.onHttpResponse);
  }

  private onHttpResponse = (httpResponseEvent: ITimedEvents[EEvent.HTTP_RESPONSE]): void => {
    const {requestType} = httpResponseEvent.detail;
    if (this.requestType !== requestType) return;

    const {data} = httpResponseEvent.detail;
    this.setDataSegment(data as ArrayBuffer);
  };

  private getIndex(): number {
    return this._initSegmentIndex ?? this._nextSegmentIndex;
  }

  private searchClosestSegmentIndex(searchValue: number): number {
    let leftIndex: number = 0;
    let rightIndex: number = this._dataSegments.length - 1;

    while (leftIndex <= rightIndex) {
      const midIndex: number = leftIndex + ((rightIndex - leftIndex) >> 1);
      const diff: number = this._dataSegments[midIndex].time - searchValue;
      if (diff < 0) {
        leftIndex = midIndex + 1;
      } else if (diff > 0) {
        rightIndex = midIndex - 1;
      } else {
        return midIndex;
      }
    }

    if (rightIndex < 0) {
      return 0;
    }

    return rightIndex;
  }

  private setDataSegment(data: ArrayBuffer): void {
    const index: number = this.getIndex();
    const dataSegment: IDataSegment = this._dataSegments[index];
    this._logger.debug(`${this._contentType} segment ready ${dataSegment.index}`, dataSegment);
    this._readyDataSegments.push({
      ...dataSegment,
      data
    });

    if (this._initSegmentIndex !== null) {
      this._initSegmentIndex = null;
    } else {
      this._nextSegmentIndex++;
    }

    Dispatcher.emit({
      name: EEvent.SEGMENT_READY,
      contentType: this._contentType
    });
  }

  public downloadNextSegment(): void {
    const index: number = this.getIndex();
    const dataSegment: IDataSegment = this._dataSegments[index];

    this._logger.debug(`Downloading next ${this._contentType} segment ${dataSegment.index}`, dataSegment);

    let responseType: XMLHttpRequestResponseType = 'arraybuffer';
    if (this._contentType === EContentType.TEXT && dataSegment.mimeType !== EMimeType.APPLICATION) {
      responseType = 'text';
    }
    Xhr.request(dataSegment.url, this.requestType, {
      responseType
    });
  }

  public getCurrentDataSegment(): IDataSegment | undefined {
    const index: number = this.getIndex();

    return this._dataSegments[index];
  }

  public getReadyDataSegment(): IDataSegment | null {
    let dataSegment: IDataSegment | null = null;
    if (this._readyDataSegments.length > 0) {
      dataSegment = Object.assign({}, this._readyDataSegments[0]);
      this._readyDataSegments.shift();
      this._lastDataSegment = Object.assign({}, dataSegment);
    }

    return dataSegment;
  }

  public shouldDownloadNext(): boolean {
    if (this._readyDataSegments.length <= this._DOWNLOAD_QUEUE) return true;
    if (this._readyDataSegments[this._readyDataSegments.length - 1]?.index === this._nextSegmentIndex - 1)
      return false;

    return true;
  }

  public updateSegments(segments: Array<ISegment>): void {
    const segment: ISegment = segments[0];

    let insertIndex: number = this._dataSegments.length;
    for (let i: number = this._dataSegments.length - 1; i >= 0; i--) {
      const target: number = i - this._dataSegments[i].id;

      if (this._dataSegments[target].periodId === segment.periodId) {
        insertIndex = target;
        break;
      } else {
        i = target;
      }
    }

    if (this._dataSegments[insertIndex - 1]) {
      this._dataSegments[insertIndex - 1].isLast = false;
    }

    if (this._dataSegments[insertIndex]) {
      for (
        let i: number = insertIndex + 1, segmentShift: number = 0;
        i < insertIndex + segments.length;
        i++, segmentShift++
      ) {
        if (this._dataSegments[i].time === segments[1].time) {
          if (segmentShift) {
            this._logger.debug(
              `Shifting next ${this._contentType} segment index from ${this._nextSegmentIndex} to ${
                this._nextSegmentIndex - segmentShift
              }`
            );
            this._nextSegmentIndex = this._nextSegmentIndex - segmentShift;
          }
          break;
        }
      }
    }

    for (let i: number = insertIndex, x: number = 0; i < insertIndex + segments.length; i++, x++) {
      this._dataSegments[i] = {
        ...segments[x],
        index: i,
        isLast: false
      };
    }
    this._dataSegments[this._dataSegments.length - 1].isLast = true;
  }

  public updateNextSegmentIndex(currentTime: number): void {
    if (this._dataSegments.length === 0) return;

    const newSegmentIndex: number = this.searchClosestSegmentIndex(currentTime);

    const isInitSegmentNeeded: boolean =
      this._lastDataSegment?.periodId !== this._dataSegments[newSegmentIndex]?.periodId ||
      this._lastDataSegment?.representationId !== this._dataSegments[newSegmentIndex]?.representationId;

    const isSameSegment: boolean =
      newSegmentIndex + 1 === this._nextSegmentIndex ||
      this._lastDataSegment?.time === this._dataSegments[newSegmentIndex]?.time;

    if (!isInitSegmentNeeded && isSameSegment) return;

    Xhr.abort(this.requestType);

    this._logger.debug(
      `Next ${this._contentType} segment index to download ${newSegmentIndex}`,
      this._dataSegments[newSegmentIndex]
    );
    this._nextSegmentIndex = newSegmentIndex;
    this._readyDataSegments.length = 0;
    this._lastDataSegment = null;

    if (isInitSegmentNeeded) {
      const {id} = this._dataSegments[newSegmentIndex];
      if (id === 0) return;
      this._initSegmentIndex = newSegmentIndex - id;
      this._logger.debug(`Need ${this._contentType} init segment first ${this._initSegmentIndex}`);
    }
  }

  public reset(): void {
    Xhr.abort(this.requestType);
    this._dataSegments.length = 0;
    this._readyDataSegments.length = 0;
    this._lastDataSegment = null;
    this._nextSegmentIndex = 0;
    this._initSegmentIndex = null;
  }

  public destroy(): void {
    this._logger.info(`Destroying ${this._contentType} downloader`);
    this.removeListeners();

    this.reset();
  }
}

export default SegmentDownloader;
