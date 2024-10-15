import ServerComponent from "../ServerComponent";
import { randFloat } from "battletribes-shared/utils";
import { EntityID, FishColour } from "battletribes-shared/entities";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { TileType } from "battletribes-shared/tiles";
import Board from "../../Board";
import { createWaterSplashParticle } from "../../particles";
import { getEntityLayer } from "../../world";
import { getEntityTile, TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";

class FishComponent extends ServerComponent {
   public colour: FishColour = 0;
   public readonly waterOpacityMultiplier = randFloat(0.6, 1);
}

export default FishComponent;

export const FishComponentArray = new ServerComponentArray<FishComponent>(ServerComponentType.fish, true, {
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
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
   
function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const fishComponent = FishComponentArray.getComponent(entity);
   fishComponent.colour = reader.readNumber();
}