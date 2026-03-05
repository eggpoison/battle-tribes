import { PacketSnapshot } from "../../../game/networking/packet-snapshots";

export const debugInfoDisplay = {
   updateCurrentSnapshot: (() => {}) as (snapshot: PacketSnapshot) => void,
   updateServerTPS: (() => {}) as (tps: number) => void,
   updateSnapshotBufferSize: (() => {}) as (snapshotBufferSize: number) => void,
   refreshTickDebugData: (() => {}) as () => void
};