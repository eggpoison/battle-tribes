import { randFloat, Entity, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface DustfleaComponentData {}

export interface DustfleaComponent {}

class _DustfleaComponentArray extends ServerComponentArray<DustfleaComponent, DustfleaComponentData> {
   public decodeData(): DustfleaComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("entities/dustflea/dustflea.png")
         )
      );
   }

   public createComponent(): DustfleaComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
      
   public onHit(dustflea: Entity, hitbox: Hitbox): void {
      playSoundOnHitbox("dustflea-hit.mp3", 0.4, randFloat(0.9, 1.1), dustflea, hitbox, false);
   }

   public onDie(dustflea: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(dustflea);
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("dustflea-explosion.mp3", 0.4, randFloat(0.9, 1.1), dustflea, hitbox, false);
   }
}

export const DustfleaComponentArray = registerServerComponentArray(ServerComponentType.dustflea, _DustfleaComponentArray, true);