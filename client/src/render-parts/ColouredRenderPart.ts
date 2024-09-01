import { RenderThing } from "./render-parts";
import BaseRenderPart from "./RenderPart";

export interface RenderPartColour {
   r: number;
   g: number;
   b: number;
   a: number;
}

class ColouredRenderPart extends BaseRenderPart {
   // @Incomplete: alpha doesn't actualy do anything
   public readonly colour: RenderPartColour;

   constructor(parent: RenderThing | null, zIndex: number, rotation: number, colour: RenderPartColour) {
      super(parent, zIndex, rotation);

      this.colour = colour;
   }
}

export default ColouredRenderPart;