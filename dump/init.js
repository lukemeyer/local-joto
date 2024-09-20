load('api_timer.js');
load('api_uart.js');
load('api_sys.js');
load('api_shadow.js');
load("api_config.js");
load('api_gpio.js');
load('api_sys.js');
load("api_rpc.js");
load('api_events.js');
load('api_mqtt.js');
load('api_net.js');

//MJS FUNCTIONS
let checkCerts = ffi('int check_certs()');
let resetSystem = ffi('void reset_system()');
let ledOff = ffi('void led_off()');
let ledOn = ffi('void led_on()');
let ledBlink = ffi('void led_blink(int)');
let espReboot = ffi('void mgos_system_restart_after(int)');

let pairingFlag = false;

//UART SETUP - BUT CAN PROBABLY GO IN C
let userId = "";
let uartNo = 1;
UART.setConfig(1, {
  baudRate: 115200,
  esp32: {
    gpio: {
      rx: 26,
      tx: 25,
    },
  },
});

let playlistCount = 0;
let playlistTimer;
let loop = Cfg.get('playlist.loop');
let delay = Cfg.get('playlist.delay');
let playlistFiles=[];

if(Cfg.get('playlist.files')){
  playlistFiles = JSON.parse(Cfg.get('playlist.files'));
}

let playlist = function(){
  let currentItem = playlistFiles[playlistCount];
  if(playlistCount < playlistFiles.length){
    if(currentItem.type === "file"){
      localFileSend('/mnt/'+ currentItem.name);
      playlistCount++;
    }else if(currentItem.type === "delay"){
      playlistTimer = Timer.set(currentItem.duration, 0, function() {
        playlistCount++;
        playlist();
      }, null);
    }else{
      print("Unknown playlist object");
    }
  }else{
    if(loop){
      playlistCount = 0;
      playlist();
    }else{
      print("Playlist complete.");
    }
  }
};


//LAST STATE
let lastState = Cfg.get('state.status');


let demo = false;
let mcuCount = 0;

//ERROR LOGS OVER MQTT
let log_std_out = function(message){
  print("LOG STD - ", message);
  let topic = 'things/' + Cfg.get('device.id') + '/stdout';
  let ok = MQTT.pub(topic, JSON.stringify({ message: message}), 1);
};

let log_std_err = function(message){
  let topic = 'things/' + Cfg.get('device.id') + '/stderr';
  let ok = MQTT.pub(topic, JSON.stringify({ message: message}), 1);
};

let ping = function(args){
  let topic = 'things/' + Cfg.get('device.id') + '/pingResponse';
  let ok = MQTT.pub(topic, JSON.stringify({ message: args, time: Timer.now()}), 1);
};

let formatFix = false;
let error = false;
let connected = true;
let shadow = false;
let mcuConnection = false;

let updateLED = function () {
  if(error){
    ledBlink(90);
  }
  else if(currentState.pairing){
    ledBlink(500);
  }
  else if(currentState.shadowConnected){
    ledOff();
  }
  else if(!connected){
    ledOn();
  }
  else if(connected && !currentState.shadowConnected){
    ledOn();
  }
  else{
    ledBlink(90);
  }
};

let localFiles = {
  startup: "startup.g",
  maintenance: "maintenance.g",
  reset: "reset.g",
  demo: "/mnt/demo.g"
};

let fw_version = 'unknown';
let fw_id = 'unknown';

RPC.call(RPC.LOCAL, 'Sys.GetInfo', null, function(resp, ud){
  fw_version = resp.fw_version
  fw_id = resp.fw_id
}, null);

//INITIAL STATE SETUP
let currentState = {
  fw_version: fw_version,
  fw_id: fw_id,
  status: "idle",                                 //nothings moving
  connected: true,                               //not connected
  pairing: Cfg.get('wifi.ap.enable'),             //only pairing if wifi ap is enabled
  maintenance:  Cfg.get('mode.maintenance'),      //maintenance mode
  jot : Cfg.get('state.jot'),                     //whats the jotId on the board at the moment
  deviceId: Cfg.get('deviceId'),                  //debug purposes
  progress: 0,                                    //progress
  settings: Cfg.get('gcode')  
};

