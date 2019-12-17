const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const { version }			= require('./package.json');
const { close_connections }		= require('./clients.js');

const print				= require('@whi/printf').colorAlways();

function exit( status ) {
    close_connections();
    process.exit( status );
}
const loggers				= [];



const config				= {
    version,
    "register_logger": function ( log ) {
	loggers.push( log );
    },
    "set_log_level": function ( verbosity ) {
	if ( process.env.DEBUG_LEVEL )
	    log.warn("Log level set to %d:%s", verbosity || 0, process.env.DEBUG_LEVEL );
	else {
	    for (let log of loggers) {
		log.transports[0].setLevel( verbosity );
	    }
	}
    },
    "show_error": function ( err ) {
	console.error( err );
    },
    "main_resolve": function ( status ) {
	if ( isNaN(status) ) {
	    console.log( JSON.stringify( status, null, 4 ) );
	    exit( 0 );
	}
	else {
	    exit( status )
	}
    },
    "main_reject": function ( status ) {
	log.warn("Exited in error with status: %s", status );
	exit( status );
    },
    "node_version_check": function ( quiet ) {
	if ( parseInt( process.version.slice(1).split('.')[0] ) < 12 ) {
	    if ( ! quiet )
		print("WARNING!! This version of Node (%s) is not supported.  Supported versions are v12 or newer", process.version );
	    else
		log.warn("This tool has not been tested against this version of Node (%s)", process.version );
	}
    },
}

module.exports				= config;
