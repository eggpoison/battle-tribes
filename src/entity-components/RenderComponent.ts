import Board from "../Board";
import Camera from "../Camera";
import Component from "../Component";
import { Vector } from "../utils";
import TransformComponent from "./TransformComponent";

interface BaseRenderSettings {
   readonly size: unknown;
   readonly offset?: [number, number];
   readonly amount?: number;
   readonly zIndex?: number;
}
abstract class BaseRenderClass implements BaseRenderSettings {
   public readonly size: unknown;
   public readonly offset: [number, number];
   public readonly amount: number;
   public readonly zIndex: number;

   constructor(renderSettings: BaseRenderSettings) {
      this.size = renderSettings.size;
      this.offset = renderSettings.offset || [0, 0];
      this.amount = renderSettings.amount || 1;
      this.zIndex = renderSettings.zIndex || 0;
   }
}

interface ShapeRenderSettings extends BaseRenderSettings {
   readonly type: "circle" | "rectangle";
   readonly fillColour: string;
   /** The size of the shape, in tiles. */
   readonly border?: {
      readonly width: number;
      readonly colour: string;
   }
}
abstract class ShapeRenderClass extends BaseRenderClass implements ShapeRenderSettings {
   public readonly type: "circle" | "rectangle";
   public readonly fillColour: string;
   public readonly border?: { readonly width: number; readonly colour: string; };
   public readonly offset: [number, number];
   
   constructor(renderSettings: ShapeRenderSettings) {
      super(renderSettings);

      this.type = renderSettings.type;
      this.fillColour = renderSettings.fillColour;
      this.border = renderSettings.border;
      this.offset = renderSettings.offset || [0, 0];
   }
}

// CIRCLES
interface CircleRenderSettings extends ShapeRenderSettings {
   readonly type: "circle";
   readonly size: {
      readonly radius: number;
   }
}
export class CircleRenderClass extends ShapeRenderClass implements CircleRenderSettings {
   public readonly type = "circle";
   public readonly size: {
      readonly radius: number;
   }

   constructor(renderSettings: CircleRenderSettings) {
      super(renderSettings);

      this.size = renderSettings.size;
   }
}

// RECTANGLES
interface RectangleRenderSettings extends ShapeRenderSettings {
   readonly type: "rectangle";
   readonly size: {
      readonly width: number;
      readonly height: number;
   }
}
export class RectangleRenderClass extends ShapeRenderClass implements RectangleRenderSettings {
   public readonly type = "rectangle";
   public readonly size: {
      readonly width: number;
      readonly height: number
   };

   constructor(renderSettings: RectangleRenderSettings) {
      super(renderSettings);

      this.size = renderSettings.size;
   }
}

interface ImageRenderSettings extends BaseRenderSettings {
   readonly size: {
      readonly width: number;
      readonly height: number;
   }
   readonly type: "image";
   readonly url: string;
}
export class ImageRenderClass extends BaseRenderClass implements ImageRenderSettings {
   public readonly type: "image";
   public readonly url: string;
   public readonly size: {
      readonly width: number;
      readonly height: number;
   }
   
   constructor(renderSettings: ImageRenderSettings) {
      super(renderSettings);

      this.type = renderSettings.type;
      this.url = renderSettings.url;
      this.size = renderSettings.size;
   }
}

export type RenderClasses = ReadonlyArray<CircleRenderClass | RectangleRenderClass | ImageRenderClass>;

class RenderComponent extends Component {
   private readonly renderClasses: RenderClasses;
   private readonly images: Array<HTMLImageElement>;

   constructor(renderClasses: RenderClasses) {
      super();

      this.renderClasses = this.sortRenderClassesByZIndex(renderClasses);
      this.images = new Array<HTMLImageElement>(renderClasses.length);
   }

