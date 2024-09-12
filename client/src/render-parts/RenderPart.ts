import { Point } from "battletribes-shared/utils";
import { createIdentityMatrix } from "../rendering/matrices";
import { RenderThing } from "./render-parts";
import Board from "../Board";

let idCounter = 0;

/** A thing which is able to hold render parts */
export abstract class BaseRenderThing {
   /** Estimated position of the object during the current frame */
   public renderPosition = new Point(-1, -1);

   public readonly offset = new Point(0, 0);

   public rotation: number;
   // @Cleanup: change to total rotation
   public totalParentRotation = 0;
   
   /** Whether or not the thing will inherit its parents' rotation */
   public inheritParentRotation = true;
   public flipX = false;

   public scale = 1;
   public shakeAmount = 0;

   public readonly zIndex: number;

   public readonly children = new Array<RenderThing>();
   public readonly parent: RenderThing | null;

   // Needed for the tree-like update system regardless of whether the thing is visible visually
   public readonly modelMatrix = createIdentityMatrix();
   public modelMatrixIsDirty = true;

   public readonly tags = new Array<string>();

   constructor(parent: RenderThing | null, zIndex: number, rotation: number) {
      this.parent = parent;
      this.zIndex = zIndex;
      this.rotation = rotation;
   }

   public dirty(): void {
      this.modelMatrixIsDirty = true;

      // Propagate to parent
      if (this.parent !== null) {
         this.parent.dirty();
      }
   }

   public addTag(tag: string): void {
      this.tags.push(tag);
   }
}

abstract class BaseRenderPart extends BaseRenderThing {
   public readonly id: number;
   
   /** The point in time when the render part was created */
   private creationTicks = Board.serverTicks;

   public opacity = 1;

   public tintR = 0;
   public tintG = 0;
   public tintB = 0;
   
   constructor(parent: RenderThing | null, zIndex: number, rotation: number) {
      super(parent, zIndex, rotation);

      this.id = idCounter++;
   }

   public getAge(): number {
      return Board.serverTicks - this.creationTicks;
   }

   // @Incomplete
   /** Updates the render part based on its parent */
   // public update(): void {
   //    this.renderPosition.x = this.parent.renderPosition.x;
   //    this.renderPosition.y = this.parent.renderPosition.y;

   //    // Rotate the offset to match the parent object's rotation
   //    if (this.inheritParentRotation) {
   //       this.renderPosition.x += rotateXAroundPoint(this.offset.x, this.offset.y, 0, 0, this.parent.rotation + this.parent.totalParentRotation);
   //       this.renderPosition.y += rotateYAroundPoint(this.offset.x, this.offset.y, 0, 0, this.parent.rotation + this.parent.totalParentRotation);
   //    } else {
   //       this.renderPosition.x += rotateXAroundPoint(this.offset.x, this.offset.y, 0, 0, this.parent.totalParentRotation);
   //       this.renderPosition.y += rotateYAroundPoint(this.offset.x, this.offset.y, 0, 0, this.parent.totalParentRotation);
   //    }

   //    // Shake
   //    if (this.shakeAmount > 0) {
   //       const direction = 2 * Math.PI * Math.random();
   //       this.renderPosition.x += this.shakeAmount * Math.sin(direction);
   //       this.renderPosition.y += this.shakeAmount * Math.cos(direction);
   //    }

   //    // Recalculate rotation
   //    if (this.inheritParentRotation) {
   //       this.totalParentRotation = this.parent.rotation + this.parent.totalParentRotation;
   //    } else {
   //       this.totalParentRotation = this.parent.totalParentRotation;
   //    }
   // }
}

export default BaseRenderPart;