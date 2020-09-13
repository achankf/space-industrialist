import React, { createRef, useContext, useEffect, useState } from "react";
import LZString from "lz-string";
import { Game, ISaveData } from "../game";
import Window from "../components/Window";
import { GameContext } from "../contexts/GameContext";
import TitleBar from "../components/TitleBar";
import { ViewContext } from "../contexts/ViewContext";
import { BaseViewProps, ViewKind } from "./constants/view";

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
  if (!withLen) {
    throw new Error("cannot decompress save data");
  }

  const json = JSON.parse(withLen) as { len: number; json: string };
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

export type ImportExportProps = BaseViewProps;

const ImportExport: React.FC<ImportExportProps> = ({ viewId: id }) => {
  const { game } = useContext(GameContext);
  const { setCurrentView } = useContext(ViewContext);
  const [saveData, setSaveData] = useState("");
  const textareaRef = createRef<HTMLTextAreaElement>();

  useEffect(() => {
    // this is expensive, so initialize save data here instead of running toSave at every render
    setSaveData(toSave(game));
  }, []);

  function copySave() {
    textareaRef.current?.select();
    document.execCommand("Copy");
  }

  async function importSave() {
    game.reload(fromSave(saveData));
    await game.save();
  }

  async function restartGame() {
    const isOk = window.confirm("Are you sure?");
    if (isOk) {
      game.reload();
      await game.save();
      setCurrentView({ kind: ViewKind.Tutorial });
    }
  }

  return (
    <Window>
      <TitleBar viewId={id} title="Import/Export Save" />
      <textarea
        spellCheck={false}
        cols={45}
        rows={30}
        value={saveData}
        onChange={(e) => setSaveData(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        ref={textareaRef}
      />
      <div>
        <button onClick={() => setSaveData("")}>Clear</button>
        <button onClick={importSave}>Import</button>
        <button onClick={copySave}>Copy</button>
        <button onClick={() => setSaveData(toSave(game))}>Refresh</button>
        <button onClick={restartGame}>Restart Game</button>
      </div>
    </Window>
  );
};

export default ImportExport;
