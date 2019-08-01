
# Overview

Holo CLI is designed to streamline common workflows in the Holo Hosting architecture.  It can be
used for sending commands to conductor, calling the Envoy adminstrative API or the infrastructure
API.  There are built-in commands for the main hApp Store and Holo Hosting App operations (HHA) such
as `create_app`, `register_app`, or `enable_app`.

> **Note:** hApp developers do not need this tool.  This tool only assists developers who are
> contributing to the Holo Hosting infrastructure.

## Installation

Local install
``` bash
npm install holo-cli

// Run with
npx holo --help
```

Global install
``` bash
npm install -g holo-cli

// Run with
holo --help
```

## Sub-command Modules

- **Admin**	- Administrative commands to conductor
- **hApp**	- hApp store controls
- **Provider**	- Provider controls and management
- **Host**	- Manage host details and enabled apps

### `holo admin`

Command line controls for the conductor's admin API

**This sub-command has its own subcommand list:**

- `holo admin dna`
- `holo admin agent`
- `holo admin interface`
- `holo admin instance`


### `holo happ`

Command line controls for the hApp Store


### `holo provider`

Command line controls for the Holo Hosting App provider zome


### `holo host`

Command line controls for the Holo Hosting App host zome


## Manually calls using `holo call <instance> <zome> <func> [args...]`

The `[args...]` are converted to JSON using the `args2json` NPM module.

Example of manually configuring what `holo host register <kyc_proof>` does

``` bash
holo call holo-hosting-app host register_as_host "host_doc.kyc_proof=<kyc_proof>"
```

Another example of manually configuring what `holo provider register-app <happ_hash> <domain_name>`
does.

``` bash
holo call holo-hosting-app provider register_app "app_bundle.happ_hash=<happ_hash>" "domain_name.dns_name=<domain_name>"
```
