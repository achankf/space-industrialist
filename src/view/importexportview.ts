import { Game, ISaveData } from "../game";
import * as View from "./view";

function toSave(game: Game) {
    const json = JSON.stringify(game.serialize());
    const withLen = JSON.stringify({
        json,
        len: json.length, // acts as a simple checksum
    });
    return LZString.compressToBase64(withLen);
}

function fromSave(input: string) {
    const withLen = LZString.decompressFromBase64(input);
    const json = JSON.parse(withLen) as { len: number, json: string };
    if (
        json &&
        Number.isSafeInteger(json.len) &&
        typeof json.json === "string" &&
        json.len === json.json.length
    ) {
        // likely a valid save, close enough
        return JSON.parse(json.json) as ISaveData;
    }
    throw new Error("not a valid save");
}

export class ImportExportView implements View.Observer {

    public readonly view = document.createElement("div");

    constructor(
        game: Game,
    ) {
        const $title = View.$createTitlebar(game, this, `Import/Export Save`);
        const $contentPanel = View.$addContentPanelClass();

        const $textarea = $("<textarea>")
            .width("350px")
            .height("300px")
            .prop("spellcheck", false)
            .val(toSave(game))
            .blur(() => $(this).focus())
            .mousemove(() => View.suspendDraggable())
            .click((e) => e.stopPropagation()) // avoid bringing the view to front (hence losing focus)
            ;

        const $clearButton = $("<button>")
            .text("clear")
            .click(() => $textarea.val(""));

        const $importButton = $("<button>")
            .text("import")
            .click(async () => {
                try {
                    const saveData = fromSave($textarea.val() as string);
                    game.reload(saveData);
                    await game.save();
                } catch (error) {
                    alert("invalid save");
                }
            });

        const $copyButton = $("<button>")
            .text("copy to clipboard")
            .click(() => {
                $textarea.select();
                document.execCommand("Copy");
            });

        const $refreshButton = $("<button>")
            .text("refresh")
            .click(() => $textarea.text(toSave(game)));

        const $restartButton = $("<button>")
            .text("restart")
            .click(async () => {
                const isOk = confirm("Are you sure?");
                if (isOk) {
                    game.reload();
                    await game.save();
                }
            });

        $contentPanel.append(
            $textarea,
            $("<div>").append(
                $clearButton,
                $importButton,
                $copyButton,
                $refreshButton,
                $restartButton,
            ));

        View
            .$addPanelClass(this)
            .append($title)
            .append($contentPanel)
            .mousedown((e) => View.makeDraggable(this.view, e))
            .click(() => View.bringToFront(this.view))
            .appendTo(document.body);
    }

    public update() {
        // nothing
    }
}
