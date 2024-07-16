import { EntityType } from "webgl-test-shared/dist/entities";
import { ServerComponentType, TurretComponentData } from "webgl-test-shared/dist/components";
import { lerp } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import ServerComponent from "./ServerComponent";
import { playSound } from "../sound";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { BallistaAmmoType, ItemType } from "webgl-test-shared/dist/items/items";
import { RenderPart } from "../render-parts/render-parts";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

type TurretType = EntityType.slingTurret | EntityType.ballista;

const NUM_SLING_TURRET_CHARGE_TEXTURES = 5;
const NUM_BALLISTA_CHARGE_TEXTURES = 11;

interface AmmoRenderInfo {
   readonly projectileTextureSource: string;
   readonly drawOffset: number;
}

const AMMO_RENDER_INFO_RECORD: Record<BallistaAmmoType, AmmoRenderInfo> = {
   [ItemType.wood]: {
      projectileTextureSource: "projectiles/wooden-bolt.png",
      drawOffset: 0
   },
   [ItemType.rock]: {
      projectileTextureSource: "projectiles/ballista-rock.png",
      drawOffset: -20
   },
   [ItemType.frostcicle]: {
      projectileTextureSource: "projectiles/ballista-frostcicle.png",
      drawOffset: -10
   },
   [ItemType.slimeball]: {
      projectileTextureSource: "projectiles/ballista-slimeball.png",
      drawOffset: -20
   }
};

const getSlingTurretChargeTextureSource = (chargeProgress: number): string => {
   let textureIdx = Math.floor(chargeProgress * NUM_SLING_TURRET_CHARGE_TEXTURES);
   if (textureIdx >= NUM_SLING_TURRET_CHARGE_TEXTURES) {
      textureIdx = NUM_SLING_TURRET_CHARGE_TEXTURES - 1;
   }

   if (textureIdx === 0) {
      return "entities/sling-turret/sling-turret-sling.png";
   }
   return "entities/sling-turret/sling-charge-" + textureIdx + ".png";
}

const getBallistaCrossbarTextureSource = (chargeProgress: number): string => {
   let textureIdx = Math.floor(chargeProgress * NUM_BALLISTA_CHARGE_TEXTURES);
   if (textureIdx >= NUM_BALLISTA_CHARGE_TEXTURES) {
      textureIdx = NUM_BALLISTA_CHARGE_TEXTURES - 1;
   }
   return "entities/ballista/crossbow-" + (textureIdx + 1) + ".png";
}

const getChargeTextureSource = (entityType: TurretType, chargeProgress: number): string => {
   switch (entityType) {
      case EntityType.slingTurret: return getSlingTurretChargeTextureSource(chargeProgress);
      case EntityType.ballista: return getBallistaCrossbarTextureSource(chargeProgress);
   }
}

const getProjectilePullbackAmount = (entity: Entity, chargeProgress: number): number => {
   switch (entity.type as TurretType) {
      case EntityType.slingTurret: {
         return lerp(0, -21, chargeProgress);
      }
      case EntityType.ballista: {
         const turretComponent = entity.getServerComponent(ServerComponentType.ammoBox);
         const ammoRenderInfo = AMMO_RENDER_INFO_RECORD[turretComponent.ammoType!];
         return lerp(48, 0, chargeProgress) + ammoRenderInfo.drawOffset;
      }
   }
}

const playFireSound = (entity: Entity): void => {
   const transformComponent = entity.getServerComponent(ServerComponentType.transform);
   
   switch (entity.type as TurretType) {
      case EntityType.slingTurret: {
         playSound("sling-turret-fire.mp3", 0.2, 1, transformComponent.position);
         break;
      }
      case EntityType.ballista: {
         playSound("sling-turret-fire.mp3", 0.25, 0.7, transformComponent.position);
         break;
      }
   }
}

const getProjectileTextureSource = (entity: Entity): string => {
   switch (entity.type as TurretType) {
      case EntityType.slingTurret: {
         return "projectiles/sling-rock.png";
      }
      case EntityType.ballista: {
         const ammoBoxComponent = entity.getServerComponent(ServerComponentType.ammoBox);
         const ammoRenderInfo = AMMO_RENDER_INFO_RECORD[ammoBoxComponent.ammoType!];
         return ammoRenderInfo.projectileTextureSource;
      }
   }
}

