import { EntityDebugData } from "webgl-test-shared/dist/client-server-types";
import Entity from "../../../Entity";
import { Tile } from "../../../Tile";
export declare let updateDebugInfoTile: (tile: Tile | null) => void;
export declare let updateDebugInfoEntity: (entity: Entity | null) => void;
export declare let setDebugInfoDebugData: (debugData: EntityDebugData | null) => void;
export declare let refreshDebugInfo: () => void;
declare const DebugInfo: () => import("react/jsx-runtime").JSX.Element;
export default DebugInfo;
