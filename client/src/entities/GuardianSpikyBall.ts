import { EntityType } from "../../../shared/src/entities";
import Entity from "../Entity";

export default class GuardianSpikyBall extends Entity {
   constructor(id: number) {
      super(id, EntityType.guardianSpikyBall);
   }
}