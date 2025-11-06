<script lang="ts">
   interface Props {
      readonly text: string;
      readonly isSelected: boolean;
      onClick(): void;
   }

   let props: Props = $props();
</script>
   
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<li
   onclick={props.onClick}
   class="option"
   class:selected={props.isSelected}
>
   <span class="text">{props.text}</span>
   {#if props.isSelected}
      <div class="selection-marker"></div>
   {/if}
</li>