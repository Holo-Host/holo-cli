// #!/usr/bin/env node
// // -*- mode: javascript -*-

const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const fs				= require('fs');
const commander				= require('commander');

const print				= require('@whi/printf').colorAlways();
const sprintf				= require('sprintf-js').sprintf;
const prompter				= require('@whi/prompter');

const { Client }			= require('rpc-websockets');
const axios				= require('axios');


function close() {
    log.info("Closing %d websocket clients", clients.length );
    for ( let ws of clients ) {
	log.debug('Closing websocket: %s', ws.address );
	ws.close();
    }
}

function exit( status ) {
    close();
    process.exit( status );
}

function main ( argv ) {
    return new Promise((f,r) => {

	function increaseVerbosity(v, total) {
	    return total + 1;
	}

	commander
	    .version('1.0.0')
	    .option('-v, --verbose', 'Increase logging verbosity', increaseVerbosity, 0);

	commander
	    .command('call <instance> <zome> [func] [args...]')
	    .description("Backup the given table name")
	    .option('-p, --primary [column]', 'Set the primary column to order results by')
	    .action(async function ( instance, zome, func, args ) {
		if ( typeof func !== 'string' )
		    throw new Error("Have not implemented administrative calls yet");

		try {
		    var data		= await run_command('call', [ instance, zome, func, args ], this, this.parent);
		    f( data );
		} catch ( err ) {
		    console.error( err );
		    r( 1 );
		}
	    });

	commander.parse( argv );

	// console.log( commander );

	function help_and_exit() {
	    commander.help();
	    f( 0 );
	}

	// Catch undefined subcommands
	if ( typeof commander.args[commander.args.length-1] === 'string' ) {
	    print( `Error: Unknown subcommand '${commander.args[0]}'` );
	    help_and_exit()
	}
	
    });
}


async function call_conductor( client, args ) {
    try {
	let data;

	log.info("Calling conductor with client %s: %d args", client.address, args.length );
	if ( args.length === 1 ) {
	    const [cmd]			= args;
	    data			= await client.call( cmd );
	}
	else if ( args.length === 2 ) {
	    const [cmd,params]		= args;
	    data			= await client.call( cmd, params );
	}
	else if ( args.length === 3 || args.length === 4 ) {
	    const [inst,zome,func]	= args;
	    const params		= parse_parameters( args[3] );
	    
	    data			= await client.call('call', {
		"instance_id":	inst,
		"zome":		zome,
		"function":	func,
		"args":		params,
	    });
	}
	else {
	    log.error("Unknown command: %s", args );
	}
	
	return data;
    } catch (err) {
	log.error("Conductor call returned error: %s", err );
	return err;
    }
}


function parse_parameters ( params ) {
    const args				= {};
    
    for ( let param of params ) {
	// Example param:
	// 
	//     something="string"
	//     something=3
	//     agent.id=6
	//     agent.key="Hcblabla..."
	//     agent.names[0]="Homer"
	//     agent.names[1]="Simpson"
	//     
	log.silly("param: %s", param );

	let ctx			= args;
	let [key, value]	= param.split(/=(.+)/);

	// If the `key` contains any '.' characters, that means it is refering to a child object
	// that may or may not exist.  If it does not exist, we will create one.  If it exists, but
	// is not an object, throw an error.
	let keys		= key.includes('.') ? key.split('.') : [ key ];
	let last_index		= keys.length - 1;
	    
	for ( let [n,k] of keys.entries() ) {
	    log.silly("key %s:%s => %s", last_index, n, k );
	    
	    let i;

	    log.silly("CTX: %s", ctx );
	    if ( k.includes('[') ) {
		[_,k,i]	= k.match(/(.*)\[([0-9]+)\]/);
		if ( isNaN(i) )
		    throw new Error(sprintf("Invalid parameter index '%s'. Must be an integer: %s", i, param ));
		
		i		= parseInt( i );
		
		log.silly("New array ctx for: %s", k );
		ctx		= ctx[k]	= ctx[k] || [];

		// Verify that ctx is an array
		if ( !Array.isArray( ctx ) )
		    throw new Error(sprintf("Misconfiguration, expected '%s' for key '%s' to be an array", typeof ctx, k ));
		
		
		if ( n === last_index ) {
		    key	= i;
		} else {
		    ctx	= ctx[i]	= ctx[i] || {};
		}
	    } else if ( n === last_index ) {
		// The last key of the array needs to be used for the final value assignment.
		log.silly("Last key: %s", k );
		key		= k;
	    } else {
		// This is not the final value, so we will use ore create an object here.
		log.silly("New object ctx for: %s", k );
		ctx		= ctx[k]	= ctx[k] || {};

		// Verify that ctx is an object
		if ( ctx === null || typeof ctx !== 'object' )
		    throw new Error(sprintf("Misconfiguration, expected '%s' for key '%s' to be an object", typeof ctx, k ));
	    }
	    
	    log.silly("Current state: %20.20s = %-20.20s in %s", key, value, ctx );
	}
	log.silly("Final state: %20.20s = %-20.20s in %s", key, value, ctx );

	try {
	    if ( ctx[key] !== undefined )
		throw new Error( sprintf("Cannot overwrite existing key '%s' with value: %s", key, value ) );
	    
	    if ( !isNaN( value ) )
		ctx[key]	= parseInt( value );
	    else
		ctx[key]	= eval( value );
	} catch (err) {
	    log.error("Failed to parse param '%s', failed with: %s", param, String(err) );
	    throw err;
	}
    }
    return args;
}

function open_connection ( port=80 ) {
    const client			= new Client( `ws://localhost:${port}` );
    clients.push( client );
    
    Object.defineProperty( client, 'readyState', {
	get() {
	    return this.socket.readyState;
	},
    });
    
    return new Promise((f,r) => {
	client.on('open', function () {
	    f( client );
	});
	client.on('error', function ( err ) {
	    r( err );
	});
    });
}

const clients				= [];

async function run_command(command, args, cmdopts, opts) {
    // Set logging verbosity for console transport
    if ( process.env.DEBUG_LEVEL )
	print("Log level set to %d:%s", opts.verbose || 0, process.env.DEBUG_LEVEL );
    else {
	log.transports[0].setLevel( opts.verbose );
    }

    let ws_master;
    let ws_public;
    let ws_intern;
    
    if ( clients.length === 0 ) {
	log.normal('Connecting WebSocket clients: master, public, internal' );
	[
	    ws_master,
	    ws_public,
	    ws_intern,
	]				= await Promise.all([
	    open_connection( '1111' ),
	    open_connection( '2222' ),
	    open_connection( '3333' ),
	]);
    }
    
    log.info('Client ready state: master=%s; public=%s; internal=%s',
	     ws_master.readyState, ws_public.readyState, ws_intern.readyState );

    log.debug("Running subcommand '%s'", command);
    try {
	switch( command ) {
	case 'call':
	    return call_conductor( ws_master, args );
	    break;
	}
    } catch (err) {
	console.error( err );
	throw err;
    }
}

if ( typeof require != 'undefined' && require.main == module ) {
    main( process.argv ).then( (status) => {
	exit( status )
    });
}
else {
    module.exports = {
	main,
	close,
	parse_parameters,
    }
}

