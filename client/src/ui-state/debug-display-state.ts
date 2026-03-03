import { Settings } from "webgl-test-shared";
import { PacketSnapshot } from "../game/networking/packet-snapshots";

// @Location
let uiZoom = 1;
// @Hack @Copynpaste
document.documentElement.style.setProperty("--zoom", uiZoom.toString());

export const debugDisplayState = {
   // @Hack: cast
   currentSnapshot: null as unknown as PacketSnapshot,
   snapshotBufferSize: 0,
   measuredServerTPS: Settings.SERVER_PACKET_SEND_RATE,
   numActiveSounds: 0,
   cameraZoom: 1,
   nightVisionIsEnabled: false,
   showHitboxes: false,
   showChunkBorders: false,
   showRenderChunkBorders: false,
   showParticles: true,
   showAllTechs: false,
   hideEntities: false,
   showPathfindingNodes: false,
   showSafetyNodes: false,
   showBuildingSafetys: false,
   showBuildingPlans: false,
   showRestrictedAreas: false,
   showWallConnections: false,
   maxGreenSafety: 100,
   debugLights: false,
   showSubtileSupports: false,
   showLightLevels: false,
   debugTethers: false
};