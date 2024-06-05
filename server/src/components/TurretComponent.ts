import { AMMO_INFO_RECORD, ServerComponentType, TurretComponentData } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import Entity from "../Entity";
import { ComponentArray } from "./ComponentArray";
import { SLING_TURRET_RELOAD_TIME_TICKS, SLING_TURRET_SHOT_COOLDOWN_TICKS } from "../entities/structures/sling-turret";
import Board from "../Board";
import { AmmoBoxComponentArray } from "./AmmoBoxComponent";

export class TurretComponent {
   public aimDirection = 0;
   public fireCooldownTicks: number;
   public hasTarget = false;

   constructor(fireCooldownTicks: number) {
      this.fireCooldownTicks = fireCooldownTicks;
   }
}

export const TurretComponentArray = new ComponentArray<ServerComponentType.turret, TurretComponent>(true, {
   serialise: serialise
});

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

const getReloadProgress = (turret: Entity): number => {
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

function serialise(entityID: number): TurretComponentData {
   const turretComponent = TurretComponentArray.getComponent(entityID);

   // @Hack
   const turret = Board.entityRecord[entityID]!;
   
   return {
      componentType: ServerComponentType.turret,
      aimDirection: turretComponent.aimDirection,
      // @Speed: Both these functions call getComponent for turretComponent when we already get it in this function
      chargeProgress: getChargeProgress(turret),
      reloadProgress: getReloadProgress(turret)
   }
}