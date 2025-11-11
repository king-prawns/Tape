import EContentType from '@parser/manifest/enum/EContentType';

import EEvent from '../enum/EEvent';

interface ISegmentReadyEvent {
  name: EEvent.SEGMENT_READY;
  contentType: EContentType;
}

export default ISegmentReadyEvent;
