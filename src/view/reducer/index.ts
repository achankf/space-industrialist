import { combineReducers } from "redux";
import { closableAction, ClosableState } from "./closable_action";
import { ISpeedCommandState, speedCommand } from "./speed_command";

export interface IStoreProps {
  closableAction: ClosableState;
  speedCommand: ISpeedCommandState;
}

export default combineReducers<IStoreProps>({
  closableAction,
  speedCommand,
});
