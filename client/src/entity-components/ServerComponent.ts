import { EntityID } from "../../../shared/src/entities";
import { getEntityRenderInfo } from "../world";

// @Cleanup: make components not extend this. remove this
abstract class ServerComponent {
   // @Memory
   public tintR = 0;
   public tintG = 0;
   public tintB = 0;

   public setTint(entity: EntityID, r: number, g: number, b: number): void {
      if (r !== this.tintR || g !== this.tintG || b !== this.tintB) {
         this.tintR = r;
         this.tintG = g;
         this.tintB = b;

         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.recalculateTint();
         renderInfo.dirty();
      }
   }
}

export default ServerComponent;