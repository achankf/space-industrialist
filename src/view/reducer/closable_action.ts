import {
    ClosableAction,
    ClosableActionType,
    ClosableArgs,
    ClosablePanelType,
    IAddClosableAction,
} from "../action/closable_action";

export interface IClosableState {
    panelType: ClosablePanelType;
    args: ClosableArgs;
}

export type ClosableState = IClosableState | null;

export function closableAction(
    state: ClosableState = null,
    action: ClosableAction,
): ClosableState {
    switch (action.type) {
        case ClosableActionType.Switch:
            {
                const castedAction = action as IAddClosableAction;
                return {
                    args: castedAction.args,
                    panelType: castedAction.panelType,
                };
            }
        case ClosableActionType.Close:
            return null;
        default:
            return state;
    }
}
