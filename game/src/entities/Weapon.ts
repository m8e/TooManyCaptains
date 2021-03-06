import { Game } from '../index';
import PlayerShip from './PlayerShip';
import { Enemy } from './Enemy';

const toDegrees = (radians: number) => radians * 180 / Math.PI;

class Beam extends Phaser.Sprite {
  public color: string;

  constructor(game: Game, key: string) {
    super(game, 0, 0, key);
    this.texture.baseTexture.scaleMode = PIXI.scaleModes.NEAREST;
    this.anchor.set(0.5);
    this.checkWorldBounds = true;
    this.outOfBoundsKill = true;
    this.exists = false;
    this.scale.set(1.5, 1.5);
    game.physics.enable(this, Phaser.Physics.ARCADE);
    this.body.setSize(28, 3.5, 15.5, 15.5);
  }

  public fire(x: number, y: number, angle: number, speed: number) {
    this.reset(x, y);
    this.angle = angle;
    this.game.physics.arcade.velocityFromAngle(
      angle,
      speed,
      this.body.velocity,
    );
  }
}

export class Weapon extends Phaser.Group {
  public game: Game;
  public bulletColor: string;
  public bulletDamage: number;
  public ship: Enemy;

  private bulletVelocity = 200;
  private fireRate: 250;
  private yOffset: number;
  private nextFire = 0;

  constructor(
    ship: Enemy,
    bulletDamage = 10,
    bulletColor = 'R',
    yOffset = 0,
    angle = 0,
  ) {
    super(
      ship.game,
      ship.game.world,
      'Single Bullet',
      false,
      true,
      Phaser.Physics.ARCADE,
    );
    this.ship = ship;

    this.bulletColor = bulletColor;

    this.nextFire = 0;
    this.bulletDamage = bulletDamage;
    this.bulletVelocity = -this.bulletVelocity;
    this.yOffset = yOffset;

    for (let i = 0; i < 64; i++) {
      const bullet = new Beam(ship.game, `beam_${bulletColor}`);
      bullet.angle = angle;
      bullet.color = bulletColor;
      this.add(bullet, true);
    }
  }

  public fire(): boolean {
    if (this.game.time.time < this.nextFire) {
      return false;
    }

    const x = this.ship.x;
    const y = this.ship.y + this.yOffset;

    const angleToPlayer = toDegrees(
      this.game.physics.arcade.angleToXY(this.game.player, x, y),
    );
    this.getFirstExists(false).fire(
      x,
      y,
      angleToPlayer,
      this.bulletVelocity,
      0,
      600,
    );
    this.nextFire = this.game.time.time + this.fireRate;
    return true;
  }
}

export class Bullet extends Phaser.Sprite {
  public color: string;
  public strength = 0;

  constructor(game: Game, key: string) {
    super(game, 0, 0, key);
    this.texture.baseTexture.scaleMode = PIXI.scaleModes.NEAREST;
    this.anchor.set(0.5);
    this.checkWorldBounds = true;
    this.outOfBoundsKill = true;
    this.exists = false;
    const scale = 0.25;
    this.scale.set(scale, scale);
    this.scale.x = -this.scale.x;
    game.physics.enable(this, Phaser.Physics.ARCADE);
    this.body.setSize(350, 100, 0, 25);
  }

  public fire(x: number, y: number, speed: number, strength: number) {
    this.reset(x, y);
    this.angle = 0;
    this.strength = 50 * strength;
    const scale = 0.25 * (1 + strength * 1.5);
    console.log(`bullet damage: ${this.strength}`);
    this.scale.set(scale, scale);
    this.game.physics.arcade.velocityFromAngle(
      this.angle,
      speed,
      this.body.velocity,
    );
  }
}

export class PlayerWeapon extends Phaser.Group {
  public game: Game;
  public ship: PlayerShip;
  public nextFire = 0;
  public bulletVelocity = 400;
  public fireRate = 100;
  public color: string;

  constructor(ship: PlayerShip, color = 'R') {
    super(
      ship.game,
      ship.game.world,
      'Player Bullet',
      false,
      true,
      Phaser.Physics.ARCADE,
    );
    this.ship = ship;
    this.color = color;
    this.bulletVelocity = this.bulletVelocity;

    for (let i = 0; i < 64; i++) {
      const bullet = new Bullet(this.game, `bullet_shoot_${color}`);
      bullet.color = color;
      this.add(bullet, true);
    }
  }

  public fire(strength: number) {
    if (this.game.time.time < this.nextFire) {
      return false;
    }
    console.info(`firing with strength: ${strength}`);

    const x = this.ship.x + this.ship.width / 2;
    const y = this.ship.y;

    this.getFirstExists(false).fire(x, y, this.bulletVelocity, strength);
    this.nextFire = this.game.time.time + this.fireRate;
    return true;
  }
}
