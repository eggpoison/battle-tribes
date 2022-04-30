import Board from "../Board";
import Entity, { EventType } from "./Entity";
import HealthComponent from "../entity-components/HealthComponent";
import HitboxComponent, { CircleHitboxInfo } from "../entity-components/HitboxComponent";
import RenderComponent, { ImageRenderPart } from "../entity-components/RenderComponent";
import ResourceSpawnComponent from "../entity-components/ResourceSpawnerComponent";
import TransformComponent from "../entity-components/TransformComponent";
import { ItemName } from "../items";
import { getTilesByType, TileType } from "../tiles";
import { randFloat, randItem } from "../utils";

class Berry extends Entity {
   private static readonly spawnableTileTypes: ReadonlyArray<TileType> = [
      TileType.grass
   ];

   private static readonly SIZE = 1;

   private static readonly HEALTH = 10;
   private static readonly LIFESPAN = 30;

   constructor() {
      // Calculate the position of the berry
      const potentialTileCoordinates = getTilesByType(Berry.spawnableTileTypes);
      const spawnTileCoordinates = randItem(potentialTileCoordinates);
      const position = Board.getRandomPositionInTile(spawnTileCoordinates);

      const startingRotation = randFloat(0, 360);

      const hitbox: CircleHitboxInfo = {
         type: "circle",
         radius: Berry.SIZE / 2
      };

      super([
         new TransformComponent(position, undefined, startingRotation),
         new RenderComponent(),
         new HitboxComponent(hitbox),
         new HealthComponent(Berry.HEALTH, undefined, undefined, undefined, Berry.LIFESPAN),
         new ResourceSpawnComponent()
      ]);

      this.getComponent(RenderComponent)!.addPart(
         new ImageRenderPart({
            type: "image",
            url: "berry.png",
            size: {
               width: Berry.SIZE,
               height: Berry.SIZE
            }
         })
      );

      this.getComponent(ResourceSpawnComponent)!.addResource(ItemName.berry, [1, 2], EventType.deathByEntity);
   }
}

export default Berry;