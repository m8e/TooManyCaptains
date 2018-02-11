import _ from 'lodash';
import Stats from 'stats.js';
import Main from './states/Main';
import Boot from './states/Boot';
import Before from './states/Before';
import Preload from './states/Preload';
import After from './states/After';
import './index.css';
import GameServer from './GameServer';
import { Packet } from '../../common/types';
import { Captain } from './types';
import PlayerShip from './entities/PlayerShip';

function getUrlParams(search: string) {
  const hashes = search.slice(search.indexOf('?') + 1).split('&');
  const params = {};
  hashes.forEach(hash => {
    const [key, val] = hash.split('=');
    params[key] = decodeURIComponent(val);
  });

  return params;
}

interface Config {
  debug: boolean;
  skip: boolean;
  invulnerable: boolean;
  local: boolean;
  serverURL: string;
  noCards: boolean;
}

function getConfig() {
  const urlParams = getUrlParams(window.location.search);

  const config: Config = {
    debug: _.has(urlParams, 'debug'),
    skip: _.has(urlParams, 'skip'),
    invulnerable: _.has(urlParams, 'invuln'),
    local: _.has(urlParams, 'local'),
    noCards: _.has(urlParams, 'nocards'),
    serverURL: 'http://server.toomanycaptains.com',
  };
  if (config.local) {
    config.serverURL = 'http://localhost:9000';
  }
  return config;
}

export class Game extends Phaser.Game {
  public params: Config;
  public server: GameServer;
  public captains: Captain[];
  public player: PlayerShip;
  public score: number;

  constructor() {
    super(1920, 1080, Phaser.CANVAS, 'surface');
    this.state.add('Boot', Boot, false);
    this.state.add('Preload', Preload, false);
    this.state.add('Before', Before, false);
    this.state.add('Main', Main, false);
    this.state.add('After', After, false);

    this.params = getConfig();

    // Kick things off with the boot state.
    this.state.start('Boot');
    this.bindServerEvents();

    if (this.params.debug) {
      this.setupPerformanceStatistics();
    }
  }

  private bindServerEvents() {
    this.server = new GameServer(this.params.serverURL);
    const gameMainState = this.state.states.Main;

    this.server.socket.on('packet', (packet: Packet) => {
      if (this.params.debug) {
        console.log(packet);
      }

      if (packet.kind === 'wiring' && this.state.current === 'Main') {
        if (packet.subsystem === 'weapons') {
          gameMainState.onWeaponsChanged(packet.wires);
        } else if (packet.subsystem === 'shields') {
          gameMainState.onShieldsChanged(packet.wires);
        } else if (packet.subsystem === 'thrusters') {
          gameMainState.onThrustersChanged(packet.wires);
        } else if (packet.subsystem === 'repairs') {
          gameMainState.onRepairsChanged(packet.wires);
        }
      } else if (packet.kind === 'move' && this.state.current === 'Main') {
        if (packet.state === 'released') {
          gameMainState.onMoveStop();
        } else if (packet.direction === 'up') {
          gameMainState.onMoveUp();
        } else if (packet.direction === 'down') {
          gameMainState.onMoveDown();
        }
      } else if (packet.kind === 'fire') {
        if (this.state.current === 'Before' && packet.state === 'released') {
          this.state.start('Main');
        } else if (
          this.state.current === 'After' &&
          packet.state === 'released'
        ) {
          this.state.start('Main');
        } else if (this.state.current === 'Main') {
          gameMainState.onFire(packet.state);
        }
      } else if (packet.kind === 'scan') {
        if (this.state.current === 'Before') {
          // TODO
        } else if (this.state.current === 'Main') {
          const captain = this.captains.find(c => c.number === packet.captain);
          if (!captain) {
            throw Error('captain not in game!');
          }
          if (captain.charge === 1) {
            captain.charge = 0;
            const value = this.player.batteries[packet.subsystem];
            this.player.batteries[packet.subsystem] = Math.min(value + 7.5, 15);
          }
          gameMainState.onShieldsChanged(this.player.shieldColors);
        }
      }
    });
  }

  private setupPerformanceStatistics() {
    // Setup the new stats panel.
    const stats = new Stats();
    document.body.appendChild(stats.dom);

    // Monkey-patch the update loop so we can track the timing.
    const updateLoop = this.update;
    this.update = (...args: any[]) => {
      stats.begin();
      updateLoop.apply(this, args);
      stats.end();
    };
  }
}

// tslint:disable-next-line:no-unused-expression
new Game();