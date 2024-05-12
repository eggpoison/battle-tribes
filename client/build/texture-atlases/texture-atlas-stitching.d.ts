export declare const ATLAS_SLOT_SIZE = 16;
export interface TextureAtlasInfo {
    /** The texture atlas */
    readonly texture: WebGLTexture;
    readonly atlasSize: number;
    /** The widths of all inputted textures, in the original order */
    readonly textureWidths: Array<number>;
    /** The heights of all inputted textures, in the original order */
    readonly textureHeights: Array<number>;
    /** The indexes of all inputted textures in the texture atlas */
    readonly textureSlotIndexes: Array<number>;
}
export declare function stitchTextureAtlas(textureSources: ReadonlyArray<string>): Promise<TextureAtlasInfo>;
