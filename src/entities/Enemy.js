import { Vehicle, Regulator, Think, FollowPathBehavior, Vector3, Vision, MemorySystem, GameEntity, Quaternion, AABB } from '../lib/yuka.module.js';
import { ExploreEvaluator } from './Evaluators.js';
import { WeaponSystem } from './WeaponSystem.js';
import { TargetSystem } from './TargetSystem.js';
import { CONFIG } from '../core/Config.js';
import { MESSAGE_HIT, SPAWN_HEALTH, ENTITY_STATUS_ALIVE, ENTITY_STATUS_DIEING, ENTITY_STATUS_DEAD } from '../core/Constants.js';

const positiveWeightings = new Array();
const weightings = [ 0, 0, 0, 0 ];
const directions = [
	{ direction: new Vector3( 0, 0, 1 ), name: 'soldier_forward' },
	{ direction: new Vector3( 0, 0, - 1 ), name: 'soldier_backward' },
	{ direction: new Vector3( - 1, 0, 0 ), name: 'soldier_left' },
	{ direction: new Vector3( 1, 0, 0 ), name: 'soldier_right' }
];
const lookDirection = new Vector3();
const moveDirection = new Vector3();
const quaternion = new Quaternion();
const transformedDirection = new Vector3();
const worldPosition = new Vector3();

/**
* Class for representing the opponent bots in this game.
*
* @author {@link https://github.com/Mugen87|Mugen87}
*/
class Enemy extends Vehicle {

	/**
	* Constructs a new enemy with the given values.
	*
	* @param {GameEntity} owner - The owner of this weapon system.
	*/
	constructor() {

		super();

		this.currentTime = 0;
		this.maxSpeed = CONFIG.BOT.MOVEMENT.MAXSPEED;
		this.updateOrientation = false;

		this.world = null;

		this.health = SPAWN_HEALTH;
		this.status = ENTITY_STATUS_ALIVE;

		// head

		this.head = new GameEntity();
		this.head.position.y = CONFIG.BOT.HEAD.HEIGHT;
		this.add( this.head );

		// hitbox

		this.defaultHitbox = new AABB( new Vector3( - 0.4, 0, - 0.4 ), new Vector3( 0.4, 1.8, 0.4 ) );
		this.currentHitbox = new AABB();

		// animation

		this.mixer = null;
		this.animations = new Map();

		// navigation

		this.navMesh = null;
		this.path = null;
		this.from = new Vector3();
		this.to = new Vector3();

		// goal-driven agent design

		this.brain = new Think( this );
		this.brain.addEvaluator( new ExploreEvaluator() );

		this.goalArbitrationRegulator = new Regulator( CONFIG.BOT.GOAL.UPDATE_FREQUENCY );

		// memory

		this.memorySystem = new MemorySystem();
		this.memorySystem.memorySpan = CONFIG.BOT.MEMORY.SPAN;
		this.memoryRecords = new Array();

		// steering

		const followPathBehavior = new FollowPathBehavior();
		followPathBehavior.active = false;
		followPathBehavior.nextWaypointDistance = CONFIG.BOT.NAVIGATION.NEXT_WAYPOINT_DISTANCE;
		followPathBehavior._arrive.deceleration = CONFIG.BOT.NAVIGATION.ARRIVE_DECELERATION;
		this.steering.add( followPathBehavior );

		// vision

		this.vision = new Vision( this.head );
		this.visionRegulator = new Regulator( CONFIG.BOT.VISION.UPDATE_FREQUENCY );

		// target system

		this.targetSystem = new TargetSystem( this );
		this.targetSystemRegulator = new Regulator( CONFIG.BOT.TARGET_SYSTEM.UPDATE_FREQUENCY );

		// weapon system

		this.weaponSystem = new WeaponSystem( this );
		this.weaponSelectionRegulator = new Regulator( CONFIG.BOT.WEAPON.UPDATE_FREQUENCY );

		// debug

		this.pathHelper = null;
		this.hitboxHelper = null;

	}

	/**
	* Executed when this game entity is updated for the first time by its entity manager.
	*
	* @return {Enemy} A reference to this game entity.
	*/
	start() {

		const run = this.animations.get( 'soldier_forward' );
		run.enabled = true;

		const level = this.manager.getEntityByName( 'level' );
		this.vision.addObstacle( level );

		this.weaponSystem.init();

		return this;

	}

	reset() {

		this.status = ENTITY_STATUS_ALIVE;
		this.health = SPAWN_HEALTH;

		this.velocity.set( 0, 0, 0 );

		this.brain.clearSubgoals();

		this.memoryRecords.length = 0;

		for ( let record of this.memorySystem.records ) {

			record.visible = false;

		}

		this.targetSystem.reset();


		this.weaponSystem.reset();

		for ( let behavior of this.steering.behaviors ) {

			behavior.active = false;

		}

		for ( let animation of this.animations ) {

			animation.enabled = true;

		}

		const run = this.animations.get( 'soldier_forward' );
		run.enabled = true;

	}

