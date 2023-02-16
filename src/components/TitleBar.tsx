import React, { useContext } from "react";
import styled from "styled-components";

import { ViewContext } from "../contexts/ViewContext";
import { MaterialIconButton } from "./MaterialIconButton";

interface TitleBarProps {
  viewId: symbol;
  title: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ viewId, title }) => {
  const { closeView } = useContext(ViewContext);

  return (
    <TitleBarContainer>
      <span>{title}</span>
      <span>
        <MaterialIconButton
          title="Close this window"
          onClick={() => closeView(viewId)}
        >
          close
        </MaterialIconButton>
      </span>
    </TitleBarContainer>
  );
};

const TitleBarContainer = styled.div`
  background-color: darkblue;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--default-padding-size);
`;
