import IAlgorithm from '@abr/interfaces/IAlgorithm';
import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import ITimedEvents from '@dispatcher/interfaces/ITimedEvents';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import IRepresentation from '@parser/manifest/interfaces/IRepresentation';
import ERequestType from '@xhr/enum/ERequestType';

class Llama implements IAlgorithm {
  private _logger: Logger = new Logger(ELogType.ABR);
  private _throughputs: Array<number> = [];
  private _ratePrev: Record<string, number> = {};

  private _HARMONIC_MEAN_SIZE: number = 20;

  constructor() {
    this.addListeners();
  }

  private addListeners(): void {
    Dispatcher.on(EEvent.HTTP_RESPONSE, this.onHttpResponse);
  }

  private removeListeners(): void {
    Dispatcher.off(EEvent.HTTP_RESPONSE, this.onHttpResponse);
  }

  private onHttpResponse = (httpResponseEvent: ITimedEvents[EEvent.HTTP_RESPONSE]): void => {
    const {timeMs, bytes, requestType} = httpResponseEvent.detail;
    if (requestType === ERequestType.VIDEO_SEGMENT) {
      const bit: number = bytes * 8;
      const timeSec: number = timeMs / 1000;
      const bps: number = bit / timeSec;
      this._throughputs.push(bps);

      this._logger.debug(`Estimated bandwidth: ${(bps / 1000).toFixed(0)} Kbps`, requestType);

      Dispatcher.emit({
        name: EEvent.ESTIMATED_BANDWIDTH,
        estimatedBandwidth: bps
      });
    }
  };

  private calculateHarmonicMean(n: number): number {
    let sum: number = 0;
    let sampleSize: number = 0;
    for (let i: number = n; i > n - this._HARMONIC_MEAN_SIZE; i--) {
      if (i > 0) {
        const throughput: number = this._throughputs[i];
        sum = sum + 1 / throughput;
        sampleSize = sampleSize + 1;
      }
    }
    const mean: number = sum / sampleSize;

    return 1 / mean;
  }

  public chooseRepresentation(representations: Array<IRepresentation>): IRepresentation {
    const periodId: string = representations[0].periodId;
    if (this._ratePrev[periodId] === undefined) {
      this._ratePrev[periodId] = 0;
    }

    const lastThroughput: number = this._throughputs[this._throughputs.length - 1];
    const harmonicMean: number = this.calculateHarmonicMean(this._throughputs.length - 1);

    const i: number = this._ratePrev[periodId];
    if (i > 0 && lastThroughput < representations[i].bandwidth) {
      this._ratePrev[periodId] = i - 1;

      return representations[i - 1];
    } else if (i < representations.length - 1 && harmonicMean > representations[i + 1].bandwidth) {
      this._ratePrev[periodId] = i + 1;

      return representations[i + 1];
    } else {
      return representations[i];
    }
  }

  public destroy(): void {
    this._logger.info('Destroying Llama algorithm');

    this.removeListeners();

    this._throughputs.length = 0;
    this._ratePrev = {};
  }
}

export default Llama;
