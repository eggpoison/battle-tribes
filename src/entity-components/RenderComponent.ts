import Board from "../Board";
import Camera from "../Camera";
import Component from "../Component";
import TransformComponent from "./TransformComponent";

interface BaseRenderSettings {
   readonly type: string;
}
interface ShapeRenderSettings extends BaseRenderSettings {
   readonly type: "circle" | "rectangle";
   readonly fillColour?: string;
   readonly border?: {
      readonly width: number;
      readonly colour: string;
   }
}
interface ImageRenderSettings extends BaseRenderSettings {
   readonly type: "image";
   readonly url: string;
}

export type RenderSettings = ShapeRenderSettings | ImageRenderSettings;

class RenderComponent extends Component {
   private renderSettings: RenderSettings;
   private renderFunc?: (ctx: CanvasRenderingContext2D) => void;

   private image!: HTMLImageElement;

   constructor(renderSettings: RenderSettings, renderFunc?: (ctx: CanvasRenderingContext2D) => void) {
      super();

      this.renderSettings = renderSettings;
      this.renderFunc = renderFunc;
   }

   public onLoad(): void {
      // Preload the image
      if (this.renderSettings.type === "image") {   
         this.image = new Image();
         this.image.src = require("../images/" + this.renderSettings.url);
      }
   }

   public renderEntity(ctx: CanvasRenderingContext2D): void {
      // Get the entity position
      const entityTransformComponent = this.getEntity().getComponent(TransformComponent);
      const position = entityTransformComponent.position;
      const size = entityTransformComponent.size;

      const cameraX = Camera.getXPositionInCamera(position.x);
      const cameraY = Camera.getYPositionInCamera(position.y);
      const cameraXWithSize = Camera.getXPositionInCamera(position.x - size.width * Board.tileSize / 2)
      const cameraYWithSize = Camera.getYPositionInCamera(position.y - size.width * Board.tileSize / 2)

      switch (this.renderSettings.type) {
         case "circle": {
            // Create the circle
            ctx.fillStyle = this.renderSettings.fillColour!;
            ctx.beginPath();
            ctx.arc(cameraX, cameraY, size.width * Board.tileSize / 2, 0, Math.PI * 2);
            ctx.fill();

            if (typeof this.renderSettings.border !== "undefined") {
               // Create the circle border
               ctx.lineWidth = this.renderSettings.border.width;
               ctx.strokeStyle = this.renderSettings.border.colour;
               ctx.stroke();
            }

            break;
         }
         case "rectangle": {
            ctx.fillStyle = this.renderSettings.fillColour!;
            ctx.fillRect(cameraX, cameraY, size.width, size.height);
            break;
         }
         case "image": {
            ctx.drawImage(this.image, cameraXWithSize, cameraYWithSize, size.width * Board.tileSize, size.height * Board.tileSize);

            break;
         }
      }

      if (typeof this.renderFunc !== "undefined") this.renderFunc(ctx);
   }
}

export default RenderComponent;