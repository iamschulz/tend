#!/bin/sh
chown node:node /data
exec su-exec node node .output/server/index.mjs
