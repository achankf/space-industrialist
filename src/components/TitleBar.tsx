import React, { useContext } from "react";
import { ViewContext } from "../contexts/ViewContext";

interface TitleBarProps {
  viewId: symbol;
  title: string;
}

const TitleBar: React.FC<TitleBarProps> = ({ viewId, title }) => {
  const { closeView } = useContext(ViewContext);

  return (
    <div className="titlebar">
      {title}
      <span>
        <i
          className="material-icons"
          title="Close this window"
          onClick={() => closeView(viewId)}
        >
          close
        </i>
      </span>
    </div>
  );
};

export default TitleBar;
