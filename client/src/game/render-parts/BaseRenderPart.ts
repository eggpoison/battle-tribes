import { Point } from "webgl-test-shared";
import { createIdentityMatrix } from "../rendering/matrices";
import { RenderPartParent, RenderPart } from "./render-parts";

// @Speed: if I make this into an object I can remove its prototype.
/** A thing which is able to hold render parts */
export default abstract class BaseRenderPart {
   public offsetX: number;
   public offsetY: number;

   public angle: number;
   
   /** True by default. If false, the render part will be considered as if its parent's rotation is always zero. */
   public inheritParentRotation = true;
   public flipXMultiplier = 1;

   public scale = 1;

   public readonly zIndex: number;

   public readonly children = new Array<RenderPart>();
   public readonly parent: RenderPartParent;

   // Needed for the tree-like update system regardless of whether the thing will be rendered to the screen
   public readonly modelMatrix = createIdentityMatrix();

   constructor(parent: RenderPartParent, zIndex: number, rotation: number, offsetX: number, offsetY: number) {
      this.parent = parent;
      this.zIndex = zIndex;
      this.angle = rotation;
      this.offsetX = offsetX;
      this.offsetY = offsetY;
   }

   // @Cleanup: unused?
   // public dirty(): void {
   //    this.modelMatrixIsDirty = true;

   //    // Propagate to parent
   //    if (this.parent !== null) {
   //       this.parent.dirty();
   //    }
   // }

   public setFlipX(flipX: boolean): void {
      this.flipXMultiplier = flipX ? -1 : 1;
   }
}