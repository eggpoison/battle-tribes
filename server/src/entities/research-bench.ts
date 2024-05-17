import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import { HealthComponentArray, ResearchBenchComponentArray, TribeComponentArray } from "../components/ComponentArray";
import { HealthComponent } from "../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../components/StatusEffectComponent";
import RectangularHitbox from "../hitboxes/RectangularHitbox";
import Tribe from "../Tribe";
import { TribeComponent } from "../components/TribeComponent";
import { ResearchBenchComponent } from "../components/ResearchBenchComponent";
import CircularHitbox from "../hitboxes/CircularHitbox";

export function createResearchBenchHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<CircularHitbox | RectangularHitbox> {
   const hitboxes = new Array<CircularHitbox | RectangularHitbox>();
   hitboxes.push(new RectangularHitbox(parentPosition, 1.8, 0, 0, HitboxCollisionType.hard, localID, parentRotation, 128, 80, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   return hitboxes;
}

export function createResearchBench(position: Point, rotation: number, tribe: Tribe): Entity {
   const bench = new Entity(position, rotation, EntityType.researchBench, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createResearchBenchHitboxes(position, bench.getNextHitboxLocalID(), bench.rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      bench.addHitbox(hitboxes[i]);
   }
   
   HealthComponentArray.addComponent(bench.id, new HealthComponent(40));
   StatusEffectComponentArray.addComponent(bench.id, new StatusEffectComponent(StatusEffect.poisoned));
   TribeComponentArray.addComponent(bench.id, new TribeComponent(tribe));
   ResearchBenchComponentArray.addComponent(bench.id, new ResearchBenchComponent());

   return bench;
}