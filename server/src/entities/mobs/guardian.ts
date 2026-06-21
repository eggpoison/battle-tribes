import GuardianAI from "../../ai/GuardianAI.js";
import GuardianCrystalBurstAI from "../../ai/GuardianCrystalBurstAI.js";
import GuardianCrystalSlamAI from "../../ai/GuardianCrystalSlamAI.js";
import GuardianSpikyBallSummonAI from "../../ai/GuardianSpikyBallSummonAI.js";
import WanderAI from "../../ai/WanderAI.js";
import { EntityConfig, LightCreationInfo } from "../../components.js";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent.js";
import { getGuardianLimbOrbitRadius, GuardianComponent, GuardianComponentArray } from "../../components/GuardianComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import Layer from "../../Layer.js";
import { createHitbox, setHitboxIgnoresWallCollisions, setHitboxTag } from "../../hitboxes.js";
import { createLight } from "../../lights.js";
import { createCircularBox, HitboxCollisionType, HitboxTag } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { Entity, EntityType } from "../../../../shared/dist/entities.js";
import { TileIndex, Point } from "../../../../shared/dist/utils.js";

function tileIsValidCallback(entity: Entity, _layer: Layer, tileIndex: TileIndex): boolean {
   const guardianComponent = GuardianComponentArray.getComponent(entity);
   return guardianComponent.homeTiles.includes(tileIndex);
}

const moveFunc = () => {
   throw new Error();
}

