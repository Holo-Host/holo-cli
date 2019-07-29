const path				= require('path');
const log				= require('@whi/stdlog')(path.basename( __filename ), {
    level: process.env.DEBUG_LEVEL || 'fatal',
});

const { version }			= require('./package.json');
const { close_connections }		= require('./clients.js');

function exit( status ) {
    close_connections();
    process.exit( status );
}
const loggers				= [];



const config				= {
    "config": version,
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
	exit( status );
    },
}

module.exports				= config;
