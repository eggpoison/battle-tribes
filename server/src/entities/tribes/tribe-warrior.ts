import { DEFAULT_COLLISION_MASK, CollisionBit, ScarInfo, EntityType, TRIBE_INFO_RECORD, TribeType, randInt, Point, randAngle, HitboxCollisionType, CircularBox } from "battletribes-shared";
import { TribesmanAIComponent } from "../../components/TribesmanAIComponent.js";
import { TribeComponent } from "../../components/TribeComponent.js";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { InventoryComponent } from "../../components/InventoryComponent.js";
import { InventoryUseComponent } from "../../components/InventoryUseComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TribeMemberComponent } from "../../components/TribeMemberComponent.js";
import Tribe from "../../Tribe.js";
import { TribeWarriorComponent } from "../../components/TribeWarriorComponent.js";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent.js";
import { AIAssignmentComponent } from "../../components/AIAssignmentComponent.js";
import { PatrolAI } from "../../ai/PatrolAI.js";
import { generateTribesmanName } from "../../tribesman-names.js";
import { TribesmanComponent } from "../../components/TribesmanComponent.js";
import { Hitbox } from "../../hitboxes.js";
import { AIPathfindingComponent } from "../../components/AIPathfindingComponent.js";

const moveFunc = () => {
   throw new Error();
}

const turnFunc = () => {
   throw new Error();
}

const generateScars = (): ReadonlyArray<ScarInfo> => {
   let numScars = 1;
   while (Math.random() < 0.65 / numScars) {
      numScars++;
   }

   const scars: Array<ScarInfo> = [];
   for (let i = 0; i < numScars; i++) {
      const offsetDirection = randAngle();
      const offsetMagnitude = 20 * Math.random();
      scars.push({
         offsetX: offsetMagnitude * Math.sin(offsetDirection),
         offsetY: offsetMagnitude * Math.cos(offsetDirection),
         rotation: Math.PI / 2 * randInt(0, 3),
         type: randInt(0, 1)
      });
   }
   return scars;
}

const getHitboxRadius = (tribeType: TribeType): number => {
   switch (tribeType) {
      case TribeType.barbarians:
      case TribeType.frostlings:
      case TribeType.goblins:
      case TribeType.plainspeople: {
         return 32;
      }
      case TribeType.dwarves: {
         return 28;
      }
   }
}

export function createTribeWarriorConfig(x: number, y: number, angle: number, tribe: Tribe): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.traction = 1.4;

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, angle, getHitboxRadius(tribe.tribeType)), 1.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const tribeInfo = TRIBE_INFO_RECORD[tribe.tribeType];
   const healthComponent = new HealthComponent(tribeInfo.maxHealthPlayer);

   const statusEffectComponent = new StatusEffectComponent(0);

   const tribeComponent = new TribeComponent(tribe);

   const tribeMemberComponent = new TribeMemberComponent(generateTribesmanName(tribe.tribeType));

   const tribesmanComponent = new TribesmanComponent();
   
   const tribesmanAIComponent = new TribesmanAIComponent();

   const aiHelperComponent = new AIHelperComponent(transformComponent.hitboxes[0], 560, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.patrol] = new PatrolAI();
   
   const aiPathfindingComponent = new AIPathfindingComponent();

   const aiAssignmentComponent = new AIAssignmentComponent();
   
   const inventoryComponent = new InventoryComponent();

   const inventoryUseComponent = new InventoryUseComponent();

   const tribeWarriorComponent = new TribeWarriorComponent(generateScars());

   return {
      entityType: EntityType.tribeWarrior,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         tribeComponent,
         tribeMemberComponent,
         tribesmanComponent,
         tribesmanAIComponent,
         aiHelperComponent,
         aiPathfindingComponent,
         aiAssignmentComponent,
         inventoryComponent,
         inventoryUseComponent,
         tribeWarriorComponent
      ],
      lights: []
   };
}