import {IEMEConfig} from '../../..';

interface IAsset {
  name: string;
  manifestUrl: string;
  protocol: 'DASH';
  eme?: IEMEConfig;
}

export default IAsset;
