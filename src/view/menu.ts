import { Game, UpdateChannel } from "../game.js";
import * as View from "../view/view.js";

export class Menu implements View.Observer {

    private static readonly view = document.getElementById("menu")!;

    private static setup(game: Game) {
        Menu.setupMenu(game);
        Menu.setupPauseButton(game);
        Menu.setupCloseAll(game);
        Menu.setupOrganizationButton(game);
    }

    private static setupPauseButton(game: Game) {
        const button = $("#pause")
            .attr("title", "Pause");
        const buttonLabel = $("#pause i");
        $("#pause").click((e) => {
            if (!game.isGameRunning()) {
                game.start();
                button.attr("title", "Pause");
                buttonLabel.text("pause");
            } else {
                game.pause();
                button.attr("title", "Start");
                buttonLabel.text("play_arrow");
            }
            e.stopPropagation();
        });
    }

    private static setupCloseAll(game: Game) {
        $("#closeAll").click((e) => {
            game.closeAll();
            e.stopPropagation();
        });
    }

    private static setupMenu(game: Game) {
        // $(this.view).mousedown((e) => View.makeDraggable(this.view, e));
    }

    private static setupOrganizationButton(game: Game) {
        const galaxy = game.galaxy;
        $("#organization").click((e) => {
            if ($(`#${View.OrganizationView.id}`).length === 0) {
                const org = galaxy.getCompany();
                const view = new View.OrganizationView(game);
                game.addClosable(view);
                e.stopPropagation();
            }
        });
    }

    constructor(game: Game) {
        View.Menu.setup(game);
    }

    public update(game: Game) {
        const galaxy = game.galaxy;

        $("#cash").text(galaxy.getMoney().toFixed(2));
        $("#colonist").text(galaxy.getNumColonists().toFixed(2));
        $("#trader").text(galaxy.getNumTraders().toFixed(2));
    }
}
