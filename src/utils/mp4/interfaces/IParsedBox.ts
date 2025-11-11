import DataViewReader from '../dataViewReader';
import Mp4Parser from '../parser';

interface IParsedBox {
  parser: Mp4Parser;
  version: number;
  flags: number;
  reader: DataViewReader;
  size: number;
  start: number;
}

export default IParsedBox;
