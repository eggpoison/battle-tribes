import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { Light, addLight, attachLightToEntity } from "../../lights";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSound } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export class GuardianSpikyBallComponent {}

export const GuardianSpikyBallComponentArray = new ServerComponentArray<GuardianSpikyBallComponent>(ServerComponentType.guardianSpikyBall, true, {
   onLoad: onLoad,
   padData: padData,
   updateFromData: updateFromData
});

function onLoad(_guardianSpikyBallComponent: GuardianSpikyBallComponent, entity: EntityID): void {
   const renderPart = new TexturedRenderPart(
      null,
      0,
      0,
      getTextureArrayIndex("entities/guardian-spiky-ball/guardian-spiky-ball.png")
   );

   const renderInfo = getEntityRenderInfo(entity);
   renderInfo.attachRenderThing(renderPart);

   const light: Light = {
      offset: new Point(0, 0),
      intensity: 0.4,
      strength: 0.3,
      radius: 20,
      r: 0.9,
      g: 0.2,
      b: 0.9
   };
   const lightID = addLight(light);
   attachLightToEntity(lightID, entity);

   const transformComponent = TransformComponentArray.getComponent(entity);
   playSound("guardian-spiky-ball-spawn.mp3", 0.4, 1, transformComponent.position);
}

function padData(): void {}

function updateFromData(): void {}