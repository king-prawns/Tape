import IRepresentation from '@parser/manifest/interfaces/IRepresentation';

interface IAlgorithm {
  chooseRepresentation(representations: Array<IRepresentation>): IRepresentation;
  destroy(): void;
}

export default IAlgorithm;
