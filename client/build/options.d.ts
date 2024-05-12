interface Options {
    uiZoom: number;
    nightVisionIsEnabled: boolean;
    /**
     * If true, then all entity hitboxes will be shown
     * @default false
     */
    showHitboxes: boolean;
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
declare const OPTIONS: Options;
export default OPTIONS;
