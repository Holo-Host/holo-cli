
# Overview

Holo CLI is designed to streamline common workflows in the Holo Hosting architecture.  It can be
used for sending commands to conductor, calling the Envoy adminstrative API or the infrastructure
API.

> **Note:** hApp developers do not need this tool.  This tool only assists developers who are
> contributing to the Holo Hosting infrastructure.

## Installation

Local install
``` bash
npm install @holo-host/holo-cli

// Run with
npx conductor-cli --help
```

Global install
``` bash
npm install -g @holo-host/holo-cli

// Run with
conductor-cli --help
```

## Usage

### `conductor list <type>`
List the current configuration for the given 'type' (dnas, cells, apps)

``` bash
conductor-cli list dnas
```
