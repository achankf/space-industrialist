import * as React from "react";

const Window: React.SFC = (props) => {
    return <div className="panel">
        {props.children}
    </div>;
};

export default Window;
