type ClientSettings = {
   /** Number of triangles to create when drawing a circle */
   readonly CIRCLE_DETAIL: number;
   /** Maximum distance from an entity that the cursor tooltip will be rendered from */
   readonly CURSOR_TOOLTIP_HOVER_RANGE: number;
}

const CLIENT_SETTINGS: ClientSettings = {
   CIRCLE_DETAIL: 25,
   CURSOR_TOOLTIP_HOVER_RANGE: 64
};

export default CLIENT_SETTINGS;