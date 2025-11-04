import { Point } from "battletribes-shared/utils";
import { createIdentityMatrix } from "../rendering/matrices";
import { RenderPartParent, RenderPart } from "./render-parts";
import { currentSnapshot } from "../client";
import { Hitbox } from "../hitboxes";

let idCounter = 0;

/** A thing which is able to hold render parts */
export default abstract class BaseRenderPart {
   public readonly id = idCounter++;

   /** The point in time when the render part was created */
   private creationTicks = currentSnapshot.tick;
   
   /** Estimated position of the object during the current frame */
   public renderPosition = new Point(-1, -1);

   public readonly offset = new Point(0, 0);

   public angle: number;
   // @Cleanup: change to total rotation
   public totalParentRotation = 0;
   
   /** True by default. If false, the render part will be considered as if its parent's rotation is always zero. */
   public inheritParentRotation = true;
   public flipXMultiplier = 1;

   public scale = 1;
   public shakeAmount = 0;

   public readonly zIndex: number;

   public readonly children = new Array<RenderPart>();
   public readonly parent: RenderPartParent;

   // Needed for the tree-like update system regardless of whether the thing will be rendered to the screen
   public readonly modelMatrix = createIdentityMatrix();
   public modelMatrixIsDirty = true;

   public readonly tags = new Array<string>();

   constructor(parent: RenderPartParent, zIndex: number, rotation: number) {
      this.parent = parent;
      this.zIndex = zIndex;
      this.angle = rotation;
   }

   // @Cleanup: unused?
   // public dirty(): void {
   //    this.modelMatrixIsDirty = true;

   //    // Propagate to parent
   //    if (this.parent !== null) {
   //       this.parent.dirty();
   //    }
   // }

   public addTag(tag: string): void {
      this.tags.push(tag);
   }

   public setFlipX(flipX: boolean): void {
      this.flipXMultiplier = flipX ? -1 : 1;
   }

   public getAge(): number {
      return currentSnapshot.tick - this.creationTicks;
   }
}