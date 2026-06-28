// ESP32 + BNO055 trimite date live prin WiFi WebSocket catre KinetoLive
#include <WiFi.h>
#include <Wire.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <WebSocketsClient.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BNO055.h>
#include <HTTPClient.h>

const char* WIFI_SSID = "NUMELE_RETELEI_TALE";
const char* WIFI_PASSWORD = "PAROLA_RETELEI_TALE";

// IP-ul laptopului pe care ruleaza Spring Boot, nu localhost
const char* BACKEND_HOST = "192.168.1.34";
const uint16_t BACKEND_PORT = 8080;
const char* BACKEND_PATH = "/ws/sensor";

const int I2C_SDA = 21;
const int I2C_SCL = 22;

const unsigned long SAMPLE_INTERVAL_MS = 40;
const unsigned long CONTROL_CHECK_INTERVAL_MS = 1000;

Adafruit_BNO055 bno = Adafruit_BNO055(55, 0x28);
WebSocketsClient webSocket;
Preferences preferences;

int sessionId = 0;
int sampleIndex = 0;

bool websocketConnected = false;
bool streamingEnabled = false;

unsigned long lastSampleTime = 0;
unsigned long lastControlCheckTime = 0;

bool hasSavedCalibration() {
  return preferences.getBytesLength("offsets") == sizeof(adafruit_bno055_offsets_t);
}

void readCalibrationLevels(uint8_t& calSys, uint8_t& calAcc, uint8_t& calGyr, uint8_t& calMag) {
  uint8_t calGyrRaw = 0;
  uint8_t calAccRaw = 0;
  uint8_t calMagRaw = 0;
  uint8_t calSysRaw = 0;

  bno.getCalibration(&calSysRaw, &calGyrRaw, &calAccRaw, &calMagRaw);

  calSys = calSysRaw;
  calAcc = calAccRaw;
  calGyr = calGyrRaw;
  calMag = calMagRaw;
}

bool loadCalibration() {
  // Incarca profilul de calibrare BNO055 din memoria nevolatila
  adafruit_bno055_offsets_t calibrationData;

  size_t savedSize = preferences.getBytesLength("offsets");

  if (savedSize != sizeof(calibrationData)) {
    Serial.println("CALIBRATION;NO_SAVED_PROFILE");
    return false;
  }

  preferences.getBytes("offsets", &calibrationData, sizeof(calibrationData));
  bno.setSensorOffsets(calibrationData);

  Serial.println("CALIBRATION;SAVED_PROFILE_LOADED");
  return true;
}

bool saveCalibrationInternal(String& message) {
  uint8_t calSys = 0;
  uint8_t calAcc = 0;
  uint8_t calGyr = 0;
  uint8_t calMag = 0;

  readCalibrationLevels(calSys, calAcc, calGyr, calMag);

  if (!bno.isFullyCalibrated()) {
    message = String("NOT_FULLY_CALIBRATED;") + calSys + ";" + calAcc + ";" + calGyr + ";" + calMag;
    return false;
  }

  adafruit_bno055_offsets_t calibrationData;
  bno.getSensorOffsets(calibrationData);

  preferences.putBytes("offsets", &calibrationData, sizeof(calibrationData));

  message = "OK";
  return true;
}

bool clearCalibrationInternal(String& message) {
  preferences.remove("offsets");
  message = "OK";
  return true;
}

void printCalibrationStatus() {
  uint8_t calSys = 0;
  uint8_t calAcc = 0;
  uint8_t calGyr = 0;
  uint8_t calMag = 0;

  readCalibrationLevels(calSys, calAcc, calGyr, calMag);

  Serial.print("CAL;");
  Serial.print(calSys);
  Serial.print(";");
  Serial.print(calAcc);
  Serial.print(";");
  Serial.print(calGyr);
  Serial.print(";");
  Serial.print(calMag);
  Serial.print(";");
  Serial.println(hasSavedCalibration() ? 1 : 0);
}

