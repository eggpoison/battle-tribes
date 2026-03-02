import { HitboxCollisionType } from "../../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../../shared/src/collision";
import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityType } from "../../../../../shared/src/entities";
import { Point } from "../../../../../shared/src/utils";
import { EntityConfig } from "../../../components";
import { AIAssignmentComponent } from "../../../components/AIAssignmentComponent";
import { AIHelperComponent, AIType } from "../../../components/AIHelperComponent";
import { CogwalkerComponent } from "../../../components/CogwalkerComponent";
import { HealthComponent } from "../../../components/HealthComponent";
import { InventoryComponent } from "../../../components/InventoryComponent";
import { InventoryUseComponent } from "../../../components/InventoryUseComponent";
import { PatrolAI } from "../../../ai/PatrolAI";
import { StatusEffectComponent } from "../../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../../components/TransformComponent";
import { TribeComponent } from "../../../components/TribeComponent";
import { TribeMemberComponent } from "../../../components/TribeMemberComponent";
import { TribesmanAIComponent } from "../../../components/TribesmanAIComponent";
import { Hitbox } from "../../../hitboxes";
import { addHumanoidInventories } from "../../../inventories";
import Tribe from "../../../Tribe";
import { generateCogwalkerName } from "../../../tribesman-names";
import { AIPathfindingComponent } from "../../../components/AIPathfindingComponent";

const moveFunc = () => {
   throw new Error();
}

const turnFunc = () => {
   throw new Error();
}

export function createCogwalkerConfig(position: Point, rotation: number, tribe: Tribe): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.traction = 1.4;

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 28), 1.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(25);

   const statusEffectComponent = new StatusEffectComponent(0);

   const tribeComponent = new TribeComponent(tribe);

   const tribeMemberComponent = new TribeMemberComponent(generateCogwalkerName(tribe));

   // @Hack @Temporary?
   const tribesmanAIComponent = new TribesmanAIComponent();

   const aiHelperComponent = new AIHelperComponent(transformComponent.hitboxes[0], 400, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.patrol] = new PatrolAI();

   const aiPathfindingComponent = new AIPathfindingComponent();
   
   const aiAssignmentComponent = new AIAssignmentComponent();

   const inventoryComponent = new InventoryComponent();

   const inventoryUseComponent = new InventoryUseComponent();

   addHumanoidInventories(inventoryComponent, inventoryUseComponent, EntityType.cogwalker);

   const cogwalkerComponent = new CogwalkerComponent();

   return {
      entityType: EntityType.cogwalker,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.tribeMember]: tribeMemberComponent,
         [ServerComponentType.tribesmanAI]: tribesmanAIComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.aiPathfinding]: aiPathfindingComponent,
         [ServerComponentType.aiAssignment]: aiAssignmentComponent,
         [ServerComponentType.inventory]: inventoryComponent,
         [ServerComponentType.inventoryUse]: inventoryUseComponent,
         [ServerComponentType.cogwalker]: cogwalkerComponent
      },
      lights: []
   };
}