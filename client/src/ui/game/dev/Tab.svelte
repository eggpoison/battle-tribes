<script lang="ts">
   import { TabType } from "../../../ui-state/tab-selector-state.svelte";
   import ItemTabImage from "src/images/ui/item-tab.png";
   import SummonTabImage from "src/images/ui/summon-tab.png";
   import TitlesTabImage from "src/images/ui/titles-tab.png";
   import TribesTabImage from "src/images/ui/tribes-tab.png";

   interface Props {
      readonly tabType: TabType;
      readonly selectedTabType: TabType | null;
      onClick(e: MouseEvent, tabType: TabType): void;
   }

   interface TabInfo {
      readonly text: string;
      readonly image: string;
   }

   const TAB_INFO_RECORD: Record<TabType, TabInfo> = {
      [TabType.items]: {
         text: "Items",
         image: ItemTabImage
      },
      [TabType.summon]: {
         text: "Summon",
         image: SummonTabImage
      },
      [TabType.titles]: {
         text: "Titles",
         image: TitlesTabImage
      },
      [TabType.tribes]: {
         text: "Tribes",
         image: TribesTabImage
      }
   };

   let props: Props = $props();

   const tabInfo = TAB_INFO_RECORD[props.tabType];
   const isSelected = props.tabType === props.selectedTabType;
</script>
   
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
   onmousedown={e => props.onClick(e, props.tabType)}
   class="tab-selector devmode-container"
   class:selected={isSelected}
>
   <img src={tabInfo.image} alt="" />
   <span>{tabInfo.text}</span>
</div>