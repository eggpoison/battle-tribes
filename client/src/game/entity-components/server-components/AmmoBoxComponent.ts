import { ServerComponentType, TurretAmmoType } from "battletribes-shared/components";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData, getEntityRenderInfo } from "../../world";
import { Entity } from "../../../../../shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";
import { VisualRenderPart } from "../../render-parts/render-parts";
import { Hitbox } from "../../hitboxes";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { currentSnapshot } from "../../client";

export interface AmmoBoxComponentData {
   readonly ammoType: TurretAmmoType | null;
   readonly ammoRemaining: number;
}

interface IntermediateInfo {
   readonly ammoWarningRenderPart: VisualRenderPart | null;
}

export interface AmmoBoxComponent {
   ammoType: TurretAmmoType | null;
   ammoRemaining: number;

   ammoWarningRenderPart: VisualRenderPart | null;
}

const createAmmoWarningRenderPart = (parentHitbox: Hitbox): VisualRenderPart => {
   const renderPart = new TexturedRenderPart(
      parentHitbox,
      999,
      0,
      getTextureArrayIndex("entities/ballista/ammo-warning.png")
   );
   // @Incomplete? What is this supposed to be doing and does it achieve it?
   // I think it's just supposed to be going over the ammo box but without copying its rotation
   // renderPart.offset.x = rotateXAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
   // renderPart.offset.y = rotateYAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
   renderPart.inheritParentRotation = false;

   return renderPart;
}

export const AmmoBoxComponentArray = new ServerComponentArray<AmmoBoxComponent, AmmoBoxComponentData, IntermediateInfo>(ServerComponentType.ammoBox, true, createComponent, getMaxRenderParts, decodeData);
AmmoBoxComponentArray.populateIntermediateInfo = createIntermediateInfo;
AmmoBoxComponentArray.updateFromData = updateFromData;

export function createAmmoBoxComponentData(): AmmoBoxComponentData {
   return {
      ammoType: null,
      ammoRemaining: 0
   };
}

function decodeData(reader: PacketReader): AmmoBoxComponentData {
   const ammoType = reader.readNumber();
   const ammoRemaining = reader.readNumber();
   return {
      ammoType: ammoType,
      ammoRemaining: ammoRemaining
   };
}

function createIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   let ammoWarningRenderPart: VisualRenderPart | null;
   if (entityComponentData.serverComponentData[ServerComponentType.ammoBox]!.ammoType === null) {
      const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
      const hitbox = transformComponentData.hitboxes[0];
      
      ammoWarningRenderPart = createAmmoWarningRenderPart(hitbox);
      renderInfo.attachRenderPart(ammoWarningRenderPart);
   } else {
      ammoWarningRenderPart = null;
   }
   
   return {
      ammoWarningRenderPart: ammoWarningRenderPart
   };
}

function createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): AmmoBoxComponent {
   const ammoBoxComponentData = entityComponentData.serverComponentData[ServerComponentType.ammoBox]!;
   
   return {
      ammoType: ammoBoxComponentData.ammoType,
      ammoRemaining: ammoBoxComponentData.ammoRemaining,
      ammoWarningRenderPart: intermediateInfo.ammoWarningRenderPart
   };
}

function getMaxRenderParts(): number {
   return 1;
}

const updateAmmoType = (ammoBoxComponent: AmmoBoxComponent, entity: Entity, ammoType: TurretAmmoType | null): void => {
   if (ammoType === null) {
      ammoBoxComponent.ammoType = null;

      if (ammoBoxComponent.ammoWarningRenderPart === null) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         const hitbox = transformComponent.hitboxes[0];
         
         ammoBoxComponent.ammoWarningRenderPart = new TexturedRenderPart(
            hitbox,
            999,
            0,
            getTextureArrayIndex("entities/ballista/ammo-warning.png")
         );
         // @Temporary @Incomplete
         // ammoBoxComponent.ammoWarningRenderPart.offset.x = rotateXAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
         // ammoBoxComponent.ammoWarningRenderPart.offset.y = rotateYAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
         ammoBoxComponent.ammoWarningRenderPart.inheritParentRotation = false;

         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.attachRenderPart(ammoBoxComponent.ammoWarningRenderPart);
      }

      ammoBoxComponent.ammoWarningRenderPart.opacity = (Math.sin(currentSnapshot.tick / 15) * 0.5 + 0.5) * 0.4 + 0.4;
      
      return;
   }

   if (ammoBoxComponent.ammoWarningRenderPart !== null) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.removeRenderPart(ammoBoxComponent.ammoWarningRenderPart);
      ammoBoxComponent.ammoWarningRenderPart = null;
   }
   
   ammoBoxComponent.ammoType = ammoType;
}

function updateFromData(data: AmmoBoxComponentData, entity: Entity): void {
   const ammoBoxComponent = AmmoBoxComponentArray.getComponent(entity);
   updateAmmoType(ammoBoxComponent, entity, ammoBoxComponent.ammoRemaining > 0 ? data.ammoType : null);
   ammoBoxComponent.ammoRemaining = data.ammoRemaining;
}