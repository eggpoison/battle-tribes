import { TribeType } from "battletribes-shared/tribes";
import { EnemyTribeData } from "battletribes-shared/techs";
import { ServerComponentType } from "battletribes-shared/components";
import { randFloat } from "battletribes-shared/utils";
import Entity from "../Entity";
import ServerComponent from "./ServerComponent";
import Game from "../Game";
import { playSound } from "../sound";
import { getTribesmanRadius } from "./TribeMemberComponent";
import { createConversionParticle } from "../particles";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

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

class TribeComponent extends ServerComponent {
   public tribeID: number;
   public tribeType: TribeType;

   constructor(entity: Entity, reader: PacketReader) {
      super(entity);
      
      this.tribeID = reader.readNumber();
      this.tribeType = getTribeType(this.tribeID);
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      const tribeID = reader.readNumber();
      
      // Tribesman conversion
      if (tribeID !== this.tribeID && this.entity.hasServerComponent(ServerComponentType.tribeMember)) {
         const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);

         playSound("conversion.mp3", 0.4, 1, transformComponent.position);

         const radius = getTribesmanRadius(this.entity);
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
      
      this.tribeID = tribeID;
      this.tribeType = getTribeType(tribeID);
   }
}

export default TribeComponent;

export const TribeComponentArray = new ComponentArray<TribeComponent>(ComponentArrayType.server, ServerComponentType.tribe, true, {});