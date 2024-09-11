import Entity from "../Entity";
import { EntityType } from "battletribes-shared/entities";

class GrassStrand extends Entity {
   constructor(id: number) {
      super(id, EntityType.grassStrand);
   }
}

export default GrassStrand;