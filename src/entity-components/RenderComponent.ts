import Board from "../Board";
import Camera from "../Camera";
import Component from "../Component";
import { Vector } from "../utils";
import HealthComponent from "./HealthComponent";
import TransformComponent from "./TransformComponent";

interface BaseRenderSettings {
   readonly size: unknown;
   readonly offset?: [number, number];
   readonly amount?: number;
   readonly zIndex?: number;
   readonly rotation?: number;
   isVisible?(): boolean;
}
abstract class BaseRenderPart implements BaseRenderSettings {
   public abstract type: string;

   public readonly size: unknown;
   public readonly offset: [number, number];
   public readonly amount: number;
   public readonly zIndex: number;
   public readonly rotation: number;
   public isVisible?(): boolean;

   constructor(renderSettings: BaseRenderSettings) {
      this.size = renderSettings.size;
      this.offset = renderSettings.offset || [0, 0];
      this.amount = renderSettings.amount || 1;
      this.zIndex = renderSettings.zIndex || 0;
      this.rotation = renderSettings.rotation || 0;
      this.isVisible = renderSettings.isVisible
   }
}

interface ShapeRenderSettings extends BaseRenderSettings {
   readonly fillColour: string;
   /** The size of the shape, in tiles. */
   readonly border?: {
      readonly width: number;
      readonly colour: string;
   }
}
abstract class ShapeRenderPart extends BaseRenderPart implements ShapeRenderSettings {
   public readonly fillColour: string;
   public readonly border?: { readonly width: number; readonly colour: string; };
   public readonly offset: [number, number];

   public isTargeted: boolean = false;
   
   constructor(renderSettings: ShapeRenderSettings) {
      super(renderSettings);

      this.fillColour = renderSettings.fillColour;
      this.border = renderSettings.border;
      this.offset = renderSettings.offset || [0, 0];
   }
}

// CIRCLES
interface EllipseRenderSettings extends ShapeRenderSettings {
   readonly size: {
      readonly radius: number | [number, number];
   }
}
export class EllipseRenderPart extends ShapeRenderPart implements EllipseRenderSettings {
   public readonly type = "ellipse";
   public readonly size: {
      readonly radius: number | [number, number];
   }

   constructor(renderSettings: EllipseRenderSettings) {
      super(renderSettings);

      this.size = renderSettings.size;
   }
}

// RECTANGLES
interface RectangleRenderSettings extends ShapeRenderSettings {
   readonly size: {
      readonly width: number;
      readonly height: number;
   }
}
export class RectangleRenderPart extends ShapeRenderPart implements RectangleRenderSettings {
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
   readonly url: string | (() => string);
}
export class ImageRenderPart extends BaseRenderPart implements ImageRenderSettings {
   public readonly type = "image";
   public readonly url: string | (() => string);
   public readonly size: {
      readonly width: number;
      readonly height: number;
   }
   
   constructor(renderSettings: ImageRenderSettings) {
      super(renderSettings);

      this.url = renderSettings.url;
      this.size = renderSettings.size;
   }

   public getURL(): string {
      return typeof this.url === "function" ? this.url() : this.url;
   }
}
   
const getHurtImageData = (image: HTMLImageElement): HTMLImageElement => {
   const canvas = document.createElement("canvas");
   const ctx = canvas.getContext("2d")!;

   canvas.width = image.width;
   canvas.height = image.height;

   ctx.drawImage(image, 0, 0);

   const imageData = ctx.getImageData(0, 0, image.width, image.height);

   // Convert all pixels to white
   for (let px = 0; px < imageData.width * imageData.height * 4; px += 4) {
      imageData.data[px] = 255;
      imageData.data[px + 1] = 255;
      imageData.data[px + 2] = 255;
   }

   ctx.putImageData(imageData, 0, 0);

   // Create an image from the data
   const resultImage = new Image();
   resultImage.src = canvas.toDataURL();

   return resultImage;
}

type ImageRecord = {
   [key: string]: HTMLImageElement;
}
const PART_IMAGES: ImageRecord = {};
const HURT_IMAGES: ImageRecord = {};

type RenderPart = EllipseRenderPart | RectangleRenderPart | ImageRenderPart;
export type RenderParts = Array<RenderPart>;

class RenderComponent extends Component {
   private readonly renderParts: RenderParts = new Array<RenderPart>();

   public async addPart(renderPart: RenderPart): Promise<void> {
      // Find a spot in the renderParts array for the part
      let idx = 0;
      for (; idx < this.renderParts.length; idx++) {
         const currentRenderPart = this.renderParts[idx];
         if (renderPart.zIndex <= currentRenderPart.zIndex) {
            break;
         }
      }

      // Insert the render part into the array
      this.renderParts.splice(idx, 0, renderPart);
   }

   public addParts(renderParts: ReadonlyArray<RenderPart>): void {
      for (const renderPart of renderParts) {
         this.addPart(renderPart);
      }
   }

