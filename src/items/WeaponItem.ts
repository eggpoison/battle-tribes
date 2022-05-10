import Item, { ItemInfo } from "./Item";

interface WeaponItemInfo extends ItemInfo {
   readonly damage: number;
   readonly attackCooldown: number;
}

class WeaponItem extends Item implements WeaponItemInfo {
   public readonly damage: number;
   public readonly attackCooldown: number;
   
   constructor(itemInfo: WeaponItemInfo) {
      super(itemInfo);

      this.damage = itemInfo.damage;
      this.attackCooldown = itemInfo.attackCooldown;
   }
}

export default WeaponItem;