import Component from "../../Component";
import Entity, { RenderLayer } from "../Entity";
import Tribe from "../../Tribe";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderPart, ImageRenderPart } from "../../entity-components/RenderComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import { Colour, Point, randFloat, randInt, Vector, Vector3 } from "../../utils";
import LivingEntity from "../LivingEntity";
import SelectedSlotComponent from "../../entity-components/SelectedSlotComponent";
import Timer from "../../Timer";
import Board from "../../Board";
import TRIBE_INFO from "../../data/tribe-info";
import Particle from "../../particles/Particle";
import FiniteInventoryComponent from "../../entity-components/inventory/FiniteInventoryComponent";
import ItemEntity from "../ItemEntity";
import ITEMS from "../../items/items";
import StatusEffectComponent from "../../components/StatusEffectComponent";
import SETTINGS from "../../settings";
import { TileKind } from "../../data/tile-types";
import Game from "../../Game";
import AttackComponent, { AttackInfo } from "../../entity-components/AttackComponent";
import ToolItem from "../../items/ToolItem";

const TILE_WALK_COLOURS: Record<TileKind, [number, number, number]> = {
   [TileKind.grass]: [0, 153, 28],
   [TileKind.dirt]: [196, 98, 0],
   [TileKind.ice]: [158, 250, 255],
   [TileKind.magma]: [255, 142, 66],
   [TileKind.rock]: [89, 89, 89],
   [TileKind.sand]: [173, 168, 0],
   [TileKind.sandstone]: [125, 120, 0],
   [TileKind.sludge]: [0, 87, 10],
   [TileKind.snow]: [161, 161, 161],
   [TileKind.lava]: [140, 9, 0]
}

abstract class Tribesman extends Entity {
   public abstract SIZE: number;
   
   public static readonly RESPAWN_TIME = 3;

   private static readonly SIZE = 1;
   private static readonly HAND_SIZE = 0.45;
   private static readonly HAND_ANGLES = 40 / 180 * Math.PI;

   public sightRange!: number;

   public readonly tribe: Tribe;

   private isRespawning: boolean = false;

   constructor(tribe: Tribe, components?: ReadonlyArray<Component>) {
      super(RenderLayer.Tribesmen, [
         new TransformComponent(tribe.getMemberSpawnPosition()),
         new RenderComponent(),
         new HitboxComponent(),
         new HealthComponent(),
         new SelectedSlotComponent(),
         new StatusEffectComponent(),
         ...(components || [])
      ]);

      this.tribe = tribe;

      this.createRenderParts();

      this.createEvent("killEntity", ([entity]: [Entity]) => {
         if (entity instanceof LivingEntity) {
            const expDrop = entity.entityInfo.exp;
            
            this.addExp(expDrop);
         }
      });

      // Create gore particles when hit
      this.createEvent("deathByEntity", ([attackingEntity]: [Entity]) => {
         const particleAmount = randInt(3, 5);

         const initialPosition = this.getComponent(TransformComponent)!.position.convertTo3D();

         // Calculate the push vector
         const angle = this.getComponent(TransformComponent)!.position.angleBetween(attackingEntity.getComponent(TransformComponent)!.position);
         const pushVector = new Vector3(1, Math.PI/2, angle + Math.PI);

         for (let i = 0; i < particleAmount; i++) {
            const inclination = randFloat(Math.PI / 4, Math.PI / 3);
            const azimuth = randFloat(0, Math.PI * 2);
            let velocity = new Vector3(3, inclination, azimuth);

            // Randomize the strength of the push vector
            pushVector.radius = randFloat(1, 1.5);

            velocity = velocity.add(pushVector);

            const width = randFloat(5, 12.5);
            const height = randFloat(5, 12.5);

            const colour = new Colour(TRIBE_INFO[this.tribe.type].bloodColour).getRGB();

            const lifespan = randFloat(0.5, 1);
            
            new Particle(initialPosition, {
               type: "rectangle",
               size: {
                  width: width,
                  height: height
               },
               renderLayer: RenderLayer.HighParticles,
               initialVelocity: velocity,
               angularVelocity: 0,
               colour: colour,
               lifespan: lifespan,
               friction: 1
            });
         }
      });

      // Respawn when killed
      this.createEvent("die", () => {
         if (!this.isRespawning) {
            this.startRespawn();
            this.dropItems();
         }
      });
   }

   public onLoad(): void {
      // Reveal fog
      if (this.tribe.type === "humans") {
         const coordinates = this.getComponent(TransformComponent)!.getTileCoordinates();
         Board.revealFog(coordinates, this.sightRange, true);
      }
   }

   public tick(): void {
      super.tick();

      // Reveal any fog of war the tribe member is standing on
      if (this.tribe.type === "humans") {
         const coordinates = this.getComponent(TransformComponent)!.getTileCoordinates();
         Board.revealFog(coordinates, this.sightRange, false);
      }

      const isMoving = this.getComponent(TransformComponent)!.isMoving;

      const SPAWN_RATE = 8;
      const currentTime = Game.secondsElapsed * SPAWN_RATE;
      const previousTime = (Game.secondsElapsed - 1 / SETTINGS.tps) * SPAWN_RATE;

      // Create walk particle
      if (isMoving && Math.floor(currentTime) !== Math.floor(previousTime)) {
         this.createWalkParticle();
      }
   }

   protected setSightRange(sightRange: number): void {
      this.sightRange = sightRange;
   }

   public addExp(amount: number): void {
      this.tribe.addExp(amount);
   }

   protected startRespawn(): void {
      this.isRespawning = true;

      new Timer({
         duration: Tribesman.RESPAWN_TIME,
         onEnd: () => this.respawn(),
         onTick: this.respawnTick
      });
   }

