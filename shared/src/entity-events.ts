import { ItemType } from "./items/items";

// @Cleanup: rename to entity-tick-events

export const enum EntityTickEventType {
   cowFart,
   fireBow
}

const EventDataTypes = {
   [EntityTickEventType.cowFart]: (): unknown => 0 as any,
   [EntityTickEventType.fireBow]: (): ItemType => 0 as any,
} satisfies Record<EntityTickEventType, () => unknown>;

export type EntityEventData<T extends EntityTickEventType> = ReturnType<typeof EventDataTypes[T]>;

export interface EntityTickEvent<T extends EntityTickEventType = EntityTickEventType> {
   readonly entityID: number;
   readonly type: T;
   readonly data: EntityEventData<T>;
}