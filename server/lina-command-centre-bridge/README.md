# Vaelinya Command Centre Bridge

This bridge makes the private Vaelinya Command Centre buttons real.

It runs only on localhost and is reached through Apache at:

```text
/private/api/lina-command-centre/
```

Cloudflare Access must protect `/private/*` before this bridge is used.

## What it does

Allowed read actions:

```text
GET /private/api/lina-command-centre/status
GET /private/api/lina-command-centre/logs
```

Allowed write actions:

```text
POST /private/api/lina-command-centre/start
POST /private/api/lina-command-centre/stop
POST /private/api/lina-command-centre/restart
```

It does not read or return the bot `.env` file.
It redacts token-shaped values from log output.
It verifies the Cloudflare Access JWT assertion before returning anything.

## Files

```text
server/lina-command-centre-bridge/bridge.mjs
server/lina-command-centre-bridge/package.json
server/lina-command-centre-bridge/.env.example
server/lina-command-centre-bridge/systemd/vaelinya-command-centre-bridge.service
server/lina-command-centre-bridge/apache/vaelinya-command-centre-bridge.conf
server/lina-command-centre-bridge/sudoers/lina-command-centre-bridge
```

## Install

Run from the deployed repository checkout on the server.

```bash
sudo useradd --system --home /opt/vaelinya-command-centre-bridge --shell /usr/sbin/nologin lina-bridge || true
sudo mkdir -p /opt/vaelinya-command-centre-bridge
sudo cp server/lina-command-centre-bridge/bridge.mjs /opt/vaelinya-command-centre-bridge/bridge.mjs
sudo cp server/lina-command-centre-bridge/package.json /opt/vaelinya-command-centre-bridge/package.json
sudo chown -R lina-bridge:lina-bridge /opt/vaelinya-command-centre-bridge
cd /opt/vaelinya-command-centre-bridge
sudo -u lina-bridge npm install --omit=dev
```

Create the environment file:

```bash
sudo cp server/lina-command-centre-bridge/.env.example /etc/vaelinya-command-centre-bridge.env
sudo nano /etc/vaelinya-command-centre-bridge.env
sudo chown root:root /etc/vaelinya-command-centre-bridge.env
sudo chmod 600 /etc/vaelinya-command-centre-bridge.env
```

Set `CF_ACCESS_AUD` to the Audience/AUD tag from the Cloudflare Access application.

## Install sudoers rule

```bash
sudo cp server/lina-command-centre-bridge/sudoers/lina-command-centre-bridge /etc/sudoers.d/lina-command-centre-bridge
sudo chmod 440 /etc/sudoers.d/lina-command-centre-bridge
sudo visudo -c
```

## Install systemd service

```bash
sudo cp server/lina-command-centre-bridge/systemd/vaelinya-command-centre-bridge.service /etc/systemd/system/vaelinya-command-centre-bridge.service
sudo systemctl daemon-reload
sudo systemctl enable --now vaelinya-command-centre-bridge
sudo systemctl status vaelinya-command-centre-bridge --no-pager
```

## Install Apache proxy

```bash
sudo a2enmod proxy proxy_http headers
sudo cp server/lina-command-centre-bridge/apache/vaelinya-command-centre-bridge.conf /etc/apache2/conf-available/vaelinya-command-centre-bridge.conf
sudo a2enconf vaelinya-command-centre-bridge
sudo apachectl configtest
sudo systemctl reload apache2
```

## Test

Logged out test should still redirect to Cloudflare Access:

```bash
curl -I https://vaelinya.uk/private/api/lina-command-centre/status
```

Local bridge test should reject because it has no Cloudflare Access assertion:

```bash
curl -i http://127.0.0.1:3771/private/api/lina-command-centre/status
```

Expected local result:

```text
401 Missing Cloudflare Access assertion
```

Final browser test:

```text
Open /private/lina-command-centre/
Press Refresh
Check the bridge card says Bridge connected
```

Only then use Start, Stop, or Restart.
