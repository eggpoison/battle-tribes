import Board from "../../Board";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { ImageRenderPart } from "../../entity-components/RenderComponent";
import ItemSpawnComponent from "../../entity-components/ItemSpawnerComponent";
import { ItemName } from "../../items/items";
import { getTilesByType, TileType } from "../../tiles";
import { randItem } from "../../utils";
import Resource from "./Resource";

class Berry extends Resource {
   private static readonly spawnableTileTypes: ReadonlyArray<TileType> = [
      TileType.grass
   ];

   public readonly SIZE = 1;

   private static readonly HEALTH = 10;
   private static readonly LIFESPAN = 30;

   constructor() {
      // Calculate the position of the berry
      const potentialTileCoordinates = getTilesByType(Berry.spawnableTileTypes);
      const spawnTileCoordinates = randItem(potentialTileCoordinates);
      const position = Board.getRandomPositionInTile(spawnTileCoordinates);

      super(position);

      this.setMaxHealth(Berry.HEALTH);
      this.getComponent(HealthComponent)!.setLifespan(Berry.LIFESPAN);

      this.getComponent(ItemSpawnComponent)!.addResource(ItemName.berry, [1, 2], "deathByEntity");
   }

   protected createRenderParts(renderComponent: RenderComponent): void {
      renderComponent.addPart(
         new ImageRenderPart({
            type: "image",
            url: "berry.png",
            size: {
               width: this.SIZE,
               height: this.SIZE
            }
         })
      );
   }

   protected setHitbox(hitboxComponent: HitboxComponent): void {
      hitboxComponent.setHitbox({
         type: "circle",
         radius: this.SIZE / 2
      });
   }
}

export default Berry;