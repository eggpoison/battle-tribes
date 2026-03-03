<script lang="ts">
   import { Menu, menuSelectorState } from "../../../ui-state/menu-selector-state";
   import ItemTabImage from "/src/images/ui/item-tab.png";
   import SummonTabImage from "/src/images/ui/summon-tab.png";
   import TitlesTabImage from "/src/images/ui/titles-tab.png";
   import TribesTabImage from "/src/images/ui/tribes-tab.png";

   interface Props {
      readonly menu: Menu;
      onClick(e: MouseEvent, menu: Menu): void;
   }

   interface TabInfo {
      readonly text: string;
      readonly image: string;
   }

   const TAB_INFO_RECORD: Partial<Record<Menu, TabInfo>> = {
      [Menu.itemsDevTab]: {
         text: "Items",
         image: ItemTabImage
      },
      [Menu.summonDevTab]: {
         text: "Summon",
         image: SummonTabImage
      },
      [Menu.titlesDevTab]: {
         text: "Titles",
         image: TitlesTabImage
      },
      [Menu.tribesDevTab]: {
         text: "Tribes",
         image: TribesTabImage
      }
   };

   let props: Props = $props();

   const tabInfo = $derived(TAB_INFO_RECORD[props.menu]!);
   const isSelected = $derived(menuSelectorState.menuIsOpen(props.menu));
</script>
   
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
   onmousedown={e => props.onClick(e, props.menu)}
   class="tab-selector devmode-container"
   class:selected={isSelected}
>
   <img src={tabInfo.image} alt="" />
   <span>{tabInfo.text}</span>
</div>