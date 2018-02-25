import { Game } from "./game";

// disable right-click context menu
document.body.oncontextmenu = () => false;

Game
    .tryLoad()
    .then((game) => {
        game.startRendering();
    });
