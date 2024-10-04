import { EntityType } from "../../../shared/src/entities";
import Entity from "../Entity";

export default class GuardianGemFragmentProjectile extends Entity {
   constructor(id: number) {
      super(id, EntityType.guardianGemFragmentProjectile);
   }
}