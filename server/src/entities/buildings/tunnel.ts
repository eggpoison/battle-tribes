import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { BuildingMaterial } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { BuildingMaterialComponentArray, HealthComponentArray, TribeComponentArray, TunnelComponentArray } from "../../components/ComponentArray";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { TribeComponent } from "../../components/TribeComponent";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { TunnelComponent } from "../../components/TunnelComponent";
import { BuildingMaterialComponent } from "../../components/BuildingMaterialComponent";
import CircularHitbox from "../../hitboxes/CircularHitbox";

const HITBOX_WIDTH = 8 - 0.05;
const HITBOX_HEIGHT = 64 - 0.05;
const THIN_HITBOX_WIDTH = 0.1;

export const TUNNEL_HEALTHS = [25, 75];

// @Incomplete: increments local id many times
export function createTunnelHitboxes(parentX: number, parentY: number, localID: number, parentRotation: number): ReadonlyArray<CircularHitbox | RectangularHitbox> {
   const hitboxes = new Array<CircularHitbox | RectangularHitbox>();
   
   // Soft hitboxes
   hitboxes.push(new RectangularHitbox(parentX, parentY, 1, -32 + HITBOX_WIDTH / 2, 0, HitboxCollisionType.soft, localID, parentRotation, HITBOX_WIDTH, HITBOX_HEIGHT, 0));
   hitboxes.push(new RectangularHitbox(parentX, parentY, 1, 32 - HITBOX_WIDTH / 2, 0, HitboxCollisionType.soft, localID, parentRotation, HITBOX_WIDTH, HITBOX_HEIGHT, 0));

   // Hard hitboxes
   // entity.addHitbox(new RectangularHitbox(entity, 1, -32 + THIN_HITBOX_WIDTH, 0, HitboxCollisionType.hard, THIN_HITBOX_WIDTH, HITBOX_HEIGHT));
   // entity.addHitbox(new RectangularHitbox(entity, 1, 32 - THIN_HITBOX_WIDTH, 0, HitboxCollisionType.hard, THIN_HITBOX_WIDTH, HITBOX_HEIGHT));
   // @Temporary
   hitboxes.push(new RectangularHitbox(parentX, parentY, 1, -32.5, 0, HitboxCollisionType.hard, localID, parentRotation, THIN_HITBOX_WIDTH, HITBOX_HEIGHT, 0));
   hitboxes.push(new RectangularHitbox(parentX, parentY, 1, 32.5, 0, HitboxCollisionType.hard, localID, parentRotation, THIN_HITBOX_WIDTH, HITBOX_HEIGHT, 0));

   return hitboxes;
}

export function createTunnel(position: Point, rotation: number, tribe: Tribe, material: BuildingMaterial): Entity {
   const tunnel = new Entity(position, EntityType.tunnel, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   tunnel.rotation = rotation;

   const hitboxes = createTunnelHitboxes(tunnel.position.x, tunnel.position.y, tunnel.getNextHitboxLocalID(), tunnel.rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      tunnel.addHitbox(hitboxes[i]);
   }
   
   HealthComponentArray.addComponent(tunnel.id, new HealthComponent(TUNNEL_HEALTHS[material]));
   StatusEffectComponentArray.addComponent(tunnel.id, new StatusEffectComponent(StatusEffect.bleeding));
   TribeComponentArray.addComponent(tunnel.id, new TribeComponent(tribe));
   TunnelComponentArray.addComponent(tunnel.id, new TunnelComponent());
   BuildingMaterialComponentArray.addComponent(tunnel.id, new BuildingMaterialComponent(material));
   
   return tunnel;
}