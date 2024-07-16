import { AMMO_INFO_RECORD, ServerComponentType, TurretComponentData } from "webgl-test-shared/dist/components";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { ComponentArray } from "./ComponentArray";
import { SLING_TURRET_RELOAD_TIME_TICKS, SLING_TURRET_SHOT_COOLDOWN_TICKS } from "../entities/structures/sling-turret";
import Board from "../Board";
import { AmmoBoxComponentArray } from "./AmmoBoxComponent";

export interface TurretComponentParams {
   readonly fireCooldownTicks: number;
}

export class TurretComponent {
   public aimDirection = 0;
   public fireCooldownTicks: number;
   public hasTarget = false;

   constructor(params: TurretComponentParams) {
      this.fireCooldownTicks = params.fireCooldownTicks;
   }
}

export const TurretComponentArray = new ComponentArray<TurretComponent>(ServerComponentType.turret, true, {
   serialise: serialise
});

const getShotCooldownTicks = (turret: EntityID): number => {
   const entityType = Board.getEntityType(turret);
   switch (entityType) {
      case EntityType.ballista: {
         const ballistaComponent = AmmoBoxComponentArray.getComponent(turret);
         return AMMO_INFO_RECORD[ballistaComponent.ammoType].shotCooldownTicks;
      }
      case EntityType.slingTurret: {
         return SLING_TURRET_SHOT_COOLDOWN_TICKS;
      }
   }

   // @Robustness
   throw new Error("Unknown turret type " + entityType);
}

const getReloadTimeTicks = (turret: EntityID): number => {
   const entityType = Board.getEntityType(turret);
   switch (entityType) {
      case EntityType.ballista: {
         const ballistaComponent = AmmoBoxComponentArray.getComponent(turret);
         return AMMO_INFO_RECORD[ballistaComponent.ammoType].reloadTimeTicks;
      }
      case EntityType.slingTurret: {
         return SLING_TURRET_RELOAD_TIME_TICKS;
      }
   }

   // @Robustness
   throw new Error("Unknown turret type " + entityType);
}

const getChargeProgress = (turret: EntityID): number => {
   // @Incomplete?
   // const ballistaComponent = BallistaComponentArray.getComponent(ballista.id);
   // if (ballistaComponent.ammoRemaining === 0) {
   //    return 0;
   // }

   const shotCooldownTicks = getShotCooldownTicks(turret);
   const turretComponent = TurretComponentArray.getComponent(turret);
   
   if (turretComponent.fireCooldownTicks > shotCooldownTicks) {
      return 0;
   }

   return 1 - turretComponent.fireCooldownTicks / shotCooldownTicks;
}

const getReloadProgress = (turret: EntityID): number => {
   // @Incomplete?
   // const ballistaComponent = BallistaComponentArray.getComponent(ballista.id);
   // if (ballistaComponent.ammoRemaining === 0) {
   //    return 0;
   // }

   const shotCooldownTicks = getShotCooldownTicks(turret);
   const turretComponent = TurretComponentArray.getComponent(turret);

   // If the shot is charging, the turret has already reloaded
   if (turretComponent.fireCooldownTicks < shotCooldownTicks) {
      return 0;
   }
   
   const reloadTimeTicks = getReloadTimeTicks(turret);
   return 1 - (turretComponent.fireCooldownTicks - shotCooldownTicks) / reloadTimeTicks;
}

function serialise(entity: EntityID): TurretComponentData {
   const turretComponent = TurretComponentArray.getComponent(entity);

   return {
      componentType: ServerComponentType.turret,
      aimDirection: turretComponent.aimDirection,
      // @Speed: Both these functions call getComponent for turretComponent when we already get it in this function
      chargeProgress: getChargeProgress(entity),
      reloadProgress: getReloadProgress(entity)
   }
}