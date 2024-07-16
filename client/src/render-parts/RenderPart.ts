import { Point, rotateXAroundPoint, rotateYAroundPoint } from "webgl-test-shared/dist/utils";
import { createIdentityMatrix } from "../rendering/matrices";
import { RenderObject, RenderPart } from "./render-parts";

let idCounter = 0;

/** A thing which is able to hold render parts */
export abstract class BaseRenderObject {
   public readonly children = new Array<RenderPart>();
   
   /** Estimated position of the object during the current frame */
   public renderPosition = new Point(-1, -1);

   public rotation = 0;
   // @Cleanup: change to total rotation
   public totalParentRotation = 0;

   public tintR = 0;
   public tintG = 0;
   public tintB = 0;

   public modelMatrix = createIdentityMatrix();

   public modelMatrixIsDirty = true;

   public dirty(): void {
      this.modelMatrixIsDirty = true;
   }
}

const isRenderPart = (renderObject: RenderObject): renderObject is BaseRenderPart => {
   return typeof (renderObject as BaseRenderPart).tags !== "undefined";
}

abstract class BaseRenderPart extends BaseRenderObject {
   public readonly id: number;
   public readonly parent: BaseRenderObject;

   /** Age of the render part in ticks */
   public age = 0;

   public readonly offset = new Point(0, 0)
   public readonly zIndex: number;
   public rotation = 0;

   public opacity = 1;
   public scale = 1;
   public shakeAmount = 0;
   
   /** Whether or not the render part will inherit its parents' rotation */
   public inheritParentRotation = true;
   
   public readonly tags = new Array<string>();
   
   constructor(parent: BaseRenderObject, zIndex: number, rotation: number) {
      super();

      this.id = idCounter++;

      this.parent = parent;
      this.zIndex = zIndex;
      this.rotation = rotation;
   }

   public dirty(): void {
      super.dirty();

      // Propagate to parent
      if (isRenderPart(this.parent)) {
         this.parent.dirty();
      }
   }

   public addTag(tag: string): void {
      this.tags.push(tag);
   }

   /** Updates the render part based on its parent */
   public update(): void {
      this.renderPosition.x = this.parent.renderPosition.x;
      this.renderPosition.y = this.parent.renderPosition.y;

      // Rotate the offset to match the parent object's rotation
      if (this.inheritParentRotation) {
         this.renderPosition.x += rotateXAroundPoint(this.offset.x, this.offset.y, 0, 0, this.parent.rotation + this.parent.totalParentRotation);
         this.renderPosition.y += rotateYAroundPoint(this.offset.x, this.offset.y, 0, 0, this.parent.rotation + this.parent.totalParentRotation);
      } else {
         this.renderPosition.x += rotateXAroundPoint(this.offset.x, this.offset.y, 0, 0, this.parent.totalParentRotation);
         this.renderPosition.y += rotateYAroundPoint(this.offset.x, this.offset.y, 0, 0, this.parent.totalParentRotation);
      }

      // Shake
      if (this.shakeAmount > 0) {
         const direction = 2 * Math.PI * Math.random();
         this.renderPosition.x += this.shakeAmount * Math.sin(direction);
         this.renderPosition.y += this.shakeAmount * Math.cos(direction);
      }

      // Recalculate rotation
      if (this.inheritParentRotation) {
         this.totalParentRotation = this.parent.rotation + this.parent.totalParentRotation;
      } else {
         this.totalParentRotation = this.parent.totalParentRotation;
      }
   }
}

export default BaseRenderPart;