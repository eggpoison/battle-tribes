import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import Tribe from "../../Tribe";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { ResearchBenchComponent, ResearchBenchComponentArray } from "../../components/ResearchBenchComponent";
import { StructureComponent, StructureComponentArray } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { createResearchBenchHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";

export function createResearchBench(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const bench = new Entity(position, rotation, EntityType.researchBench, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createResearchBenchHitboxes(bench.getNextHitboxLocalID());
   for (let i = 0; i < hitboxes.length; i++) {
      bench.addHitbox(hitboxes[i]);
   }
   
   HealthComponentArray.addComponent(bench.id, new HealthComponent(40));
   StatusEffectComponentArray.addComponent(bench.id, new StatusEffectComponent(StatusEffect.poisoned));
   StructureComponentArray.addComponent(bench.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(bench.id, new TribeComponent(tribe));
   ResearchBenchComponentArray.addComponent(bench.id, new ResearchBenchComponent());

   return bench;
}