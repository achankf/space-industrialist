import { IMapData, IRouteSegment } from "../../model";
import { Fleet } from "../../model/fleet";
import { Planet } from "../../model/planet";

export enum ClosableActionType {
  Switch = "ClosableActionType_Switch",
  Close = "ClosableActionType_Close",
}

export enum ClosablePanelType {
  Fleet,
  ImportExport,
  Planet,
  Route,
  Selector,
  Tutorial,
}

export type ClosableArgs =
  | undefined
  | IMapData[]
  | Planet
  | Fleet
  | IRouteSegment;

export type ClosableComponent = React.Component;

export interface IAddClosableAction {
  type: ClosableActionType;
  panelType: ClosablePanelType;
  args: ClosableArgs;
}

export const addClosable = (
  panelType: ClosablePanelType,
  args: ClosableArgs = undefined
): IAddClosableAction => ({ type: ClosableActionType.Switch, panelType, args });

export interface IBringToFrontAction {
  type: ClosableActionType;
  component: ClosableComponent;
}

export interface ICloseAction {
  type: ClosableActionType;
}

export const close = (): ICloseAction => ({ type: ClosableActionType.Close });

export type ClosableAction = IAddClosableAction | ICloseAction;
