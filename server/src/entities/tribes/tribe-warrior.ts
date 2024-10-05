import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { ScarInfo, ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { TRIBE_INFO_RECORD } from "battletribes-shared/tribes";
import { randInt, Point } from "battletribes-shared/utils";
import { TribesmanAIComponent, TribesmanAIComponentArray } from "../../components/TribesmanAIComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { EntityConfig } from "../../components";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { entityExists } from "../../world";
import { DamageBoxComponent } from "../../components/DamageBoxComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { InventoryComponent } from "../../components/InventoryComponent";
import { InventoryUseComponent } from "../../components/InventoryUseComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TransformComponent } from "../../components/TransformComponent";
import { TribeMemberComponent } from "../../components/TribeMemberComponent";
import Tribe from "../../Tribe";
import { TribeWarriorComponent } from "../../components/TribeWarriorComponent";
import { AIHelperComponent } from "../../components/AIHelperComponent";

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
   | ServerComponentType.tribeWarrior
   | ServerComponentType.damageBox;

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

export function createTribeWarriorConfig(tribe: Tribe): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, TRIBE_WARRIOR_RADIUS), 1.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.traction = 1.4;

   const tribeInfo = TRIBE_INFO_RECORD[tribe.tribeType];
   const healthComponent = new HealthComponent(tribeInfo.maxHealthPlayer);

   const statusEffectComponent = new StatusEffectComponent(0);

   const tribeComponent = new TribeComponent(tribe);

   const tribeMemberComponent = new TribeMemberComponent();

   const tribesmanAIComponent = new TribesmanAIComponent();

   const aiHelperComponent = new AIHelperComponent(TRIBE_WARRIOR_VISION_RANGE);
   
   const inventoryComponent = new InventoryComponent();

   const inventoryUseComponent = new InventoryUseComponent();

   const tribeWarriorComponent = new TribeWarriorComponent(generateScars());

   const damageBoxComponent = new DamageBoxComponent();

   return {
      entityType: EntityType.tribeWarrior,
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
         [ServerComponentType.tribeWarrior]: tribeWarriorComponent,
         [ServerComponentType.damageBox]: damageBoxComponent
      }
   };
}

export function onTribeWarriorDeath(warrior: EntityID): void {
   // Attempt to respawn the tribesman when it is killed
   // Only respawn the tribesman if their hut is alive
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(warrior);

   if (entityExists(tribesmanComponent.hut)) {
      const tribeComponent = TribeComponentArray.getComponent(warrior);
      tribeComponent.tribe.respawnTribesman(tribesmanComponent.hut);
   }
}