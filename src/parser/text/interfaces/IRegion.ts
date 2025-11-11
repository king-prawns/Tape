import IStyle from './IStyle';

interface IRegion {
  id: string;
  displayAlign: string;
  extent: string;
  origin: string;
  styleId: string;
  style: IStyle | null;
}

export default IRegion;
