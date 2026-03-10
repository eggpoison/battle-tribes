import { HitboxCollisionType } from "../../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../../shared/src/collision";
import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityType } from "../../../../../shared/src/entities";
import { Point } from "../../../../../shared/src/utils";
import { EntityConfig } from "../../../components";
import { AIAssignmentComponent } from "../../../components/AIAssignmentComponent";
import { AIHelperComponent, AIType } from "../../../components/AIHelperComponent";
import { HealthComponent } from "../../../components/HealthComponent";
import { InventoryComponent } from "../../../components/InventoryComponent";
import { InventoryUseComponent } from "../../../components/InventoryUseComponent";
import { PatrolAI } from "../../../ai/PatrolAI";
import { ScrappyComponent } from "../../../components/ScrappyComponent";
import { StatusEffectComponent } from "../../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../../components/TransformComponent";
import { TribeComponent } from "../../../components/TribeComponent";
import { TribeMemberComponent } from "../../../components/TribeMemberComponent";
import { TribesmanAIComponent } from "../../../components/TribesmanAIComponent";
import { Hitbox } from "../../../hitboxes";
import { addHumanoidInventories } from "../../../inventories";
import Tribe from "../../../Tribe";
import { generateScrappyName } from "../../../tribesman-names";
import { AIPathfindingComponent } from "../../../components/AIPathfindingComponent";

const moveFunc = () => {
   throw new Error();
}

const turnFunc = () => {
   throw new Error();
}

export function createScrappyConfig(position: Point, rotation: number, tribe: Tribe): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.traction = 1.4;

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 20), 0.75, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
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