import Entity from "../Entity";
import { EntityType } from "webgl-test-shared/dist/entities";

class SpitPoisonArea extends Entity {
   constructor(id: number) {
      super(id, EntityType.spitPoisonArea);
   }
}

export default SpitPoisonArea;