   private async createHurtImage(image: HTMLImageElement, url: string): Promise<HTMLImageElement> {
      return new Promise(async resolve => {
         if (HURT_IMAGES.hasOwnProperty(url)) {
            resolve(HURT_IMAGES[image.src]);
         }
   
         image.addEventListener("load", () => {
            const imageData = getHurtImageData(image);
            
            HURT_IMAGES[url] = imageData;
            resolve(imageData);
         });
      });
   }

   public static getOffset(magnitude: number, radians: number): [number, number] {
      const vector = new Vector(magnitude, radians);
      const point = vector.convertToPoint();
      return [point.x, point.y];
   }

   public async renderEntity(ctx: CanvasRenderingContext2D): Promise<void> {
      // Get the entity transform information
      const entityTransformComponent = this.getEntity().getComponent(TransformComponent)!;
      const position = entityTransformComponent.position;
      
      for (let i = 0; i < this.renderParts.length; i++) {
         const renderClass = this.renderParts[i];
         
         if (typeof renderClass.isVisible !== "undefined" && !renderClass.isVisible()) continue;
         
         const entityRotation = entityTransformComponent.rotation;

         const offsetX = renderClass.offset![0] * Board.tileSize;
         const offsetY = renderClass.offset![1] * Board.tileSize;

         const centerX = Camera.getXPositionInCamera(position.x);
         const centerY = Camera.getYPositionInCamera(position.y);

         const cameraX = Camera.getXPositionInCamera(position.x + offsetX);
         const cameraY = Camera.getYPositionInCamera(position.y + offsetY);

         const healthComponent = this.getEntity().getComponent(HealthComponent);
         const isBeingHit = healthComponent !== null && healthComponent.isBeingHit();

         // Render the class
         switch (renderClass.type) {
            case "ellipse": {
               let radiusX!: number;
               let radiusY!: number;
               if (typeof renderClass.size.radius === "number") {
                  radiusX = renderClass.size.radius * Board.tileSize;
                  radiusY = renderClass.size.radius * Board.tileSize;
               } else {
                  radiusX = renderClass.size.radius[0] * Board.tileSize;
                  radiusY = renderClass.size.radius[1] * Board.tileSize;
               }

               // Move the canvas origin to the center of the image
               ctx.translate(centerX, centerY);
               ctx.rotate(entityRotation);
               // Undo the translation
               ctx.translate(-centerX, -centerY);

               // Create the circle
               ctx.fillStyle = isBeingHit ? "#fff" : renderClass.fillColour;
               ctx.beginPath();
               ctx.ellipse(cameraX, cameraY, radiusX, radiusY, 0, 0, Math.PI * 2);
               ctx.fill();

               if (typeof renderClass.border !== "undefined") {
                  // Create the circle border
                  ctx.lineWidth = renderClass.border.width;
                  ctx.strokeStyle = isBeingHit ? "#fff" : renderClass.border.colour;
                  ctx.stroke();
               }
               
               // Reset rotation
               ctx.setTransform(1, 0, 0, 1, 0, 0);

               break;
            }
            case "rectangle": {
               const width = renderClass.size.width;
               const height = renderClass.size.height;

               const cameraXWithSize = Camera.getXPositionInCamera(position.x - width/2 * Board.tileSize + offsetX);
               const cameraYWithSize = Camera.getYPositionInCamera(position.y - height/2 * Board.tileSize + offsetY);

               ctx.fillStyle = isBeingHit ? "#fff" : renderClass.fillColour;
               ctx.fillRect(cameraXWithSize, cameraYWithSize, width, height);
               break;
            }
            case "image": {
               const width = renderClass.size.width;
               const height = renderClass.size.height;

               // Entity rotation
               ctx.translate(centerX, centerY);
               ctx.rotate(entityRotation);
               // Undo the translation
               ctx.translate(-centerX, -centerY);

               const cameraXWithSize = Camera.getXPositionInCamera(position.x - width/2 * Board.tileSize + offsetX);
               const cameraYWithSize = Camera.getYPositionInCamera(position.y - height/2 * Board.tileSize + offsetY);

               // Render part rotation
               ctx.translate(cameraX, cameraY);
               ctx.rotate(renderClass.rotation);
               // Undo the translation
               ctx.translate(-cameraX, -cameraY);

               const url = renderClass.getURL();

               // If the image hasn't been created yet, create it
               if (!PART_IMAGES.hasOwnProperty(url)) {
                  PART_IMAGES[url] = new Image();
                  PART_IMAGES[url].src = require("../images/" + url);

                  // If the entity will get hit, create the hurt image
                  if (this.getEntity().getComponent(HealthComponent) !== null) {
                     HURT_IMAGES[url] = await this.createHurtImage(PART_IMAGES[url], url);
                  }
               }

               let image!: HTMLImageElement;
               if (isBeingHit && HURT_IMAGES.hasOwnProperty(url)) {
                  image = HURT_IMAGES[url];
               } else {
                  image = PART_IMAGES[url];
               }

               ctx.drawImage(image, cameraXWithSize, cameraYWithSize, width * Board.tileSize, height * Board.tileSize);

               // Reset rotation
               ctx.setTransform(1, 0, 0, 1, 0, 0);

               break;
            }
         }
      }
   }
}

export default RenderComponent;