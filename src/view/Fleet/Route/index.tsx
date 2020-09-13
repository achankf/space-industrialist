import * as React from "react";
import { useContext } from "react";
import { GameContext } from "../../../contexts/GameContext";
import { ViewContext } from "../../../contexts/ViewContext";
import { Fleet } from "../../../model/fleet";
import DestinationTable from "./DestinationTable";

interface RouteProps {
  viewId: symbol;
  fleet: Fleet;
}

const Route: React.FC<RouteProps> = ({ viewId, fleet }) => {
  const { game } = useContext(GameContext);
  const { closeView } = useContext(ViewContext);
  const galaxy = game.getReader();
  const speed = galaxy.getFleetSpeed(fleet).toFixed(2);

  function retireFleet() {
    const galaxy = game.getWriter();
    galaxy.retire(fleet);
    closeView(viewId);
  }

  return (
    <div>
      <fieldset title="This table shows a list of places that the trader is going to trader. Dest means the trader is heading towards that place.">
        <legend>General</legend>
        <div title="The speed indicates how far the trader is going to move per day.">
          Speed: {speed}
        </div>
        <button
          disabled={galaxy.isRetired(fleet)}
          onClick={retireFleet}
          title="The trader will return to the trader pool and to be reassigned."
        >
          Retire trader
        </button>
      </fieldset>
      <fieldset title="This table shows a list of places that the trader is going to trader. Dest means the trader is heading towards that place.">
        <legend>Route</legend>
        <DestinationTable fleet={fleet} game={game} />
      </fieldset>
    </div>
  );
};

export default Route;
