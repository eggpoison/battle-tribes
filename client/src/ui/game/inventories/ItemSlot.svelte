<script lang="ts">
   import { type Item } from "webgl-test-shared";
   import { getItemTypeImage } from "../../../game/client-item-info";
   import { type ItemRestTime } from "../../../game/player-action-handler";
   import type { HTMLAttributes } from "svelte/elements";
   import { itemTooltipState } from "../../../ui-state/item-tooltip-state.svelte";
   import { onDestroy } from "svelte";

   interface Props extends HTMLAttributes<HTMLDivElement> {
      item: Item | null;
      isSelected?: boolean;
      placeholderImg?: any;
      restTime?: ItemRestTime;
      onmousedown?(e: MouseEvent): void;
      onmouseover?(e: MouseEvent): void;
      onmouseout?(e: MouseEvent): void;
      onmousemove?(e: MouseEvent): void;
      oncontextmenu?(e: MouseEvent): void;
   }

   let { item, isSelected, placeholderImg, restTime, onmousedown, onmouseover, onmouseout, onmousemove, oncontextmenu, ...rest }: Props = $props();

   const img = $derived(item !== null ? getItemTypeImage(item.type) : placeholderImg);

   const onMouseOver = (e: MouseEvent): void => {
      onmouseover?.(e);

      itemTooltipState.setItem(item);
   }

   const onMouseMove = (e: MouseEvent): void => {
      onmousemove?.(e);
   }

   const onMouseOut = (e: MouseEvent): void => {
      onmouseout?.(e);

      if (itemTooltipState.item === item) {
         itemTooltipState.setItem(null);
      }
   }

   onDestroy(() => {
      // If the player is hovering over the item when the menu is closed, the onMouseOut function won't be triggered, so we have to also clear the item tooltip when it's destroyed
      if (itemTooltipState.item === item) {
         itemTooltipState.setItem(null);
      }
   });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<div
   oncontextmenu={oncontextmenu}
   onmouseover={onMouseOver}
   onmouseout={onMouseOut}
   onmousemove={onMouseMove}
   onmousedown={onmousedown}
   class="item-slot{typeof rest.class !== "undefined" ? " " + rest.class : ""}"
   class:selected={isSelected}
   class:empty={typeof item === "undefined"}
>
   {#if typeof img !== "undefined"}
      <img src={img} draggable={false} alt="" />
   {/if}
   {#if item !== null}
      <div class="item-count">{item.count !== 1 ? item.count : ""}</div>
   {/if}
   {#if (typeof restTime !== "undefined" && restTime.durationTicks > 0)}
      <div class="cooldown-bg" style:--cooldown="{restTime.remainingTimeTicks / restTime.durationTicks}"></div>
   {/if}
</div>