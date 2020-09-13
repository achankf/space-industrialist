import { BaseViewProps, ViewKind } from "./constants/view";
import { BaseFleetProps } from "./Fleet";
import { BasePlanetProps } from "./Planet";
import { BaseRouteProps } from "./Route";
import { BaseSelectorProps } from "./Selector";

export type AllBaseViewProps =
  | ({ kind: ViewKind.Fleet } & BaseFleetProps)
  | ({ kind: ViewKind.Planet } & BasePlanetProps)
  | ({ kind: ViewKind.Route } & BaseRouteProps)
  | ({ kind: ViewKind.Selector } & BaseSelectorProps)
  | { kind: ViewKind.ImportExport }
  | { kind: ViewKind.Tutorial };

export type ViewProps = AllBaseViewProps & BaseViewProps;
