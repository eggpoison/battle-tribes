import Board, { Coordinates } from "../Board";
import Entity from "../entities/Entity";
import Mob from "../entities/mobs/Mob";
import Resource from "../entities/resources/Resource";
import Tribesman from "../entities/tribe-members/Tribesman";
import AttackComponent, { AttackInfo } from "../entity-components/AttackComponent";
import FiniteInventoryComponent from "../entity-components/inventory/FiniteInventoryComponent";
import TransformComponent from "../entity-components/TransformComponent";
import { Point } from "../utils";
import Item, { ItemInfo } from "./Item";

enum Direction {
   Up,
   Right,
   Bottom,
   Left
}

const getSwingDirection = (swingAngle: number): Direction => {
   const boundedSwingAngle = swingAngle % (Math.PI * 2);

   // Up
   if (boundedSwingAngle >= Math.PI / 4 && boundedSwingAngle <= Math.PI * 3 / 4) {
      return Direction.Up
   }
   // Right
   else if (boundedSwingAngle >= -Math.PI / 4 && boundedSwingAngle <= Math.PI / 4) {
      return Direction.Right;
   }
   // Bottom
   else if (boundedSwingAngle >= Math.PI * 5 / 4 && boundedSwingAngle <= Math.PI * 7 / 4) {
      return Direction.Bottom;
   }
   // Left
   else if (boundedSwingAngle >= Math.PI * 3 / 4 && boundedSwingAngle <= Math.PI * 5 / 4) {
      return Direction.Left;
   }

   throw new Error("Couldn't find a valid direction for angle " + boundedSwingAngle);
}

const swingPickaxe = (originPosition: Point, tool: ToolItem, swingAngle: number): void => {
   const tileX = Math.floor(originPosition.x / Board.tileSize);
   const tileY = Math.floor(originPosition.y / Board.tileSize);

   const swingDirection = getSwingDirection(swingAngle);

   let targetTileCoordinates!: Coordinates;
   switch (swingDirection) {
      case Direction.Up: {
         targetTileCoordinates = [tileX, tileY - 1];
         break;
      }
      case Direction.Right: {
         targetTileCoordinates = [tileX + 1, tileY];
         break;
      }
      case Direction.Bottom: {
         targetTileCoordinates = [tileX - 1, tileY];
         break;
      }
      case Direction.Left: {
         targetTileCoordinates = [tileX - 1, tileY];
         break;
      }
   }

   // Damage the tile
}

type ToolType = "sword" | "pickaxe";

interface ToolItemInfo extends ItemInfo {
   readonly type: ToolType;
   readonly damage: number;
   readonly knockback: number;
   readonly swingTime: number;
   readonly size: number;
   readonly interactionRadius: number;
}

class ToolItem extends Item implements ToolItemInfo {
   public readonly type: ToolType;
   public readonly damage: number;
   public readonly knockback: number;
   public readonly swingTime: number;
   public readonly size: number;
   public readonly interactionRadius: number;

   constructor(toolInfo: ToolItemInfo) {
      super(toolInfo);

      this.type = toolInfo.type;
      this.damage = toolInfo.damage;
      this.knockback = toolInfo.knockback;
      this.swingTime = toolInfo.swingTime;
      this.size = toolInfo.size;
      this.interactionRadius = toolInfo.interactionRadius;
   }

   public startLeftClick(entity: Tribesman, _inventoryComponent: FiniteInventoryComponent, _slotNum: number): void {
      super.startLeftClick(entity, _inventoryComponent, _slotNum);

      // Get the position to interact from
      const interactPosition = entity.getInteractPosition();
      const entityPosition = entity.getComponent(TransformComponent)!.position;

      const attackInfo: AttackInfo = {
         position: interactPosition,
         origin: entityPosition,
         attackingEntity: entity,
         radius: this.interactionRadius,
         damage: (entity: Entity): number => {
            if (this.isCorrectDamageType(entity)) {
               return this.damage;
            } else {
               return 0;
            }
         },
         pierce: 1,
         knockbackStrength: (entity: Entity): number => {
            if (this.isCorrectDamageType(entity)) {
               return this.knockback;
            } else {
               return 0;
            }
         }
      }

      entity.getComponent(AttackComponent)!.attack(attackInfo);

      if (this.type === "pickaxe") {
         const transformComponent = entity.getComponent(TransformComponent)!;
         const originPosition = transformComponent.position;
         const swingAngle = transformComponent.rotation;

         swingPickaxe(originPosition, this, swingAngle);
      }
   }

   private isCorrectDamageType(entity: Entity): boolean {
      if (entity instanceof Mob || entity instanceof Tribesman) {
         return this.type === "sword";
      } else if (entity instanceof Resource) {
         return this.type === "pickaxe";
      }

      return false;
   }
}

export default ToolItem;