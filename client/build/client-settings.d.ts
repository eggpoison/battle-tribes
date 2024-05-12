type ClientSettings = {
    /** Number of triangles to create when drawing a circle */
    readonly CIRCLE_DETAIL: number;
    /** Maximum distance from an entity that the cursor tooltip will be rendered from */
    readonly CURSOR_TOOLTIP_HOVER_RANGE: number;
};
declare const CLIENT_SETTINGS: ClientSettings;
export default CLIENT_SETTINGS;
