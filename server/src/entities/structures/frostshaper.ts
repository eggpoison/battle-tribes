import { HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK, COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import Tribe from "../../Tribe";
import { FenceComponent, FenceComponentArray } from "../../components/FenceComponent";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponentArray, StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponentArray, StructureComponent } from "../../components/StructureComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { CraftingStation } from "webgl-test-shared/dist/crafting-recipes";
import { CraftingStationComponentArray, CraftingStationComponent } from "../../components/CraftingStationComponent";
import { Hitbox, RectangularHitbox, HitboxCollisionType, HitboxFlags } from "webgl-test-shared/dist/hitboxes/hitboxes";

const HITBOX_WIDTH = 120 - 0.05;
const HITBOX_HEIGHT = 80 - 0.05;

export function createFrostshaperHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();

   const hitbox = new RectangularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, HitboxFlags.NON_GRASS_BLOCKING, HITBOX_WIDTH, HITBOX_HEIGHT, 0);
   hitboxes.push(hitbox);

   return hitboxes;
}

export function createFrostshaper(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const frostshaper = new Entity(position, rotation, EntityType.frostshaper, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createFrostshaperHitboxes(frostshaper.getNextHitboxLocalID());
   for (let i = 0; i < hitboxes.length; i++) {
      frostshaper.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(frostshaper.id, new HealthComponent(20));
   StatusEffectComponentArray.addComponent(frostshaper.id, new StatusEffectComponent(StatusEffect.freezing | StatusEffect.poisoned));
   StructureComponentArray.addComponent(frostshaper.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(frostshaper.id, new TribeComponent(tribe));
   FenceComponentArray.addComponent(frostshaper.id, new FenceComponent());
   CraftingStationComponentArray.addComponent(frostshaper.id, new CraftingStationComponent(CraftingStation.frostshaper));
   
   return frostshaper;
}