import { Game, UpdateChannel } from "../game";
import * as Model from "../model/model";
import * as View from "../view/view";

export class Menu implements View.Observer {

    constructor(game: Game) {
        this.setupPauseButton(game);
        this.setupCloseAll(game);
        this.setupFastForwardButton(game);
        this.setupSlowDownButton(game);
        this.setupBuyTraderButton(game);
        this.setupSaveButton(game);
        this.setupImportExportButton(game);
    }

    public update(game: Game, channels: Set<UpdateChannel>) {

        const galaxy = game.galaxyProxy;

        if (channels.has(UpdateChannel.DataChange)) {
            const money = galaxy.getMoney();
            $("#cash")
                .css("color", money >= 0 ? "green" : "red")
                .text(`$${money.toFixed(2)}`);
            $("#colonist").text(galaxy.getNumColonists().toFixed(2));
            $("#trader").text(galaxy.getNumUnusedTraders().toFixed(2));
            $("#fast").prop("disabled", !game.canFastForward());
            $("#slow").prop("disabled", !game.canSlowDown());
        }
        if (channels.has(UpdateChannel.TurnChange)) {
            $("#year").text(galaxy.getYear());
            $("#day").text(galaxy.getDay());
            $("#score").text(galaxy.getScore());
        }

        const $buttonLabel = $("#pause i");
        const $pauseButton = $("#pause");
        if (game.isGameRunning()) {
            $pauseButton.attr("title", "Pause");
            $buttonLabel.text("pause");
        } else {
            $pauseButton.attr("title", "Start");
            $buttonLabel.text("play_arrow");
        }
    }

    private setupFastForwardButton(game: Game) {
        $("#fast").click(() => game.fastForward());
    }

    private setupSlowDownButton(game: Game) {
        $("#slow").click(() => game.slowDown());
    }

    private setupPauseButton(game: Game) {
        $("#pause")
            .attr("title", "Pause")
            .click((e) => {
                if (!game.isGameRunning()) {
                    game.resume();
                } else {
                    game.pause();
                }
                e.stopPropagation();
            });
    }

    private setupBuyTraderButton(game: Game) {
        $("#buyTrader")
            .click((e) => {
                const isOk = e.ctrlKey || confirm(`Are you sure? This action costs $${Model.TRADER_COST}. (press ctrl while clicking the button suppresses this message)`);
                if (isOk) {
                    const galaxy = game.galaxyProxy;
                    galaxy.addTrader();
                    galaxy.withdraw(Model.TRADER_COST);
                }
            });
    }

    private setupSaveButton(game: Game) {
        $("#save").click(() => {
            game.save();
        });
    }

    private setupImportExportButton(game: Game) {
        $("#importExport").click(() => {
            const view = new View.ImportExportView(game);
            game.addClosable(view);
        });
    }

    private setupCloseAll(game: Game) {
        $("#closeAll").click((e) => {
            game.closeAll();
            e.stopPropagation();
        });
    }
}
