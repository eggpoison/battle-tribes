import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { BuildingMaterial } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import { TunnelComponent, TunnelComponentArray } from "../../components/TunnelComponent";
import { BuildingMaterialComponent, BuildingMaterialComponentArray } from "../../components/BuildingMaterialComponent";
import { StructureComponentArray, StructureComponent } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Hitbox } from "../../hitboxes/hitboxes";

const HITBOX_WIDTH = 8 - 0.05;
const HITBOX_HEIGHT = 64 - 0.05;
const THIN_HITBOX_WIDTH = 0.1;

export const TUNNEL_HEALTHS = [25, 75];

// @Incomplete: increments local id many times
export function createTunnelHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   
   // Soft hitboxes
   hitboxes.push(new RectangularHitbox(parentPosition, 1, -32 + HITBOX_WIDTH / 2, 0, HitboxCollisionType.soft, localID, parentRotation, HITBOX_WIDTH, HITBOX_HEIGHT, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   hitboxes.push(new RectangularHitbox(parentPosition, 1, 32 - HITBOX_WIDTH / 2, 0, HitboxCollisionType.soft, localID, parentRotation, HITBOX_WIDTH, HITBOX_HEIGHT, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));

   // Hard hitboxes
   // entity.addHitbox(new RectangularHitbox(entity, 1, -32 + THIN_HITBOX_WIDTH, 0, HitboxCollisionType.hard, THIN_HITBOX_WIDTH, HITBOX_HEIGHT));
   // entity.addHitbox(new RectangularHitbox(entity, 1, 32 - THIN_HITBOX_WIDTH, 0, HitboxCollisionType.hard, THIN_HITBOX_WIDTH, HITBOX_HEIGHT));
   // @Temporary
   hitboxes.push(new RectangularHitbox(parentPosition, 1, -32.5, 0, HitboxCollisionType.hard, localID, parentRotation, THIN_HITBOX_WIDTH, HITBOX_HEIGHT, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   hitboxes.push(new RectangularHitbox(parentPosition, 1, 32.5, 0, HitboxCollisionType.hard, localID, parentRotation, THIN_HITBOX_WIDTH, HITBOX_HEIGHT, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));

   return hitboxes;
}

export function createTunnel(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo, material: BuildingMaterial): Entity {
   const tunnel = new Entity(position, rotation, EntityType.tunnel, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createTunnelHitboxes(position, tunnel.getNextHitboxLocalID(), tunnel.rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      tunnel.addHitbox(hitboxes[i]);
   }
   
   HealthComponentArray.addComponent(tunnel.id, new HealthComponent(TUNNEL_HEALTHS[material]));
   StatusEffectComponentArray.addComponent(tunnel.id, new StatusEffectComponent(StatusEffect.bleeding));
   StructureComponentArray.addComponent(tunnel.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(tunnel.id, new TribeComponent(tribe));
   TunnelComponentArray.addComponent(tunnel.id, new TunnelComponent());
   BuildingMaterialComponentArray.addComponent(tunnel.id, new BuildingMaterialComponent(material));
   
   return tunnel;
}