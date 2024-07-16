import { EntityType } from "webgl-test-shared/dist/entities";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import Entity from "../Entity";
import Board from "../Board";
import { attachSoundToEntity, playSound } from "../sound";
import { ServerComponentType } from "webgl-test-shared/dist/components";

class BattleaxeProjectile extends Entity {
   constructor(id: number) {
      super(id, EntityType.battleaxeProjectile);

      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex("items/large/stone-battleaxe.png"),
            0,
            0
         )
      );

      this.playWhoosh();
   }

   public tick(): void {
      super.tick();

      if (Board.tickIntervalHasPassed(0.25)) {
         this.playWhoosh();
      }
   }

   private playWhoosh(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      
      const soundInfo = playSound("air-whoosh.mp3", 0.25, 1, transformComponent.position);
      attachSoundToEntity(soundInfo.sound, this);
   }
}

export default BattleaxeProjectile;