import * as React from "react";
import { POWER_PLANT_COST } from "../../../model";

export default ({ onClick }: { onClick: (e: React.MouseEvent<HTMLButtonElement>) => void }) => {
    return <button
        title={`Invest $${POWER_PLANT_COST} to build a new power plant, if you have the money. Just a reminder, you don't own any power plants; however, these power plants buy fuel from you.`}
        onClick={onClick}
    >+</button>;
};
