import {Config} from '@config/config';
import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import IDataSegment from '@downloader/segment/interfaces/IDataSegment';
import SegmentDownloaderManager from '@downloader/segment/segmentDownloaderManager';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import EContentType from '@parser/manifest/enum/EContentType';
import IInbandEventStream from '@parser/manifest/interfaces/IInbandEventStream';
import getMimeCodec from '@utils/getMimeCodec';
import getTimeRange from '@utils/getTimeRange';
import IEmsg from '@utils/mp4/interfaces/IEmsg';
import IParsedBox from '@utils/mp4/interfaces/IParsedBox';
import Mp4Parser from '@utils/mp4/parser';

import IBuffer from './interfaces/IBuffer';

class AVBuffer implements IBuffer {
  private _logger: Logger = new Logger(ELogType.BUFFER);
  private _mimeCodec: string;
  private _sourceBuffer: SourceBuffer;
  private _shouldRemoveBuffer: boolean = false;
  private _currentDataSegment: IDataSegment | null = null;

  constructor(
    private _mediaSource: MediaSource,
    private _segmentDownloaderManager: SegmentDownloaderManager,
    private _minBufferTime: number,
    private _contentType: EContentType,
    mimeCodec: string
  ) {
    this._mimeCodec = mimeCodec;
    this._logger.info(`Add ${this._contentType} source buffer`, mimeCodec);
    this._sourceBuffer = this._mediaSource.addSourceBuffer(mimeCodec);
    this._sourceBuffer.mode = 'segments';

    this.addListeners();
  }

  private addListeners(): void {
    this._sourceBuffer.addEventListener('updateend', this.onSourceBufferUpdateend);
  }

  private removeListeners(): void {
    this._sourceBuffer.removeEventListener('updateend', this.onSourceBufferUpdateend);
  }

  public get isLast(): boolean {
    return Boolean(this._currentDataSegment?.isLast);
  }

  public get updating(): boolean {
    return Boolean(this._sourceBuffer?.updating);
  }

  public get sourceBuffer(): SourceBuffer {
    return this._sourceBuffer;
  }

  private onSourceBufferUpdateend = (): void => {
    Dispatcher.emit({
      name: EEvent.BUFFER_UPDATE,
      contentType: this._contentType
    });
  };

  private parseMp4(data: ArrayBuffer, inbandEventStreams: Array<IInbandEventStream>): void {
    const schemeIdUris: Array<string> = inbandEventStreams.map((i: IInbandEventStream) => i.schemeIdUri);
    new Mp4Parser()
      .fullBox('emsg', (box: IParsedBox) => {
        const parsedEmsg: IEmsg = Mp4Parser.parseEmsg(box.reader, box.version);

        if (schemeIdUris.includes(parsedEmsg.schemeIdUri)) {
          Dispatcher.emit({
            name: EEvent.INBAND_STREAM,
            ...parsedEmsg
          });
        }
      })
      .parse(data);
  }

  private hasReachBufferAhead(currentTime: number): boolean {
    const timeRange: [number, number] = this.getBufferRange(currentTime);
    const endTime: number = timeRange[1];

    return endTime - currentTime >= Math.max(Config.buffer.bufferAhead, this._minBufferTime);
  }

  public feedBuffer(currentTime: number): void {
    if (!this._sourceBuffer.updating) {
      if (!this.hasReachBufferAhead(currentTime)) {
        const dataSegment: IDataSegment | null = this._segmentDownloaderManager.getReadyDataSegment(
          this._contentType
        );

        if (dataSegment) {
          this._currentDataSegment = dataSegment;
          this._shouldRemoveBuffer = true;
          this._sourceBuffer.timestampOffset =
            this._currentDataSegment.periodStart - this._currentDataSegment.offset;

          const mimeCodec: string = getMimeCodec(
            this._currentDataSegment.mimeType,
            this._currentDataSegment.codecs
          );
          if (this._mimeCodec !== mimeCodec) {
            this._logger.debug(`Changing codec from "${this._mimeCodec}" to "${mimeCodec}"`);
            this._sourceBuffer.changeType(mimeCodec);
            this._mimeCodec = mimeCodec;
          }

          const {data, ...rest} = this._currentDataSegment;
          this._logger.debug(`Feeding ${this._contentType} buffer ${rest.index}`, rest);
          this._sourceBuffer.appendBuffer(data as ArrayBuffer);

          if (dataSegment.inbandEventStreams) {
            this.parseMp4(dataSegment.data as ArrayBuffer, dataSegment.inbandEventStreams);
          }
        } else if (this._shouldRemoveBuffer) {
          const removed: boolean = this.removeBufferBehind(currentTime);
          this._shouldRemoveBuffer = !removed;
        }
      } else if (this._shouldRemoveBuffer) {
        const removed: boolean = this.removeBufferBehind(currentTime);
        this._shouldRemoveBuffer = !removed;
      }
    }
  }

  private removeBufferBehind(currentTime: number): boolean {
    const {buffered} = this._sourceBuffer;
    if (buffered.length === 0) return false;
    const startTime: number = buffered.start(0);
    const endTime: number = currentTime - Config.buffer.bufferBehind;

    if (currentTime - startTime >= Config.buffer.bufferBehind) {
      return this.clearBuffer(startTime, endTime);
    }

    return false;
  }

  public clearBuffer(startTime?: number, endTime?: number): boolean {
    if (this._mediaSource.readyState === 'open') {
      this._sourceBuffer.abort();
    }

    const start: number = startTime ?? 0;

    let end: number | undefined = endTime;
    if (end === undefined) {
      const {buffered, updating} = this._sourceBuffer;
      if (buffered.length === 0 || updating) return false;
      end = buffered.end(buffered.length - 1);
    }

    if (start >= end) return false;
    this._logger.debug(`Clear ${this._contentType} buffer from ${start.toFixed(2)}s to ${end.toFixed(2)}s`);

    this._sourceBuffer.remove(start, end);

    return true;
  }

  public getBufferRange(time: number): [number, number] {
    return getTimeRange(this._sourceBuffer.buffered, time);
  }

  public destroy(): void {
    this._logger.info(`Destroying ${this._contentType} buffer`);
    this.clearBuffer();
    this.removeListeners();

    this._mediaSource.removeSourceBuffer(this._sourceBuffer);

    this._shouldRemoveBuffer = false;
    this._currentDataSegment = null;
  }
}

export default AVBuffer;
