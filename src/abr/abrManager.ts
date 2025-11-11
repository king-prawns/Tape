import {Config} from '@config/config';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import IRepresentation from '@parser/manifest/interfaces/IRepresentation';

// import BBA0 from './bba0/algorithm';
import Llama from './llama/algorithm';
// import Throughput from './throughput/algorithm';

/**
 * TODO - DYNAMIC
 * At startup, ABRManager starts by invoking THROUGHPUT. At this stage, BBA0 still prefers a bitrate that is too low.
 * When the buffer level reaches 10s or more and BBA0 chooses a bitrate at least as high as the bitrate chosen by THROUGHPUT, ABRManager switches to BBA0.
 * ABRManager switches back to THROUGHPUT when the buffer level falls below 10s and BBA0 chooses a bitrate lower than THROUGHPUT.
 * ABRManager switches to THROUGHPUT whenever there is a quality change, till the buffer level stabilizes, after which it can switch back to BBA0.
 */

class ABRManager {
  private _logger: Logger = new Logger(ELogType.ABR);
  // private _bba0: BBA0 = new BBA0();
  // private _throughput: Throughput = new Throughput();
  private _llama: Llama = new Llama();

  private _lastTimeChosen: Record<string, number> = {};

  private _THRESHOLD: number = 12;

  private isInitialEstimation(periodId: string): boolean {
    return this._lastTimeChosen[periodId] === undefined;
  }

  // TODO: improve logic
  private canChoose(periodId: string): boolean {
    const lastTimeChosen: number | undefined = this._lastTimeChosen[periodId];
    if (lastTimeChosen === undefined) return true;

    const now: number = Date.now();

    return now - lastTimeChosen >= Config.abr.switchInterval;
  }

  private sortRepresentations(r1: IRepresentation, r2: IRepresentation): number {
    return r1.bandwidth - r2.bandwidth;
  }

  public chooseClosestRepresentation(
    videoRepresentations: Array<IRepresentation>,
    bandwidth: number
  ): IRepresentation {
    const sortedVideoRepresentation: Array<IRepresentation> = videoRepresentations.sort(
      this.sortRepresentations
    );

    return sortedVideoRepresentation.reduce((r1: IRepresentation, r2: IRepresentation) => {
      const aDiff: number = Math.abs(r1.bandwidth - bandwidth);
      const bDiff: number = Math.abs(r2.bandwidth - bandwidth);

      if (aDiff == bDiff) {
        return r1 > r2 ? r1 : r2;
      } else {
        return bDiff < aDiff ? r2 : r1;
      }
    });
  }

  public chooseVideoRepresentation(
    videoRepresentations: Array<IRepresentation>,
    onInit: boolean
  ): IRepresentation | null {
    const periodId: string = videoRepresentations[0].periodId;
    if (!onInit && !this.canChoose(periodId)) return null;

    let sortedVideoRepresentations: Array<IRepresentation> = videoRepresentations.sort(
      this.sortRepresentations
    );

    if (this.isInitialEstimation(periodId)) {
      sortedVideoRepresentations = sortedVideoRepresentations.filter(
        (r: IRepresentation) => r.bandwidth >= Config.abr.minBandwidth
      );
    }

    // const chosenVideoRepresentation: IRepresentation =
    //   this._throughput.chooseRepresentation(sortedVideoRepresentations);
    // const chosenVideoRepresentation: IRepresentation =
    //   this._bba0.chooseRepresentation(sortedVideoRepresentations);
    const chosenVideoRepresentation: IRepresentation =
      this._llama.chooseRepresentation(sortedVideoRepresentations);

    this._logger.debug('Choose video representation', chosenVideoRepresentation);

    this._lastTimeChosen[periodId] = Date.now();

    return chosenVideoRepresentation;
  }

  public destroy(): void {
    this._logger.info('Destroying ABR manager');

    // this._bba0.destroy();
    // this._throughput.destroy();
    this._llama.destroy();

    this._lastTimeChosen = {};
  }
}

export default ABRManager;