   protected respawn(): void {
      this.isRespawning = false;
      
      this.tribe.respawnEntity(this);
   }

   protected respawnTick?(duration: number): void;

   private createRenderParts(): void {
      const renderComponent = this.getComponent(RenderComponent)!;

      const BORDER_COLOUR = "#000";

      const colour = TRIBE_INFO[this.tribe.type].colour;

      // Create body
      this.getComponent(RenderComponent)!.addPart(
         new EllipseRenderPart({
            fillColour: colour,
            size: {
               radius: Tribesman.SIZE / 2
            },
            border: {
               width: 5,
               colour: BORDER_COLOUR
            },
            zIndex: 2
         })
      );

      // Create hands
      for (let i = 0; i < 2; i++) {
         const multiplier = i === 0 ? -1 : 1;
         const offsetPoint = new Vector(Tribesman.SIZE / 2, Tribesman.HAND_ANGLES * multiplier).convertToPoint();

         renderComponent.addPart(
            new EllipseRenderPart({
               fillColour: colour,
               size: {
                  radius: Tribesman.HAND_SIZE / 2
               },
               border: {
                  width: 3,
                  colour: BORDER_COLOUR
               },
               offset: [offsetPoint.x, offsetPoint.y],
               zIndex: 1
            })
         );
      }

      const ITEM_SIZE = 1;

      const selectedSlotComponent = this.getComponent(SelectedSlotComponent)!;

      // Held item
      const heldItemOffset = new Vector(Tribesman.SIZE / 2, Tribesman.HAND_ANGLES).convertToPoint();
      renderComponent.addPart(
         new ImageRenderPart({
            size: {
               width: ITEM_SIZE,
               height: ITEM_SIZE
            },
            offset: [heldItemOffset.x + Tribesman.HAND_SIZE / 4, heldItemOffset.y],
            rotation: Math.PI / 2,
            url: (): string => {
               const itemName = selectedSlotComponent.getSelectedItemName()!;
               const itemInfo = ITEMS[itemName];
               return itemInfo.imageSrc;
            },
            isVisible: (): boolean => {
               const itemName = selectedSlotComponent.getSelectedItemName();
               return itemName !== null;
            },
            zIndex: 0 // Positioned below the hands
         })
      );
   }

   private dropItems(): void {
      const inventoryComponent = this.getComponent(FiniteInventoryComponent)!;
      const OFFSET_RANGE = 0.5 * Board.tileSize;

      // 'Explode' the tribe member's items out in a small range
      for (const itemSlot of inventoryComponent.getItemSlots()) {
         // Skip empty slots
         if (typeof itemSlot === "undefined") continue;

         const [itemName, itemAmount] = itemSlot;

         const item = ITEMS[itemName];

         // Calculate the position
         const offsetVector = new Vector(OFFSET_RANGE, randFloat(0, 360));
         let position = this.getComponent(TransformComponent)!.position.copy();
         position = position.add(offsetVector.convertToPoint());

         const itemEntity = new ItemEntity(position, item, itemAmount);
         Board.addEntity(itemEntity);
      }

      // Clear the tribe member's inventory
      inventoryComponent.clear();
   }

   private createWalkParticle(): void {
      const entityPosition = this.getComponent(TransformComponent)!.position;
      const offset = Vector.randomUnitVector();
      offset.magnitude *= 0.2 * Board.tileSize;

      const particlePosition = (entityPosition.add(offset.convertToPoint())).convertTo3D();

      // Get the colour
      const tileCoordinates = this.getComponent(TransformComponent)!.getTileCoordinates();
      const tile = Board.getTile(...tileCoordinates);
      const colour = TILE_WALK_COLOURS[tile.kind];

      const radius = randFloat(1, 1.5);
      const inclination = randFloat(Math.PI / 8, 3 * Math.PI / 8);
      const azimuth = randFloat(0, Math.PI * 2);
      const initialVelocity = new Vector3(radius, inclination, azimuth);

      new Particle(particlePosition, {
         type: "rectangle",
         size: [7, 13],
         colour: colour,
         renderLayer: RenderLayer.LowParticles,
         initialVelocity: initialVelocity,
         lifespan: [0.75, 1],
         startOpacity: 0.8,
         endOpacity: 0,
         hasShadow: false
      });
   }

   /**
    * @returns The position where the entity attacks and uses items
    */
   public getInteractPosition(): Point {
      const ATTACK_OFFSET = 0.5;
      
      const rotation = this.getComponent(TransformComponent)!.rotation;

      const offset = RenderComponent.getOffset((this.SIZE / 2 + ATTACK_OFFSET) * Board.tileSize, rotation);
      const offsetPoint = new Point(offset[0], offset[1]);

      const attackPosition = this.getComponent(TransformComponent)!.position.add(offsetPoint);
      return attackPosition;
   }

   /**
    * Calls the base attack
    */
   private baseAttack(): void {
      const interactPosition = this.getInteractPosition();

      const entityPosition = this.getComponent(TransformComponent)!.position;
      
      const attackInfo: AttackInfo = {
         position: interactPosition,
         origin: entityPosition,
         attackingEntity: this,
         radius: 0.75,
         damage: 1,
         pierce: 1,
         knockbackStrength: 0.2
      }

      this.getComponent(AttackComponent)!.attack(attackInfo);
   }

   protected attack(): void {
      const heldItemName = this.getComponent(SelectedSlotComponent)!.getSelectedItemName();
      if (heldItemName === null || !(ITEMS[heldItemName] instanceof ToolItem)) {
         this.baseAttack();
      } else {
         this.getComponent(SelectedSlotComponent)!.startLeftClick();
      }
   }
}

export default Tribesman;