import HitboxComponent, { CircleHitboxInfo } from "../../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderPart } from "../../entity-components/RenderComponent";
import MOB_INFO_RECORD, { MobInfo } from "../../mob-info";
import { Point, randInt } from "../../utils";
import Mob from "./Mob";

enum SlimeSizeCategory {
   small,
   medium,
   large,
   colossal
}

const slimeSizes: Record<SlimeSizeCategory, number> = {
   [SlimeSizeCategory.small]: 0.6,
   [SlimeSizeCategory.medium]: 1,
   [SlimeSizeCategory.large]: 1.5,
   [SlimeSizeCategory.colossal]: 2.5
}

class Slime extends Mob {
   private static readonly HEALTH = 30;
   private static readonly COLOUR = "#00d432";

   private readonly size: number;

   constructor(position: Point) {
      super(position, Slime.HEALTH);

      let sizeCategory: SlimeSizeCategory = 0;
      while (sizeCategory < 3) {
         if (Math.random() < 0.5) {
            sizeCategory++;
         } else break;
      }
      this.size = slimeSizes[sizeCategory];

      this.setHitbox();

      this.createRenderParts();
   }

   public getInfo(): MobInfo {
      return MOB_INFO_RECORD.Slime;
   }

   private setHitbox(): void {
      this.getComponent(HitboxComponent)!.setHitbox({
         type: "circle",
         radius: this.size / 2
      });
   }

   private createRenderParts(): void {
      this.getComponent(RenderComponent)!.addPart(
         new EllipseRenderPart({
            type: "ellipse",
            size: {
               radius: this.size / 2
            },
            fillColour: Slime.COLOUR,
            border: {
               width: 5,
               colour: "#000"
            }
         })
      );
   }
}

export default Slime;