   private sortRenderClassesByZIndex(renderClasses: RenderClasses): RenderClasses {
      const sortedRenderClasses = renderClasses.slice();

      for (let i = 0; i < renderClasses.length - 1; i++) {
         for (let j = 0; j < renderClasses.length - i - 1; j++) {
            let firstItem = sortedRenderClasses[j];
            let secondItem = sortedRenderClasses[j + 1];

            if (firstItem.zIndex > secondItem.zIndex) {
               // Swap them
               const temp = sortedRenderClasses[j];
               sortedRenderClasses[j] = sortedRenderClasses[j + 1];
               sortedRenderClasses[j + 1] = temp;
            }
         }
      }

      return sortedRenderClasses;
   }

   public onLoad(): void {
      // Preload the images
      for (let i = 0; i < this.renderClasses.length; i++) {
         const renderClass = this.renderClasses[i];
         if (renderClass.type === "image") {   
            this.images[i] = new Image();
            this.images[i].src = require("../images/" + renderClass.url);
         }
      }
   }

   public static getOffset(magnitude: number, degrees: number): [number, number] {
      const vector = new Vector(magnitude, degrees / 180 * Math.PI);
      const point = vector.convertToPoint();
      return [point.x, point.y];
   }

   public renderEntity(ctx: CanvasRenderingContext2D): void {
      // Get the entity transform information
      const entityTransformComponent = this.getEntity().getComponent(TransformComponent)!;
      const position = entityTransformComponent.position;

      const entityRotation = entityTransformComponent.rotation;


      for (let i = 0; i < this.renderClasses.length; i++) {
         const renderClass = this.renderClasses[i];

         const cameraX = Camera.getXPositionInCamera(position.x + renderClass.offset![0] * Board.tileSize);
         const cameraY = Camera.getYPositionInCamera(position.y + renderClass.offset![1] * Board.tileSize);

         // Render the class
         switch (renderClass.type) {
            case "circle": {
               const radius = renderClass.size.radius * Board.tileSize;

               const centerX = Camera.getXPositionInCamera(position.x);
               const centerY = Camera.getYPositionInCamera(position.y);

               // Move the canvas origin to the center of the image
               ctx.translate(centerX, centerY);
               ctx.rotate(entityRotation);
               // Undo the translation
               ctx.translate(-centerX, -centerY);

               // Create the circle
               ctx.fillStyle = renderClass.fillColour;
               ctx.beginPath();
               ctx.arc(cameraX, cameraY, radius, 0, Math.PI * 2);
               ctx.fill();

               if (typeof renderClass.border !== "undefined") {
                  // Create the circle border
                  ctx.lineWidth = renderClass.border.width;
                  ctx.strokeStyle = renderClass.border.colour;
                  ctx.stroke();
               }
               
               // Reset rotation
               ctx.setTransform(1, 0, 0, 1, 0, 0);

               break;
            }
            case "rectangle": {
               const width = renderClass.size.width;
               const height = renderClass.size.height;

               ctx.fillStyle = renderClass.fillColour;
               ctx.fillRect(cameraX, cameraY, width, height);
               break;
            }
            case "image": {
               const width = renderClass.size.width;
               const height = renderClass.size.height;

               const cameraXWithSize = Camera.getXPositionInCamera(position.x - width/2 * Board.tileSize + renderClass.offset![0] * Board.tileSize);
               const cameraYWithSize = Camera.getYPositionInCamera(position.y - height/2 * Board.tileSize + renderClass.offset![1] * Board.tileSize);

               // Move the canvas origin to the center of the image
               ctx.translate(cameraX, cameraY);
               ctx.rotate(entityRotation / 180 * Math.PI);
               // Undo the translation
               ctx.translate(-cameraX, -cameraY);

               ctx.drawImage(this.images[i], cameraXWithSize, cameraYWithSize, width * Board.tileSize, height * Board.tileSize);

               // Reset rotation
               ctx.setTransform(1, 0, 0, 1, 0, 0);

               break;
            }
         }
      }
   }
}

export default RenderComponent;