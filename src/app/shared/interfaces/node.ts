export interface INode {
  id: number;
  aspectOf: any;
  childNodes: { nodeId: number, relation: string }[];
  children?: number;
  class: string;
  font?: {size: number};
  isMainConcept?: boolean;
  label: string;
  parentNodes: any[];
  group?: number;
  parentLabel?: string;
  shape?: string;
  color?: string;
  size?: number;
  title?: string;
}
