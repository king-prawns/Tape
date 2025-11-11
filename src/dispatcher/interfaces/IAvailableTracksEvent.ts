import EContentType from '@parser/manifest/enum/EContentType';

import EEvent from '../enum/EEvent';

interface IAvailableTracksEvent {
  name: EEvent.AVAILABLE_TRACKS;
  contentType: EContentType;
  tracks: Array<string> | Array<number>;
}

export default IAvailableTracksEvent;
