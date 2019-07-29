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
        clients }			= require('./call_conductor.js');
const config				= require('./config.js');
config.register_logger( log );


function main ( argv ) {
    //
    //     cli-admin.js --version
    //     cli-admin.js --help
    //     cli-admin.js dna		- DNA actions
    //     cli-admin.js agent		- Agent actions
    //     cli-admin.js interface	- Interface actions
    //     cli-admin.js instance	- Instance actions
    //
    
    return new Promise((f,r) => {

	function increaseVerbosity(v, total) {
	    return total + 1;
	}

	const commander			= new Command();

	commander
	    .option('-v, --verbose', 'Increase logging verbosity', increaseVerbosity, 0);

	commander
	    .command('dna [action]')
	    .description("Run an administrative endpoint (eg. admin/dna/<action>) (default action: 'list'")
	    .action(async function ( action ) {
		try {
		    var data		= await run_command('dna', [ action || 'list' ], this, this.parent);

		    f( data );
		} catch ( err ) {
		    console.error( err );
		    r( 1 );
		}
	    });

	commander
	    .command('agent [action]')
	    .description("Run an administrative endpoint (eg. admin/agent/<action>) (default action: 'list'")
	    .action(async function ( action ) {
		try {
		    var data		= await run_command('agent', [ action || 'list' ], this, this.parent);

		    f( data );
		} catch ( err ) {
		    console.error( err );
		    r( 1 );
		}
	    });

	commander
	    .command('interface [action]')
	    .description("Run an administrative endpoint (eg. admin/interface/<action>) (default action: 'list'")
	    .action(async function ( action ) {
		try {
		    var data		= await run_command('interface', [ action || 'list' ], this, this.parent);

		    f( data );
		} catch ( err ) {
		    console.error( err );
		    r( 1 );
		}
	    });

	commander
	    .command('instance [action]')
	    .description("Run an administrative endpoint (eg. admin/instance/<action>) (default action: 'list'")
	    .action(async function ( action ) {
		try {
		    var data		= await run_command('instance', [ action || 'list' ], this, this.parent);

		    f( data );
		} catch ( err ) {
		    console.error( err );
		    r( 1 );
		}
	    });

	
	function help_and_exit() {
	    commander.help();
	    f( 0 );
	}

	commander.on('command:*', function () {
	    print('Invalid command: %s', commander.args.join(' '));
	    help_and_exit();
	});

	log.silly("argv: %s", argv );
	commander.parse( argv );

	if ( commander.args.length === 0 )
	    commander.help();

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
	case 'dna':
	    return call_conductor( clients.active.master, [
		'admin/dna/' + args[0],
	    ]);
	    break;
	case 'agent':
	    return call_conductor( clients.active.master, [
		'admin/agent/' + args[0],
	    ]);
	    break;
	case 'interface':
	    return call_conductor( clients.active.master, [
		'admin/interface/' + args[0],
	    ]);
	    break;
	case 'instance':
	    return call_conductor( clients.active.master, [
		'admin/instance/' + args[0],
	    ]);
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
