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



async function main ( argv ) {

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
	    
	    await runCommand('call', [ instance, zome, func, args ], this, this.parent);
	});

    commander.parse( argv );

    // console.log( commander );

    function help_and_exit() {
	commander.help();
	exit();
    }

    // Catch undefined subcommands
    if ( typeof commander.args[commander.args.length-1] === 'string' ) {
	print( `Error: Unknown subcommand '${commander.args[0]}'` );
	help_and_exit()
    }
}



async function call_conductor( inst, zome, func, args ) {
    try {
	if ( args.length === 1 ) {
	    const cmd			= args[0];
	    const data			= await client.call( cmd );
	    
	    console.log( JSON.stringify( data, null, 4 ) );
	    client.close();
	}
	else if ( args.length === 2 ) {
	    const [cmd,params]		= args;
	    const data			= await client.call( cmd, params ? JSON.parse(params) : undefined );
	    
	    console.log( JSON.stringify( data, null, 4 ) );
	    client.close();
	}
	else if ( args.length === 3 || args.length === 4 ) {
	    const [inst,zome,func]	= args;
	    const params		= args[3] ? JSON.parse( args[3] ) : {};
	    console.log("Calling", inst, zome, func, params);
	    const data			= await client.call('call', {
		"instance_id":	inst,
		"zome":		zome,
		"function":	func,
		"args":		params,
	    });
	    
	    console.log( JSON.stringify( JSON.parse(data), null, 4 ) );
	    client.close();
	}
	else {
	    console.error("Unknown command", args);
	    client.close();
	}
    } catch (err) {
	console.error( err );
	client.close();
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
	//     

	let ctx			= args;
	let [key, value]	= param.split(/=(.+)/);

	if ( key.includes('.') ) {
	    let keys		= key.split('.');
	    key			= keys.pop();
	    
	    for ( let k of keys ) {
		ctx		= args[k]	= args[k] || {};
	    }
	}

	try {
	    if ( ctx[key] !== undefined )
		throw new Error( sprintf("Cannot overwrite existing key '%s' with value: %s", key, value ) );
	    
	    if ( !isNaN( value ) )
		ctx[key]	= parseInt( value );
	    else
		ctx[key]	= eval( value );
	} catch (err) {
	    log.error("Failed to parse param '%s', failed with: %s", param, err );
	    throw err;
	}
    }
    return args;
}

async function runCommand(command, args, cmdopts, opts) {
    // Set logging verbosity for console transport
    log.transports[0].setLevel( opts.verbose );
    
    if ( process.env.DEBUG_LEVEL )
	print("Log level set to %d:%s", opts.verbose || 0, log.transports[0].level);


    console.log('Connecting WebSocket clients: master, public, internal' );
    const url				= `ws://localhost:${PORT}`;
    console.log('Connecting to', url );
    const client			= new Client( url );
    

    log.debug("Running subcommand %s", command);
    try {
	switch( command ) {
	case 'call':
	    let [inst, zome, func, params]= args;
	    
	    for ( let arg of params ) {
		// Example param:
		// 
		//     something="string"
		//     something=3
		//     agent.id=6
		//     agent.key="Hcblabla..."
		//     
		
		log.normal("Backup table for given argument %s", arg );
		const [table, pk]	= arg.split(':');
		await backupTable( table, pk );
	    }
	    break;
	}
    } catch (err) {
	console.error( err );
	exit( 1 );
    }

    exit( 0 );
}

if ( typeof require != 'undefined' && require.main == module ) {
    main( process.argv );
}
else {
    module.exports = main;
}

module.exports = {
    main,
    parse_parameters,
}
