import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { ScarInfo, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, EntityType } from "webgl-test-shared/dist/entities";
import { TRIBE_INFO_RECORD } from "webgl-test-shared/dist/tribes";
import { randInt, Point } from "webgl-test-shared/dist/utils";
import Entity, { getNextEntityID } from "../../Entity";
import Tribe from "../../Tribe";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { InventoryComponent, InventoryComponentArray } from "../../components/InventoryComponent";
import { InventoryUseComponent, InventoryUseComponentArray } from "../../components/InventoryUseComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { TribeMemberComponent, TribeMemberComponentArray } from "../../components/TribeMemberComponent";
import { TribesmanAIComponent, TribesmanAIComponentArray } from "../../components/TribesmanAIComponent";
import Board from "../../Board";
import { AIHelperComponent, AIHelperComponentArray } from "../../components/AIHelperComponent";
import { tickTribesman } from "./tribesman-ai/tribesman-ai";
import { PhysicsComponent, PhysicsComponentArray } from "../../components/PhysicsComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { TribeWarriorComponent, TribeWarriorComponentArray } from "../../components/TribeWarriorComponent";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ComponentRecord, EntityCreationInfo } from "../../components";
import { TransformComponent, TransformComponentArray } from "../../components/TransformComponent";

type ComponentTypes = [ServerComponentType.physics, ServerComponentType.health, ServerComponentType.statusEffect, ServerComponentType.tribe, ServerComponentType.tribeMember, ServerComponentType.tribesmanAI, ServerComponentType.aiHelper, ServerComponentType.tribeWarrior, ServerComponentType.inventoryUse, ServerComponentType.inventory];

export const TRIBE_WARRIOR_RADIUS = 32;
export const TRIBE_WARRIOR_VISION_RANGE = 560;

const generateScars = (): ReadonlyArray<ScarInfo> => {
   let numScars = 1;
   while (Math.random() < 0.65 / numScars) {
      numScars++;
   }

   const scars = new Array<ScarInfo>();
   for (let i = 0; i < numScars; i++) {
      const offsetDirection = 2 * Math.PI * Math.random();
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

export function createTribeWarrior(position: Point, rotation: number, tribe: Tribe, hutID: number): EntityCreationInfo<ComponentTypes> {
   const id = getNextEntityID();

   const transformComponent = new TransformComponent(position, rotation, EntityType.tribeWarrior, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   TransformComponentArray.addComponent(id, transformComponent);
   
   const hitbox = new CircularHitbox(1.5, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, TRIBE_WARRIOR_RADIUS);
   transformComponent.addHitbox(hitbox);
   
   const tribeInfo = TRIBE_INFO_RECORD[tribe.tribeType];

   const physicsComponent = new PhysicsComponent(0, 0, 0, 0, true, false);
   PhysicsComponentArray.addComponent(id, physicsComponent);

   const healthComponent = new HealthComponent(tribeInfo.maxHealthPlayer);
   HealthComponentArray.addComponent(id, healthComponent);

   const statusEffectComponent = new StatusEffectComponent(0);
   StatusEffectComponentArray.addComponent(id, statusEffectComponent);

   const tribeComponent = new TribeComponent(tribe);
   TribeComponentArray.addComponent(id, tribeComponent);

   const tribeMemberComponent = new TribeMemberComponent(tribe.tribeType, EntityType.tribeWarrior);
   TribeMemberComponentArray.addComponent(id, tribeMemberComponent);

   const tribesmanAIComponent = new TribesmanAIComponent(hutID);
   TribesmanAIComponentArray.addComponent(id, tribesmanAIComponent);

   const aiHelperComponent = new AIHelperComponent(TRIBE_WARRIOR_VISION_RANGE);
   AIHelperComponentArray.addComponent(id, aiHelperComponent);

   const tribeWarriorComponent = new TribeWarriorComponent(generateScars());
   TribeWarriorComponentArray.addComponent(id, tribeWarriorComponent);

   const inventoryUseComponent = new InventoryUseComponent();
   InventoryUseComponentArray.addComponent(id, inventoryUseComponent);

   const inventoryComponent = new InventoryComponent();
   InventoryComponentArray.addComponent(id, inventoryComponent);

   const componentRecord: ComponentRecord = {
      [ServerComponentType.physics]: physicsComponent,
      [ServerComponentType.health]: healthComponent,
      [ServerComponentType.statusEffect]: statusEffectComponent,
      [ServerComponentType.tribe]: tribeComponent,
      [ServerComponentType.tribeMember]: tribeMemberComponent,
      [ServerComponentType.tribesmanAI]: tribesmanAIComponent,
      [ServerComponentType.aiHelper]: aiHelperComponent,
      [ServerComponentType.tribeWarrior]: tribeWarriorComponent,
      [ServerComponentType.inventoryUse]: inventoryUseComponent,
      [ServerComponentType.inventory]: inventoryComponent
   };

   // @Hack @Copynpaste
   TribeMemberComponentArray.onInitialise!(warrior, componentRecord);

   return {
      entity: warrior,
      components: componentRecord
   };
}

export function tickTribeWarrior(warrior: EntityID): void {
   tickTribesman(warrior);
}

export function onTribeWarriorDeath(warrior: EntityID): void {
   // Attempt to respawn the tribesman when it is killed
   // Only respawn the tribesman if their hut is alive
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(warrior);

   if (Board.hasEntity(tribesmanComponent.hutID)) {
      const tribeComponent = TribeComponentArray.getComponent(warrior);
      tribeComponent.tribe.respawnTribesman(tribesmanComponent.hutID);
   }
}