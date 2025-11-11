import IRepresentation from '@parser/manifest/interfaces/IRepresentation';

import EEvent from '../enum/EEvent';

interface IChooseRepresentationEvent {
  name: EEvent.CHOOSE_REPRESENTATION;
  representation: IRepresentation;
}

export default IChooseRepresentationEvent;