const getProjectileZIndex = (entityType: TurretType): number => {
   switch (entityType) {
      case EntityType.slingTurret: return 1.5;
      case EntityType.ballista: return 4;
   }
}

class TurretComponent extends ServerComponent<ServerComponentType.turret> {
   /** The render part which changes texture as the turret charges */
   private readonly aimingRenderPart: TexturedRenderPart;
   /** The render part which pivots as the turret aims */
   private readonly pivotingRenderPart: RenderPart;
   private readonly gearRenderParts: ReadonlyArray<RenderPart>;
   private projectileRenderPart: TexturedRenderPart | null = null;
   
   // @Cleanup: Do we need to store this?
   private chargeProgress: number;
   
   constructor(entity: Entity, data: TurretComponentData) {
      super(entity);

      this.chargeProgress = data.chargeProgress;

      this.aimingRenderPart = this.entity.getRenderPart("turretComponent:aiming") as TexturedRenderPart;
      this.pivotingRenderPart = this.entity.getRenderPart("turretComponent:pivoting");
      this.gearRenderParts = this.entity.getRenderParts("turretComponent:gear");

      this.updateAimDirection(data.aimDirection, data.chargeProgress);
   }

   private updateAimDirection(aimDirection: number, chargeProgress: number): void {
      this.pivotingRenderPart.rotation = aimDirection;

      for (let i = 0; i < this.gearRenderParts.length; i++) {
         const gearRenderPart = this.gearRenderParts[i];
         gearRenderPart.rotation = lerp(0, Math.PI * 2, chargeProgress) * (i === 0 ? 1 : -1);
      }
   }

   private shouldShowProjectile(chargeProgress: number, reloadProgress: number): boolean {
      switch (this.entity.type) {
         case EntityType.ballista: {
            const ammoBoxComponent = this.entity.getServerComponent(ServerComponentType.ammoBox);
            return ammoBoxComponent.ammoType !== null;
         }
         case EntityType.slingTurret: {
            return chargeProgress > 0 || reloadProgress > 0;
         }
         default: throw new Error();
      }
   }

   private projectileHasRandomRotation(): boolean {
      switch (this.entity.type) {
         case EntityType.ballista: {
            const ammoBoxComponent = this.entity.getServerComponent(ServerComponentType.ammoBox);
            return ammoBoxComponent.ammoType === ItemType.rock || ammoBoxComponent.ammoType === ItemType.slimeball;
         }
         case EntityType.slingTurret: {
            return true;
         }
         default: throw new Error();
      }
   }

   private updateProjectileRenderPart(chargeProgress: number, reloadProgress: number): void {
      if (this.shouldShowProjectile(chargeProgress, reloadProgress)) {
         const textureSource = getProjectileTextureSource(this.entity);
         if (this.projectileRenderPart === null) {
            this.projectileRenderPart = new TexturedRenderPart(
               this.pivotingRenderPart,
               getProjectileZIndex(this.entity.type as TurretType),
               0,
               getTextureArrayIndex(textureSource)
            );

            if (this.projectileHasRandomRotation()) {
               this.projectileRenderPart.rotation = 2 * Math.PI * Math.random();
            }

            this.entity.attachRenderPart(this.projectileRenderPart);
         } else {
            this.projectileRenderPart.switchTextureSource(textureSource);
         }
      
         this.projectileRenderPart.offset.y = getProjectilePullbackAmount(this.entity, chargeProgress);

         if (reloadProgress > 0) {
            this.projectileRenderPart.opacity = reloadProgress;
         } else {
            this.projectileRenderPart.opacity = 1;
         }
      } else if (this.projectileRenderPart !== null) {
         this.entity.removeRenderPart(this.projectileRenderPart);
         this.projectileRenderPart = null;
      }
   }
   
   public updateFromData(data: TurretComponentData): void {
      const aimDirection = data.aimDirection;
      const chargeProgress = data.chargeProgress;
      const reloadProgress = data.reloadProgress;
      
      if (chargeProgress < this.chargeProgress) {
         playFireSound(this.entity);
      }
      this.chargeProgress = chargeProgress;

      this.aimingRenderPart.switchTextureSource(getChargeTextureSource(this.entity.type as TurretType, chargeProgress));
      
      this.updateAimDirection(aimDirection, chargeProgress);
      this.updateProjectileRenderPart(chargeProgress, reloadProgress);
   }
}

export default TurretComponent;