import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderPart } from "../../entity-components/RenderComponent";
import { Point } from "../../utils";
import Mob from "./Mob";

class Zombie extends Mob {
   public readonly SIZE = 1;

   protected createRenderParts(renderComponent: RenderComponent): void {
      renderComponent.addPart(new EllipseRenderPart({
         type: "ellipse",
         size: {
            radius: this.SIZE / 2
         },
         fillColour: "#098a00"
      }));
   }

   protected setHitbox(hitboxComponent: HitboxComponent): void {
      hitboxComponent.setHitbox({
         type: "circle",
         radius: this.SIZE / 2
      })
   }
}

export default Zombie;