import { AmmoBoxComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { rotateXAroundOrigin, rotateYAroundOrigin } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y } from "../utils";
import Board from "../Board";
import { BallistaAmmoType } from "webgl-test-shared/dist/items/items";
import { RenderPart } from "../render-parts/render-parts";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

class AmmoBoxComponent extends ServerComponent<ServerComponentType.ammoBox> {
   public ammoType: BallistaAmmoType | null;
   public ammoRemaining: number;

   private ammoWarningRenderPart: RenderPart | null = null;
   
   constructor(entity: Entity, data: AmmoBoxComponentData) {
      super(entity);

      this.ammoType = data.ammoRemaining > 0 ? data.ammoType : null;
      this.ammoRemaining = data.ammoRemaining;
   }

   private updateAmmoType(ammoType: BallistaAmmoType | null): void {
      if (ammoType === null) {
         this.ammoType = null;

         if (this.ammoWarningRenderPart === null) {
            const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
            
            this.ammoWarningRenderPart = new TexturedRenderPart(
               this.entity,
               999,
               0,
               getTextureArrayIndex("entities/ballista/ammo-warning.png")
            );
            this.ammoWarningRenderPart.offset.x = rotateXAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
            this.ammoWarningRenderPart.offset.y = rotateYAroundOrigin(BALLISTA_AMMO_BOX_OFFSET_X, BALLISTA_AMMO_BOX_OFFSET_Y, transformComponent.rotation);
            this.ammoWarningRenderPart.inheritParentRotation = false;
            this.entity.attachRenderPart(this.ammoWarningRenderPart);
         }

         this.ammoWarningRenderPart.opacity = (Math.sin(Board.ticks / 15) * 0.5 + 0.5) * 0.4 + 0.4;
         
         return;
      }

      if (this.ammoWarningRenderPart !== null) {
         this.entity.removeRenderPart(this.ammoWarningRenderPart);
         this.ammoWarningRenderPart = null;
      }
      
      this.ammoType = ammoType;
   }

   public updateFromData(data: AmmoBoxComponentData): void {
      const ammoType = data.ammoType;
      this.ammoRemaining = data.ammoRemaining;
      if (this.ammoRemaining === 0) {
         this.updateAmmoType(null);
      } else {
         this.updateAmmoType(ammoType);
      }
   }
}

export default AmmoBoxComponent;