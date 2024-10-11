import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { TRIBE_INFO_RECORD } from "battletribes-shared/tribes";
import { Point } from "battletribes-shared/utils";
import Tribe from "../../Tribe";
import { TribesmanAIComponent, TribesmanAIComponentArray } from "../../components/TribesmanAIComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { HutComponentArray } from "../../components/HutComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { entityExists } from "../../world";
import { AIHelperComponent } from "../../components/AIHelperComponent";
import { DamageBoxComponent } from "../../components/DamageBoxComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { InventoryComponent } from "../../components/InventoryComponent";
import { InventoryUseComponent } from "../../components/InventoryUseComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { TribeMemberComponent } from "../../components/TribeMemberComponent";
import { CollisionGroup } from "battletribes-shared/collision-groups";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.tribe
   | ServerComponentType.tribeMember
   | ServerComponentType.tribesmanAI
   | ServerComponentType.aiHelper
   | ServerComponentType.inventoryUse
   | ServerComponentType.inventory
   | ServerComponentType.damageBox;

export const TRIBE_WORKER_RADIUS = 28;
export const TRIBE_WORKER_VISION_RANGE = 500;

export function createTribeWorkerConfig(tribe: Tribe): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.default);
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, TRIBE_WORKER_RADIUS), 1, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.traction = 1.4;

   const tribeInfo = TRIBE_INFO_RECORD[tribe.tribeType];
   const healthComponent = new HealthComponent(tribeInfo.maxHealthWorker);

   const statusEffectComponent = new StatusEffectComponent(0);

   const tribeComponent = new TribeComponent(tribe);

   const tribeMemberComponent = new TribeMemberComponent();

   const tribesmanAIComponent = new TribesmanAIComponent();

   const aiHelperComponent = new AIHelperComponent(TRIBE_WORKER_VISION_RANGE);
   
   const inventoryComponent = new InventoryComponent();

   const inventoryUseComponent = new InventoryUseComponent();

   const damageBoxComponent = new DamageBoxComponent();

   return {
      entityType: EntityType.tribeWorker,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.tribeMember]: tribeMemberComponent,
         [ServerComponentType.tribesmanAI]: tribesmanAIComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.inventory]: inventoryComponent,
         [ServerComponentType.inventoryUse]: inventoryUseComponent,
         [ServerComponentType.damageBox]: damageBoxComponent
      }
   };
}

// @Cleanup: copy and paste
export function onTribeWorkerDeath(worker: EntityID): void {
   // 
   // Attempt to respawn the tribesman when it is killed
   // 
   
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(worker);

   // Only respawn the tribesman if their hut is alive
   if (!entityExists(tribesmanComponent.hut)) {
      return;
   }
   
   const hutComponent = HutComponentArray.getComponent(tribesmanComponent.hut);
   if (hutComponent.isRecalling) {
      hutComponent.hasSpawnedTribesman = false;
   } else {
      const tribeComponent = TribeComponentArray.getComponent(worker);
      tribeComponent.tribe.respawnTribesman(tribesmanComponent.hut);
   }
}