/*
 * Author: Sarah Knepper <sarah.knepper@intel.com>
 * Copyright (c) 2014 Intel Corporation.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
 
// Load Grove and MQTT modules
var groveSensor = require('jsupm_grove');
var mqtt = require('mqtt');
var fs = require('fs');
//var LCD = require('jsupm_i2clcd');

// Create the temperature sensor object using AIO pin 0
var temp = new groveSensor.GroveTemp(0);
console.log(temp.name());

// Set up variables for connection to IoTF
var configFile = "/node_app_slot/device.cfg";
var port = 1883;
var broker;
var topic;
var client;

// Set up variables for LCD display
//var text = " ";
//var myLCD = new LCD.Jhd1313m1(6, 0x3E, 0x62);

// Set up MQTT connection
require('getmac').getMac(function(err, macAddress) {
    if (err) throw err;

    macAddress = macAddress.toString().replace(/:/g, '').toLowerCase();

    require('properties').parse(configFile, {
        path: true
    }, function(err, config) {


        if (config['auth-method']) {
            if (config['auth-method'] !== "token") {
                throw "Authentication method not supported. Please make sure you use \"token\".";
            }
            if (config['auth-method'] && !config['auth-token']) {
                throw "Authentication method set to \"token\" but no \"auth-token\" setting was provided in device.cfg";
            }

            password = config['auth-token'];
        }

        if (!config.org) {
            throw "Configuration should include an org field that specifies your organization.";
        }

        if (!config.type) {
            throw "Configuration should include a type field that specifies your device type.";
        }

        if (!config.id) {
            throw "Configuration should include an id field that specifies your device id.";
        }

        console.log("Configuration loaded successfully, connecting your device to the registered service.");

        organization = config.org;
        deviceType = config.type;
        macAddress = config.id;


        broker = organization + ".messaging.internetofthings.ibmcloud.com";
        clientId = "d:" + organization + ":" + deviceType + ":" + macAddress;

        client = mqtt.connect("mqtt://" + broker + ":" + port, {
            "clientId": clientId,
            "keepalive": 10000,
            "username": "use-token-auth",
            "password": password
        });

        topic = 'iot-2/evt/status/fmt/json';

        // Send a message every second
        var interval = setInterval(sendMessage, 1000);

        // Subscribe and Publish
        client.subscribe('iot-2/cmd/+/fmt/json', {
            qos: 1
        }, function(err, granted) {
            if (err) throw err;
            console.log("subscribed");
        });
        //});

        client.on('error', function(err) {
            console.error('client error ' + err);
            process.exit(1);
        });

        client.on('message', function(topic, message, packet) {
            console.log('Message received on topic: ' + topic);
            var msg = JSON.parse(message.toString());
            console.log(msg);

            //lcdDisplay(msg);

        });

        console.log("Broker: " + broker);
        console.log("Device ID: " + macAddress);
        console.log("Topic: " + topic);
    });
});

function sendMessage() {
    var message = {};
    message.d = {};

    // Read the temperature and send the data to IoTF
    var celsius = temp.value();
    var fahrenheit = celsius * 9.0 / 5.0 + 32.0;

    message.d.celsius = celsius;
    message.d.fahrenheit = fahrenheit;

    console.log(message);

    // Publish message to MQTT status topic
    client.publish(topic, JSON.stringify(message));
}
/*
function lcdDisplay(data) {
    var text = data.d.text;
    var color = data.d.color;

    myLCD.clear();

    if (color === "green") {
        myLCD.setColor(110, 215, 089);
    }
    if (color === "red") {
        myLCD.setColor(210, 058, 053);
    }

    myLCD.setCursor(0, 1);
    myLCD.write('Temperature:');
    myLCD.setCursor(1, 1);
    myLCD.write(text);
}
*/