	/**
	* Updates the internal state of this game entity.
	*
	* @param {Number} delta - The time delta.
	* @return {Enemy} A reference to this game entity.
	*/
	update( delta ) {

		super.update( delta );

		this.currentTime += delta;

		// update hitbox

		if ( this.status === ENTITY_STATUS_ALIVE ) {

			this.currentHitbox.copy( this.defaultHitbox ).applyMatrix4( this.worldMatrix );

			// update perception

			if ( this.visionRegulator.ready() ) {

				this.updateVision();

			}

			// update memory system

			this.memorySystem.getValidMemoryRecords( this.currentTime, this.memoryRecords );

			// update target system

			if ( this.targetSystemRegulator.ready() ) {

				this.targetSystem.update();

			}

			// update goals

			this.brain.execute();

			if ( this.goalArbitrationRegulator.ready() ) {

				this.brain.arbitrate();

			}

			// update weapon system

			if ( this.weaponSelectionRegulator.ready() ) {

				this.weaponSystem.selectBestWeapon();

			}

			// try to aim and shoot at a target

			this.weaponSystem.aimAndShoot( delta );

		}

		if ( this.status === ENTITY_STATUS_DIEING ) {

		}

		if ( this.status === ENTITY_STATUS_DEAD ) {

			console.log( this.uuid + "dead" );

			this.world.spawningManager.respawnEnemy( this );
			this.reset();


		}

		// update animations

		this.updateAnimations( delta );

		return this;

	}

	/**
	* Updates the vision component of this game entity and stores
	* the result in the respective memory system.
	*
	* @return {Enemy} A reference to this game entity.
	*/
	updateVision() {

		const memorySystem = this.memorySystem;
		const vision = this.vision;

		const enemies = this.world.enemies;

		for ( let i = 0, l = enemies.length; i < l; i ++ ) {

			const enemy = enemies[ i ];

			if ( enemy === this ) continue;

			if ( memorySystem.hasRecord( enemy ) === false ) {

				memorySystem.createRecord( enemy );

			}

			const record = memorySystem.getRecord( enemy );

			enemy.head.getWorldPosition( worldPosition );

			if ( vision.visible( worldPosition ) === true ) {

				record.timeLastSensed = this.currentTime;
				record.lastSensedPosition.copy( enemy.position ); // it's intended to use the body's position here
				if ( record.visible === false ) record.timeBecameVisible = this.currentTime;
				record.visible = true;

			} else {

				record.visible = false;

			}

		}

		return this;

	}

	/**
	* Updates the animations of this game entity.
	*
	* @param {Number} delta - The time delta.
	* @return {Enemy} A reference to this game entity.
	*/
	updateAnimations( delta ) {

		// directions

		this.getDirection( lookDirection );
		moveDirection.copy( this.velocity ).normalize();

		// rotation

		quaternion.lookAt( this.forward, moveDirection, this.up );

		// calculate weightings for movement animations

		positiveWeightings.length = 0;
		let sum = 0;

		for ( let i = 0, l = directions.length; i < l; i ++ ) {

			transformedDirection.copy( directions[ i ].direction ).applyRotation( quaternion );
			const dot = transformedDirection.dot( lookDirection );
			weightings[ i ] = ( dot < 0 ) ? 0 : dot;
			const animation = this.animations.get( directions[ i ].name );

			if ( weightings[ i ] > 0.001 ) {

				animation.enabled = true;
				positiveWeightings.push( i );
				sum += weightings[ i ];

			} else {

				animation.enabled = false;
				animation.weight = 0;

			}

		}

		// the weightings for enabled animations have to be calculated in an additional
		// loop since the sum of weightings of all enabled animations has to be 1

		for ( let i = 0, l = positiveWeightings.length; i < l; i ++ ) {

			const index = positiveWeightings[ i ];
			const animation = this.animations.get( directions[ index ].name );
			animation.weight = weightings[ index ] / sum;

			// scale the animtion based on the actual velocity

			animation.timeScale = this.getSpeed() / this.maxSpeed;

		}

		this.mixer.update( delta );

		return this;

	}

	/**
	* Sets the animations of this game entity by creating a
	* series of animation actions.
	*
	* @param {AnimationMixer} mixer - The animation mixer.
	* @param {Array} clips - An array of animation clips.
	* @return {Enemy} A reference to this game entity.
	*/
	setAnimations( mixer, clips ) {

		this.mixer = mixer;

		// actions

		for ( const clip of clips ) {

			const action = mixer.clipAction( clip );
			action.play();
			action.enabled = false;
			action.name = clip.name;

			this.animations.set( action.name, action );

		}

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

		return ray.intersectAABB( this.currentHitbox, intersectionPoint );

	}

	/**
	* Holds the implementation for the message handling of this game entity.
	*
	* @param {Telegram} telegram - The telegram with the message data.
	* @return {Boolean} Whether the message was processed or not.
	*/
	handleMessage( telegram ) {

		switch ( telegram.message ) {

			case MESSAGE_HIT: this.health -= telegram.data.damage;
				if ( this.health < 0 && this.status === ENTITY_STATUS_ALIVE ) {

					this.status = ENTITY_STATUS_DEAD;

				}
				break;

		}

		return true;

	}

}

export { Enemy };
