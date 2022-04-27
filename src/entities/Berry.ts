import Entity from "../Entity";
import HealthComponent from "../entity-components/HealthComponent";
import HitboxComponent, { CircleHitboxInfo } from "../entity-components/HitboxComponent";
import RenderComponent, { ImageRenderClass, RenderClasses } from "../entity-components/RenderComponent";
import ResourceSpawnComponent from "../entity-components/ResourceSpawnerComponent";
import TransformComponent from "../entity-components/TransformComponent";
import ITEMS, { ItemName } from "../items";
import { TileType } from "../tiles";
import { Point, randFloat, randInt } from "../utils";

class Berry extends Entity {
   public static spawnableTileTypes = [
      TileType.grass
   ];

   constructor(position: Point) {
      /** Size of the berry in tiles */
      const SIZE = 1;

      const RENDER_CLASSES: RenderClasses = [
         new ImageRenderClass({
            type: "image",
            url: "berry.png",
            size: {
               width: SIZE,
               height: SIZE
            }
         })
      ];

      const STARTING_ROTATION = randFloat(0, 360);

      const HITBOX: CircleHitboxInfo = {
         type: "circle",
         radius: SIZE / 2
      };

      const BERRY_HEALTH = 10;
      /** How long the berry lasts in seconds */
      const LIFESPAN = 30;

      super([
         new TransformComponent(position, undefined, STARTING_ROTATION),
         new RenderComponent(RENDER_CLASSES),
         new HitboxComponent(HITBOX),
         new HealthComponent(BERRY_HEALTH, undefined, undefined, undefined, LIFESPAN),
         new ResourceSpawnComponent()
      ]);
   }

   public onDie(causeOfDeath: Entity | null): void {
      // Don't spawn items if the berry died of natural causes
      if (causeOfDeath === null) return;

      const item = ITEMS[ItemName.berry];
      
      const spawnComponent = this.getComponent(ResourceSpawnComponent)!;
      spawnComponent.spawnResource(item, randInt(1, 2));
   }
}

export default Berry;