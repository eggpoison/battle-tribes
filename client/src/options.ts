interface Options {
   uiZoom: number;
   nightVisionIsEnabled: boolean;
   /**
    * If true, then all entity hitboxes will be shown
    * @default false
    */
   showHitboxes: boolean;
   showDamageBoxes: boolean;
   /**
    * If true, then chunk borders will be displayed in a wireframe.
    * @default false
    */
   showChunkBorders: boolean;
   /**
    * If true, then render chunk borders will be displayed in a wireframe.
    * @default false
    */
   showRenderChunkBorders: boolean;
   readonly showParticles: boolean;
   readonly showAllTechs: boolean;
   showPathfindingNodes: boolean;
   showSafetyNodes: boolean;
   showBuildingSafetys: boolean;
   showBuildingPlans: boolean;
   showRestrictedAreas: boolean;
   showWallConnections: boolean;
   maxGreenSafety: number;
}

const OPTIONS: Options = {
   // @Temporary
   uiZoom: 1.4,
   // uiZoom: 1,
   nightVisionIsEnabled: false,
   showHitboxes: false,
   showDamageBoxes: false,
   showChunkBorders: false,
   showRenderChunkBorders: false,
   showParticles: true,
   showAllTechs: false,
   showPathfindingNodes: false,
   showSafetyNodes: false,
   showBuildingSafetys: false,
   showBuildingPlans: false,
   showRestrictedAreas: false,
   showWallConnections: false,
   maxGreenSafety: 100
};

document.documentElement.style.setProperty("--zoom", OPTIONS.uiZoom.toString());

export default OPTIONS;