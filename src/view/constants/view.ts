export enum ViewKind {
  Fleet,
  ImportExport,
  Planet,
  Route,
  Selector,
  Tutorial,
}

export interface BaseViewProps {
  viewId: symbol;
}
