import * as React from "react";

const ContentPanel: React.SFC = (props) =>
    <div className="panel-content">
        {props.children}
    </div>;

export default ContentPanel;
