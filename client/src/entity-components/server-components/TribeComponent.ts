import { TribeType } from "battletribes-shared/tribes";
import { EnemyTribeData } from "battletribes-shared/techs";
import { ServerComponentType } from "battletribes-shared/components";
import { randFloat } from "battletribes-shared/utils";
import Game from "../../Game";
import { playSound } from "../../sound";
import { getTribesmanRadius, TribeMemberComponentArray } from "./TribeMemberComponent";
import { createConversionParticle } from "../../particles";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { EntityID } from "../../../../shared/src/entities";
import Player from "../../entities/Player";

export function getTribeType(tribeID: number): TribeType {
   if (tribeID === Game.tribe.id) {
      return Game.tribe.tribeType;
   } else {
      let tribeData: EnemyTribeData | undefined;
      for (const currentTribeData of Game.enemyTribes) {
         if (currentTribeData.id === tribeID) {
            tribeData = currentTribeData;
            break;
         }
      }
      if (typeof tribeData === "undefined") {
         console.log("ID:",tribeID);
         console.log(Game.enemyTribes.map(t => t.id));
         throw new Error("Tribe data is undefined!");
      }
      return tribeData.tribeType;
   }
}

class TribeComponent {
   public tribeID = 0;
   public tribeType = TribeType.plainspeople;
}

export default TribeComponent;

export const TribeComponentArray = new ServerComponentArray<TribeComponent>(ServerComponentType.tribe, true, {
   padData: padData,
   updateFromData: updateFromData,
   updatePlayerFromData: updatePlayerFromData
});

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID, isInitialData: boolean): void {
   const tribeComponent = TribeComponentArray.getComponent(entity);
   
   const tribeID = reader.readNumber();
   
   // Tribesman conversion
   if (!isInitialData && tribeID !== tribeComponent.tribeID && TribeMemberComponentArray.hasComponent(entity)) {
      const transformComponent = TransformComponentArray.getComponent(entity);

      playSound("conversion.mp3", 0.4, 1, transformComponent.position);

      const radius = getTribesmanRadius(entity);
      for (let i = 0; i < 10; i++) {
         const offsetDirection = 2 * Math.PI * Math.random();
         const offsetMagnitude = radius + randFloat(0, 4);
         const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
         const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);

         const velocityDirection = offsetDirection + randFloat(-0.5, 0.5);
         const velocityMagnitude = randFloat(55, 110);
         const velocityX = velocityMagnitude * Math.sin(velocityDirection);
         const velocityY = velocityMagnitude * Math.cos(velocityDirection);
         
         createConversionParticle(x, y, velocityX, velocityY);
      }
   }
   
   tribeComponent.tribeID = tribeID;
   tribeComponent.tribeType = getTribeType(tribeID);
}

function updatePlayerFromData(reader: PacketReader): void {
   const tribeComponent = TribeComponentArray.getComponent(Player.instance!.id);
   tribeComponent.tribeID = reader.readNumber();
   tribeComponent.tribeType = getTribeType(tribeComponent.tribeID);
}