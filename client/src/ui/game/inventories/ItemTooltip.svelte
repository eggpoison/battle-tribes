<script lang="ts">
   import {ITEM_TYPE_RECORD, ITEM_INFO_RECORD, type Item, type AnimalStaffItemInfo, type ArmourItemInfo, ItemType } from "webgl-test-shared";
   import CLIENT_ITEM_INFO_RECORD from "../../../game/client-item-info";

   interface Props {
      item: Item;
      x: number;
      y: number;
   }

   let props: Props = $props();
   const item = props.item;
   const x = props.x;
   const y = props.y;

   const clientItemInfo = CLIENT_ITEM_INFO_RECORD[item.type];

   const itemCategory = ITEM_TYPE_RECORD[item.type];
   const itemInfo = ITEM_INFO_RECORD[item.type];
</script>

<div id="item-tooltip" style:left="{x}px" style:top="{y}px">
   <p class="item-name">{clientItemInfo.name}</p>

   {#if itemCategory === "animalStaff"}
      <p>Control range: {(itemInfo as AnimalStaffItemInfo).controlRange} units</p>
   {/if}

   {#if itemCategory === "armour"}
      <p>Defence: {(itemInfo as ArmourItemInfo).defence * 100}%</p>
   {/if}

<!-- @SQUEAM -->
   <!-- @HACK -->
   {#if item.type === ItemType.yuriMinecraft}
      <p class="flavour-text">Alex's thoughts keep drifting back to that encounter in the woodland mansion, as much as she wills herself not to. She can't put the cold shivers out of her mind, the cold shivers which make her feel so warm. Perhaps the Illager's intentions weren't hostile...</p>
   {/if}
   <!-- @HACK -->
   {#if item.type === ItemType.yuriSonichu}
      <p class="flavour-text">Stuck alone and pent up in the woods for a week, Sonichu has an affliction only Shrekke's gentle yet controlling hands can cure.</p>
   {/if}

   {#if typeof clientItemInfo.flavourText !== "undefined"}
      <p class="flavour-text">{clientItemInfo.flavourText}</p>
   {/if}
</div>