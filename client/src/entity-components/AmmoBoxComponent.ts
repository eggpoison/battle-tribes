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

class AmmoBoxComponent extends ServerComponent {
   public ammoType: TurretAmmoType | null = null;
   public ammoRemaining = 0;

   private ammoWarningRenderPart: RenderPart | null = null;

   private updateAmmoType(ammoType: TurretAmmoType | null): void {
      if (ammoType === null) {
         this.ammoType = null;

         if (this.ammoWarningRenderPart === null) {
            const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
            
            this.ammoWarningRenderPart = new TexturedRenderPart(
               null,
               999,
               0,
               getTextureArrayIndex("entities/ballista/ammo-warning.png")
            );
            this.ammoWarningRenderPart.offset.x = rotateXAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
            this.ammoWarningRenderPart.offset.y = rotateYAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
            this.ammoWarningRenderPart.inheritParentRotation = false;
            this.entity.attachRenderThing(this.ammoWarningRenderPart);
         }

         this.ammoWarningRenderPart.opacity = (Math.sin(Board.serverTicks / 15) * 0.5 + 0.5) * 0.4 + 0.4;
         
         return;
      }

      if (this.ammoWarningRenderPart !== null) {
         this.entity.removeRenderPart(this.ammoWarningRenderPart);
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