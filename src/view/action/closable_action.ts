import * as Model from "../../model";

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

export type ClosableArgs = undefined | Model.IMapData[] | Model.Planet | Model.Fleet | Model.IRouteSegment;

export type ClosableComponent = React.Component;

export interface IAddClosableAction {
    type: ClosableActionType;
    panelType: ClosablePanelType;
    args: ClosableArgs;
}

export const addClosable = (panelType: ClosablePanelType, args: ClosableArgs = undefined): IAddClosableAction =>
    ({ type: ClosableActionType.Switch, panelType, args });

export interface IBringToFrontAction {
    type: ClosableActionType;
    component: ClosableComponent;
}

export interface ICloseAction {
    type: ClosableActionType;
}

export const close = (): ICloseAction =>
    ({ type: ClosableActionType.Close });

export type ClosableAction = IAddClosableAction | ICloseAction;
