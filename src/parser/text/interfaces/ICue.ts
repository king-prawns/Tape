import IRegion from './IRegion';

interface ICue {
  id: string;
  subtitleId: number;
  position: number;
  begin: number;
  end: number;
  text: string;
  lang: string;
  regionId: string;
  region: IRegion | null;
}

export default ICue;