void reportCalibrationStatus(long commandId, const String& command, bool success, const String& message) {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  uint8_t calSys = 0;
  uint8_t calAcc = 0;
  uint8_t calGyr = 0;
  uint8_t calMag = 0;

  readCalibrationLevels(calSys, calAcc, calGyr, calMag);

  StaticJsonDocument<512> doc;
  doc["calSys"] = calSys;
  doc["calAcc"] = calAcc;
  doc["calGyr"] = calGyr;
  doc["calMag"] = calMag;
  doc["calibrationSaved"] = hasSavedCalibration();
  doc["fullyCalibrated"] = bno.isFullyCalibrated();

  if (commandId > 0) {
    doc["commandId"] = commandId;
    doc["command"] = command;
    doc["success"] = success;
    doc["message"] = message;
  }

  String payload;
  serializeJson(doc, payload);

  HTTPClient http;
  String url = String("http://") + BACKEND_HOST + ":" + BACKEND_PORT + "/api/device-calibration/report";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(payload);

  Serial.print("CAL_REPORT;HTTP_CODE=");
  Serial.println(httpCode);

  http.end();
}

void executeCalibrationCommand(long commandId, const String& command) {
  bool success = false;
  String message = "UNKNOWN_COMMAND";

  if (command == "SAVE_CAL") {
    success = saveCalibrationInternal(message);
  } else if (command == "CLEAR_CAL") {
    success = clearCalibrationInternal(message);
  } else if (command == "USE_SAVED_CAL") {
    success = loadCalibration();
    message = success ? "OK" : "NO_SAVED_PROFILE";
  }

  Serial.print("CAL_COMMAND;");
  Serial.print(commandId);
  Serial.print(";");
  Serial.print(command);
  Serial.print(";");
  Serial.print(success ? "OK" : "ERROR");
  Serial.print(";");
  Serial.println(message);

  reportCalibrationStatus(commandId, command, success, message);
}

void testBackendHttp() {
  HTTPClient http;

  String url = String("http://") + BACKEND_HOST + ":" + BACKEND_PORT + "/api/health";

  Serial.print("Test HTTP backend: ");
  Serial.println(url);

  http.begin(url);

  int httpCode = http.GET();

  Serial.print("HTTP code: ");
  Serial.println(httpCode);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.print("HTTP response: ");
    Serial.println(response);
  }

  http.end();
}

void checkDeviceControlState() {
  HTTPClient http;

  String url = String("http://") + BACKEND_HOST + ":" + BACKEND_PORT + "/api/device-control/state";

  http.begin(url);

  int httpCode = http.GET();

  if (httpCode == 200) {
    String response = http.getString();

    StaticJsonDocument<768> doc;
    DeserializationError error = deserializeJson(doc, response);

    if (!error) {
      bool newStreamingEnabled = doc["streamingEnabled"] | false;
      int newSessionId = doc["sessionId"] | 0;
      long calibrationCommandId = doc["calibrationCommandId"] | 0;
      const char* calibrationCommandRaw = doc["calibrationCommand"] | "";
      String calibrationCommand = String(calibrationCommandRaw);

      if (newStreamingEnabled && (!streamingEnabled || newSessionId != sessionId)) {
        sampleIndex = 0;
      }

      streamingEnabled = newStreamingEnabled;
      sessionId = newSessionId;

      Serial.print("CONTROL;streaming=");
      Serial.print(streamingEnabled ? 1 : 0);
      Serial.print(";sessionId=");
      Serial.println(sessionId);

      if (calibrationCommandId > 0 && calibrationCommand.length() > 0) {
        executeCalibrationCommand(calibrationCommandId, calibrationCommand);
      } else {
        reportCalibrationStatus(0, "STATUS", true, "STATUS");
      }
    } else {
      Serial.println("CONTROL;ERROR;JSON_INVALID");
    }
  } else {
    Serial.print("CONTROL;ERROR;HTTP_CODE=");
    Serial.println(httpCode);
  }

  http.end();
}

