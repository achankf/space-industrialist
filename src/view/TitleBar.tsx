import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "../../node_modules/redux";
import { ClosableAction, close } from "./action/closable_action";

interface ITitleBarProps {
    title: string;
}

interface ITitleBarDispatcherProps {
    closeWindow: () => void;
}

type TitleBarProps = ITitleBarProps & ITitleBarDispatcherProps;

const TitleBar = (props: TitleBarProps) => {
    return <div className="titlebar">
        {props.title}
        <span>
            <i
                className="material-icons"
                title="Close this window"
                onClick={props.closeWindow}
            >close</i>
        </span>
    </div>;
};

const dispatchers = (dispatch: Dispatch<ClosableAction>): ITitleBarDispatcherProps => ({ closeWindow: () => dispatch(close()) });

export default connect(undefined, dispatchers)(TitleBar);
