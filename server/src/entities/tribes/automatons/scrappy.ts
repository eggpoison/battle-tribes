import { EntityConfig } from "../../../components.js";
import { AIAssignmentComponent } from "../../../components/AIAssignmentComponent.js";
import { AIHelperComponent, AIType } from "../../../components/AIHelperComponent.js";
import { HealthComponent } from "../../../components/HealthComponent.js";
import { InventoryComponent } from "../../../components/InventoryComponent.js";
import { InventoryUseComponent } from "../../../components/InventoryUseComponent.js";
import { PatrolAI } from "../../../ai/PatrolAI.js";
import { ScrappyComponent } from "../../../components/ScrappyComponent.js";
import { StatusEffectComponent } from "../../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../../components/TransformComponent.js";
import { TribeComponent } from "../../../components/TribeComponent.js";
import { TribeMemberComponent } from "../../../components/TribeMemberComponent.js";
import { TribesmanAIComponent } from "../../../components/TribesmanAIComponent.js";
import { createHitbox } from "../../../hitboxes.js";
import { addHumanoidInventories } from "../../../inventories.js";
import Tribe from "../../../Tribe.js";
import { generateScrappyName } from "../../../tribesman-names.js";
import { AIPathfindingComponent } from "../../../components/AIPathfindingComponent.js";
import { createCircularBox, HitboxCollisionType } from "../../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../../shared/dist/collision.js";
import { EntityType } from "../../../../../shared/dist/entities.js";

const moveFunc = () => {
   throw new Error();
}

const turnFunc = () => {
   throw new Error();
}

export function createScrappyConfig(x: number, y: number, angle: number, tribe: Tribe): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.traction = 1.4;

   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 20), 0.75, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(10);

   const statusEffectComponent = new StatusEffectComponent(0);

   const tribeComponent = new TribeComponent(tribe);

   const tribeMemberComponent = new TribeMemberComponent(generateScrappyName(tribe));

   const tribesmanAIComponent = new TribesmanAIComponent();
   
   const aiHelperComponent = new AIHelperComponent(transformComponent.hitboxes[0], 300, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.patrol] = new PatrolAI();
   
   const aiPathfindingComponent = new AIPathfindingComponent();

   const aiAssignmentComponent = new AIAssignmentComponent();

   const inventoryComponent = new InventoryComponent();

   const inventoryUseComponent = new InventoryUseComponent();

   addHumanoidInventories(inventoryComponent, inventoryUseComponent, EntityType.scrappy);

   const scrappyComponent = new ScrappyComponent();

   return {
      entityType: EntityType.scrappy,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         tribeComponent,
         tribeMemberComponent,
         tribesmanAIComponent,
         aiHelperComponent,
         aiPathfindingComponent,
         aiAssignmentComponent,
         inventoryComponent,
         inventoryUseComponent,
         scrappyComponent
      ],
      lights: []
   };
}