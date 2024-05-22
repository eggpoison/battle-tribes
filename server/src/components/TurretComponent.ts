import { AMMO_INFO_RECORD, TurretComponentData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import { AmmoBoxComponentArray, TurretComponentArray } from "./ComponentArray";
import { SLING_TURRET_RELOAD_TIME_TICKS, SLING_TURRET_SHOT_COOLDOWN_TICKS } from "../entities/structures/sling-turret";

export class TurretComponent {
   public aimDirection = 0;
   public fireCooldownTicks: number;
   public hasTarget = false;

   constructor(fireCooldownTicks: number) {
      this.fireCooldownTicks = fireCooldownTicks;
   }
}

const getShotCooldownTicks = (turret: Entity): number => {
   switch (turret.type) {
      case EntityType.ballista: {
         const ballistaComponent = AmmoBoxComponentArray.getComponent(turret.id);
         return AMMO_INFO_RECORD[ballistaComponent.ammoType].shotCooldownTicks;
      }
      case EntityType.slingTurret: {
         return SLING_TURRET_SHOT_COOLDOWN_TICKS;
      }
   }

   throw new Error("Unknown turret type " + turret.type);
}

const getReloadTimeTicks = (turret: Entity): number => {
   switch (turret.type) {
      case EntityType.ballista: {
         const ballistaComponent = AmmoBoxComponentArray.getComponent(turret.id);
         return AMMO_INFO_RECORD[ballistaComponent.ammoType].reloadTimeTicks;
      }
      case EntityType.slingTurret: {
         return SLING_TURRET_RELOAD_TIME_TICKS;
      }
   }

   throw new Error("Unknown turret type " + turret.type);
}

const getChargeProgress = (turret: Entity): number => {
   // @Incomplete?
   // const ballistaComponent = BallistaComponentArray.getComponent(ballista.id);
   // if (ballistaComponent.ammoRemaining === 0) {
   //    return 0;
   // }

   const shotCooldownTicks = getShotCooldownTicks(turret);
   const turretComponent = TurretComponentArray.getComponent(turret.id);
   
   if (turretComponent.fireCooldownTicks > shotCooldownTicks) {
      return 0;
   }

   return 1 - turretComponent.fireCooldownTicks / shotCooldownTicks;
}

export function getReloadProgress(turret: Entity): number {
   // @Incomplete?
   // const ballistaComponent = BallistaComponentArray.getComponent(ballista.id);
   // if (ballistaComponent.ammoRemaining === 0) {
   //    return 0;
   // }

   const shotCooldownTicks = getShotCooldownTicks(turret);
   const turretComponent = TurretComponentArray.getComponent(turret.id);

   // If the shot is charging, the turret has already reloaded
   if (turretComponent.fireCooldownTicks < shotCooldownTicks) {
      return 0;
   }
   
   const reloadTimeTicks = getReloadTimeTicks(turret);
   return 1 - (turretComponent.fireCooldownTicks - shotCooldownTicks) / reloadTimeTicks;
}

export function serialiseTurretComponent(turret: Entity): TurretComponentData {
   const turretComponent = TurretComponentArray.getComponent(turret.id);
   return {
      aimDirection: turretComponent.aimDirection,
      // @Speed: Both these functions call getComponent for turretComponent when we already get it in this function
      chargeProgress: getChargeProgress(turret),
      reloadProgress: getReloadProgress(turret)
   }
}