import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { randFloat } from "webgl-test-shared/dist/utils";
import { FishColour } from "webgl-test-shared/dist/entities";
import { PacketReader } from "webgl-test-shared/dist/packets";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { TileType } from "webgl-test-shared/dist/tiles";
import Board from "../Board";
import { createWaterSplashParticle } from "../particles";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

class FishComponent extends ServerComponent {
   public readonly colour: FishColour;
   public readonly waterOpacityMultiplier: number;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.colour = reader.readNumber();
      this.waterOpacityMultiplier = randFloat(0.6, 1);
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }
}

export default FishComponent;

export const FishComponentArray = new ComponentArray<FishComponent>(ComponentArrayType.server, ServerComponentType.fish, true, {
   onTick: onTick
});

function onTick(fishComponent: FishComponent): void {
   const transformComponent = fishComponent.entity.getServerComponent(ServerComponentType.transform);
   if (transformComponent.tile.type !== TileType.water && Board.tickIntervalHasPassed(0.4)) {
      for (let i = 0; i < 8; i++) {
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = transformComponent.position.x + 8 * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + 8 * Math.cos(spawnOffsetDirection);

         createWaterSplashParticle(spawnPositionX, spawnPositionY);
      }
   }
}