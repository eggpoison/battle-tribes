import Component from "../Component";
import Entity from "../Entity";
import SETTINGS from "../settings";

class HealthComponent extends Component {
    private health: number;
    
    private readonly maxHealth: number;
    private readonly regenerationRate: number;
    private readonly armour: number;
    private lifespan: number | null;

    constructor(maxHealth: number, startingHealth?: number, regenerationRate?: number, armour?: number, lifespan?: number) {
        super();

        this.health = startingHealth || maxHealth;
        this.maxHealth = maxHealth;
        this.regenerationRate = regenerationRate || 0;
        this.armour = armour || 0;
        this.lifespan = lifespan || null;
    }

    public tick(): void {
        if (this.lifespan !== null) {
            this.lifespan -= 1 / SETTINGS.tps;

            if (this.lifespan <= 0) {
                this.die(null);
            }
            return;
        }

        const regenAmount = this.regenerationRate / SETTINGS.tps;
        this.health += regenAmount;
        if (this.health > this.maxHealth) this.health = this.maxHealth;
    }

    public getHealth(): number {
        return this.health;
    }

    private calculateDamageDealt(damage: number): number {
        return Math.max(damage - this.armour, 0);
    }

    public hurt(damage: number, attackingEntity: Entity): void {
        this.health -= this.calculateDamageDealt(damage);

        if (this.health <= 0) {
            this.die(attackingEntity);
        }
    }

    private die(causeOfDeath: Entity | null): void {
        const entity = this.getEntity();

        if (typeof entity.onDie !== "undefined") {
            entity.onDie(causeOfDeath);
        }
    }
}

export default HealthComponent;