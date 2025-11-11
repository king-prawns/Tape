import EContentType from '../enum/EContentType';
import EMimeType from '../enum/EMimeType';
import IInbandEventStream from './IInbandEventStream';

interface ISegment {
  contentType: EContentType;
  mimeType: EMimeType;
  codecs: string;
  id: number;
  url: string;
  duration: number;
  time: number;
  offset: number;
  periodId: string;
  periodStart: number;
  representationId: string;
  inbandEventStreams: Array<IInbandEventStream> | null;
}

export default ISegment;
