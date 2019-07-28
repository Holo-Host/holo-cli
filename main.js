// #!/usr/bin/env node
// // -*- mode: javascript -*-

const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const fs				= require('fs');
const { Command }			= require('commander');

const print				= require('@whi/printf').colorAlways();
const sprintf				= require('sprintf-js').sprintf;
const prompter				= require('@whi/prompter');

const axios				= require('axios');

const { call_conductor,
	open_connections,
	close_connections,
	client_config,
        clients }			= require('./call_conductor.js');



function exit( status ) {
    close_connections();
    process.exit( status );
}

function main ( argv ) {
    return new Promise((f,r) => {

	function increaseVerbosity(v, total) {
	    return total + 1;
	}

	const commander			= new Command();

	commander
	    .version('0.1.0')
	    .option('-v, --verbose', 'Increase logging verbosity', increaseVerbosity, 0);

	commander
	    .command('call <instance> <zome> <func> [args...]')
	    .description("")
	    .option('-p, --primary [column]', 'Set the primary column to order results by')
	    .action(async function ( instance, zome, func, args ) {
		try {
		    var data		= await run_command('call', [ instance, zome, func, args ], this, this.parent);
		    f( data );
		} catch ( err ) {
		    console.error( err );
		    r( 1 );
		}
	    });

	commander
	    .command('admin method [args...]')
	    .description("")
	    .option('-p, --primary [column]', 'Set the primary column to order results by')
	    .action(async function ( method, args ) {
		r( new Error("Have not implemented administrative calls yet") );
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


async function run_command(command, args, cmdopts, opts) {
    // Set logging verbosity for console transport
    if ( process.env.DEBUG_LEVEL )
	print("Log level set to %d:%s", opts.verbose || 0, process.env.DEBUG_LEVEL );
    else {
	log.transports[0].setLevel( opts.verbose );
    }

    await open_connections();
    
    log.debug("Running subcommand '%s'", command);
    try {
	switch( command ) {
	case 'call':
	    return call_conductor( clients.master, args );
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
	close_connections,
    }
}