//SAVE STATE
let saveState = function(key, value){

  if(currentState.shadowConnected){
    currentState[key] = value;
    Shadow.update(0, currentState);
  }else{
    currentState[key] = value;
  }
  if(key === "pairing"){ 
    Cfg.set({"mode.pairing" : value}); 
  }
  if(key === "status"){ 
    Cfg.set({"state.status" : value}); 
  }
  if(key === "maintenance"){ 
    Cfg.set({"mode.maintenance" : value}); 
  }
  if(key === "connected"){ 
    connected = value; 
  }
  updateLED();
};

//SET MODE
let setMode = function(mode){

  if(demo === true){
    demo = false;
    playlistCount = 0;
    Timer.del(playlistTimer);
  }

  if(mode === "maintenance"){
    maintenanceMode(!currentState.maintenance);
    // updateLED();
  }
  if(mode === "pairing"){
    pairingMode(!currentState.pairing);
    //updateLED();
  }
  if(mode === "reset" ){
    localFileSend("reset");
    // updateLED();
  }
  if(mode === "demo"){
    demo = true;
    playlistTimer = Timer.set(delay, 0, function() {
      playlist();
    }, null);
    // updateLED();
  }
  if(mode === "startup"){
    localFileSend("startup");
    // updateLED();
  }
  // if(mode === "restart"){
  //   restartDevice(500);
  // }
};

let restartDevice = function(time, format){
  Cfg.set({'fstab.fs0.created': !format});
  ledBlink(50);
  Timer.set(time, 0, function(){
    resetSystem();
    }, null);
};

//MAINTENANCE MODE
let maintenanceMode  = function(mode){
    saveState("maintenance", mode);
    if(mode){
      log_std_out("MAINTENANCE - Enter");
      localFileSend("maintenance");
    }else{
      log_std_out("MAINTENANCE - Leaving");
      localFileSend("reset");
    }
};

//PAIRING MODE
let pairingMode = function(mode) {
    saveState("pairing", mode);
    if(mode){
      log_std_out("PAIR - AP");
    }else{
      log_std_out("PAIR - WiFi");
    }
    Cfg.set({"wifi.ap.enable" : mode});
    Cfg.set({"wifi.sta.enable" : !mode});
    restartDevice(2000, false);
};

let startup = function() {
  if(!checkCerts()){
    error = true;
    updateLED();
  }
  if(lastState !== "idle"){
    setMode("reset");
  }else{
    setMode("startup");
  } 
};


/////////////////////////////////////
// Pair Device
/////////////////////////////////////
let pairDevice = function() {

  userId = Cfg.get('userId.id');
  if (userId !== ""){ 
    log_std_out("PAIR - User Id " + userId);
    let topic = 'things/' + Cfg.get('device.id') + '/pair';
    let message = JSON.stringify({
      deviceId: Cfg.get('device.id'),
      userId: userId
    });
    let ok = MQTT.pub(topic, message, 1);
    userId = "";
    log_std_out("PAIRED");
    Cfg.set({"userId.id" : ""});
    userId = "";
    pairingFlag = false;

  }
};


///////////////////////////////////
//EVENT HANDLERS
///////////////////////////////////
let Serial = Event.baseNumber('SER');

let SERIAL_RECIEVED = Serial+1;
let SERIAL_FETCHING = Serial+2;
let SERIAL_SENDING = Serial+3;
let SERIAL_DOWNLOADING = Serial+4;
let SERIAL_DRAWING = Serial+5;
let SERIAL_PROGRESS = Serial+6;
let SERIAL_ERROR = Serial+7;
let SERIAL_STATUS = Serial+8;
let SERIAL_IDLE = Serial+9;
let SERIAL_ERASIN = Serial+10;

Event.addGroupHandler(Serial, function(ev, evdata, arg) {
  if (ev === SERIAL_IDLE) {
    if(demo){
      playlist();
    }
  }
}, null);


