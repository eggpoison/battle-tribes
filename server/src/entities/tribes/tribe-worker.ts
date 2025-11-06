import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { TRIBE_INFO_RECORD, TribeType } from "battletribes-shared/tribes";
import { Point } from "battletribes-shared/utils";
import Tribe from "../../Tribe";
import { TribesmanAIComponent } from "../../components/TribesmanAIComponent";
import { TribeComponent } from "../../components/TribeComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { InventoryComponent } from "../../components/InventoryComponent";
import { InventoryUseComponent } from "../../components/InventoryUseComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { TribeMemberComponent } from "../../components/TribeMemberComponent";
import { PatrolAI } from "../../ai/PatrolAI";
import { AIAssignmentComponent } from "../../components/AIAssignmentComponent";
import { generateTribesmanName } from "../../tribesman-names";
import { TribesmanComponent } from "../../components/TribesmanComponent";
import { Hitbox } from "../../hitboxes";
import { AIPathfindingComponent } from "../../components/AIPathfindingComponent";

const moveFunc = () => {
   throw new Error();
}

const turnFunc = () => {
   throw new Error();
}

const getHitboxRadius = (tribeType: TribeType): number => {
   switch (tribeType) {
      case TribeType.barbarians:
      case TribeType.frostlings:
      case TribeType.goblins:
      case TribeType.plainspeople: {
         return 28;
      }
      case TribeType.dwarves: {
         return 24;
      }
   }
}

export function createTribeWorkerConfig(position: Point, rotation: number, tribe: Tribe): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.traction = 1.4;

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, getHitboxRadius(tribe.tribeType)), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   

   const tribeInfo = TRIBE_INFO_RECORD[tribe.tribeType];
   const healthComponent = new HealthComponent(tribeInfo.maxHealthWorker);

   const statusEffectComponent = new StatusEffectComponent(0);

   const tribeComponent = new TribeComponent(tribe);

   const tribeMemberComponent = new TribeMemberComponent(generateTribesmanName(tribe.tribeType));

   const tribesmanComponent = new TribesmanComponent();
   
   const tribesmanAIComponent = new TribesmanAIComponent();

   const aiHelperComponent = new AIHelperComponent(hitbox, 500, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.patrol] = new PatrolAI();

   const aiPathfindingComponent = new AIPathfindingComponent();

   const aiAssignmentComponent = new AIAssignmentComponent();
   
   const inventoryComponent = new InventoryComponent();

   const inventoryUseComponent = new InventoryUseComponent();

   return {
      entityType: EntityType.tribeWorker,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.tribeMember]: tribeMemberComponent,
         [ServerComponentType.tribesman]: tribesmanComponent,
         [ServerComponentType.tribesmanAI]: tribesmanAIComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.aiPathfinding]: aiPathfindingComponent,
         [ServerComponentType.aiAssignment]: aiAssignmentComponent,
         [ServerComponentType.inventory]: inventoryComponent,
         [ServerComponentType.inventoryUse]: inventoryUseComponent
      },
      lights: []
   };
}