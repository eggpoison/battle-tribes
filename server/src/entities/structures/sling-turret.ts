import { EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { ServerComponentType } from "battletribes-shared/components";
import { StructureConnectionInfo } from "battletribes-shared/structures";
import { createSlingTurretHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { EntityConfig } from "../../components";
import { AIHelperComponent } from "../../components/AIHelperComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponent } from "../../components/StructureComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { TurretComponent } from "../../components/TurretComponent";
import Tribe from "../../Tribe";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.structure
   | ServerComponentType.tribe
   | ServerComponentType.aiHelper
   | ServerComponentType.turret;

export const SLING_TURRET_SHOT_COOLDOWN_TICKS = 1.5 * Settings.TPS;
export const SLING_TURRET_RELOAD_TIME_TICKS = Math.floor(0.4 * Settings.TPS);

export function createSlingTurretConfig(tribe: Tribe, connectionInfo: StructureConnectionInfo): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent()
   transformComponent.addHitboxes(createSlingTurretHitboxes(), null);
   
   const healthComponent = new HealthComponent(25);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.bleeding);
   
   const structureComponent = new StructureComponent(connectionInfo);
   
   const tribeComponent = new TribeComponent(tribe);

   const turretComponent = new TurretComponent(SLING_TURRET_SHOT_COOLDOWN_TICKS + SLING_TURRET_RELOAD_TIME_TICKS);
   
   const aiHelperComponent = new AIHelperComponent(400);
   
   return {
      entityType: EntityType.slingTurret,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.turret]: turretComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent
      }
   };
}