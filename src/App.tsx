import React, { useEffect, useState } from "react";
import { useContext } from "react";
import styled from "styled-components";

import { GameContext } from "./contexts/GameContext";
import { SpeedContext } from "./contexts/SpeedContext";
import Map from "./view/Map";
import Menu from "./view/Menu";
import Views from "./view/Views";

const App: React.FC = () => {
  const { game, triggerGameUpdate } = useContext(GameContext);
  const { isPaused, period } = useContext(SpeedContext);
  const [shouldEndTurn, triggerEndTurn] = useState({});
  const [pid, setPid] = useState<number | undefined>(undefined);

  // setup event loop
  useEffect(() => {
    window.clearInterval(pid);
    const temp = window.setInterval(() => {
      triggerEndTurn({});
    }, period);
    setPid(temp);
  }, [period]);

  // run the event loop process
  useEffect(() => {
    if (!isPaused) {
      const galaxy = game.getWriter();
      if (galaxy.turn()) {
        triggerGameUpdate();
      }
    }
  }, [shouldEndTurn]);

  return (
    <>
      <Container>
        <Map />
        <Menu />
      </Container>
      <Views />
    </>
  );
};

const Container = styled.div`
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  overflow: hidden;
`;

export default App;
