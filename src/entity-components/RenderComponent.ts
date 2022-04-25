import Board from "../Board";
import Camera from "../Camera";
import Component from "../Component";
import { getCanvasContext } from "../components/Canvas";
import TransformComponent from "./TransformComponent";

export interface RenderSettings {
   readonly type: "circle" | "rectangle";
   readonly fillColour: string;
   readonly border?: {
      readonly width: number;
      readonly colour: string;
   }
}

class RenderComponent extends Component {
   private renderSettings: RenderSettings;
   private renderFunc?: (ctx: CanvasRenderingContext2D) => void;

   constructor(renderSettings: RenderSettings, renderFunc?: (ctx: CanvasRenderingContext2D) => void) {
      super();

      this.renderSettings = renderSettings;
      this.renderFunc = renderFunc;
   }

   public renderEntity(ctx: CanvasRenderingContext2D): void {
      // Get the entity position
      const entityTransformComponent = this.getEntity().getComponent(TransformComponent);
      const position = entityTransformComponent.position;
      const size = entityTransformComponent.size;

      ctx.fillStyle = this.renderSettings.fillColour;

      switch (this.renderSettings.type) {
         case "circle": {
            // Create the circle
            ctx.beginPath();
            ctx.arc(Camera.getXPositionInCamera(position.x), Camera.getYPositionInCamera(position.y), size.width * Board.tileSize / 2, 0, Math.PI * 2);
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
            ctx.fillRect(Camera.getXPositionInCamera(position.x), Camera.getYPositionInCamera(position.y), size.width, size.height);
            break;
         }
      }

      if (typeof this.renderFunc !== "undefined") this.renderFunc(ctx);
   }
}

export default RenderComponent;