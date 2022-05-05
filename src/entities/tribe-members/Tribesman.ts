import Board from "../../Board";
import AIManagerComponent from "../../entity-components/ai/AIManangerComponent";
import TribesmanFollowAI from "../../entity-components/ai/TribesmanFollowAI";
import WanderAI from "../../entity-components/ai/WanderAI";
import AttackComponent, { CircleAttack } from "../../entity-components/AttackComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import InventoryComponent from "../../entity-components/InventoryComponent";
import RenderComponent from "../../entity-components/RenderComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import Tribe from "../../Tribe";
import { ConstructorFunction, Point } from "../../utils";
import Entity from "../Entity";
import ItemEntity from "../ItemEntity";
import Mob from "../mobs/Mob";
import Resource from "../resources/Resource";
import GenericTribeMember from "./GenericTribeMember";
import Player from "./Player";

class Tribesman extends GenericTribeMember {
   private static readonly SIZE = 1;
   private static readonly MAX_HEALTH = 25;
   private static readonly DEFAULT_SLOT_COUNT = 3;

   private static readonly ATTACK_DAMAGE = 5;
   public static readonly ATTACK_INTERVAL = 0.25;

   constructor(tribe: Tribe) {
      super(tribe, [
         new AIManagerComponent(),
         new AttackComponent(),
         new InventoryComponent(Tribesman.DEFAULT_SLOT_COUNT)
      ]);

      super.setMaxHealth(Tribesman.MAX_HEALTH);

      const HAND_SIZE = 0.45;
      const HAND_ANGLES = 40 / 180 * Math.PI;

      super.createRenderParts(Tribesman.SIZE, HAND_SIZE, Player.TRIBE_COLOUR, Player.TRIBE_COLOUR, HAND_ANGLES);

      this.getComponent(HitboxComponent)!.setHitbox({
         type: "circle",
         radius: Tribesman.SIZE / 2
      });

      this.createAttacks();
      
      this.createAI();
   }

   private createAttacks(): void {
      const ATTACK_RADIUS = 1;
      const ATTACK_OFFSET = 0.5;
      
      this.getComponent(AttackComponent)!.addAttack("baseAttack", new CircleAttack({
            radius: ATTACK_RADIUS,
            damage: Tribesman.ATTACK_DAMAGE,
            knockbackStrength: 5,
            getPosition: (): Point => {
               const rotation = this.getComponent(TransformComponent)!.rotation;

               const offset = RenderComponent.getOffset((Tribesman.SIZE / 2 + ATTACK_OFFSET) * Board.tileSize, rotation);
               const offsetPoint = new Point(offset[0], offset[1]);
   
               return this.getComponent(TransformComponent)!.position.add(offsetPoint);
            },
            attackingEntity: this
      }));
   }

   private createAI(): void {
      const WALK_SPEED = 1;
      const RUN_SPEED = 2.5;
      
      const VISION_RANGE = 3.5;

      const ATTACK_RANGE = 1;

      const WANDER_CHANCE = 0.5;
      const WANDER_RANGE = 3;

      const validEntityConstr: ReadonlyArray<ConstructorFunction> = [Mob, Resource, ItemEntity];

      this.getComponent(AIManagerComponent)!.addAI(
         new WanderAI(WANDER_CHANCE, WANDER_RANGE, WALK_SPEED)
      );
      this.getComponent(AIManagerComponent)!.addAI(
         new TribesmanFollowAI(VISION_RANGE, RUN_SPEED, ATTACK_RANGE, validEntityConstr)
      );

      this.getComponent(AIManagerComponent)!.setCurrentAIType("follow");
   }

   protected onCollision(collidingEntity: Entity): void {
      if (collidingEntity instanceof ItemEntity) {
         // Pick up the item
         const inventoryComponent = this.getComponent(InventoryComponent)!;
         inventoryComponent.pickupResource(collidingEntity);
      }
   }
}

export default Tribesman;