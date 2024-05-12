import { Point } from "webgl-test-shared/dist/utils";
type LightID = number;
export interface Light {
    readonly position: Point;
    intensity: number;
    /** Number of tiles which the light extends from */
    strength: number;
    radius: number;
    r: number;
    g: number;
    b: number;
}
export declare function getLights(): ReadonlyArray<Light>;
export declare function addLight(light: Light): LightID;
export declare function attachLightToEntity(lightID: LightID, entityID: number): void;
export declare function attachLightToRenderPart(lightID: LightID, renderPartID: number): void;
export declare function removeLight(light: Light): void;
export declare function removeLightsAttachedToEntity(entityID: number): void;
export declare function removeLightsAttachedToRenderPart(renderPartID: number): void;
export declare function getLightPosition(lightIdx: number): Point;
export {};
