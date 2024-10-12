import { ServerComponentType, TurretAmmoType } from "battletribes-shared/components";
import { rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import ServerComponent from "./ServerComponent";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y } from "../utils";
import Board from "../Board";
import { RenderPart } from "../render-parts/render-parts";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getEntityRenderInfo } from "../world";

class AmmoBoxComponent extends ServerComponent {
   public ammoType: TurretAmmoType | null = null;
   public ammoRemaining = 0;

   private ammoWarningRenderPart: RenderPart | null = null;

   private updateAmmoType(ammoType: TurretAmmoType | null): void {
      if (ammoType === null) {
         this.ammoType = null;

         if (this.ammoWarningRenderPart === null) {
            const transformComponent = TransformComponentArray.getComponent(this.entity.id);
            
            this.ammoWarningRenderPart = new TexturedRenderPart(
               null,
               999,
               0,
               getTextureArrayIndex("entities/ballista/ammo-warning.png")
            );
            this.ammoWarningRenderPart.offset.x = rotateXAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
            this.ammoWarningRenderPart.offset.y = rotateYAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
            this.ammoWarningRenderPart.inheritParentRotation = false;

            const renderInfo = getEntityRenderInfo(this.entity.id);
            renderInfo.attachRenderThing(this.ammoWarningRenderPart);
         }

         this.ammoWarningRenderPart.opacity = (Math.sin(Board.serverTicks / 15) * 0.5 + 0.5) * 0.4 + 0.4;
         
         return;
      }

      if (this.ammoWarningRenderPart !== null) {
         const renderInfo = getEntityRenderInfo(this.entity.id);
         renderInfo.removeRenderPart(this.ammoWarningRenderPart);
         this.ammoWarningRenderPart = null;
      }
      
      this.ammoType = ammoType;
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      const ammoType = reader.readNumber();
      const ammoRemaining = reader.readNumber();

      if (this.ammoRemaining === 0) {
         this.updateAmmoType(null);
      } else {
         this.updateAmmoType(ammoType);
      }

      this.ammoRemaining = ammoRemaining;
   }
}

export default AmmoBoxComponent;

export const AmmoBoxComponentArray = new ComponentArray<AmmoBoxComponent>(ComponentArrayType.server, ServerComponentType.ammoBox, true, {});