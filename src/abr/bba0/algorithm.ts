import IAlgorithm from '@abr/interfaces/IAlgorithm';
import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ITimedEvents from '@dispatcher/interfaces/ITimedEvents';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import IRepresentation from '@parser/manifest/interfaces/IRepresentation';
import getTimeRange from '@utils/getTimeRange';

class BBA0 implements IAlgorithm {
  private _logger: Logger = new Logger(ELogType.ABR);
  private _ratePrev: Record<string, number> = {};
  private _bufferLevel: number = 0;
  private _videoBufferEnd: number = 0;
  private _audioBufferEnd: number = 0;

  private _CUSHION: number = 30;
  private _RESERVOIR: number = 8;

  constructor() {
    this.addListeners();
  }

  get bufferLevel(): number {
    return this._bufferLevel;
  }

  private addListeners(): void {
    Dispatcher.on(EEvent.BUFFERS_UPDATE, this.onBuffersUpdate);
    Dispatcher.on(EEvent.TIME_UPDATE, this.onTimeUpdate);
  }

  private removeListeners(): void {
    Dispatcher.off(EEvent.BUFFERS_UPDATE, this.onBuffersUpdate);
    Dispatcher.off(EEvent.TIME_UPDATE, this.onTimeUpdate);
  }

  private onBuffersUpdate = (buffersUpdateEvent: ITimedEvents[EEvent.BUFFERS_UPDATE]): void => {
    const {videoBuffered, audioBuffered, currentTime} = buffersUpdateEvent.detail;

    const videoTimeRange: [number, number] = getTimeRange(videoBuffered, currentTime);

    const audioTimeRange: [number, number] = getTimeRange(audioBuffered, currentTime);

    this._videoBufferEnd = videoTimeRange[1];
    this._audioBufferEnd = audioTimeRange[1];

    this.setBufferLevel(currentTime);
  };

  private onTimeUpdate = (timeUpdateEvent: ITimedEvents[EEvent.TIME_UPDATE]): void => {
    const {currentTime} = timeUpdateEvent.detail;

    this.setBufferLevel(currentTime);
  };

  private setBufferLevel(currentTime: number): void {
    const videoBufferAhead: number = this.getBufferAhead(this._videoBufferEnd, currentTime);
    const audioBufferAhead: number = this.getBufferAhead(this._audioBufferEnd, currentTime);

    this._bufferLevel = Math.max(videoBufferAhead, audioBufferAhead);
  }

  private getBufferAhead(bufferEnd: number, currentTime: number): number {
    return bufferEnd ? bufferEnd - currentTime : 0;
  }

  private getMappedBitrate(bufferLevel: number, step: number, rateMap: {[key: number]: number}): number {
    if (bufferLevel <= this._CUSHION + this._RESERVOIR && bufferLevel >= this._RESERVOIR) {
      return rateMap[Math.round((bufferLevel - this._RESERVOIR) / step) * step + this._RESERVOIR];
    } else if (bufferLevel > this._CUSHION + this._RESERVOIR) {
      return rateMap[this._CUSHION + this._RESERVOIR];
    } else {
      return rateMap[this._RESERVOIR];
    }
  }

  public chooseRepresentation(representations: Array<IRepresentation>): IRepresentation {
    const periodId: string = representations[0].periodId;

    const rateMap: Record<number, number> = {};
    const step: number = this._CUSHION / (representations.length - 1);

    representations.forEach((representation: IRepresentation, index: number) => {
      rateMap[this._RESERVOIR + index * step] = representation.bandwidth;
    });

    const rateMax: number = representations[representations.length - 1].bandwidth;
    const rateMin: number = representations[0].bandwidth;

    this._ratePrev[periodId] = this._ratePrev[periodId] > rateMin ? this._ratePrev[periodId] : rateMin;

    let ratePlus: number = rateMax;
    let rateMinus: number = rateMin;

    if (this._ratePrev[periodId] === rateMax) {
      ratePlus = rateMax;
    } else {
      for (const representation of representations) {
        if (representation.bandwidth > this._ratePrev[periodId]) {
          ratePlus = representation.bandwidth;
          break;
        }
      }
    }

    if (this._ratePrev[periodId] === rateMin) {
      rateMinus = rateMin;
    } else {
      for (const representation of representations) {
        if (representation.bandwidth < this._ratePrev[periodId]) {
          rateMinus = representation.bandwidth;
          break;
        }
      }
    }

    const bufferLevel: number = this._bufferLevel;
    const mappedBufferLevel: number = this.getMappedBitrate(bufferLevel, step, rateMap);

    let rateNext: number = -1;
    if (bufferLevel <= this._RESERVOIR) {
      rateNext = rateMin;
    } else if (bufferLevel >= this._RESERVOIR + this._CUSHION) {
      rateNext = rateMax;
    } else if (mappedBufferLevel >= ratePlus) {
      for (const representation of representations) {
        if (representation.bandwidth <= mappedBufferLevel) {
          rateNext = representation.bandwidth;
          break;
        }
      }
    } else if (mappedBufferLevel <= rateMinus) {
      for (const representation of representations) {
        if (representation.bandwidth > mappedBufferLevel) {
          rateNext = representation.bandwidth;
          break;
        }
      }
    } else {
      rateNext = this._ratePrev[periodId];
    }

    this._ratePrev[periodId] = rateNext;
    const selectedRepresentation: IRepresentation | undefined = representations.find(
      (r: IRepresentation) => r.bandwidth === rateNext
    );

    if (!selectedRepresentation) {
      this._logger.warn('Representation not found, fallback to the first representation');

      return representations[0];
    }

    return selectedRepresentation;
  }

  public destroy(): void {
    this._logger.info('Destroying BBA0 algorithm');

    this.removeListeners();

    this._ratePrev = {};
    this._bufferLevel = 0;
    this._videoBufferEnd = 0;
    this._audioBufferEnd = 0;
  }
}

export default BBA0;
