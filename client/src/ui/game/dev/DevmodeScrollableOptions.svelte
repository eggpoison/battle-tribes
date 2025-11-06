<script lang="ts">
   import DevmodeScrollableOption from "./DevmodeScrollableOption.svelte";

   interface Props {
      readonly options: ReadonlyArray<string>;
      onOptionSelect(optionIdx: number): void;
   }

   let props: Props = $props();

   let selectedOptionIdx = $state(0);
   
</script>

<div class="devmode-scrollable-options devmode-menu-section flex-container">
   <ul>
      {#each props.options as _, i}
         {#if i > 0}
            {@const isBright = i === selectedOptionIdx || i === selectedOptionIdx + 1}
            <div class="separator" class:bright={isBright}></div>
         {/if}

         {@const text = props.options[i]}
         <DevmodeScrollableOption text={text} isSelected={i === selectedOptionIdx} onClick={() => { selectedOptionIdx = i; props.onOptionSelect(i) }} />
      {/each}
   </ul>
</div>