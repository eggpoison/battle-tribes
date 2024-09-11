import { Point, randFloat } from "battletribes-shared/utils";
import ServerComponent from "./ServerComponent";
import Board from "../Board";
import Entity from "../Entity";
import { Light, addLight, attachLightToEntity } from "../lights";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { createSmokeParticle, createEmberParticle } from "../particles";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

class CookingComponent extends ServerComponent {
   public heatingProgress: number;
   public isCooking: boolean;

   public readonly light: Light;

   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.heatingProgress = reader.readNumber();
      this.isCooking = reader.readBoolean();
      reader.padOffset(3);

      this.light = {
         offset: new Point(0, 0),
         intensity: 1,
         strength: 3.5,
         radius: 40,
         r: 0,
         g: 0,
         b: 0
      };
      const lightID = addLight(this.light);
      attachLightToEntity(lightID, this.entity.id);
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader): void {
      this.heatingProgress = reader.readNumber();
      this.isCooking = reader.readBoolean();
      reader.padOffset(3);
   }
}

export default CookingComponent;

export const CookingComponentArray = new ComponentArray<CookingComponent>(ComponentArrayType.server, ServerComponentType.cooking, true, {
   onTick: onTick
});

function onTick(cookingComponent: CookingComponent): void {
   if (Board.tickIntervalHasPassed(0.15)) {
      cookingComponent.light.radius = 40 + randFloat(-7, 7);
   }

   if (cookingComponent.isCooking) {
      const transformComponent = cookingComponent.entity.getServerComponent(ServerComponentType.transform);

      // Smoke particles
      if (Board.tickIntervalHasPassed(0.1)) {
         const spawnOffsetMagnitude = 20 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         createSmokeParticle(spawnPositionX, spawnPositionY);
      }

      // Ember particles
      if (Board.tickIntervalHasPassed(0.05)) {
         let spawnPositionX = transformComponent.position.x - 30 * Math.sin(transformComponent.rotation);
         let spawnPositionY = transformComponent.position.y - 30 * Math.cos(transformComponent.rotation);

         const spawnOffsetMagnitude = 11 * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createEmberParticle(spawnPositionX, spawnPositionY, transformComponent.rotation + Math.PI + randFloat(-0.8, 0.8), randFloat(80, 120));
      }
   }
}