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

// Load Grove module
var groveSensor = require('jsupm_grove');
var mqtt = require('mqtt');
var fs = require('fs');

// Create the temperature sensor object using AIO pin 0
var temp = new groveSensor.GroveTemp(0);
console.log(temp.name());

// Set up variables for connection to IoTF
var configFile = "./device.cfg";
var port = 1883;
var broker = "quickstart.messaging.internetofthings.ibmcloud.com";
var topic;
var client;

require('getmac').getMac(function(err, macAddress) {
    if (err) throw err;
    
    macAddress = macAddress.toString().replace(/:/g, '').toLowerCase();

    require('properties').parse(configFile, { path: true }, function (err, config){
        var options = {};
        
        // Set the configuration used when no device.cfg is present
        var organization = "quickstart";
        var deviceType = "iotsample-galileo";

        // If device.cfg was loaded successfully update the configuarion
        if(config){

            if(config['auth-method']){
                if(config['auth-method'] !== "token"){
                    throw "Authentication method not supported. Please make sure you use \"token\".";
                }
                if(config['auth-method'] && !config['auth-token']){
                    throw "Authentication method set to \"token\" but no \"auth-token\" setting was provided in device.cfg";
                }

                options.username = "use-token-auth"; // Actual value of options.username can be set to any string
                options.password = config['auth-token'];
            }

            if(!config.org){
                throw "Configuration should include an org field that specifies your organization.";
            }

            if(!config.type){
                throw "Configuration should include a type field that specifies your device type.";
            }

            if(!config.id){
                throw "Configuration should include an id field that specifies your device id.";
            }

            console.log("Configuration loaded successfully, connecting your device to the registered service.");

            organization = config.org;
            deviceType = config.type;
            macAddress = config.id;

            broker = organization + ".messaging.internetofthings.ibmcloud.com";
        }
        else {
            console.log("No configuration file found, connecting to the quickstart servcice.");
        }
        
        options.clientId = "d:" + organization + ":" + deviceType + ":" + macAddress;
        client = mqtt.createClient(port, broker, options);
        topic = "iot-2/evt/status/fmt/json";

        var interval = setInterval(sendMessage,1000);

        if(config){
            client.subscribe('/iot-2/cmd/+/fmt/json');

            client.on('message', function(topic, message) {
                console.log('Received command on topic: ' + topic);
                
                var msg;
                try {
                    msg = JSON.parse(message);
                }
                catch (e) {
                    msg = {};
                    console.log("Couldn't parse recieved command. Please ensure it is valid JSON.");
                }

                if(msg.hasOwnProperty('send-status')){
                    if(msg['send-status']){
                        if(!interval){
                            interval = setInterval(sendMessage,1000);
                        }
                    }
                    else {
                        clearInterval(interval);
                        interval = false;
                    }
                }
            });
        }
          
        
        console.log("Broker: " + broker);
        console.log("Device ID: " + macAddress);
        console.log("Topic: " + topic);
        console.log("Connection options: ");
        console.log(options);
    });
});

function sendMessage() {
    var message = {};
    message.d = {};
    
    // Read the temperature and send the data to IoTF
    var celsius = temp.value();
    var fahrenheit = celsius * 9.0/5.0 + 32.0;
    //console.log(celsius + " degrees Celsius, or " + Math.round(fahrenheit) + " degrees Fahrenheit");
    
    message.d.celsius = celsius; 
    message.d.fahrenheit = fahrenheit;
    console.log(message);
    client.publish(topic, JSON.stringify(message));
}