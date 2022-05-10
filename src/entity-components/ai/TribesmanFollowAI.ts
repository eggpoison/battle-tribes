import Board from "../../Board";
import Entity from "../../entities/Entity";
import ItemEntity from "../../entities/ItemEntity";
import Mob from "../../entities/mobs/Mob";
import Resource from "../../entities/resources/Resource";
import Tribesman from "../../entities/tribe-members/Tribesman";
import { MobBehaviour } from "../../mob-info";
import Timer from "../../Timer";
import { ConstructorFunction } from "../../utils";
import AttackComponent from "../AttackComponent";
import HealthComponent from "../HealthComponent";
import FiniteInventoryComponent from "../inventory/FiniteInventoryComponent";
import TransformComponent from "../TransformComponent";
import TribeMemberComponent from "../TribeMemberComponent";
import FollowAI from "./FollowAI";

class TribesmanFollowAI extends FollowAI {
   private static readonly MAX_DISTANCE_FROM_STASH = 10;

   private readonly stopRange: number;

   private isAttacking: boolean = false;

   constructor(searchRadius: number, moveSpeed: number, stopRange: number, validEntityConstr: ReadonlyArray<ConstructorFunction>) {
      super(searchRadius, moveSpeed, validEntityConstr);

      this.stopRange = stopRange;
   }

   public shouldSwitch(): boolean {
      let visibleEntities = super.getEntitiesInSearchRadius();
      if (visibleEntities === null) return false;

      visibleEntities = this.filterEntities(visibleEntities);
      return visibleEntities !== null;
   }

   protected filterEntities(entityArray: ReadonlyArray<Entity>): Array<Entity> {
      let entities = entityArray.slice();
      entities = super.filterEntities(entities);

      // Filter out any items which can't be picked up
      for (let idx = entities.length - 1; idx >= 0; idx--) {
         const entity = entities[idx];

         if (entity instanceof ItemEntity) {
            const inventoryComponent = this.entity.getComponent(FiniteInventoryComponent)!;
            const item = entity.item;

            if (!inventoryComponent.canPickupItem(item)) {
               entities.splice(idx, 1);
            }
         }
      }

      return entities;
   }

   protected findClosestEntity(): Entity | null {
      let entities = super.getEntitiesInSearchRadius();
      if (entities === null) return null;
      entities = this.filterEntities(entities);

      // Sort the entities by type
      const hostileMobs = new Array<Mob>();
      const otherEntities = new Array<Mob | Resource | ItemEntity>();
      for (const entity of entities) {
         // Mobs
         if (entity instanceof Mob) {
            switch (entity.getInfo().behaviour) {
               case MobBehaviour.hostile:
                  hostileMobs.push(entity);
                  break;
               case MobBehaviour.peaceful:
                  otherEntities.push(entity);
            }
            continue;
         }

         // Resources
         if (entity instanceof Resource) {
            otherEntities.push(entity);
            continue;
         }

         // Item entities
         if (entity instanceof ItemEntity) {
            otherEntities.push(entity);
         }
      }

      let entityArr!: Array<Entity>;
      if (hostileMobs.length > 0) {
         entityArr = hostileMobs;
      } else if (otherEntities.length > 0) {
         entityArr = otherEntities;
      } else return null;

      const tribesmanPosition = this.entity.getComponent(TransformComponent)!.position;

      // Find the closest entity
      let closestEntity!: Entity;
      let closestDistance: number = Number.MAX_SAFE_INTEGER;
      for (const entity of entityArr) {
         const dist = tribesmanPosition.distanceFrom(entity.getComponent(TransformComponent)!.position);

         if (dist < closestDistance) {
            closestDistance = dist;
            closestEntity = entity;
         }
      }  

      return closestEntity;
   }

   private inventoryIsFull(): boolean {
      const inventoryComponent = this.entity.getComponent(FiniteInventoryComponent)!;

      const inventory = inventoryComponent.getItemSlots();
      const slotCount = inventoryComponent.slotCount;

      let inventoryIsFull = true;
      for (let i = 0; i < slotCount; i++) {
         if (typeof inventory[i] === "undefined") inventoryIsFull = false;
      }
      return inventoryIsFull;
   }

   public tick(): void {
      if (this.inventoryIsFull()) {
         const targetPosition = this.entity.getComponent(TribeMemberComponent)!.tribe.stash.getPosition();
         super.moveToPosition(targetPosition, this.moveSpeed);
         return;
      }

      const closestEntity = this.findClosestEntity();

      if (closestEntity !== null) {
         const position = closestEntity.getPosition();

         const healthComponent = closestEntity.getComponent(HealthComponent);
         if (healthComponent !== null) {
            const thisPosition = this.entity.getPosition();
   
            const dist = thisPosition.distanceFrom(position);

            if (dist > this.stopRange * Board.tileSize) {
               super.moveToPosition(position, this.moveSpeed);
            } else {
               // If the tribesman is in range to attack
               if (!this.isAttacking) {
                  this.entity.getComponent(AttackComponent)!.startAttack("baseAttack");
                  
                  this.isAttacking = true;
   
                  new Timer(Tribesman.ATTACK_INTERVAL, () => {
                     this.isAttacking = false;
                  });
               }
   
               // Rotate it to look at the entity
               const angle = thisPosition.angleBetween(position);
               this.entity.getComponent(TransformComponent)!.rotation = angle;
            }
         } else {
            // If it's an item

            super.moveToPosition(position, this.moveSpeed);
         }
      } else {
         super.changeCurrentAI("wander");
      }
   }
}

export default TribesmanFollowAI;