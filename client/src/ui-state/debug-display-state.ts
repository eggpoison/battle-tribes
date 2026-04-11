// @Location
const uiZoom = 1;
// @Hack @Copynpaste
document.documentElement.style.setProperty("--zoom", uiZoom.toString());

export const debugDisplayState = {
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