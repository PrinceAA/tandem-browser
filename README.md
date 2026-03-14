# Tandem Browser

Tandem Browser is a local-first Electron browser built specifically for
human-AI collaboration with OpenClaw.

This repository is a public `developer preview`.

The human browses normally. OpenClaw gets a local API on `127.0.0.1:8765` for
navigation, extraction, automation, and observability. Tandem is not a generic
"AI browser" shell with OpenClaw added later. It is an OpenClaw-first browser
environment designed so the human and OpenClaw can browse together on the same
machine.

Tandem is maintained by the same maintainer behind OpenClaw and should be read
as a first-party OpenClaw companion browser rather than a third-party
integration experiment.

Tandem is built around a two-layer model:

- visible layer: Chromium webviews, tabs, sidebar tools, downloads, and the
  human-facing shell
- invisible layer: Electron services, the local HTTP API, security systems,
  OpenClaw integration, and agent tooling

## Status

Tandem is currently a public `developer preview`.

- primary platform: macOS
- secondary platform: Linux
- Windows is not actively validated yet
- current version: `0.57.4`
- current release history: [CHANGELOG.md](CHANGELOG.md)

The repository is intended to be public and usable by contributors, but not
everything is polished to end-user distribution quality yet.

The goal of making the repository public is not just to show the project. It is
also to let other contributors, maintainers, and OpenClaw-adjacent builders
help improve the browser over time.

## OpenClaw-First Positioning

Tandem is built around collaboration with OpenClaw.

- the right-side Wingman workflow is designed around OpenClaw as the primary AI runtime
- the local browser API exists so OpenClaw can inspect, navigate, extract, and automate safely
- the security model is shaped by the fact that OpenClaw has access to a live browser
- Tandem is maintained by the same maintainer behind OpenClaw and is intended as a first-party companion browser
- the repository may still be useful for general Electron browser experimentation, but the product itself is intentionally OpenClaw-first

## What Tandem Does

- Human + AI shared browsing with one local browser session
- Local HTTP API for tabs, navigation, screenshots, content extraction,
  sessions, devtools surfaces, and automation
- Security-by-default browsing with multi-layer filtering and review points
- OpenClaw-first runtime integration for chat, browser control, and local agent workflows
- Local-first persistence for sessions, history, workspaces, bookmarks, and
  settings
- Chrome-style extension loading and related compatibility work

## Key Product Surfaces

- left sidebar for workspaces, communication panels, bookmarks, history,
  downloads, and utilities
- main Chromium browsing surface with multi-tab session management
- right-side Wingman panel for chat, activity, screenshots, and agent context
- shell-level overlays for screenshots and annotations that stay outside the
  page JavaScript context

## Security Model

If an AI can read and act on live web content, the browser becomes part of the
threat model. Tandem treats external content as hostile by default and adds a
multi-layer security stack before content reaches the page or the agent.

Current protections include:

- network-level threat feed blocking
- outbound request checks
- runtime script inspection
- behavior monitoring
- agent-facing decision points for ambiguous cases

This project is intentionally more paranoid than a normal desktop browser shell.

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- macOS or Linux

### Install

```bash
npm install
```

### Verify

```bash
npm run verify
```

### Start

```bash
npm start
```

On macOS, the start script clears Electron quarantine flags before launch.

## OpenClaw Integration

Tandem is designed first and foremost for OpenClaw.

The browser can run without OpenClaw for shell or API development work, but the
full product experience expects a local OpenClaw gateway and configuration on
the same machine.

If you are only working on browser shell, tabs, screenshots, security, or API
behavior, you do not need every OpenClaw feature running first.

If you are evaluating Tandem as a product, assume OpenClaw integration is a
core part of the intended workflow rather than an optional extra. Tandem should
be understood as a first-party OpenClaw companion browser.

## How OpenClaw Connects To Tandem

OpenClaw does not discover Tandem automatically just because both are installed.
The connection works when these pieces are in place on the same machine:

- Tandem is running and serving its local API on `http://127.0.0.1:8765`
- OpenClaw uses the Tandem skill and sends requests to that local API
- OpenClaw reads the Tandem bearer token from `~/.tandem/api-token`
- For the in-app Wingman chat experience, the local OpenClaw gateway also needs
  to be running on `ws://127.0.0.1:18789`

In practice, Tandem is the browser surface and local API. OpenClaw is the agent
runtime that uses that API.

## Minimum Setup For Testers

If you want to test Tandem with an existing OpenClaw installation, the minimum
setup is:

- Tandem Browser checked out and started locally
- a valid Tandem API token in `~/.tandem/api-token`
- OpenClaw installed on the same machine
- the updated Tandem skill available to the OpenClaw agent

For full Wingman chat integration inside Tandem, also ensure:

- the OpenClaw gateway is running locally
- `~/.openclaw/openclaw.json` exists and contains the gateway auth token

## Verify The Connection

Use these commands to verify that Tandem is reachable and that OpenClaw has the
information it needs:

```bash
TOKEN="$(cat ~/.tandem/api-token)"

curl -sS http://127.0.0.1:8765/status

curl -sS http://127.0.0.1:8765/tabs/list \
  -H "Authorization: Bearer $TOKEN"

test -f ~/.openclaw/openclaw.json && echo "OpenClaw config found"
```

Expected result:

- `/status` returns a live Tandem status payload
- `/tabs/list` returns JSON instead of `401 Unauthorized`
- the OpenClaw config file exists if you want Wingman chat inside Tandem

## Public API Snapshot

Examples:

```bash
curl http://127.0.0.1:8765/status

curl -X POST http://127.0.0.1:8765/navigate \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com"}'

curl http://127.0.0.1:8765/page-content

curl http://127.0.0.1:8765/screenshot --output screen.png

curl -X POST http://127.0.0.1:8765/sessions/fetch \
  -H 'Content-Type: application/json' \
  -d '{"tabId":"tab-7","url":"/api/me","method":"GET"}'
```

The local API binds to `127.0.0.1:8765`.

## Known Limitations

- `Personal News` exists as a sidebar slot but is not a finished panel
- Linux video recording still has desktop audio limitations due to Electron
  process isolation
- Windows support is not actively validated
- Packaging and auto-update flows are still less mature than the core browser
  and API surface

## Repository Guide

- [PROJECT.md](PROJECT.md): product vision and architecture overview
- [docs/README.md](docs/README.md): documentation map
- [CHANGELOG.md](CHANGELOG.md): release history
- [CONTRIBUTING.md](CONTRIBUTING.md): contribution workflow
- [SECURITY.md](SECURITY.md): vulnerability reporting
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md): collaboration expectations

Files such as [AGENTS.md](AGENTS.md), [TODO.md](TODO.md), and several archived
documents are maintainer workflow material. They remain in the repository for
engineering context, but they are not the primary public entry points.

Contributions are welcome. If you want to help improve Tandem as an
OpenClaw-first browser, start with [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
