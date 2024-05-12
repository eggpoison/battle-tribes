import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { BuildingMaterial } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { BuildingMaterialComponentArray, DoorComponentArray, HealthComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import Tribe from "../../Tribe";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { DoorComponent } from "../../components/DoorComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { PhysicsComponent, PhysicsComponentArray } from "../../components/PhysicsComponent";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent";
import CircularHitbox from "../../hitboxes/CircularHitbox";

const HITBOX_WIDTH = 64 - 0.05;
const HITBOX_HEIGHT = 16 - 0.05;

export const DOOR_HEALTHS = [15, 45];

export function createDoorHitboxes(parentX: number, parentY: number, localID: number, parentRotation: number): ReadonlyArray<CircularHitbox | RectangularHitbox> {
   const hitboxes = new Array<CircularHitbox | RectangularHitbox>();
   hitboxes.push(new RectangularHitbox(parentX, parentY, 0.5, 0, 0, HitboxCollisionType.hard, localID, parentRotation, HITBOX_WIDTH, HITBOX_HEIGHT, 0));
   return hitboxes;
}

export function createDoor(position: Point, rotation: number, tribe: Tribe, material: BuildingMaterial): Entity {
   const door = new Entity(position, EntityType.door, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   door.rotation = rotation;

   const hitboxes = createDoorHitboxes(door.position.x, door.position.y, door.getNextHitboxLocalID(), door.rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      door.addHitbox(hitboxes[i]);
   }
   
   PhysicsComponentArray.addComponent(door.id, new PhysicsComponent(false, true));
   HealthComponentArray.addComponent(door.id, new HealthComponent(DOOR_HEALTHS[material]));
   StatusEffectComponentArray.addComponent(door.id, new StatusEffectComponent(0));
   DoorComponentArray.addComponent(door.id, new DoorComponent(position.x, position.y, rotation));
   TribeComponentArray.addComponent(door.id, new TribeComponent(tribe)); 
   BuildingMaterialComponentArray.addComponent(door.id, new BuildingMaterialComponent(material));

   return door;
}