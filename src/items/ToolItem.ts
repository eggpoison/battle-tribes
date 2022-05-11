import Item, { ItemInfo } from "./Item";

type ToolType = "pickaxe" | "axe";

interface ToolItemInfo extends ItemInfo {
   readonly swingCooldown: number;
   readonly type: ToolType;
}

class ToolItem extends Item implements ToolItemInfo {
   public readonly swingCooldown: number;
   public readonly type: ToolType;

   constructor(toolInfo: ToolItemInfo) {
      super(toolInfo);

      this.swingCooldown = toolInfo.swingCooldown;
      this.type = toolInfo.type;
   }
}

export default ToolItem;