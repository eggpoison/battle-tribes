import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { BuildingMaterial } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import Tribe from "../../Tribe";
import { DoorComponent, DoorComponentArray } from "../../components/DoorComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { PhysicsComponent, PhysicsComponentArray } from "../../components/PhysicsComponent";
import { BuildingMaterialComponent, BuildingMaterialComponentArray } from "../../components/BuildingMaterialComponent";
import { StructureComponentArray, StructureComponent } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { createDoorHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";

export const DOOR_HEALTHS = [15, 45];

export function createDoor(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo, material: BuildingMaterial): Entity {
   const door = new Entity(position, rotation, EntityType.door, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createDoorHitboxes();
   for (let i = 0; i < hitboxes.length; i++) {
      door.addHitbox(hitboxes[i]);
   }
   
   PhysicsComponentArray.addComponent(door.id, new PhysicsComponent(0, 0, 0, 0, false, true));
   HealthComponentArray.addComponent(door.id, new HealthComponent(DOOR_HEALTHS[material]));
   StatusEffectComponentArray.addComponent(door.id, new StatusEffectComponent(0));
   DoorComponentArray.addComponent(door.id, new DoorComponent(position.x, position.y, rotation));
   StructureComponentArray.addComponent(door.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(door.id, new TribeComponent(tribe)); 
   BuildingMaterialComponentArray.addComponent(door.id, new BuildingMaterialComponent(material));

   return door;
}