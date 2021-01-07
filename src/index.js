const log				= require('@whi/stdlog')("conductor-cli", {
    level: process.env.LOG_LEVEL || 'fatal',
});
module.exports.log			= log;

const path				= require('path');
const crypto				= require('crypto');
const print				= require('@whi/printf').colorAlways();
const { Command }			= require('commander');

const config				= require('./config.js');
const { ControlledError }		= require('./constants.js');

const { admin_connection }		= require('./admin_api.js');
// const { app_connection }		= require('./aapp_api.js');


function increaseTotal(v, total) {
    return total + 1;
}


let conductor_admin_port;


function prelude (handler) {
    return function ( ...args ) {
	conductor_admin_port		= this.parent.port;
	log.transports[0].setLevel( this.parent.verbose );
	handler.call(this, ...args );
    };
}

async function main ( args ) {
    const commander			= new Command();

    commander
	.version( config.version )
	.option('-q, --quiet', 'suppress all printing except for final result', false )
	.option('-v, --verbose', 'increase logging verbosity', increaseTotal, 0)
	.option('-p, --port <port>', 'admin port', 33001 )

    commander
	.command("list <type>")
	.description("list the current configuration for the given 'type' (dnas, cells, apps)")
	.action( prelude(function (type) {
	    execute_admin(async (AdminAPI) => {
		let results;

		if ( ["dna", "dnas"].includes(type) ) {
		    results = await admin.listDnas();
		}
		else if ( ["cell", "cells"].includes(type) ) {
		    results = await admin.listCellIds();
		}
		else if ( ["app", "apps"].includes(type) ) {
		    results = await admin.listActiveApps();
		}
		else {
		    throw new Error(`Unknown type: ${type}, valid types are [dnas, cells, apps]`);
		}

		console.log( results.map(b => b.toString("base64")) );
	    });
	}));

    commander
	.command("gen-agent")
	.description("generate a new agent pubkey")
	.action( prelude(function () {
	    execute_admin(async (AdminAPI) => {
		const pubkey		= await AdminAPI.generate_pubkey();
		console.log( pubkey.toString("base64") );
	    });
	}));

    commander
	.command("install <name> <dna...>")
	.description("install app")
	.option('-a, --agent [pubkey]', 'create a new agent for installed App', false)
	.action( prelude(function ( name, dnas ) {
	    execute_admin(async (AdminAPI) => {
		let agent_pubkey;

		if ( this.agent === false ) {
		    agent_pubkey	= await AdminAPI.generate_pubkey();
		    log.normal("Using Agent (%s) for install", agent_pubkey.toString("base64") );
		}
		else {
		    agent_pubkey	= Buffer.from( this.agent, "base64" );
		    log.normal("Using Agent (%s) for install", this.agent );
		}

		let dna_config = dnas.reduce( (obj, dna) => {
		    const index		= dna.lastIndexOf(":");
		    const nick		= dna.slice( index + 1 );
		    obj[nick]		= dna.slice( 0, index );
		    return obj;
		}, {});

		let app			= await AdminAPI.install_app(
		    name, agent_pubkey, dna_config
		);

		print("DNAs for App '%s':", app.installed_app_id );
		AdminAPI.print_cell_data( app.cell_data );
	    });
	}));

    commander
	.command("activate <name>")
	.description("activate app")
	.action( prelude(function ( name ) {
	    execute_admin(async (AdminAPI) => {
		await AdminAPI.activate_app( name );

		print("Hurray! Let's assume this worked.  What could go wrong?");
	    });
	}));

    commander
	.command("attach-interface <port>")
	.description("attach app to TCP port")
	.action( prelude(function ( port ) {
	    execute_admin(async (AdminAPI) => {
		let resp = await AdminAPI.attach_interface( port );

		print(`This port (${resp.port}) is now something`);
	    });
	}));

    commander
	.command("call-zome <port> <dna> <agent>")
	.description("call a zome function")
	.action( prelude(function ( port, dna, agent ) {
	    execute_app( port, async function (client) {
		let dna_hash		= Buffer.from( dna, "base64" );
		let agent_pubkey	= Buffer.from( agent, "base64" );

		let call_spec = {
		    "cell_id": [ dna_hash, agent_pubkey ],
		    "zome_name": "hha",
		    "fn_name": "get_happs",
		    "payload": null,
		    "provenance": agent_pubkey, // AgentPubKey
		};

		let resp = await client.callZome( call_spec );
		console.log( resp );
	    });
	}));

    commander.parse( args );
}


async function run_and_close_socket (async_fn, client) {
    try {
	await async_fn( client );
    } catch ( err ) {
	if ( err instanceof ControlledError )
	    print( err.message );
	else
	    console.log("\x1b[91mFailed during %s: %s\x1b[0m", client.constructor.name, err instanceof Error ? String(err) : JSON.stringify( err ) );
    } finally {
	client.api.client.socket.terminate();
	await client.api.client.awaitClose();
    }
}

async function execute_admin (async_fn) {
    log.info("Execute procedure with AdminAPI");
    run_and_close_socket( async_fn, await admin_connection( conductor_admin_port ) );
}

async function execute_app (async_fn) {
    log.info("Execute procedure with AppAPI");
    run_and_close_socket( async_fn, await app_connection( conductor_admin_port ) );
}


module.exports.main			= main;
