import React from "react";
import styled from "styled-components";

import { assert } from "../utils/assert";

export interface NavButtonProps {
  label: string;
  onClick: () => void;
}

interface NavProps {
  buttons: NavButtonProps[];
}

export const Nav: React.FC<NavProps> = ({ buttons }) => {
  assert(buttons.length > 0);

  return (
    <NavContainer>
      {buttons.map((props) => (
        <NavButton key={props.label} {...props}>
          {props.label}
        </NavButton>
      ))}
    </NavContainer>
  );
};

const NavContainer = styled.nav`
  display: flex;
  padding: var(--default-padding-size);
`;

const NavButton = styled.div.attrs<NavButtonProps>({ className: "button" })`
  padding: 0.125rem 0.3125rem;
  border: 1px solid black;
`;
