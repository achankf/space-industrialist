import * as React from "react";
import { connect } from "react-redux";
import { close } from "./action/closable_action";

const TitleBar = (props: { title: string, closeWindow?: () => void }) => {
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

export default connect<{ closeWindow?: () => void }>(
    undefined,
    (dispatch) => ({ closeWindow: () => dispatch(close()) }),
)(TitleBar);
