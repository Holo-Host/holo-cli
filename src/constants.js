
const $TYPE				= Symbol.for("type");
const $HOLOCLI				= Symbol.for("@holo-host/holo-cli");

class ConductorError extends Error {
    [$TYPE]				= $HOLOCLI;
    [Symbol.toStringTag]		= ConductorError.name;

    static [Symbol.toPrimitive] ( hint ) {
	return hint === "number" ? null : `[${this.name} {}]`;
    }

    constructor ( ...params ) {
	super( ...params );

	if (Error.captureStackTrace) {
	    Error.captureStackTrace(this, this.constructor);
	}

	this.name			= this.constructor.name;
    }

    [Symbol.toPrimitive] ( hint ) {
	return hint === "number" ? null : this.toString();
    }

    toString () {
	return `${this.constructor.name}( ${this.message} )`;
    }
}
class ControlledError extends ConductorError {
    [Symbol.toStringTag]		= ControlledError.name;
}


module.exports = {
    ConductorError,
    ControlledError,
};
