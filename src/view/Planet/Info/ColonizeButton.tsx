import React, { useContext } from "react";

import { GameContext } from "../../../contexts/GameContext";

interface ColonizeButtonProps {
  colonize: () => void;
}

export const ColonizeButton: React.FC<ColonizeButtonProps> = ({ colonize }) => {
  const { game } = useContext(GameContext);
  const galaxy = game.getReader();
  const isDisabled = galaxy.getNumColonists() < 1;

  return (
    <tr title="Spend 1 free colonist to colonize this planet. You can encourage growth from colonized planets.">
      <td colSpan={2}>
        <button onClick={colonize} disabled={isDisabled}>
          Colonize
        </button>
      </td>
    </tr>
  );
};