void connectToWiFi() {
  Serial.print("Conectare WiFi la: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();
  Serial.println("WiFi conectat.");
  Serial.print("IP ESP32: ");
  Serial.println(WiFi.localIP());
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      websocketConnected = true;
      Serial.println("WebSocket conectat la Spring Boot.");
      break;

    case WStype_DISCONNECTED:
      websocketConnected = false;
      streamingEnabled = false;
      Serial.println("WebSocket deconectat. Streaming oprit.");
      break;

    case WStype_TEXT:
      Serial.print("Mesaj backend: ");
      Serial.println((char*)payload);
      break;

    case WStype_ERROR:
      websocketConnected = false;
      streamingEnabled = false;
      Serial.print("WebSocket eroare: ");
      if (payload && length > 0) {
        Serial.println((char*)payload);
      } else {
        Serial.println("fara mesaj");
      }
      break;

    default:
      Serial.print("Eveniment WebSocket: ");
      Serial.println(type);
      break;
  }
}

void connectToWebSocket() {
  webSocket.setExtraHeaders("Origin: http://localhost:5173");
  webSocket.begin(BACKEND_HOST, BACKEND_PORT, BACKEND_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  webSocket.enableHeartbeat(15000, 3000, 2);
}

bool isZeroSample(
  imu::Vector<3> acc,
  imu::Vector<3> gyr,
  imu::Vector<3> mag,
  imu::Quaternion quat
) {
  return acc.x() == 0.0 &&
         acc.y() == 0.0 &&
         acc.z() == 0.0 &&
         gyr.x() == 0.0 &&
         gyr.y() == 0.0 &&
         gyr.z() == 0.0 &&
         mag.x() == 0.0 &&
         mag.y() == 0.0 &&
         mag.z() == 0.0 &&
         quat.w() == 0.0 &&
         quat.x() == 0.0 &&
         quat.y() == 0.0 &&
         quat.z() == 0.0;
}

void sendSensorSample() {
  if (!websocketConnected || !streamingEnabled || sessionId <= 0) {
    return;
  }

  imu::Vector<3> acc = bno.getVector(Adafruit_BNO055::VECTOR_ACCELEROMETER);
  imu::Vector<3> gyr = bno.getVector(Adafruit_BNO055::VECTOR_GYROSCOPE);
  imu::Vector<3> mag = bno.getVector(Adafruit_BNO055::VECTOR_MAGNETOMETER);
  imu::Quaternion quat = bno.getQuat();

  if (isZeroSample(acc, gyr, mag, quat)) {
    return;
  }

  uint8_t calSys = 0;
  uint8_t calAcc = 0;
  uint8_t calGyr = 0;
  uint8_t calMag = 0;

  readCalibrationLevels(calSys, calAcc, calGyr, calMag);

  StaticJsonDocument<512> doc;

  doc["sessionId"] = sessionId;
  doc["sampleIndex"] = sampleIndex;

  doc["accX"] = acc.x();
  doc["accY"] = acc.y();
  doc["accZ"] = acc.z();

  doc["gyrX"] = gyr.x();
  doc["gyrY"] = gyr.y();
  doc["gyrZ"] = gyr.z();

  doc["magX"] = mag.x();
  doc["magY"] = mag.y();
  doc["magZ"] = mag.z();

  doc["quatW"] = quat.w();
  doc["quatX"] = quat.x();
  doc["quatY"] = quat.y();
  doc["quatZ"] = quat.z();

  doc["calSys"] = calSys;
  doc["calAcc"] = calAcc;
  doc["calGyr"] = calGyr;
  doc["calMag"] = calMag;

  char payload[512];
  size_t payloadLength = serializeJson(doc, payload);

  webSocket.sendTXT(payload, payloadLength);

  sampleIndex++;

  Serial.print("WS_SAMPLE_SENT;");
  Serial.print(sessionId);
  Serial.print(";");
  Serial.println(sampleIndex);
}

void saveCalibrationSerial() {
  String message;
  bool success = saveCalibrationInternal(message);

  if (success) {
    Serial.println("ACK;SAVE_CAL;OK");
  } else {
    Serial.print("ACK;SAVE_CAL;ERROR;");
    Serial.println(message);
  }
}

void clearCalibrationSerial() {
  String message;
  bool success = clearCalibrationInternal(message);

  if (success) {
    Serial.println("ACK;CLEAR_CAL;OK");
  } else {
    Serial.print("ACK;CLEAR_CAL;ERROR;");
    Serial.println(message);
  }
}

void handleSerialCommand(String command) {
  command.trim();

  if (command.length() == 0) {
    return;
  }

  if (command.startsWith("SET_SESSION")) {
    int spaceIndex = command.indexOf(" ");

    if (spaceIndex < 0) {
      Serial.println("ACK;SET_SESSION;ERROR;MISSING_ID");
      return;
    }

    sessionId = command.substring(spaceIndex + 1).toInt();
    sampleIndex = 0;

    Serial.print("ACK;SET_SESSION;OK;");
    Serial.println(sessionId);
    return;
  }

  if (command == "START") {
    if (sessionId <= 0) {
      Serial.println("ACK;START;ERROR;SESSION_ID_NOT_SET");
      return;
    }

    streamingEnabled = true;
    sampleIndex = 0;

    Serial.print("ACK;START;OK;");
    Serial.println(sessionId);
    return;
  }

  if (command == "STOP") {
    streamingEnabled = false;
    Serial.println("ACK;STOP;OK");
    return;
  }

  if (command == "GET_CAL") {
    printCalibrationStatus();
    return;
  }

  if (command == "SAVE_CAL") {
    saveCalibrationSerial();
    return;
  }

  if (command == "CLEAR_CAL") {
    clearCalibrationSerial();
    return;
  }

  if (command == "USE_SAVED_CAL") {
    bool success = loadCalibration();
    Serial.print("ACK;USE_SAVED_CAL;");
    Serial.println(success ? "OK" : "ERROR;NO_SAVED_PROFILE");
    return;
  }

  if (command == "STATUS") {
    Serial.print("STATUS;");
    Serial.print("wifi=");
    Serial.print(WiFi.status() == WL_CONNECTED ? 1 : 0);
    Serial.print(";ws=");
    Serial.print(websocketConnected ? 1 : 0);
    Serial.print(";streaming=");
    Serial.print(streamingEnabled ? 1 : 0);
    Serial.print(";sessionId=");
    Serial.print(sessionId);
    Serial.print(";sampleIndex=");
    Serial.println(sampleIndex);
    printCalibrationStatus();
    return;
  }

  if (command == "HELP") {
    Serial.println("Comenzi disponibile:");
    Serial.println("SET_SESSION 9");
    Serial.println("START");
    Serial.println("STOP");
    Serial.println("GET_CAL");
    Serial.println("SAVE_CAL");
    Serial.println("CLEAR_CAL");
    Serial.println("USE_SAVED_CAL");
    Serial.println("STATUS");
    return;
  }

  Serial.println("ACK;UNKNOWN_COMMAND");
}

void readSerialCommands() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    handleSerialCommand(command);
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Wire.begin(I2C_SDA, I2C_SCL);

  preferences.begin("bno055", false);

  if (!bno.begin()) {
    Serial.println("Eroare: BNO055 nu a fost detectat.");
    while (1) {
      delay(1000);
    }
  }

  delay(1000);

  bno.setExtCrystalUse(true);
  loadCalibration();

  connectToWiFi();
  testBackendHttp();
  connectToWebSocket();

  reportCalibrationStatus(0, "STATUS", true, "STARTUP");

  Serial.println("ESP32 pregatit pentru KinetoLive.");
  Serial.println("Trimite HELP pentru comenzi.");
}

void loop() {
  webSocket.loop();
  readSerialCommands();

  unsigned long now = millis();

  if (now - lastControlCheckTime >= CONTROL_CHECK_INTERVAL_MS) {
    lastControlCheckTime = now;
    checkDeviceControlState();
  }

  if (now - lastSampleTime >= SAMPLE_INTERVAL_MS) {
    lastSampleTime = now;
    sendSensorSample();
  }
}