Event.on(Event.CLOUD_CONNECTED, function() {
    log_std_out("SHADOW - shadow connected");
    saveState('shadowConnected', true);
    if(!pairingFlag){
      pairingFlag = true;
      Timer.set(1000, 0,  pairDevice, null);
    }
    connected = true;
    currentState.connected = true;
    currentState.fw_id = fw_id;
    currentState.fw_version = fw_version;
    Shadow.update(0, currentState);
  });

Event.addGroupHandler(Net.EVENT_GRP, function(ev, evdata, arg) {
  if (ev === Net.STATUS_DISCONNECTED) {
    log_std_out('NET - event disconnected');
    connected = false;
  } else if (ev === Net.STATUS_GOT_IP || ev === Net.STATUS_CONNECTED) {
    log_std_out('NET - event connected');
    connected = true;
  }
  updateLED();
}, null);


//BUTTON EVENT
let Button = Event.baseNumber('BUT');
let BUTTON_CLICK = Button+1;
let BUTTON_DBL_CLICK = Button+2;
let BUTTON_TPL_CLICK = Button+3;
let BUTTON_LONG = Button+4;
let BUTTON_HELD = Button+5;

Event.addGroupHandler(Button, function(ev, evdata, arg) {
  if(mcuConnection){
    if (ev === BUTTON_CLICK) {  
      log_std_out('Button - click');
      restartDevice(500, false);
    }else if (ev === BUTTON_DBL_CLICK) {  
      log_std_out('Button - double');
      setMode("maintenance");
    }else if(ev === BUTTON_TPL_CLICK){
      log_std_out('Button - triple');
      setMode("demo");
    }else if(ev === BUTTON_LONG){
      log_std_out('Button - long');
      setMode("pairing");
    }else if(ev === BUTTON_HELD){
      log_std_out('Button - held');
      restartDevice(500, true);
    }
  }
}, null);

//HEARTBEAT EVENT
let Heartbeat = Event.baseNumber('HRT');
let MCU_CONNECTED = Heartbeat+1;
let MCU_DISCONNECTED = Heartbeat+2;

Event.addGroupHandler(Heartbeat, function(ev, evdata, ud) {
  if (ev === MCU_CONNECTED) {
    mcuConnection = true;
    log_std_out("MCU connected");
    startup();
  }else if(ev === MCU_DISCONNECTED){
    mcuCount++;
    if(mcuCount > 1){
      log_std_err("MCU disconnected");
    }
    mcuConnection = false;
  }
}, null);

//MQTT LOGS
let Logs = Event.baseNumber('LOG');
let LOG_STD_OUT = Logs+1;
let LOG_STD_ERR = Logs+2;

let eventGetString = ffi('char* eventGetString(void*)');

Event.addGroupHandler(Logs, function(ev, evdata, ud) {
    let logString = eventGetString(evdata);
    if (ev === LOG_STD_OUT) {
      log_std_out(logString)
    }else if(ev === LOG_STD_ERR){
      log_std_err(logString)
    }
}, null);


//LOCAL FILE SEND
let localFileSend = function(mode){
  
  let filename = mode;
  
  if(localFiles[mode]){
    filename = localFiles[mode];
  }

  RPC.call(RPC.LOCAL, 'SAM3XDL', {file: filename}, function (resp, ud) {
    log_std_out('LOCAL - SAM3XDL call complete');
  }, null);
};

let RPCCancel = function(){
  log_std_out('RPC - Cancel request');
  restartDevice(500, false);
};

let RPCMaintenance = function(){
  log_std_out('RPC - Maintenance request');
  setMode("maintenance");
};

RPC.addHandler("Cancel", function(args) {RPCCancel()}, null);
RPC.addHandler("Care", function(args) {RPCMaintenance()}, null);
RPC.addHandler("Ping", function(args) {
  if (typeof(args) === 'object'){
    ping(args);
    return null;
  } else {
    return {error: -1, message: 'Bad request. Expected ping object'};
  }
}, null);


RPC.addHandler('Gcode', function(args) {
  if (typeof(args) === 'object' && typeof(args.gcode) === 'string') {
    UART.write(
      uartNo,
      args.gcode + '\r\n'
    );
  } else {
    return {error: -1, message: 'Bad request. Expected: {"gcode":N1 }'};
  }
});

updateLED();
