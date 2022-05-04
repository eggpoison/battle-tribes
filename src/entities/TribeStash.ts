import Entity from "./Entity";
import HitboxComponent from "../entity-components/HitboxComponent";
import InventoryComponent from "../entity-components/InventoryComponent";
import RenderComponent, { ImageRenderPart } from "../entity-components/RenderComponent";
import TransformComponent from "../entity-components/TransformComponent";
import Tribe from "../Tribe";
import TribeMemberComponent from "../entity-components/TribeMemberComponent";

/** Where tribes put their resources in order to use them. */
class TribeStash extends Entity {
   private static readonly SIZE = 1.5;

   public static OPEN_MESSAGE = "Press space to open stash";
   public static CLOSE_MESSAGE = "Press space to close stash";

   public static readonly DEFAULT_SLOT_COUNT = 10;

   constructor(tribe: Tribe) {
      const spawnPosition = tribe.position;

      super([
         new TransformComponent(spawnPosition, undefined, undefined, true),
         new HitboxComponent(),
         new RenderComponent(),
         new InventoryComponent(TribeStash.DEFAULT_SLOT_COUNT),
         new TribeMemberComponent(tribe)
      ]);

      this.setHitbox();

      this.getComponent(RenderComponent)!.addPart(
         new ImageRenderPart({
            type: "image",
            size: {
               width: TribeStash.SIZE,
               height: TribeStash.SIZE
            },
            url: "tribe-stash.png"
         })
      );
   }

   private setHitbox(): void {
      this.getComponent(HitboxComponent)!.setHitbox({
         type: "circle",
         radius: TribeStash.SIZE / 2
      });
   }
}

export default TribeStash;