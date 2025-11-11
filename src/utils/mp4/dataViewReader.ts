import {Dispatcher} from '@dispatcher/dispatcher';
import EEvent from '@dispatcher/enum/EEvent';
import EErrorCode from '@error/enum/EErrorCode';
import EErrorSeverity from '@error/enum/EErrorSeverity';
import ELogType from '@logger/enum/ELogType';
import Logger from '@logger/logger';

import EEndian from './enum/EEndian';
import ESize from './enum/ESize';

class DataViewReader {
  private _logger: Logger = new Logger(ELogType.MP4);
  private _position: number = 0;
  private _dataView: DataView;
  private _littleEndian: boolean;

  constructor(data: ArrayBuffer, endianess: EEndian) {
    this._dataView = this.createView(data, DataView) as DataView;
    this._littleEndian = endianess === EEndian.LITTLE;
  }

  private createView(
    data: DataView | ArrayBuffer | Uint8Array,
    Type: typeof DataView | typeof Uint8Array,
    offset: number = 0,
    length: number = Infinity
  ): DataView | Uint8Array {
    let buffer: ArrayBuffer;
    if (data instanceof ArrayBuffer) {
      buffer = data;
    } else {
      buffer = data.buffer;
    }

    const dataOffset: number = 'byteOffset' in data ? data.byteOffset : 0;
    // Absolute end of the |data| view within |buffer|.
    const dataEnd: number = dataOffset + data.byteLength;
    // Absolute start of the result within |buffer|.
    const rawStart: number = dataOffset + offset;
    const start: number = Math.max(0, Math.min(rawStart, dataEnd));
    // Absolute end of the result within |buffer|.
    const end: number = Math.min(start + Math.max(length, 0), dataEnd);

    return new Type(buffer, start, end - start);
  }

  private overflowError(): Error {
    return this.onError(EErrorCode.JS_OVERFLOW, 'JS integer overflow');
  }
  private outOfBoundsError(): Error {
    return this.onError(EErrorCode.READER_OUT_OF_BOUNDS, 'Buffer position out of bounds');
  }

  private onError(code: EErrorCode, message: string): Error {
    this._logger.error(message);
    Dispatcher.emit({
      name: EEvent.TAPE_ERROR,
      message,
      code,
      severity: EErrorSeverity.FATAL
    });

    return new Error(message);
  }

  public getDataView(): DataView {
    return this._dataView;
  }

  public getLength(): number {
    return this._dataView.byteLength;
  }

  public getPosition(): number {
    return this._position;
  }

  public hasMoreData(): boolean {
    return this.getPosition() < this.getLength();
  }

  public readUint8(): number {
    try {
      const value: number = this._dataView.getUint8(this._position);
      this._position += ESize.UINT8;

      return value;
    } catch (e) {
      throw this.outOfBoundsError();
    }
  }

  public readUint16(): number {
    try {
      const value: number = this._dataView.getUint16(this._position, this._littleEndian);
      this._position += ESize.UINT16;

      return value;
    } catch (e) {
      throw this.outOfBoundsError();
    }
  }

  public readUint32(): number {
    try {
      const value: number = this._dataView.getUint32(this._position, this._littleEndian);
      this._position += ESize.UINT32;

      return value;
    } catch (e) {
      throw this.outOfBoundsError();
    }
  }

  public readInt32(): number {
    try {
      const value: number = this._dataView.getInt32(this._position, this._littleEndian);
      this._position += ESize.UINT32;

      return value;
    } catch (e) {
      throw this.outOfBoundsError();
    }
  }

  public readUint64(): number {
    let low: number;
    let high: number;

    try {
      if (this._littleEndian) {
        low = this._dataView.getUint32(this._position, true);
        high = this._dataView.getUint32(this._position + ESize.UINT32, true);
      } else {
        high = this._dataView.getUint32(this._position, false);
        low = this._dataView.getUint32(this._position + ESize.UINT32, false);
      }
    } catch (e) {
      throw this.outOfBoundsError();
    }

    if (high > 0x1fffff) {
      throw this.overflowError();
    }

    this._position += 8;

    return high * Math.pow(2, 32) + low;
  }

  public readBytes(bytes: number): Uint8Array {
    if (this._position + bytes > this.getLength()) {
      throw this.outOfBoundsError();
    }

    const value: Uint8Array = this.createView(
      this._dataView,
      Uint8Array,
      this._position,
      bytes
    ) as Uint8Array;
    this._position += bytes;

    return value;
  }

  public readTerminatedString(): string {
    const start: number = this._position;
    while (this.hasMoreData()) {
      const value: number = this._dataView.getUint8(this._position);
      if (value === 0) {
        break;
      }
      this._position += 1;
    }

    const value: Uint8Array = this.createView(
      this._dataView,
      Uint8Array,
      start,
      this._position - start
    ) as Uint8Array;

    // Skip string termination.
    this._position += 1;

    return this.uint8toString(value);
  }

  public skip(bytes: number): void {
    if (this._position + bytes > this.getLength()) {
      throw this.outOfBoundsError();
    }
    this._position += bytes;
  }

  public typeToString(type: number): string {
    const name: string = String.fromCharCode(
      (type >> 24) & 0xff,
      (type >> 16) & 0xff,
      (type >> 8) & 0xff,
      type & 0xff
    );

    return name;
  }

  public uint8toString(uint8: Uint8Array): string {
    // If present, strip off the UTF-8 BOM.
    if (uint8[0] == 0xef && uint8[1] == 0xbb && uint8[2] == 0xbf) {
      uint8 = uint8.subarray(3);
    }

    const utf8decoder: TextDecoder = new TextDecoder();
    const decoded: string = utf8decoder.decode(uint8);
    if (decoded.includes('\uFFFD')) {
      const message: string =
        'Decoded string contains an "unknown character" codepoint. That probably means the UTF8 encoding was incorrect!';
      this._logger.error(message);
      Dispatcher.emit({
        name: EEvent.TAPE_ERROR,
        message,
        code: EErrorCode.TEXT_DECODER,
        severity: EErrorSeverity.FATAL
      });

      return '';
    }

    return decoded;
  }
}

export default DataViewReader;
