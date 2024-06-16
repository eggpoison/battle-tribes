import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { BuildingMaterial } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { TunnelComponent, TunnelComponentArray } from "../../components/TunnelComponent";
import { BuildingMaterialComponent, BuildingMaterialComponentArray } from "../../components/BuildingMaterialComponent";
import { StructureComponentArray, StructureComponent } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { createTunnelHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";

export const TUNNEL_HEALTHS = [25, 75];

export function createTunnel(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo, material: BuildingMaterial): Entity {
   const tunnel = new Entity(position, rotation, EntityType.tunnel, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createTunnelHitboxes(tunnel.getNextHitboxLocalID());
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