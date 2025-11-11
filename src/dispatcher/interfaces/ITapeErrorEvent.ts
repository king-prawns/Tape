import ITapeError from '@error/interfaces/ITapeError';

import EEvent from '../enum/EEvent';

type ITapeErrorEvent = {
  name: EEvent.TAPE_ERROR;
} & ITapeError;

export default ITapeErrorEvent;
