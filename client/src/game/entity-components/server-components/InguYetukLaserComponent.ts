import { randFloat, Entity, ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import { playSoundOnHitbox } from "../../sound";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface InguYetukLaserComponentData {}

export interface InguYetukLaserComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.inguYetukLaser, _InguYetukLaserComponentArray> {}
}

class _InguYetukLaserComponentArray extends _ServerComponentArray<InguYetukLaserComponent, InguYetukLaserComponentData> {
   public decodeData(): InguYetukLaserComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex("entities/ingu-yetuk-laser/laser.png")
      );
      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(): InguYetukLaserComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 50;
   }

   public onSpawn(laser: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(laser);
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("lazur.mp3", 0.4, randFloat(0.8, 1.2), laser, hitbox, false);
   }
}

export const InguYetukLaserComponentArray = registerServerComponentArray(ServerComponentType.inguYetukLaser, _InguYetukLaserComponentArray, true);

export function createInguYetukLaserComponentData(): InguYetukLaserComponentData {
   return {};
}