import { TribeType } from "webgl-test-shared/dist/tribes";
import { EnemyTribeData } from "webgl-test-shared/dist/techs";
import { ServerComponentType, TribeComponentData } from "webgl-test-shared/dist/components";
import { randFloat } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import ServerComponent from "./ServerComponent";
import Game from "../Game";
import { playSound } from "../sound";
import { getTribesmanRadius } from "./TribeMemberComponent";
import { createConversionParticle } from "../particles";

const getTribeType = (tribeID: number): TribeType => {
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

class TribeComponent extends ServerComponent<ServerComponentType.tribe> {
   public tribeID: number;
   public tribeType: TribeType;

   constructor(entity: Entity, data: TribeComponentData) {
      super(entity);
      
      this.tribeID = data.tribeID;
      this.tribeType = getTribeType(data.tribeID);
   }

   public updateFromData(data: TribeComponentData): void {
      // Tribesman conversion
      if (data.tribeID !== this.tribeID && this.entity.hasServerComponent(ServerComponentType.tribeMember)) {
         playSound("conversion.mp3", 0.4, 1, this.entity.position.x, this.entity.position.y);

         const radius = getTribesmanRadius(this.entity);
         for (let i = 0; i < 10; i++) {
            const offsetDirection = 2 * Math.PI * Math.random();
            const offsetMagnitude = radius + randFloat(0, 4);
            const x = this.entity.position.x + offsetMagnitude * Math.sin(offsetDirection);
            const y = this.entity.position.y + offsetMagnitude * Math.cos(offsetDirection);

            const velocityDirection = offsetDirection + randFloat(-0.5, 0.5);
            const velocityMagnitude = randFloat(55, 110);
            const velocityX = velocityMagnitude * Math.sin(velocityDirection);
            const velocityY = velocityMagnitude * Math.cos(velocityDirection);
            
            createConversionParticle(x, y, velocityX, velocityY);
         }
      }
      
      this.tribeID = data.tribeID;
      this.tribeType = getTribeType(data.tribeID);
   }
}

export default TribeComponent;