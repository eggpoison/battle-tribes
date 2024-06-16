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
import { Hitbox, RectangularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";

const HITBOX_WIDTH = 120 - 0.05;
const HITBOX_HEIGHT = 80 - 0.05;

export function createStonecarvingTableHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();

   const hitbox = new RectangularHitbox(1, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HITBOX_WIDTH, HITBOX_HEIGHT, 0);
   hitboxes.push(hitbox);

   return hitboxes;
}

export function createStonecarvingTable(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const stonecarvingTable = new Entity(position, rotation, EntityType.stonecarvingTable, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createStonecarvingTableHitboxes(stonecarvingTable.getNextHitboxLocalID());
   for (let i = 0; i < hitboxes.length; i++) {
      stonecarvingTable.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(stonecarvingTable.id, new HealthComponent(40));
   StatusEffectComponentArray.addComponent(stonecarvingTable.id, new StatusEffectComponent(StatusEffect.freezing | StatusEffect.poisoned));
   StructureComponentArray.addComponent(stonecarvingTable.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(stonecarvingTable.id, new TribeComponent(tribe));
   FenceComponentArray.addComponent(stonecarvingTable.id, new FenceComponent());
   CraftingStationComponentArray.addComponent(stonecarvingTable.id, new CraftingStationComponent(CraftingStation.stonecarvingTable));
   
   return stonecarvingTable;
}