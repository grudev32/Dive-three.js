/**
 * @author robp94 / https://github.com/robp94
 */
import { CONFIG } from '../core/Config.js';
import { GameEntity } from '../lib/yuka.module.js';

class HealthPack extends GameEntity {

	constructor( world ) {

		super();
		this.world = world;

		this.health = CONFIG.HEALTHPACK.HEALTH;
		this.currentTime = 0;
		this.nextSpawnTime = 0;
		this.displayed = true; //rename

		this.dontTrigger = true; //remove after update lib




	}

	update( delta ) {

		this.currentTime += delta;

		if ( ! this.displayed ) {

			if ( this.currentTime >= this.nextSpawnTime ) {

				this.world.spawningManager.reSpawnHealthPack( this );

			}

		}

	}

}
export { HealthPack };
