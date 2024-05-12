export declare const ENTITY_TEXTURE_ATLAS_LENGTH: number;
export declare let ENTITY_TEXTURE_ATLAS: WebGLTexture;
export declare let ENTITY_TEXTURE_SLOT_INDEXES: ReadonlyArray<number>;
export declare let ENTITY_TEXTURE_ATLAS_SIZE: number;
export declare function createEntityTextureAtlas(): Promise<void>;
export declare function getTextureArrayIndex(textureSource: string): number;
export declare function getTextureWidth(textureArrayIndex: number): number;
export declare function getTextureHeight(textureArrayIndex: number): number;
