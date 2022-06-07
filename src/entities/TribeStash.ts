import Entity from "./Entity";
import HitboxComponent from "../entity-components/HitboxComponent";
import RenderComponent, { ImageRenderPart } from "../entity-components/RenderComponent";
import TransformComponent from "../entity-components/TransformComponent";
import Tribe from "../Tribe";
import InfiniteInventoryComponent from "../entity-components/inventory/InfiniteInventoryComponent";
import { updateTribeStashViewer } from "../components/inventory/TribeStashViewer";

/** Where tribes put their resources in order to use them. */
class TribeStash extends Entity {
   public readonly name = "Tribe Stash";
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

      // Link the player's tribe stash to the tribe stash viewer
      if (this.tribe.type === "humans") {
         // When the inventory changes, update the tribe stash viewer to match those changes
         this.createEvent("inventoryChange", () => {
            const itemSlots = this.getComponent(InfiniteInventoryComponent)!.getItemSlots();
            updateTribeStashViewer(itemSlots);
         });
      }
   }

   private setHitbox(): void {
      this.getComponent(HitboxComponent)!.setHitbox({
         type: "circle",
         radius: this.SIZE / 2
      });
   }
}

export default TribeStash;