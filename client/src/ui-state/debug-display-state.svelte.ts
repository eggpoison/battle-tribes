import { cameraZoom } from "../game/camera";
import { PacketSnapshot } from "../game/networking/packet-snapshots";

// @Hack: cast
let currentSnapshot = $state(null as unknown as PacketSnapshot);

let snapshotBufferSize = $state(0);

let _cameraZoom = $state(cameraZoom);

let uiZoom = $state(1);
// @Hack @Copynpaste
document.documentElement.style.setProperty("--zoom", uiZoom.toString());

let nightVisionIsEnabled = $state(false);
let showHitboxes = $state(false);
let showChunkBorders = $state(false);
let showRenderChunkBorders = $state(false);
let showParticles = $state(true);
let showAllTechs = $state(false);
let hideEntities = $state(false);
let showPathfindingNodes = $state(false);
let showSafetyNodes = $state(false);
let showBuildingSafetys = $state(false);
let showBuildingPlans = $state(false);
let showRestrictedAreas = $state(false);
let showWallConnections = $state(false);
let maxGreenSafety = $state(100);
let debugLights = $state(false);
let showSubtileSupports = $state(false);
let showLightLevels = $state(false);
let debugTethers = $state(false);

export const debugDisplayState = {
   get currentSnapshot() {
      return currentSnapshot;
   },
   setCurrentSnapshot(snapshot: PacketSnapshot): void {
      currentSnapshot = snapshot;
   },

   get snapshotBufferSize() {
      return snapshotBufferSize;
   },
   setSnapshotBufferSize(newSnapshotBufferSize: number): void {
      snapshotBufferSize = newSnapshotBufferSize;
   },

   get cameraZoom() {
      return _cameraZoom;
   },
   setCameraZoom(newCameraZoom: number): void {
      _cameraZoom = newCameraZoom;
   },

   get nightVisionIsEnabled() {
      return nightVisionIsEnabled;
   },
   get showHitboxes() {
      return showHitboxes;
   },
   get showChunkBorders() {
      return showChunkBorders;
   },
   get showRenderChunkBorders() {
      return showRenderChunkBorders;
   },
   get showParticles() {
      return showParticles;
   },
   get showAllTechs() {
      return showAllTechs;
   },
   get hideEntities() {
      return hideEntities;
   },
   get showPathfindingNodes() {
      return showPathfindingNodes;
   },

   get showSafetyNodes() {
      return showSafetyNodes;
   },
   setShowSafetyNodes(newShowSafetyNodes: boolean): void {
      showSafetyNodes = newShowSafetyNodes;
   },

   get showBuildingSafetys() {
      return showBuildingSafetys;
   },
   setShowBuildingSafetys(newShowBuildingSafetys: boolean): void {
      showBuildingSafetys = newShowBuildingSafetys;
   },
   
   get showBuildingPlans() {
      return showBuildingPlans;
   },
   setShowBuildingPlans(newShowBuildingPlans: boolean): void {
      showBuildingPlans = newShowBuildingPlans;
   },
   
   get showRestrictedAreas() {
      return showRestrictedAreas;
   },
   setShowRestrictedAreas(newShowRestrictedAreas: boolean): void {
      showRestrictedAreas = newShowRestrictedAreas;
   },
   
   get showWallConnections() {
      return showWallConnections;
   },
   setShowWallConnections(newShowWallConnections: boolean): void {
      showWallConnections = newShowWallConnections;
   },
   
   get maxGreenSafety() {
      return maxGreenSafety;
   },
   get debugLights() {
      return debugLights;
   },
   get showSubtileSupports() {
      return showSubtileSupports;
   },
   get showLightLevels() {
      return showLightLevels;
   },
   get debugTethers() {
      return debugTethers;
   }
};