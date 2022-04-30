import Entity from "./Entity";
import HitboxComponent, { CircleHitboxInfo } from "../entity-components/HitboxComponent";
import InventoryComponent from "../entity-components/InventoryComponent";
import RenderComponent, { ImageRenderPart } from "../entity-components/RenderComponent";
import TransformComponent from "../entity-components/TransformComponent";
import Tribe from "../Tribe";

/** Where tribes put their resources in order to use them. */
class TribeStash extends Entity {
   public static OPEN_MESSAGE = "Press space to open stash";
   public static CLOSE_MESSAGE = "Press space to close stash";

   public readonly tribe: Tribe;

   public static readonly DEFAULT_SLOT_COUNT = 10;

   constructor(tribe: Tribe) {
      const spawnPosition = tribe.position;

      const SIZE = 1.5;

      const HITBOX: CircleHitboxInfo = {
         type: "circle",
         radius: SIZE / 2
      };

      super([
         new TransformComponent(spawnPosition),
         new HitboxComponent(HITBOX),
         new RenderComponent(),
         new InventoryComponent(TribeStash.DEFAULT_SLOT_COUNT)
      ]);

      this.getComponent(RenderComponent)!.addPart(
         new ImageRenderPart({
            type: "image",
            size: {
               width: SIZE,
               height: SIZE
            },
            url: "berry.png"
         })
      );

      this.tribe = tribe;
   }
}

export default TribeStash;