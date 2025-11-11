import IManifest from '@parser/manifest/interfaces/IManifest';

import EEvent from '../enum/EEvent';

interface IManifestReadyEvent {
  name: EEvent.MANIFEST_READY;
  manifest: IManifest;
}

export default IManifestReadyEvent;
