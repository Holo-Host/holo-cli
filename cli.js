#! /usr/bin/env node

const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const fs				= require('fs');
const { Command }			= require('commander');

const print				= require('@whi/printf').colorAlways();

const { call_conductor,
        clients }			= require('./call_conductor.js');

const config				= require('./config.js');
config.register_logger( log );



function main ( argv ) {
    return new Promise((f,r) => {

	function increaseVerbosity(v, total) {
	    return total + 1;
	}

	const commander			= new Command();

	commander
	    .version( config.version )
	    .option('-v, --verbose', 'Increase logging verbosity', increaseVerbosity, 0);

	commander
	    .command('call <instance> <zome> <func> [args...]')
	    .description("Manually call a conductor's instance->zome->function( ...args )")
	    .action(async function ( instance, zome, func, args ) {
		try {
		    var data		= await run_command('call', [ instance, zome, func, args ], this, this.parent);

		    f( data );
		} catch ( err ) {
		    console.error( err );
		    r( 1 );
		}
	    });

	const submodules		= {
	    "admin":		"Administrative commands to conductor",
	    "happ":		"hApp store controls",
	    "provider":		"Provider controls and management",
	    "host":		"Manage host details and enabled apps",
	}
	
	for (let [cmd,desc] of Object.entries(submodules) ) {
	    commander.command( cmd, desc );
	}

	
	function help_and_exit() {
	    commander.help();
	    f( 0 );
	}

	commander.on('command:*', function () {
	    // This fires even when there is a registered sub command so we have to check if it is a
	    // valid command.
	    if ( Object.keys( submodules ).includes( commander.args[0] ) ) {
		
		// Forward verbosity argument to submodule
		if ( commander.verbose )
		    commander.args.push('-' + 'v'.repeat(commander.verbose) );
		
		return;
	    }
	    
	    print('Invalid command: %s', commander.args.join(' '));
	    help_and_exit();
	});

	log.silly("argv: %s", argv );
	commander.parse( argv );

	// console.log( commander );
    });
}


async function run_command(command, args, cmdopts, opts) {
    // Set logging verbosity for console transport
    config.set_log_level( opts.verbose );
    
    await clients.open_connections();
    
    log.debug("Running subcommand '%s'", command);
    try {
	switch( command ) {
	case 'call':
	    return call_conductor( clients.active.master, args );
	    break;
	}
    } catch (err) {
	console.error( err );
	throw err;
    }
}


if ( typeof require != 'undefined' && require.main == module ) {
    main( process.argv )
	.then( config.main_resolve, config.main_reject )
	.catch( config.show_error );
}
else {
    module.exports = {
	main,
	"close_connections": clients.close_connections,
    }
}

