import { Point } from "webgl-test-shared/dist/utils";
/** A thing which is able to hold render parts */
export declare abstract class RenderObject {
    readonly children: RenderPart[];
    /** Estimated position of the object during the current frame */
    renderPosition: Point;
    rotation: number;
    totalParentRotation: number;
    tintR: number;
    tintG: number;
    tintB: number;
}
declare class RenderPart extends RenderObject {
    readonly id: number;
    readonly parent: RenderObject;
    /** Age of the render part in ticks */
    age: number;
    readonly offset: Point;
    readonly zIndex: number;
    rotation: number;
    opacity: number;
    scale: number;
    shakeAmount: number;
    textureArrayIndex: number;
    /** Whether or not the render part will inherit its parents' rotation */
    inheritParentRotation: boolean;
    flipX: boolean;
    constructor(parent: RenderObject, textureArrayIndex: number, zIndex: number, rotation: number);
    /** Updates the render part based on its parent */
    update(): void;
    switchTextureSource(newTextureSource: string): void;
}
export default RenderPart;
