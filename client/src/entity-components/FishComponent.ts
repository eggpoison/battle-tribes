import ServerComponent from "./ServerComponent";
import { randFloat } from "battletribes-shared/utils";
import { EntityID, FishColour } from "battletribes-shared/entities";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { TileType } from "battletribes-shared/tiles";
import Board from "../Board";
import { createWaterSplashParticle } from "../particles";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { getEntityLayer } from "../world";
import { getEntityTile, TransformComponentArray } from "./TransformComponent";

class FishComponent extends ServerComponent {
   public colour: FishColour = 0;
   public readonly waterOpacityMultiplier = randFloat(0.6, 1);
   
   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      this.colour = reader.readNumber();
   }
}

export default FishComponent;

export const FishComponentArray = new ComponentArray<FishComponent>(ComponentArrayType.server, ServerComponentType.fish, true, {
   onTick: onTick
});

function onTick(_fishComponent: FishComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const layer = getEntityLayer(entity);
   
   const tile = getEntityTile(layer, transformComponent);
   if (tile.type !== TileType.water && Board.tickIntervalHasPassed(0.4)) {
      for (let i = 0; i < 8; i++) {
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = transformComponent.position.x + 8 * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + 8 * Math.cos(spawnOffsetDirection);

         createWaterSplashParticle(spawnPositionX, spawnPositionY);
      }
   }
}