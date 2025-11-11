import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';
import getTimeSeconds from '@utils/getTimeSeconds';
import DataViewReader from '@utils/mp4/dataViewReader';
import EEndian from '@utils/mp4/enum/EEndian';
import IData from '@utils/mp4/interfaces/IData';
import IMdhd from '@utils/mp4/interfaces/IMdhd';
import IParsedBox from '@utils/mp4/interfaces/IParsedBox';
import ITfdt from '@utils/mp4/interfaces/ITfdt';
import ITfhd from '@utils/mp4/interfaces/ITfhd';
import ITrun from '@utils/mp4/interfaces/ITrun';
import Mp4Parser from '@utils/mp4/parser';

import ICue from '../interfaces/ICue';
import IParser from '../interfaces/IParser';

class WebVTTParser implements IParser {
  private _logger: Logger = new Logger(ELogType.PARSER);
  private _timescale: number = 0;

  private buildSubtitle(str: string, subtitleId: number): Array<ICue> {
    const cues: Array<ICue> = [];

    const [idStr, timeRangeStr, ...rest] = str.split(/\r?\n/);
    const [beginStr, endStr] = timeRangeStr.split('-->');

    const begin: number = getTimeSeconds(beginStr.trim());
    const end: number = getTimeSeconds(endStr.trim());
    const text: string = rest.join('\n');

    cues.push({
      id: `${subtitleId}_${idStr}`,
      subtitleId,
      begin,
      end,
      text,
      lang: '',
      position: 0,
      region: null,
      regionId: ''
    });

    return cues;
  }

  public parseInit(data: ArrayBuffer): void {
    new Mp4Parser()
      .box('moov', Mp4Parser.children)
      .box('trak', Mp4Parser.children)
      .box('mdia', Mp4Parser.children)
      .fullBox('mdhd', (box: IParsedBox) => {
        const parsedMDHDBox: IMdhd = Mp4Parser.parseMdhd(box.reader, box.version);
        this._timescale = parsedMDHDBox.timescale;
      })
      .parse(data);
  }

  public parseMp4(data: ArrayBuffer, subtitleId: number, isInit: boolean): Array<ICue> {
    const cues: Array<ICue> = [];

    if (isInit) {
      this.parseInit(data);

      return cues;
    }

    let baseTime: number = 0;
    let defaultDuration: number = 0;
    let presentations: ITrun['sampleData'] = [];
    let rawPayload: Uint8Array | undefined;

    new Mp4Parser()
      .box('moof', Mp4Parser.children)
      .box('traf', Mp4Parser.children)
      .fullBox('tfdt', (box: IParsedBox) => {
        const parsedTFDTBox: ITfdt = Mp4Parser.parseTfdt(box.reader, box.version);
        baseTime = parsedTFDTBox.baseMediaDecodeTime;
      })
      .fullBox('tfhd', (box: IParsedBox) => {
        const parsedTFHDBox: ITfhd = Mp4Parser.parseTfhd(box.reader, box.flags);
        defaultDuration = parsedTFHDBox.defaultSampleDuration ?? 0;
      })
      .fullBox('trun', (box: IParsedBox) => {
        const parsedTRUNBox: ITrun = Mp4Parser.parseTrun(box.reader, box.version, box.flags);
        presentations = parsedTRUNBox.sampleData;
      })
      .box('mdat', (box: IParsedBox) => {
        const parsedMdat: IData = Mp4Parser.parseData(box.reader);
        rawPayload = parsedMdat.data;
      })
      .parse(data);

    if (rawPayload) {
      let currentTime: number = baseTime;

      const reader: DataViewReader = new DataViewReader(rawPayload, EEndian.BIG);

      let i: number = 0;
      for (const presentation of presentations) {
        // If one presentation corresponds to multiple payloads, it is assumed
        // that all of those payloads have the same start time and duration.
        const duration: number = presentation.sampleDuration || defaultDuration;
        const startTime: number = presentation.sampleCompositionTimeOffset
          ? baseTime + presentation.sampleCompositionTimeOffset
          : currentTime;
        currentTime = startTime + (duration || 0);

        // Read samples until it adds up to the given size.
        let totalSize: number = 0;

        do {
          // Read the payload size.
          const payloadSize: number = reader.readUint32();
          totalSize += payloadSize;

          // Skip the type.
          const payloadType: number = reader.readUint32();
          const payloadName: string = reader.typeToString(payloadType);

          let payload: Uint8Array | null = null;
          if (payloadName == 'vttc') {
            if (payloadSize > 8) {
              payload = reader.readBytes(payloadSize - 8);
            }
          } else if (payloadName == 'vtte') {
            // It's a vtte, which is a vtt cue that is empty. Ignore any data that
            // does exist.
            reader.skip(payloadSize - 8);
          } else {
            reader.skip(payloadSize - 8);
          }

          if (duration) {
            if (payload) {
              let text: string = '';
              // let id: string = '';
              // let settings: string = '';
              const begin: number = startTime / this._timescale;
              const end: number = currentTime / this._timescale;

              new Mp4Parser()
                .box('payl', (box: IParsedBox) => {
                  const parsedPayl: IData = Mp4Parser.parseData(box.reader);
                  text = box.reader.uint8toString(parsedPayl.data);
                })
                // .box('iden', (box: IParsedBox) => {
                //   const parsedIden: IData = Mp4Parser.parseData(box.reader);
                //   id = box.reader.uint8toString(parsedIden.data);
                // })
                // .box('sttg', (box: IParsedBox) => {
                //   const parsedSttg: IData = Mp4Parser.parseData(box.reader);
                //   settings = box.reader.uint8toString(parsedSttg.data);
                // })
                .parse(payload);

              cues.push({
                id: `${begin}_${end}_${i}`,
                subtitleId,
                begin,
                end,
                text,
                lang: '',
                position: i,
                region: null,
                regionId: ''
              });

              i++;
            }
          } else {
            this._logger.warn('WebVTT sample duration unknown, and no default found!');
          }
          // If no sampleSize was specified, it's assumed that this presentation
          // corresponds to only a single cue.
        } while (presentation.sampleSize && totalSize < presentation.sampleSize);
      }
    }

    return cues;
  }

  public parseText(text: string, subtitleId: number): Array<ICue> {
    if (!text) return [];

    return this.buildSubtitle(text, subtitleId);
  }

  public destroy(): void {
    this._logger.info('Destroying WebVTT parser');
  }
}

export default WebVTTParser;
