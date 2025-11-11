import ISegment from '@parser/manifest/interfaces/ISegment';

interface IDataSegment extends ISegment {
  data?: ArrayBuffer | string;
  isLast: boolean;
  index: number;
}

export default IDataSegment;
