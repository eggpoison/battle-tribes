import { ItemRestTime } from "../game/player-action-handler";

let hotbarChargeElapsedTicks = $state(-1);
let hotbarChargeDuration = $state(-1);
let offhandChargeElapsedTicks = $state(-1);
let offhandChargeDuration = $state(-1);

let hotbarItemRestTime = $state<ItemRestTime>({ remainingTimeTicks: 0, durationTicks: 0, itemSlot: 1 });
let offhandItemRestTime = $state<ItemRestTime>({ remainingTimeTicks: 0, durationTicks: 0, itemSlot: 1 });

export const playerActionState = {
   get hotbarChargeElapsedTicks() {
      return hotbarChargeElapsedTicks;
   },
   setHotbarChargeElapsedTicks(newHotbarChargeElapsedTicks: number): void {
      hotbarChargeElapsedTicks = newHotbarChargeElapsedTicks;
   },

   get hotbarChargeDuration() {
      return hotbarChargeDuration;
   },
   setHotbarChargeDuration(newHotbarChargeDuration: number): void {
      hotbarChargeDuration = newHotbarChargeDuration;
   },

   get offhandChargeElapsedTicks() {
      return offhandChargeElapsedTicks;
   },
   setOffhandChargeElapsedTicks(newOffhandChargeElapsedTicks: number): void {
      offhandChargeElapsedTicks = newOffhandChargeElapsedTicks;
   },

   get offhandChargeDuration() {
      return offhandChargeDuration;
   },
   setOffhandChargeDuration(newOffhandChargeDuration: number): void {
      offhandChargeDuration = newOffhandChargeDuration;
   },

   get hotbarItemRestTime() {
      return hotbarItemRestTime;
   },
   setHotbarItemRestTime(newHotbarItemRestTime: ItemRestTime): void {
      hotbarItemRestTime = newHotbarItemRestTime;
   },

   get offhandItemRestTime() {
      return offhandItemRestTime;
   },
   setOffhandItemRestTime(newOffhandItemRestTime: ItemRestTime): void {
      offhandItemRestTime = newOffhandItemRestTime;
   },

   decreaseItemRestTimes(): void {
      if (hotbarItemRestTime.remainingTimeTicks > 0) {
         hotbarItemRestTime.remainingTimeTicks--;
      }
      if (offhandItemRestTime.remainingTimeTicks > 0) {
         offhandItemRestTime.remainingTimeTicks--;
      }
   }
};