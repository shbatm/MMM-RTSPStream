#!/usr/bin/env node

/* jshint esversion: 6 */

const fs = require('fs');
const path = require("path");
const child_process = require('child_process');
const pm2 = require('pm2');

stopAllOmxplayers = function() {
    console.log('PM2: Stopping all OMXPlayer Streams...');
    pm2.connect((err) => {
        if (err) {
            console.error(err);
            return;
        }
        // Stops the Daemon if it's already started
        pm2.list((err2, list) => {
            if (err2) {
                console.log(err2);
                pm2.disconnect();
                this.pm2Connected = false;
                return;
            }

            var toStop = [];

            var stopProcs = () => {
                if (toStop.length > 0) {
                    pm2.stop(toStop[toStop.length - 1], (e, p) => {
                        if (e) { console.log(e); throw e; }
                        toStop.pop();
                        stopProcs();
                    });
                } else {
                    pm2.disconnect();
                    process.exit(0);
                    return;
                }
            };

            let omxProcs = list.filter(o => o.name.startsWith("omx_"));
            if (omxProcs) {
                omxProcs.forEach(o => {
                    console.log(`PM2: Checking if ${o.name} is running...`);
                    if ("status" in o.pm2_env && o.pm2_env.status === "online") {
                        console.log(`PM2: Stopping ${o.name}...`);
                        toStop.push(o.name);
                    }
                });
            }
            stopProcs();
        });
    });
};

stopAllOmxplayers();