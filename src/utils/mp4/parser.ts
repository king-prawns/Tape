import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';

import DataViewReader from './dataViewReader';
import EBoxType from './enum/EBoxType';
import EEndian from './enum/EEndian';
import IData from './interfaces/IData';
import IEmsg from './interfaces/IEmsg';
import IMdhd from './interfaces/IMdhd';
import IParsedBox from './interfaces/IParsedBox';
import ITfdt from './interfaces/ITfdt';
import ITfhd from './interfaces/ITfhd';
import ITrun from './interfaces/ITrun';

type CallbackType = (box: IParsedBox) => void;

// TODO: spike codem-isoboxer pkg
class Mp4Parser {
  private _logger: Logger = new Logger(ELogType.MP4);
  private headers = new Map<string, EBoxType>();
  private boxDefinitions = new Map<string, CallbackType>();
  private done: boolean = false;

  private parseNext(reader: DataViewReader): void {
    const start: number = reader.getPosition();
    let size: number = reader.readUint32();
    const type: number = reader.readUint32();
    const name: string = reader.typeToString(type);

    switch (size) {
      case 0:
        size = reader.getLength() - start;
        break;
      case 1:
        size = reader.readUint64();
        break;
    }

    if (this.boxDefinitions.has(name)) {
      let version: number = 0;
      let flags: number = 0;

      if (this.headers.get(name) === EBoxType.FULL_BOX) {
        const versionAndFlags: number = reader.readUint32();
        version = versionAndFlags >>> 24;
        flags = versionAndFlags & 0xffffff;
      }

      const end: number = start + size;

      const payloadSize: number = end - reader.getPosition();
      const payload: Uint8Array = payloadSize > 0 ? reader.readBytes(payloadSize) : new Uint8Array(0);
      const payloadReader: DataViewReader = new DataViewReader(payload, EEndian.BIG);
      const box: IParsedBox = {
        parser: this,
        version,
        flags,
        reader: payloadReader,
        size,
        start
      };

      const boxDefinition: CallbackType = this.boxDefinitions.get(name) as CallbackType;
      boxDefinition(box);
    } else {
      const skipLength: number = Math.min(
        start + size - reader.getPosition(),
        reader.getLength() - reader.getPosition()
      );
      reader.skip(skipLength);
    }
  }

  public box(name: string, definition: CallbackType, type = EBoxType.BASIC_BOX): Mp4Parser {
    this.headers.set(name, type);
    this.boxDefinitions.set(name, definition);

    return this;
  }

  public fullBox(name: string, definition: CallbackType): Mp4Parser {
    return this.box(name, definition, EBoxType.FULL_BOX);
  }

  public parse(data: ArrayBuffer): void {
    this.done = false;
    const reader: DataViewReader = new DataViewReader(data, EEndian.BIG);
    while (reader.hasMoreData() && !this.done) {
      this.parseNext(reader);
    }
  }

  public stop(): void {
    this.done = true;
  }

  public static children(box: IParsedBox): void {
    while (box.reader.hasMoreData()) {
      box.parser.parseNext(box.reader);
    }
  }

  public static parseData(reader: DataViewReader): IData {
    const all: number = reader.getLength() - reader.getPosition();
    const data: Uint8Array = reader.readBytes(all);

    return {
      data
    };
  }

  public static parseEmsg(reader: DataViewReader, version: number): IEmsg {
    let id: number;
    let eventDuration: number;
    let timescale: number;
    let presentationTimeDelta: number;
    let schemeIdUri: string;
    let value: string;
    if (version === 0) {
      schemeIdUri = reader.readTerminatedString();
      value = reader.readTerminatedString();
      timescale = reader.readUint32();
      presentationTimeDelta = reader.readUint32();
      eventDuration = reader.readUint32();
      id = reader.readUint32();
    } else {
      timescale = reader.readUint32();
      presentationTimeDelta = reader.readUint64();
      eventDuration = reader.readUint32();
      id = reader.readUint32();
      schemeIdUri = reader.readTerminatedString();
      value = reader.readTerminatedString();
    }
    const messageData: Uint8Array = reader.readBytes(reader.getLength() - reader.getPosition());

    return {
      id,
      eventDuration,
      timescale,
      presentationTimeDelta,
      schemeIdUri,
      value,
      messageData
    };
  }

  public static parseMdhd(reader: DataViewReader, version: number): IMdhd {
    if (version == 1) {
      reader.skip(8); // Skip "creation_time"
      reader.skip(8); // Skip "modification_time"
    } else {
      reader.skip(4); // Skip "creation_time"
      reader.skip(4); // Skip "modification_time"
    }

    const timescale: number = reader.readUint32();

    return {
      timescale
    };
  }

  public static parseTfdt(reader: DataViewReader, version: number): ITfdt {
    const baseMediaDecodeTime: number = version == 1 ? reader.readUint64() : reader.readUint32();

    return {
      baseMediaDecodeTime
    };
  }

  static parseTfhd(reader: DataViewReader, flags: number): ITfhd {
    let defaultSampleDuration: number | null = null;
    let defaultSampleSize: number | null = null;

    const trackId: number = reader.readUint32(); // Read "track_ID"

    // Skip "base_data_offset" if present.
    if (flags & 0x000001) {
      reader.skip(8);
    }

    // Skip "sample_description_index" if present.
    if (flags & 0x000002) {
      reader.skip(4);
    }

    // Read "default_sample_duration" if present.
    if (flags & 0x000008) {
      defaultSampleDuration = reader.readUint32();
    }

    // Read "default_sample_size" if present.
    if (flags & 0x000010) {
      defaultSampleSize = reader.readUint32();
    }

    return {
      trackId,
      defaultSampleDuration,
      defaultSampleSize
    };
  }

  static parseTrun(reader: DataViewReader, version: number, flags: number): ITrun {
    const sampleCount: number = reader.readUint32();
    const sampleData: ITrun['sampleData'] = [];

    // Skip "data_offset" if present.
    if (flags & 0x000001) {
      reader.skip(4);
    }

    // Skip "first_sample_flags" if present.
    if (flags & 0x000004) {
      reader.skip(4);
    }

    for (let i: number = 0; i < sampleCount; i++) {
      /** @type {shaka.util.ParsedTRUNSample} */
      const sample: ITrun['sampleData'][0] = {
        sampleDuration: null,
        sampleSize: null,
        sampleCompositionTimeOffset: null
      };

      // Read "sample duration" if present.
      if (flags & 0x000100) {
        sample.sampleDuration = reader.readUint32();
      }

      // Read "sample_size" if present.
      if (flags & 0x000200) {
        sample.sampleSize = reader.readUint32();
      }

      // Skip "sample_flags" if present.
      if (flags & 0x000400) {
        reader.skip(4);
      }

      // Read "sample_time_offset" if present.
      if (flags & 0x000800) {
        sample.sampleCompositionTimeOffset = version == 0 ? reader.readUint32() : reader.readInt32();
      }

      sampleData.push(sample);
    }

    return {
      sampleCount,
      sampleData
    };
  }
}

export default Mp4Parser;
