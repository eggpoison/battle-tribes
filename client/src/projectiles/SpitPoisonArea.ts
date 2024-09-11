import Entity from "../Entity";
import { EntityType } from "battletribes-shared/entities";

class SpitPoisonArea extends Entity {
   constructor(id: number) {
      super(id, EntityType.spitPoisonArea);
   }
}

export default SpitPoisonArea;