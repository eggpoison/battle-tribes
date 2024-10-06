import { createHitbox, HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "../../../../shared/src/collision";
import { CollisionGroup } from "../../../../shared/src/collision-groups";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID, EntityType } from "../../../../shared/src/entities";
import { Point, TileIndex } from "../../../../shared/src/utils";
import GuardianAI from "../../ai/GuardianAI";
import GuardianCrystalBurstAI from "../../ai/GuardianCrystalBurstAI";
import GuardianCrystalSlamAI from "../../ai/GuardianCrystalSlamAI";
import GuardianSpikyBallSummonAI from "../../ai/GuardianSpikyBallSummonAI";
import WanderAI from "../../ai/WanderAI";
import { EntityConfig } from "../../components";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { getGuardianLimbOrbitRadius, GuardianComponent, GuardianComponentArray } from "../../components/GuardianComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TransformComponent } from "../../components/TransformComponent";
import Layer from "../../Layer";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.guardian;

function tileIsValidCallback(entity: EntityID, _layer: Layer, tileIndex: TileIndex): boolean {
   const guardianComponent = GuardianComponentArray.getComponent(entity);
   return guardianComponent.homeTiles.includes(tileIndex);
}

export function createGuardianConfig(homeTiles: ReadonlyArray<TileIndex>): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.default);

   // Head
   transformComponent.addHitbox(createHitbox(new CircularBox(new Point(0, 0), 0, 40), 1.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []), null);

   // Limbs
   const limbOrbitRadius = getGuardianLimbOrbitRadius();
   for (let i = 0; i < 2; i++) {
      transformComponent.addHitbox(createHitbox(new CircularBox(new Point(limbOrbitRadius * (i === 0 ? 1 : -1), 0), 0, 14), 0.7, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [HitboxFlag.GUARDIAN_LIMB_HITBOX]), null);
   }
   
   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(60);
   
   const statusEffectComponent = new StatusEffectComponent(0);
   
   const aiHelperComponent = new AIHelperComponent(300);
   aiHelperComponent.ais[AIType.wander] =                  new WanderAI(200, Math.PI * 0.5, 0.6, tileIsValidCallback),
   aiHelperComponent.ais[AIType.guardian] =                new GuardianAI(280, Math.PI * 0.5),
   aiHelperComponent.ais[AIType.guardianCrystalSlam] =     new GuardianCrystalSlamAI(200, Math.PI * 0.3),
   aiHelperComponent.ais[AIType.guardianCrystalBurst] =    new GuardianCrystalBurstAI(Math.PI * 0.5),
   aiHelperComponent.ais[AIType.guardianSpikyBallSummon] = new GuardianSpikyBallSummonAI()
   
   const guardianComponent = new GuardianComponent(homeTiles);
   
   return {
      entityType: EntityType.guardian,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.guardian]: guardianComponent
      }
   };
}