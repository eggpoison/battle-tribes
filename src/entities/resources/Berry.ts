import Board from "../../Board";
import { EventType } from "../Entity";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { ImageRenderPart } from "../../entity-components/RenderComponent";
import ItemSpawnComponent from "../../entity-components/ItemSpawnerComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import { ItemName } from "../../items";
import { getTilesByType, TileType } from "../../tiles";
import { randFloat, randItem } from "../../utils";
import Resource from "./Resource";
import RESOURCE_INFO, { ResourceInfo } from "../../resource-info";

class Berry extends Resource {
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

      super(position);

      this.getComponent(HealthComponent)!.setMaxHealth(Berry.HEALTH, true);
      this.getComponent(HealthComponent)!.setLifespan(Berry.LIFESPAN);

      this.getComponent(TransformComponent)!.rotation = startingRotation;

      this.setHitbox();

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

      this.getComponent(ItemSpawnComponent)!.addResource(ItemName.berry, [1, 2], EventType.deathByEntity);
   }

   protected getInfo(): ResourceInfo {
      return RESOURCE_INFO.berry;
   }

   private setHitbox(): void {
      this.getComponent(HitboxComponent)!.setHitbox({
         type: "circle",
         radius: Berry.SIZE / 2
      });
   }
}

export default Berry;