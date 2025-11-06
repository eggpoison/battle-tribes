import { ItemType } from "./items/items";

// @Cleanup: rename to entity-tick-events

// @Cleanup: remove this, this is all so shit lool

export enum EntityTickEventType {
   cowFart,
   fireBow,
   automatonAccident,
   cowEat,
   dustfleaLatch,
   tongueGrab,
   tongueLaunch,
   tongueLick,
   dustfleaEggPop,
   okrenEyeHitSound,
   foodMunch,
   foodBurp,
   inguSerpentAngry,
   inguSerpentLeap,
   tukmokAngry
}

const EventDataTypes = {
   [EntityTickEventType.cowFart]: (): unknown => 0 as any,
   [EntityTickEventType.fireBow]: (): ItemType => 0 as any,
   [EntityTickEventType.automatonAccident]: (): unknown => 0 as any,
   [EntityTickEventType.cowEat]: (): unknown => 0 as any,
   [EntityTickEventType.dustfleaLatch]: (): unknown => 0 as any,
   [EntityTickEventType.tongueGrab]: (): unknown => 0 as any,
   [EntityTickEventType.tongueLaunch]: (): unknown => 0 as any,
   [EntityTickEventType.tongueLick]: (): unknown => 0 as any,
   [EntityTickEventType.dustfleaEggPop]: (): unknown => 0 as any,
   [EntityTickEventType.okrenEyeHitSound]: (): unknown => 0 as any,
   [EntityTickEventType.foodMunch]: (): unknown => 0 as any,
   [EntityTickEventType.foodBurp]: (): unknown => 0 as any,
   [EntityTickEventType.inguSerpentAngry]: (): unknown => 0 as any,
   [EntityTickEventType.inguSerpentLeap]: (): unknown => 0 as any,
   [EntityTickEventType.tukmokAngry]: (): unknown => 0 as any,
} satisfies Record<EntityTickEventType, () => unknown>;

export type EntityEventData<T extends EntityTickEventType> = ReturnType<typeof EventDataTypes[T]>;

export interface EntityTickEvent<T extends EntityTickEventType = EntityTickEventType> {
   readonly entityID: number;
   readonly type: T;
   readonly data: EntityEventData<T>;
}