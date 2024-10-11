import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { Point, randInt, TileIndex } from "battletribes-shared/utils";
import { createItemsOverEntity } from "../../entity-shared";
import { registerAttackingEntity } from "../../ai/escape-ai";
import { ItemType } from "battletribes-shared/items/items";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import WanderAI from "../../ai/WanderAI";
import { Biome } from "battletribes-shared/tiles";
import Layer from "../../Layer";
import { TransformComponent } from "../../components/TransformComponent";
import { PhysicsComponent } from "../../components/PhysicsComponent";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { EscapeAIComponent } from "../../components/EscapeAIComponent";
import { FollowAIComponent } from "../../components/FollowAIComponent";
import { KrumblidComponent } from "../../components/KrumblidComponent";
import { CollisionGroup } from "battletribes-shared/collision-groups";

export const enum KrumblidVars {
   VISION_RANGE = 224,
   MIN_FOLLOW_COOLDOWN = 7,
   MAX_FOLLOW_COOLDOWN = 9
}

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.aiHelper
   | ServerComponentType.escapeAI
   | ServerComponentType.followAI
   | ServerComponentType.krumblid;

const MAX_HEALTH = 15;
const KRUMBLID_SIZE = 48;

const FOLLOW_CHANCE_PER_SECOND = 0.3;

function positionIsValidCallback(_entity: EntityID, layer: Layer, x: number, y: number): boolean {
   return !layer.positionHasWall(x, y) && layer.getBiomeAtPosition(x, y) === Biome.desert;
}

export function createKrumblidConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.default);
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, KRUMBLID_SIZE / 2), 0.75, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   
   const healthComponent = new HealthComponent(MAX_HEALTH);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const aiHelperComponent = new AIHelperComponent(KrumblidVars.VISION_RANGE);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(200, 2 * Math.PI, 0.25, positionIsValidCallback);

   const escapeAIComponent = new EscapeAIComponent();
   
   const followAIComponent = new FollowAIComponent(randInt(KrumblidVars.MIN_FOLLOW_COOLDOWN, KrumblidVars.MAX_FOLLOW_COOLDOWN), FOLLOW_CHANCE_PER_SECOND, 50);
   
   const krumblidComponent = new KrumblidComponent();
   
   return {
      entityType: EntityType.krumblid,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.escapeAI]: escapeAIComponent,
         [ServerComponentType.followAI]: followAIComponent,
         [ServerComponentType.krumblid]: krumblidComponent
      }
   };
}

export function onKrumblidHurt(cow: EntityID, attackingEntity: EntityID): void {
   registerAttackingEntity(cow, attackingEntity);
}

export function onKrumblidDeath(krumblid: EntityID): void {
   createItemsOverEntity(krumblid, ItemType.leather, randInt(2, 3), 30);
}