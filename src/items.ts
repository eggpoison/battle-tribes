import FoodItem from "./items/FoodItem";
import Item from "./items/Item";

export enum ItemName {
   berry,
   leather,
   meat,
   cookedMeat,
   slime,
   smallBackpack
}

type ItemsType = { [key in ItemName]: Item };

const REGULAR_STACK_SIZE = 64;

const ITEMS: ItemsType = {
   [ItemName.berry]: new FoodItem({
      displayName: "Berry",
      description: "Restores 2 health when eaten.",
      imageSrc: "berry.png",
      stackSize: REGULAR_STACK_SIZE,
      healthReplenishAmount: 2,
      eatTime: 0.3
   }),
   [ItemName.leather]: new Item({
      displayName: "Leather",
      description: "It's leather, you know what it does.",
      imageSrc: "leather.png",
      stackSize: REGULAR_STACK_SIZE
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
   [ItemName.slime]: new Item({
      displayName: "Slime",
      description: "Military-grade adhesive.",
      imageSrc: "berry.png",
      stackSize: REGULAR_STACK_SIZE
   }),
   [ItemName.smallBackpack]: new Item({
      displayName: "Small Backpack",
      description: "Increases inventory size by 1 slot.",
      imageSrc: "berry.png",
      stackSize: 1
   })
};

export default ITEMS;