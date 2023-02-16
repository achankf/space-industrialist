import { createGlobalStyle, css } from "styled-components";

const globalCss = css`
  :root {
    --default-padding-size: 0.125rem;
  }

  body {
    background-color: black;
    color: white;
    height: 100vh;
    margin: 0;
    padding: 0;
    -moz-user-select: none;
    -webkit-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  .button {
    cursor: pointer;

    :hover {
      background-color: darkgray;
    }

    :active {
      background-color: #333;
    }
  }

  table {
    border-collapse: collapse;
    width: 100%;
  }

  table,
  th,
  tr,
  td {
    border: 1px solid black;
  }
`;

export const GlobalStyle = createGlobalStyle`${globalCss}`;
