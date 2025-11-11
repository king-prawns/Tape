import ICue from '@parser/text/interfaces/ICue';

import EEvent from '../enum/EEvent';

interface ICueEnterEvent {
  name: EEvent.CUE_ENTER;
  data: ICue;
}

export default ICueEnterEvent;