export function createGuardianConfig(x: number, y: number, angle: number, homeTiles: readonly TileIndex[]): EntityConfig {
   const transformComponent = new TransformComponent();

   // Head
   const headHitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 40), 1.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, headHitbox);

   // Limbs
   const limbOrbitRadius = getGuardianLimbOrbitRadius();
   for (let i = 0; i < 2; i++) {
      const hitbox = createHitbox(transformComponent, headHitbox, createCircularBox(0, 0, limbOrbitRadius * (i === 0 ? 1 : -1), 0, 0, 14), 0.7, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
      setHitboxTag(hitbox, HitboxTag.guardianLimbHitbox);
      setHitboxIgnoresWallCollisions(hitbox);
      addHitboxToTransformComponent(transformComponent, hitbox);
   }
   
   const healthComponent = new HealthComponent(60);
   
   const statusEffectComponent = new StatusEffectComponent(0);
   
   const aiHelperComponent = new AIHelperComponent(headHitbox, 300, moveFunc, moveFunc);
   aiHelperComponent.ais[AIType.wander] =                  new WanderAI(200, Math.PI * 0.5, 1, 0.6, tileIsValidCallback),
   aiHelperComponent.ais[AIType.guardian] =                new GuardianAI(280, Math.PI * 0.5),
   aiHelperComponent.ais[AIType.guardianCrystalSlam] =     new GuardianCrystalSlamAI(200, Math.PI * 0.3),
   aiHelperComponent.ais[AIType.guardianCrystalBurst] =    new GuardianCrystalBurstAI(Math.PI * 0.5),
   aiHelperComponent.ais[AIType.guardianSpikyBallSummon] = new GuardianSpikyBallSummonAI(Math.PI * 0.5)
   
   const guardianComponent = new GuardianComponent(homeTiles);

   const lights: LightCreationInfo[] = [];
   
   // Red lights

   let light = createLight(new Point(0, 4.5 * 4), 0.5, 0.3, 6, 1, 0, 0.1);
   // rubyLights.push([light.intensity, light]);
   // intermediateInfo.lights.push({
   //    light: light,
   //    attachedRenderPart: headRenderPart
   // });
   lights.push({
      light: light,
      attachedHitbox: headHitbox
   });

   for (let i = 0; i < 2; i++) {
      const light = createLight(
         new Point(4.25 * 4 * (i === 0 ? 1 : -1), 3.25 * 4),
         0.4,
         0.2,
         4,
         1,
         0,
         0.1
      );
      // rubyLights.push([light.intensity, light]);
      // intermediateInfo.lights.push({
      //    light: light,
      //    attachedRenderPart: headRenderPart
      // });
      lights.push({
         light: light,
         attachedHitbox: headHitbox
      });
   }

   // Green lights

   light = createLight(
      new Point(0, -3 * 4),
      0.5,
      0.3,
      6,
      0,
      1,
      0
   );
   // emeraldLights.push([light.intensity, light]);
   // intermediateInfo.lights.push({
   //    light: light,
   //    attachedRenderPart: bodyRenderPart
   // });
   lights.push({
      light: light,
      // @Bug: should be on body hitbox
      attachedHitbox: headHitbox
   });

   // Amethyst lights
   // @Hack @Robustness: Make pixels able to glow!

   // @Temporary
   // light = {
   //    offset: new Point(0, 4 * 4),
   //    intensity: 0.35,
   //    strength: 0.2,
   //    radius: 4,
   //    r: 0.6,
   //    g: 0,
   //    b: 1
   // };
   // lightID = addLight(light);
   // attachLightToRenderPart(lightID, bodyRenderPart.id);

   light = createLight(
      new Point(5 * 4, 6.5 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   // amethystLights.push([light.intensity, light]);
   // intermediateInfo.lights.push({
   //    light: light,
   //    attachedRenderPart: bodyRenderPart
   // });
   lights.push({
      light: light,
      // @Bug: should be on body hitbox
      attachedHitbox: headHitbox
   });

   light = createLight(
      new Point(6.5 * 4, 3 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   // amethystLights.push([light.intensity, light]);
   // intermediateInfo.lights.push({
   //    light: light,
   //    attachedRenderPart: bodyRenderPart
   // });
   lights.push({
      light: light,
      // @Bug: should be on body hitbox
      attachedHitbox: headHitbox
   });

   light = createLight(
      new Point(10 * 4, 0),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   // amethystLights.push([light.intensity, light]);
   // intermediateInfo.lights.push({
   //    light: light,
   //    attachedRenderPart: bodyRenderPart
   // });
   lights.push({
      light: light,
      // @Bug: should be on body hitbox
      attachedHitbox: headHitbox
   });

   light = createLight(
      new Point(7 * 4, -5 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   // amethystLights.push([light.intensity, light]);
   // intermediateInfo.lights.push({
   //    light: light,
   //    attachedRenderPart: bodyRenderPart
   // });
   lights.push({
      light: light,
      // @Bug: should be on body hitbox
      attachedHitbox: headHitbox
   });

   light = createLight(
      new Point(3.5 * 4, -8 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   // amethystLights.push([light.intensity, light]);
   // intermediateInfo.lights.push({
   //    light: light,
   //    attachedRenderPart: bodyRenderPart
   // });
   lights.push({
      light: light,
      // @Bug: should be on body hitbox
      attachedHitbox: headHitbox
   });

   light = createLight(
      new Point(-2 * 4, -9 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   // amethystLights.push([light.intensity, light]);
   // intermediateInfo.lights.push({
   //    light: light,
   //    attachedRenderPart: bodyRenderPart
   // });
   lights.push({
      light: light,
      // @Bug: should be on body hitbox
      attachedHitbox: headHitbox
   });

   light = createLight(
      new Point(-5 * 4, -5 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   // amethystLights.push([light.intensity, light]);
   // intermediateInfo.lights.push({
   //    light: light,
   //    attachedRenderPart: bodyRenderPart
   // });
   lights.push({
      light: light,
      // @Bug: should be on body hitbox
      attachedHitbox: headHitbox
   });

   light = createLight(
      new Point(-8 * 4, -3 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   // amethystLights.push([light.intensity, light]);
   // intermediateInfo.lights.push({
   //    light: light,
   //    attachedRenderPart: bodyRenderPart
   // });
   lights.push({
      light: light,
      // @Bug: should be on body hitbox
      attachedHitbox: headHitbox
   });

   light = createLight(
      new Point(-7 * 4, 2.5 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   // amethystLights.push([light.intensity, light]);
   // intermediateInfo.lights.push({
   //    light: light,
   //    attachedRenderPart: bodyRenderPart
   // });
   lights.push({
      light: light,
      // @Bug: should be on body hitbox
      attachedHitbox: headHitbox
   });

   light = createLight(
      new Point(-8 * 4, 6 * 4),
      0.35,
      0.2,
      4,
      0.6,
      0,
      1
   );
   // amethystLights.push([light.intensity, light]);
   // intermediateInfo.lights.push({
   //    light: light,
   //    attachedRenderPart: bodyRenderPart
   // });
   lights.push({
      light: light,
      // @Bug: should be on body hitbox
      attachedHitbox: headHitbox
   });
   
   return {
      entityType: EntityType.guardian,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         aiHelperComponent,
         guardianComponent
      ],
      lights: []
   };
}