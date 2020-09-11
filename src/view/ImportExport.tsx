import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import LZString from "lz-string";
import { Game, ISaveData } from "../game";
import {
  addClosable,
  ClosableAction,
  ClosablePanelType,
} from "./action/closable_action";
import TitleBar from "./TitleBar";
import Window from "./Window";

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

interface IImportExportProps {
  game: Game;
}

interface IImportExportDispatchProps {
  showTutorial: () => void;
}

type ImportExportProps = IImportExportProps & IImportExportDispatchProps;

interface IImportExportState {
  saveData: string;
}

class ImportExport extends React.Component<
  ImportExportProps,
  IImportExportState
> {
  private textareaRef = React.createRef<HTMLTextAreaElement>();

  constructor(props: ImportExportProps) {
    super(props);
    this.state = { saveData: toSave(this.props.game) };
  }

  public render() {
    return (
      <Window>
        <TitleBar title="Import/Export Save" />
        <textarea
          spellCheck={false}
          cols={45}
          rows={30}
          value={this.state.saveData}
          onChange={this.updateState}
          onClick={this.textareaClick}
          ref={this.textareaRef}
        />
        <div>
          <button onClick={this.clearSave}>Clear</button>
          <button onClick={this.importSave}>Import</button>
          <button onClick={this.copySave}>Copy</button>
          <button onClick={this.refreshSave}>Refresh</button>
          <button onClick={this.restartGame}>Restart Game</button>
        </div>
      </Window>
    );
  }

  public textareaClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
  };

  public componentDidMount() {
    const current = this.textareaRef.current;
    if (!current) {
      throw new Error("bug: textarea not ready");
    }
    current.spellcheck = false;
  }

  private copySave = () => {
    this.textareaRef.current?.select();
    document.execCommand("Copy");
  };

  private clearSave = () => {
    this.setState(() => ({ saveData: "" }));
  };

  private refreshSave = () => {
    this.setState(() => ({ saveData: toSave(this.props.game) }));
  };

  private importSave = async () => {
    const saveData = fromSave(this.state.saveData);
    const game = this.props.game;
    game.reload(saveData);
    await game.save();
  };

  private restartGame = async () => {
    const game = this.props.game;
    const isOk = confirm("Are you sure?");
    if (isOk) {
      game.reload();
      await game.save();
      this.props.showTutorial();
    }
  };

  private updateState = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    this.setState({ saveData: e.target.value });
  };
}

const dispatchers = (
  dispatch: Dispatch<ClosableAction>
): IImportExportDispatchProps => ({
  showTutorial: () => dispatch(addClosable(ClosablePanelType.Tutorial)),
});

export default connect(null, dispatchers)(ImportExport);
