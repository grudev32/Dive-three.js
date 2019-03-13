import { GameEntity, MovingEntity, Vector3, AABB, MathUtils } from '../lib/yuka.module.js';
import { LoopOnce } from '../lib/three.module.js';
import { WeaponSystem } from './WeaponSystem.js';
import { CONFIG } from '../core/Config.js';
import { Projectile } from '../weapons/Projectile.js';
import { STATUS_ALIVE, WEAPON_TYPES_ASSAULT_RIFLE, MESSAGE_HIT, MESSAGE_DEAD, STATUS_DYING, STATUS_DEAD } from '../core/Constants.js';

const startPosition = new Vector3();
const endPosition = new Vector3();
const intersectionPoint = new Vector3();
const targetPosition = new Vector3();
const projectile = new Projectile();

/**
* Class for representing the human player of the game.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Player extends MovingEntity {

	/**
	* Constructs a new player object.
	*
	* @param {World} world - A reference to the world.
	*/
	constructor( world ) {

		super();

		this.world = world;

		this.currentTime = 0;
		this.boundingRadius = CONFIG.PLAYER.BOUNDING_RADIUS;
		this.height = CONFIG.PLAYER.HEAD_HEIGHT;
		this.updateOrientation = false;
		this.maxSpeed = CONFIG.PLAYER.MAX_SPEED;
		this.health = CONFIG.PLAYER.MAX_HEALTH;
		this.isPlayer = true;

		this.status = STATUS_ALIVE;

		// the camera is attached to the player's head

		this.head = new GameEntity();
		this.head.forward.set( 0, 0, - 1 );
		this.add( this.head );

		// death animation

		this.endTimeDying = Infinity;
		this.dyingTime = CONFIG.PLAYER.DYING_TIME;

		// the weapons are attached to the following container entity

		this.weaponContainer = new GameEntity();
		this.head.add( this.weaponContainer );

		// the player uses the weapon system, too

		this.weaponSystem = new WeaponSystem( this, true );
		this.weaponSystem.init();

		//

		this.bounds = new AABB();
		this.boundsDefinition = new AABB( new Vector3( - 0.5, 0, - 0.5 ), new Vector3( 0.5, 1.8, 0.5 ) );

		//

		this.audios = new Map();

		//

		this.mixer = null;
		this.animations = new Map();

		//

		this.currentRegion = null;

		// TODO: Only for dev

		this.deactivate();

	}

	/**
	* Updates the internal state of this game entity.
	*
	* @param {Number} delta - The time delta.
	* @return {Player} A reference to this game entity.
	*/
	update( delta ) {

		startPosition.copy( this.position );

		super.update( delta );

		this.currentTime += delta;

		endPosition.copy( this.position );

		// ensure the player stays inside its navmesh

		this.currentRegion = this.world.navMesh.clampMovement(
			this.currentRegion,
			startPosition,
			endPosition,
			this.position
		);

		//

		if ( this.status === STATUS_ALIVE ) {

			// update weapon system

			this.weaponSystem.updateWeaponChange();

			// update bounds

			this.bounds.copy( this.boundsDefinition ).applyMatrix4( this.worldMatrix );

		}

		// handle dying

		if ( this.status === STATUS_DYING ) {

			if ( this.currentTime >= this.endTimeDying ) {

				this.status = STATUS_DEAD;
				this.endTimeDying = Infinity;

			}

		}

		// handle death

		if ( this.status === STATUS_DEAD ) {

			if ( this.world.debug ) console.log( 'DIVE.Player: Player died.' );

			this.world.spawningManager.respawnCompetitor( this );

			this.reset();

		}

		//

		this.mixer.update( delta );

		return this;

	}

	/**
	* Resets the player after a death.
	*
	* @return {Enemy} A reference to this game entity.
	*/
	reset() {

		this.rotation.set( 0, 0, 0, 1 );

		this.health = CONFIG.PLAYER.MAX_HEALTH;
		this.status = STATUS_ALIVE;

		this.weaponSystem.reset();

		this.world.fpsControls.reset();

		this.world.uiManager.showFPSInterface();

		return this;

	}

	/**
	* Inits the death of the player.
	*
	* @return {Player} A reference to this game entity.
	*/
	initDeath() {

		this.status = STATUS_DYING;
		this.endTimeDying = this.currentTime + this.dyingTime;

		this.velocity.set( 0, 0, 0 );

		const animation = this.animations.get( 'player_death' );
		animation.stop();
		animation.play();

		this.weaponSystem.hideCurrentWeapon();

		this.world.fpsControls.active = false;
		this.world.uiManager.hideFPSInterface();

		return this;

	}

	/**
	* Fires a round at the player's target with the current armed weapon.
	*
	* @return {Player} A reference to this game entity.
	*/
	shoot() {

		const head = this.head;
		const world = this.world;

		// simulate a shot in order to retrieve the closest intersection point

		const ray = projectile.ray;

		head.getWorldPosition( ray.origin );
		head.getWorldDirection( ray.direction );

		projectile.owner = this;

		const result = world.checkProjectileIntersection( projectile, intersectionPoint );

		// now calculate the distance to the closest intersection point. if no point was found,
		// choose a point on the ray far away from the origin

		const distance = ( result === null ) ? 1000 : ray.origin.distanceTo( intersectionPoint );
		targetPosition.copy( ray.origin ).add( ray.direction.multiplyScalar( distance ) );

		// fire

		this.weaponSystem.shoot( targetPosition );

		return this;

	}

	/**
	* Reloads the current weapon of the player.
	*
	* @return {Player} A reference to this game entity.
	*/
	reload() {

		this.weaponSystem.reload();

		return this;

	}

	/**
	* Changes the weapon to the defined type.
	*
	* @param {WEAPON_TYPES} type - The weapon type.
	* @return {Player} A reference to this game entity.
	*/
	changeWeapon( type ) {

		this.weaponSystem.setNextWeapon( type );

		return this;

	}

	/**
	* Indicates if the player does currently use an automatic weapon.
	*
	* @return {Boolean} Whether an automatic weapon is used or not.
	*/
	isAutomaticWeaponUsed() {

		return ( this.weaponSystem.currentWeapon.type === WEAPON_TYPES_ASSAULT_RIFLE );

	}

	/**
	* Activates this game entity. Enemies will shot at the player and
	* the current weapon is rendered.
	*
	* @return {Player} A reference to this game entity.
	*/
	activate() {

		this.active = true;
		this.weaponSystem.currentWeapon._renderComponent.visible = true;

		return this;

	}

	/**
	* Deactivates this game entity. Enemies will not shot at the player and
	* the current weapon is not rendered.
	*
	* @return {Player} A reference to this game entity.
	*/
	deactivate() {

		this.active = false;
		this.weaponSystem.currentWeapon._renderComponent.visible = false;

		return this;

	}

	/**
	* Returns the intesection point if a projectile intersects with this entity.
	* If no intersection is detected, null is returned.
	*
	* @param {Ray} ray - The ray that defines the trajectory of this bullet.
	* @param {Vector3} intersectionPoint - The intersection point.
	* @return {Vector3} The intersection point.
	*/
	checkProjectileIntersection( ray, intersectionPoint ) {

		return ray.intersectAABB( this.bounds, intersectionPoint );

	}

	/**
	* Sets the animations of this game entity by creating a
	* series of animation actions.
	*
	* @param {AnimationMixer} mixer - The animation mixer.
	* @param {Array} clips - An array of animation clips.
	* @return {Player} A reference to this game entity.
	*/
	setAnimations( mixer, clips ) {

		this.mixer = mixer;

		// actions

		for ( const clip of clips ) {

			const action = mixer.clipAction( clip );
			action.loop = LoopOnce;
			action.name = clip.name;

			this.animations.set( action.name, action );

		}

		return this;

	}

	/**
	* Holds the implementation for the message handling of this game entity.
	*
	* @param {Telegram} telegram - The telegram with the message data.
	* @return {Boolean} Whether the message was processed or not.
	*/
	handleMessage( telegram ) {

		switch ( telegram.message ) {

			case MESSAGE_HIT:

				// play audio

				const audio = this.audios.get( 'impact' + MathUtils.randInt( 1, 7 ) );
				if ( audio.isPlaying === true ) audio.stop();
				audio.play();

				// reduce health

				this.health -= telegram.data.damage;

				// logging

				if ( this.world.debug ) {

					console.log( 'DIVE.Player: Player hit by Game Entity with ID %s receiving %i damage.', telegram.sender.uuid, telegram.data.damage );

				}

				// check if the player is death

				if ( this.health <= 0 && this.status === STATUS_ALIVE ) {

					this.initDeath();

					// inform all other competitors about its death

					const competitors = this.world.competitors;

					for ( let i = 0, l = competitors.length; i < l; i ++ ) {

						const competitor = competitors[ i ];

						if ( this !== competitor ) this.sendMessage( competitor, MESSAGE_DEAD );

					}

				}

				break;

		}

		return true;

	}

}


export { Player };
