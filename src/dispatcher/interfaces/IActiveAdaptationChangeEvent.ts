import EEvent from '@dispatcher/enum/EEvent';
import EContentType from '@parser/manifest/enum/EContentType';

interface IActiveAdaptationChangeEvent {
  name: EEvent.ACTIVE_ADAPTATION_CHANGE;
  contentType: EContentType;
  id: string | null;
  lang: string | null;
}

export default IActiveAdaptationChangeEvent;
