import IBuffer from '@buffer/interfaces/IBuffer';
import {Config} from '@config/config';
import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import IDataSegment from '@downloader/segment/interfaces/IDataSegment';
import SegmentDownloaderManager from '@downloader/segment/segmentDownloaderManager';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import EContentType from '@parser/manifest/enum/EContentType';
import EMimeType from '@parser/manifest/enum/EMimeType';
import ICue from '@parser/text/interfaces/ICue';
import TextParser from '@parser/text/textParser';

class TextBuffer implements IBuffer {
  private _logger: Logger = new Logger(ELogType.BUFFER);
  private _activeCueIds: Record<string, boolean> = {};
  private _textParser: TextParser;
  private _shouldRemoveBuffer: boolean = false;
  private _textTrack: TextTrack;

  constructor(
    private _videoElement: HTMLVideoElement,
    private _segmentDownloaderManager: SegmentDownloaderManager,
    private _minBufferTime: number,
    codecs: string
  ) {
    this._textParser = new TextParser(codecs);

    this._logger.info('Add text track');
    this._textTrack = this._videoElement.addTextTrack('subtitles', 'Tape Text Track', 'generic');
    this._textTrack.mode = 'hidden';
  }

  private addCue(cue: ICue, currentDataSegment: IDataSegment): void {
    const {begin: relativeBegin, end: relativeEnd, text, subtitleId, position, id} = cue;
    if (this._textTrack.cues?.getCueById(id)) return;

    const begin: number = currentDataSegment.periodStart + relativeBegin;
    const end: number = currentDataSegment.periodStart + relativeEnd;

    const vttCue: VTTCue = new VTTCue(begin, end, text);
    vttCue.id = id;

    const {data, ...rest} = currentDataSegment;
    this._logger.debug(`Feeding ${EContentType.TEXT} buffer ${rest.index}`, {
      ...rest,
      subtitleId,
      position,
      begin,
      end
    });
    this._textTrack.addCue(vttCue);
    Dispatcher.emit({
      name: EEvent.BUFFER_UPDATE,
      contentType: EContentType.TEXT
    });

    vttCue.addEventListener('enter', (_event: Event) => {
      this._logger.debug(`Cue ${id} enter`, cue);
      this._activeCueIds[id] = true;
      Dispatcher.emit({
        name: EEvent.CUE_ENTER,
        data: cue
      });
    });
    vttCue.addEventListener('exit', (_event: Event) => {
      this._logger.debug(`Cue ${id} exit`, cue);
      delete this._activeCueIds[id];
      Dispatcher.emit({
        name: EEvent.CUE_EXIT,
        id
      });
    });
  }

  private removeCues(cueIds: Array<string>): void {
    for (let i: number = 0; i < cueIds.length; i++) {
      const cue: TextTrackCue | null | undefined = this._textTrack.cues?.getCueById(cueIds[i]);
      if (cue) {
        this._logger.debug(`Remove cue ${cue.id}`);
        if (this._activeCueIds[cueIds[i]]) {
          cue.dispatchEvent(new Event('exit'));
        }
        this._textTrack.removeCue(cue);
      }
    }
  }

  private hasReachBufferAhead(currentTime: number): boolean {
    const timeRange: [number, number] = this.getBufferRange(currentTime);
    const endTime: number = timeRange[1];

    return endTime - currentTime >= Math.max(Config.buffer.bufferAhead, this._minBufferTime);
  }

  public feedBuffer = (currentTime: number): void => {
    const {parser} = this._textParser;
    if (!parser) return;
    if (!this.hasReachBufferAhead(currentTime)) {
      const currentDataSegment: IDataSegment | null = this._segmentDownloaderManager.getReadyDataSegment(
        EContentType.TEXT
      );

      if (currentDataSegment) {
        this._shouldRemoveBuffer = true;

        let cues: Array<ICue> = [];
        if (currentDataSegment.mimeType !== EMimeType.APPLICATION) {
          cues = parser.parseText(currentDataSegment.data as string, currentDataSegment.index);
        } else {
          cues = parser.parseMp4(
            currentDataSegment.data as ArrayBuffer,
            currentDataSegment.index,
            currentDataSegment.id === 0
          );
        }

        for (let i: number = 0; i < cues.length; i++) {
          this.addCue(cues[i], currentDataSegment);
        }
      }
    } else if (this._shouldRemoveBuffer) {
      const removed: boolean = this.removeBufferBehind(currentTime);
      this._shouldRemoveBuffer = !removed;
    }
  };

  private removeBufferBehind(currentTime: number): boolean {
    const timeRange: [number, number] = this.getBufferRange(currentTime);

    const startTime: number = timeRange[0];
    const endTime: number = currentTime - Config.buffer.bufferBehind;

    if (currentTime - startTime >= Config.buffer.bufferBehind) {
      return this.clearBuffer(startTime, endTime);
    }

    return false;
  }

  public clearBuffer(startTime?: number, endTime?: number): boolean {
    if (!this._textTrack.cues?.length) return false;

    const start: number = startTime ?? 0;

    let end: number | undefined = endTime;
    if (end === undefined) {
      end = this._textTrack.cues[this._textTrack.cues.length - 1].endTime;
    }

    if (start > end) return false;
    this._logger.debug(`Clear ${EContentType.TEXT} buffer from ${start.toFixed(2)}s to ${end.toFixed(2)}s`);

    const cueIds: Array<string> = [];
    for (let i: number = 0; i < this._textTrack.cues.length; i++) {
      const cue: TextTrackCue = this._textTrack.cues[i];
      if ((start <= cue.startTime && cue.startTime <= end) || (start <= cue.endTime && cue.endTime <= end)) {
        cueIds.push(cue.id);
      }
    }
    this.removeCues(cueIds);

    return true;
  }

  public getBufferRange(time: number): [number, number] {
    if (!this._textTrack.cues || this._textTrack.cues.length === 0) return [0, 0];
    const start: number = this._textTrack.cues[0].startTime;
    const end: number = this._textTrack.cues[this._textTrack.cues.length - 1].endTime;

    if (start <= time && time <= end) {
      return [start, end];
    }

    return [0, 0];
  }

  public destroy(): void {
    this._logger.info(`Destroying ${EContentType.TEXT} Buffer`);
    this.clearBuffer();

    this._textParser.destroy();
    this._shouldRemoveBuffer = false;
    this._activeCueIds = {};
  }
}

export default TextBuffer;
