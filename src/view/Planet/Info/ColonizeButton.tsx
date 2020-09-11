import * as React from "react";
import { Game } from "../../../game";

interface ColonizeButtonProps {
  colonize: () => void;
  game: Game;
}
const ColonizeButton: React.FC<ColonizeButtonProps> = ({ colonize, game }) => {
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

export default ColonizeButton;
