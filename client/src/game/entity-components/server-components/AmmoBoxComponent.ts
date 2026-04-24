import { PacketReader, Entity, ServerComponentType, TurretAmmoType } from "webgl-test-shared";
import { getTextureArrayIndex } from "../../texture-atlases";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData, getEntityRenderObject } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
import { VisualRenderPart } from "../../render-parts/render-parts";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { currentSnapshot } from "../../networking/snapshots";
import { registerServerComponentArray } from "../component-registry";

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

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.ammoBox, _AmmoBoxComponentArray> {}
}

const createAmmoWarningRenderPart = (parentHitbox: Hitbox): VisualRenderPart => {
   const renderPart = new TexturedRenderPart(
      parentHitbox,
      999,
      0,
      0, 0,
      getTextureArrayIndex("entities/ballista/ammo-warning.png")
   );
   // @Incomplete? What is this supposed to be doing and does it achieve it?
   // I think it's just supposed to be going over the ammo box but without copying its rotation
   // renderPart.offset.x = rotateXAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
   // renderPart.offset.y = rotateYAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
   renderPart.inheritParentRotation = false;

   return renderPart;
}

class _AmmoBoxComponentArray extends _ServerComponentArray<AmmoBoxComponent, AmmoBoxComponentData, IntermediateInfo> {
   public decodeData(reader: PacketReader): AmmoBoxComponentData {
      const ammoType = reader.readNumber();
      const ammoRemaining = reader.readNumber();
      return {
         ammoType: ammoType,
         ammoRemaining: ammoRemaining
      };
   }

   public createIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const ammoBoxComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.ammoBox);

      let ammoWarningRenderPart: VisualRenderPart | null;
      if (ammoBoxComponentData.ammoType === null) {
         const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
         const hitbox = transformComponentData.hitboxes[0];
         
         ammoWarningRenderPart = createAmmoWarningRenderPart(hitbox);
         renderObject.attachRenderPart(ammoWarningRenderPart);
      } else {
         ammoWarningRenderPart = null;
      }
      
      return {
         ammoWarningRenderPart: ammoWarningRenderPart
      };
   }

   public createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): AmmoBoxComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const ammoBoxComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.ammoBox);
      
      return {
         ammoType: ammoBoxComponentData.ammoType,
         ammoRemaining: ammoBoxComponentData.ammoRemaining,
         ammoWarningRenderPart: intermediateInfo.ammoWarningRenderPart
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public updateFromData(data: AmmoBoxComponentData, entity: Entity): void {
      const ammoBoxComponent = AmmoBoxComponentArray.getComponent(entity);
      updateAmmoType(ammoBoxComponent, entity, ammoBoxComponent.ammoRemaining > 0 ? data.ammoType : null);
      ammoBoxComponent.ammoRemaining = data.ammoRemaining;
   }
}

export const AmmoBoxComponentArray = registerServerComponentArray(ServerComponentType.ammoBox, _AmmoBoxComponentArray, true);

export function createAmmoBoxComponentData(): AmmoBoxComponentData {
   return {
      ammoType: null,
      ammoRemaining: 0
   };
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
            0, 0,
            getTextureArrayIndex("entities/ballista/ammo-warning.png")
         );
         // @Temporary @Incomplete
         // ammoBoxComponent.ammoWarningRenderPart.offset.x = rotateXAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
         // ammoBoxComponent.ammoWarningRenderPart.offset.y = rotateYAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
         ammoBoxComponent.ammoWarningRenderPart.inheritParentRotation = false;

         const renderObject = getEntityRenderObject(entity);
         renderObject.attachRenderPart(ammoBoxComponent.ammoWarningRenderPart);
      }

      ammoBoxComponent.ammoWarningRenderPart.opacity = (Math.sin(currentSnapshot.tick / 15) * 0.5 + 0.5) * 0.4 + 0.4;
      
      return;
   }

   if (ammoBoxComponent.ammoWarningRenderPart !== null) {
      const renderObject = getEntityRenderObject(entity);
      renderObject.removeRenderPart(ammoBoxComponent.ammoWarningRenderPart);
      ammoBoxComponent.ammoWarningRenderPart = null;
   }
   
   ammoBoxComponent.ammoType = ammoType;
}