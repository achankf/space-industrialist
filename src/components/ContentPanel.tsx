import * as React from "react";

const ContentPanel: React.FC = (props) => (
  <div className="panel-content">{props.children}</div>
);

export default ContentPanel;
