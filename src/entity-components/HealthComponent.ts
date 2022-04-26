import Board from "../Board";
import Component from "../Component";
import SETTINGS from "../settings";

class HealthComponent extends Component {
    private health: number;
    
    private readonly maxHealth: number;
    private readonly regenerationRate: number;
    private readonly armour: number;

    constructor(maxHealth: number, startingHealth?: number, regenerationRate?: number, armour?: number) {
        super();

        this.health = startingHealth || maxHealth;
        this.maxHealth = maxHealth;
        this.regenerationRate = regenerationRate || 0;
        this.armour = armour || 0;
    }

    public tick(): void {
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

    public hurt(damage: number): void {
        this.health -= this.calculateDamageDealt(damage);

        if (this.health <= 0) {
            this.die();
        }
    }

    private die(): void {
        Board.removeEntity(this.getEntity());
    }
}

export default HealthComponent;