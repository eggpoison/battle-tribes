import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import Tribe from "../../Tribe";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { ResearchBenchComponent, ResearchBenchComponentArray } from "../../components/ResearchBenchComponent";
import { StructureComponent, StructureComponentArray } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Hitbox } from "../../hitboxes/hitboxes";

export function createResearchBenchHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(parentPosition, 1.8, 0, 0, HitboxCollisionType.hard, localID, parentRotation, 128, 80, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   return hitboxes;
}

export function createResearchBench(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const bench = new Entity(position, rotation, EntityType.researchBench, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createResearchBenchHitboxes(position, bench.getNextHitboxLocalID(), bench.rotation);
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