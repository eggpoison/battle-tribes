import Component from "../../Component";
import Entity from "../Entity";
import Tribe from "../../Tribe";
import HealthComponent from "../../entity-components/HealthComponent";
import HitboxComponent from "../../entity-components/HitboxComponent";
import RenderComponent, { EllipseRenderPart, ImageRenderPart } from "../../entity-components/RenderComponent";
import TransformComponent from "../../entity-components/TransformComponent";
import { Colour, randFloat, randInt, Vector, Vector3 } from "../../utils";
import LivingEntity from "../LivingEntity";
import SelectedSlotComponent from "../../entity-components/SelectedSlotComponent";
import Timer from "../../Timer";
import Board from "../../Board";
import TRIBE_INFO from "../../data/tribe-info";
import Particle from "../../particles/Particle";
import FiniteInventoryComponent from "../../entity-components/inventory/FiniteInventoryComponent";
import ItemEntity from "../ItemEntity";
import ITEMS, { ItemName } from "../../items/items";
import StatusEffectComponent from "../../components/StatusEffectComponent";

abstract class GenericTribeMember extends Entity {
   public static readonly RESPAWN_TIME = 3;

   private static readonly SIZE = 1;
   private static readonly HAND_SIZE = 0.45;
   private static readonly HAND_ANGLES = 40 / 180 * Math.PI;

   public sightRange!: number;

   public readonly tribe: Tribe;

   constructor(tribe: Tribe, components?: ReadonlyArray<Component>) {
      super([
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
         this.startRespawn();

         this.unloadItems();
      });
   }

   public onLoad(): void {
      if (this.tribe.type === "humans") {
         const coordinates = this.getComponent(TransformComponent)!.getTileCoordinates();
         Board.revealFog(coordinates, this.sightRange, true);
      }
   }

   public tickComponents(): void {
      super.tickComponents();

      // Reveal any fog of war the tribe member is standing on
      if (this.tribe.type === "humans") {
         const coordinates = this.getComponent(TransformComponent)!.getTileCoordinates();
         Board.revealFog(coordinates, this.sightRange, false);
      }
   }

   protected setSightRange(sightRange: number): void {
      this.sightRange = sightRange;
   }

   public addExp(amount: number): void {
      this.tribe.addExp(amount);
   }

   protected startRespawn(): void {
      new Timer({
         duration: GenericTribeMember.RESPAWN_TIME,
         onEnd: () => this.respawn(),
         onTick: this.respawnTick
      });
   }

   protected respawn(): void {
      this.tribe.respawnEntity(this);
   }

   protected respawnTick?(duration: number): void;

   private createRenderParts(): void {
      const renderComponent = this.getComponent(RenderComponent)!;

      const BORDER_COLOUR = "#000";

      const colour = TRIBE_INFO[this.tribe.type].colour;

      // Create player body
      this.getComponent(RenderComponent)!.addPart(
         new EllipseRenderPart({
            type: "ellipse",
            fillColour: colour,
            size: {
               radius: GenericTribeMember.SIZE / 2
            },
            border: {
               width: 5,
               colour: BORDER_COLOUR
            },
            zIndex: 1
         })
      );

      // Create player hands
      for (let i = 0; i < 2; i++) {
         const multiplier = i === 0 ? -1 : 1;
         const offsetPoint = new Vector(GenericTribeMember.SIZE / 2, GenericTribeMember.HAND_ANGLES * multiplier).convertToPoint();

         renderComponent.addPart(
            new EllipseRenderPart({
               type: "ellipse",
               fillColour: colour,
               size: {
                  radius: GenericTribeMember.HAND_SIZE / 2
               },
               border: {
                  width: 3,
                  colour: BORDER_COLOUR
               },
               offset: [offsetPoint.x, offsetPoint.y],
               zIndex: 0
            })
         );
      }

      const ITEM_SIZE = 1;

      const selectedSlotComponent = this.getComponent(SelectedSlotComponent)!;

      // Held item
      const heldItemOffset = new Vector(GenericTribeMember.SIZE / 2, GenericTribeMember.HAND_ANGLES).convertToPoint();
      renderComponent.addPart(
         new ImageRenderPart({
            type: "image",
            size: {
               width: ITEM_SIZE,
               height: ITEM_SIZE
            },
            offset: [heldItemOffset.x, heldItemOffset.y],
            rotation: Math.PI / 2,
            url: (): string => {
               const itemName = selectedSlotComponent.getItem()!;
               const itemInfo = ITEMS[ItemName[itemName] as unknown as ItemName];
               return itemInfo.imageSrc;
            },
            isVisible: (): boolean => {
               const itemName = selectedSlotComponent.getItem();
               return itemName !== null;
            },
            zIndex: 0
         })
      );
   }

   private unloadItems(): void {
      const inventoryComponent = this.getComponent(FiniteInventoryComponent)!;
      const OFFSET_RANGE = 0.5 * Board.tileSize;

      // 'Explode' the tribe member's items out in a small range
      for (const itemSlot of inventoryComponent.getItemSlots()) {
         // Skip empty slots
         if (typeof itemSlot === "undefined") continue;

         const [itemName, itemAmount] = itemSlot;

         const item = ITEMS[ItemName[itemName] as unknown as ItemName];

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
}

export default GenericTribeMember;