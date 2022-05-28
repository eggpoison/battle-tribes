import FoodItem from "./FoodItem";
import Item from "./Item";
import ToolItem from "./ToolItem";
import WeaponItem from "./WeaponItem";

export enum ItemName {
   wood,
   berry,
   flower,
   rock,
   leather,
   meat,
   cookedMeat,
   slime,
   smallBackpack,
   woodenSword,
   woodenPickaxe,
   woodenAxe,
}

const REGULAR_STACK_SIZE = 64;

type ItemsType = Record<ItemName, Item>;
const ITEMS: ItemsType = {
   // Dropped items
   [ItemName.wood]: new Item({
      displayName: "Wood",
      description: "Do not eat.", 
      imageSrc: "wood.png",
      stackSize: REGULAR_STACK_SIZE
   }),
   [ItemName.leather]: new Item({
      displayName: "Leather",
      description: "It's leather, you know what it does.",
      imageSrc: "leather.png",
      stackSize: REGULAR_STACK_SIZE
   }),
   [ItemName.rock]: new Item({
      displayName: "Rock",
      description: "I Grug. I Hit You Rock.",
      imageSrc: "rock.png",
      stackSize: REGULAR_STACK_SIZE
   }),
   [ItemName.flower]: new Item({
      displayName: "Flower",
      description: "i am a flower",
      imageSrc: "flower-1.png",
      stackSize: REGULAR_STACK_SIZE
   }),
   [ItemName.slime]: new Item({
      displayName: "Slime",
      description: "Military-grade adhesive.",
      imageSrc: "slime.png",
      stackSize: REGULAR_STACK_SIZE
   }),

   // Food
   [ItemName.berry]: new FoodItem({
      displayName: "Berry",
      description: "Restores 2 health when eaten.",
      imageSrc: "berry.png",
      stackSize: REGULAR_STACK_SIZE,
      cooldown: 2,
      eatTime: 0.3
   }),
   [ItemName.meat]: new FoodItem({
      displayName: "Raw Meat",
      description: "Restores 4 health when eaten.",
      imageSrc: "meat.png",
      stackSize: REGULAR_STACK_SIZE,
      cooldown: 4,
      eatTime: 1.2
   }),
   [ItemName.cookedMeat]: new FoodItem({
      displayName: "Cooked Meat",
      description: "Restores 15 health when eaten.",
      imageSrc: "berry.png",
      stackSize: REGULAR_STACK_SIZE,
      cooldown: 15,
      eatTime: 1.2
   }),

   // Weapons
   [ItemName.woodenSword]: new WeaponItem({
      displayName: "Wooden Sword",
      description: "stab stab",
      imageSrc: "berry.png",
      stackSize: 1,
      damage: 2,
      attackCooldown: 0.4
   }),

   // Tools
   [ItemName.woodenPickaxe]: new ToolItem({
      displayName: "Wooden Pickaxe",
      description: "mine",
      imageSrc: "wooden-pickaxe.png",
      stackSize: 1,
      swingCooldown: 0.5,
      type: "pickaxe"
   }),
   [ItemName.woodenAxe]: new ToolItem({
      displayName: "Wooden Axe",
      description: "chop",
      imageSrc: "berry.png",
      stackSize: 1,
      swingCooldown: 0.5,
      type: "axe"
   }),

   // Wearable
   [ItemName.smallBackpack]: new Item({
      displayName: "Small Backpack",
      description: "Increases inventory size by 1 slot.",
      imageSrc: "small-backpack.png",
      stackSize: 1
   })
};

export default ITEMS;