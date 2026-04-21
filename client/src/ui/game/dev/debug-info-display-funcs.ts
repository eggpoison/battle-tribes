import { TickSnapshot } from "../../../game/networking/snapshot-processing";

export const debugInfoDisplay = {
   updateCurrentSnapshot: (() => {}) as (snapshot: TickSnapshot) => void,
   updateServerTPS: (() => {}) as (tps: number) => void,
   updateSnapshotBufferSize: (() => {}) as (snapshotBufferSize: number) => void,
   refreshTickDebugData: (() => {}) as () => void
};