import Entity from "./Entity";
import HitboxComponent from "../entity-components/HitboxComponent";
import RenderComponent, { ImageRenderPart } from "../entity-components/RenderComponent";
import TransformComponent from "../entity-components/TransformComponent";
import Tribe from "../Tribe";
import InfiniteInventoryComponent from "../entity-components/inventory/InfiniteInventoryComponent";

/** Where tribes put their resources in order to use them. */
class TribeStash extends Entity {
   public readonly SIZE = 1.5;

   public static OPEN_MESSAGE = "Press E to open stash";
   public static CLOSE_MESSAGE = "Press E to close stash";

   public readonly tribe: Tribe;

   constructor(tribe: Tribe) {
      const spawnPosition = tribe.position;

      super([
         new TransformComponent(spawnPosition, undefined, undefined, true),
         new HitboxComponent(),
         new RenderComponent(),
         new InfiniteInventoryComponent()
      ]);

      this.tribe = tribe;

      this.setHitbox();

      this.getComponent(RenderComponent)!.addPart(
         new ImageRenderPart({
            type: "image",
            size: {
               width: this.SIZE,
               height: this.SIZE
            },
            url: "tribe-stash.png"
         })
      );
   }

   private setHitbox(): void {
      this.getComponent(HitboxComponent)!.setHitbox({
         type: "circle",
         radius: this.SIZE / 2
      });
   }
}

export default TribeStash;