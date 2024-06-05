import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { BuildingMaterial } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import Tribe from "../../Tribe";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { DoorComponent, DoorComponentArray } from "../../components/DoorComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { PhysicsComponent, PhysicsComponentArray } from "../../components/PhysicsComponent";
import { BuildingMaterialComponent, BuildingMaterialComponentArray } from "../../components/BuildingMaterialComponent";
import { StructureComponentArray, StructureComponent } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Hitbox } from "../../hitboxes/hitboxes";

const HITBOX_WIDTH = 64 - 0.05;
const HITBOX_HEIGHT = 16 - 0.05;

export const DOOR_HEALTHS = [15, 45];

export function createDoorHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(parentPosition, 0.5, 0, 0, HitboxCollisionType.hard, localID, parentRotation, HITBOX_WIDTH, HITBOX_HEIGHT, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   return hitboxes;
}

export function createDoor(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo, material: BuildingMaterial): Entity {
   const door = new Entity(position, rotation, EntityType.door, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createDoorHitboxes(position, door.getNextHitboxLocalID(), door.rotation);
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