<script lang="ts">
   import {ITEM_TYPE_RECORD, ITEM_INFO_RECORD, type Item, type AnimalStaffItemInfo, type ArmourItemInfo, itemInfoIsTool, ItemType } from "webgl-test-shared";
   import CLIENT_ITEM_INFO_RECORD from "../../../game/client-item-info";
   import { gameUIState } from "../../../ui-state/game-ui-state";

   interface Props {
      readonly item: Item;
   }

   const props: Props = $props();
   const item = $derived(props.item);
    
   const clientItemInfo = $derived(CLIENT_ITEM_INFO_RECORD[item.type]);

   const itemCategory = $derived(ITEM_TYPE_RECORD[item.type]);
   const itemInfo = $derived(ITEM_INFO_RECORD[item.type]);
</script>

<div id="item-tooltip" style:left="{gameUIState.cursorX}px" style:top="{gameUIState.cursorY}px">
   <p class="item-name">{item.nickname !== "" ? '"' + item.nickname + '"' : clientItemInfo.name}</p>

   {#if itemCategory === "animalStaff"}
      <p>Control range: {(itemInfo as AnimalStaffItemInfo).controlRange} units</p>
   {/if}

   {#if itemCategory === "armour"}
      <p>Defence: {(itemInfo as ArmourItemInfo).defence * 100}%</p>
   {/if}

   {#if itemInfoIsTool(item.type, itemInfo)}
      <p>Damage: {itemInfo.damage}</p>
   {/if}

   <!-- @SQUEAM -->
    {#if item.type === ItemType.mrpebbles}
      <p>Damage: 1</p>
    {/if}

   {#if typeof clientItemInfo.flavourText !== "undefined"}
      <p class="flavour-text">{clientItemInfo.flavourText}</p>
   {/if}

   {#if item.namer !== ""}
      <p class="namer">Named by {item.namer}.</p>
   {/if}
</div>

<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap');

#item-tooltip {
   max-width: 320px;
   font-family: "Noto Sans";
   border: 3px solid #000;
   background-color: #808080;
   padding: 4px;
   position: absolute;
   pointer-events: none;
   z-index: 3;
   transform: scale(var(--zoom));
   transform-origin: 0% 0%;
   box-shadow: -3px -3px 0 0 #606060 inset, 3px 3px 0 0 #a5a5a5 inset;
}

#item-tooltip p {
   color: #ddd;
   font-size: 0.9rem;
   margin: 0;
   text-shadow: 2px 2px 2px rgba(0, 0, 0, 0.6);
}

#item-tooltip p.item-name {
   font-size: 1rem;
   color: #fff;
}

#item-tooltip p:not(:first-child) {
   margin: 0.2rem 0 0 2px;
}

#item-tooltip p.flavour-text {
   /* @Temporary? For the berryboy sad shot */
   /* font-size: 0.8rem; */
   font-size: 0.9rem;
   /* font-style: italic; */
   /* @Temporary? For the berryboy sad shot */
   /* color: #bbb; */
   color: #cfcfcf;
}

#item-tooltip p.namer {
   font-size: 0.8rem;
   font-style: italic;
   color: #bbb;
   margin-top: 0.4rem;
   /* shifted 1px in x y instead of 2px */
   text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.6);
}
</style>