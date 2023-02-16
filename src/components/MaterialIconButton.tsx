import styled from "styled-components";

import { MaterialIcon } from "./MaterialIcon";

export const MaterialIconButton = styled(MaterialIcon)`
  cursor: pointer;

  :hover {
    color: darkgray;
  }

  :active {
    color: gray;
  }
`;
