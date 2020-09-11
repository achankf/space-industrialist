import * as React from "react";

const Window: React.FC = (props) => {
  return <div className="panel">{props.children}</div>;
};

export default Window;
