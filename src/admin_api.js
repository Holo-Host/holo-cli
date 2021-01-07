
const path				= require('path');
const { AdminWebsocket,
	AppWebsocket,
	...sdk }			= require('@holochain/conductor-api');
const print				= require('@whi/printf').colorAlways();

const { log }				= require('./index.js');
const { ControlledError,
	ConductorError }		= require('./constants.js');



function transform_conductor_errors ( err, transformer = (e) => e ) {
    if ( err.type === "error" ) {
	let msg;

	if ( err.data.type === "internal_error" )
	    msg	= err.data.data;
	else
	    msg	= JSON.stringify( err.data );

	throw transformer( new ConductorError(msg) );
    } else if ( err instanceof Error ) {
	throw err;
    } else {
	throw new Error( String(err) );
    }
}



class AdminAPI {
    constructor ( port ) {
	this.port			= port;
    }

    async connect () {
	const api			= await AdminWebsocket.connect( "http://localhost:" + this.port );
	this.api			= api;
    }

    async list_active_apps () {
	return await this.api.listActiveApps();
    }

    async install_app ( name, pubkey, dnas ) {
	let install_request = {
	    "installed_app_id": name,
	    "agent_key": pubkey,
	    "dnas": Object.keys(dnas).map(nick => {
		return {
		    "path": path.resolve( process.cwd(), dnas[nick] ),
		    nick
		};
	    }),
	};

	try {
	    log.silly("Install request: %s %s %s", () => [
		install_request.installed_app_id,
		install_request.agent_key.toString("base64"),
		JSON.stringify( install_request.dnas, null, 4 ) ]);

	    return await this.api.installApp( install_request );
	} catch (err) {
	    transform_conductor_errors( err, (e) => {
		if ( e.message.includes("AppAlreadyInstalled") )
		    return new ControlledError(`App '${name}' is already installed.`);
		return e;
	    });
	}
    }

    async activate_app ( name ) {
	let apps			= await this.list_active_apps();
	try {
	    return await this.api.activateApp({
		"installed_app_id": name,
	    });
	} catch (err) {
	    transform_conductor_errors( err, (e) => {
		if ( e.message.includes("AppNotInstalled") ) {
		    if ( apps.includes(name) )
			return new ControlledError(`App '${name}' is already activated.`);
		    else
			return new ControlledError(`App '${name}' is not installed.`);
		}
		return e;
	    });
	}
    }

    async attach_interface ( port ) {
	try {
	    return await this.api.attachAppInterface({
		"port": parseInt( port ),
	    });
	} catch (err) {
	    transform_conductor_errors( err, (e) => {
		if ( e.message.includes("Address already in use") )
		    return new ControlledError(`Port '${port}' is already in use.`);
		return e;
	    });
	}
    }

    async generate_pubkey () {
	const pubkey		= await api.generateAgentPubKey();
	return pubkey;
    }

    print_cell_data ( cell_data ) {
	cell_data.map(config => {
	    let cell = config[0];
	    let nick = config[1];
	    let hash = cell[0].toString("base64");
	    let agent = cell[1].toString("base64");

	    print(`  ${nick}\n    ${hash}:${agent}`);
	});
    }
}


module.exports = {
    async admin_connection ( port ) {
	const client = new AdminAPI( port );
	await client.connect();
	return client;
    },
    AdminAPI,
};
