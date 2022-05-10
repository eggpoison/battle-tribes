import FoodItem from "./FoodItem";
import Item from "./Item";
import WeaponItem from "./WeaponItem";

export enum ItemName {
   wood,
   berry,
   rock,
   leather,
   meat,
   cookedMeat,
   slime,
   smallBackpack,
   woodenSword
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
      displayName: "ROck",
      description: "I Grug. I Hit You Rock.",
      imageSrc: "rock.png",
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
      healthReplenishAmount: 2,
      eatTime: 0.3
   }),
   [ItemName.meat]: new FoodItem({
      displayName: "Raw Meat",
      description: "Restores 4 health when eaten.",
      imageSrc: "meat.png",
      stackSize: REGULAR_STACK_SIZE,
      healthReplenishAmount: 4,
      eatTime: 1.2
   }),
   [ItemName.cookedMeat]: new FoodItem({
      displayName: "Cooked Meat",
      description: "Restores 15 health when eaten.",
      imageSrc: "berry.png",
      stackSize: REGULAR_STACK_SIZE,
      healthReplenishAmount: 15,
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

   // Craftable items
   [ItemName.smallBackpack]: new Item({
      displayName: "Small Backpack",
      description: "Increases inventory size by 1 slot.",
      imageSrc: "berry.png",
      stackSize: 1
   })
};

export default ITEMS;