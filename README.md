[![](https://img.shields.io/npm/v/@holo-host/holo-cli/latest?style=flat-square)](http://npmjs.com/package/@holo-host/holo-cli)
<!-- [![](https://img.shields.io/github/workflow/status/holo-host/holo-cli/Node.js%20CI/master?style=flat-square&label=master)](https://github.com/holo-host/holo-cli) -->

# Holo CLI
Holo CLI is designed to streamline common workflows in the Holo Hosting architecture.  It can be
used for sending commands to conductor, calling the Envoy adminstrative API or the infrastructure
API.

> **Note:** hApp developers do not need this tool.  This tool is intended to assists developers who
> are contributing to the Holo Hosting infrastructure.


[![](https://img.shields.io/github/issues-raw/holo-host/holo-cli?style=flat-square)](https://github.com/holo-host/holo-cli/issues)
[![](https://img.shields.io/github/issues-closed-raw/holo-host/holo-cli?style=flat-square)](https://github.com/holo-host/holo-cli/issues?q=is%3Aissue+is%3Aclosed)
[![](https://img.shields.io/github/issues-pr-raw/holo-host/holo-cli?style=flat-square)](https://github.com/holo-host/holo-cli/pulls)

## Overview
Included executables

- `conductor-cli` - tool for communicating with Conductor's Admin API and testing zome calls.

Future executables

- `hha-cli` - tool for communicating with the Holo Hosting App in Conductor
- `servicelogger-cli` - tool for communicating with the Servicelogger in Conductor

### Basic Usage

Local install
``` bash
npm install @holo-host/holo-cli

// Run with
npx conductor-cli
```

Global install
``` bash
npm install -g @holo-host/holo-cli

// Run with
conductor-cli
```

## API Reference
The best usage documentation is `--help`
