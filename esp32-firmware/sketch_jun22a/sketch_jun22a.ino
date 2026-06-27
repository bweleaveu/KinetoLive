// ESP32 + BNO055 trimite date live prin WiFi WebSocket catre KinetoLive
#include <WiFi.h>
#include <Wire.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <WebSocketsClient.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BNO055.h>
#include <HTTPClient.h>

// const char* WIFI_SSID = "TP-LINK_AEC8";
// const char* WIFI_PASSWORD = "91220653";
const char* WIFI_SSID = "SM-G975W";
const char* WIFI_PASSWORD = "nuamnet.cluji";

// IP-ul laptopului pe care ruleaza Spring Boot, nu localhost
// const char* BACKEND_HOST = "192.168.0.103";
const char* BACKEND_HOST = "192.168.57.229";
const uint16_t BACKEND_PORT = 8080;
const char* BACKEND_PATH = "/ws/sensor";

const int I2C_SDA = 21;
const int I2C_SCL = 22;

const unsigned long SAMPLE_INTERVAL_MS = 40;

Adafruit_BNO055 bno = Adafruit_BNO055(55, 0x28);
WebSocketsClient webSocket;
Preferences preferences;

// Variabile pentru sesiunea live controlata din backend
int sessionId = 0;
int sampleIndex = 0;

bool websocketConnected = false;
bool streamingEnabled = false;

unsigned long lastSampleTime = 0;
unsigned long lastControlCheckTime = 0;

const unsigned long CONTROL_CHECK_INTERVAL_MS = 1000;

// Testeaza daca ESP32 poate accesa backend-ul Spring Boot prin HTTP
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

// Citeste din backend daca ESP32 trebuie sa transmita date si pe ce sesiune
void checkDeviceControlState() {
  HTTPClient http;

  String url = String("http://") + BACKEND_HOST + ":" + BACKEND_PORT + "/api/device-control/state";

  http.begin(url);

  int httpCode = http.GET();

  if (httpCode == 200) {
    String response = http.getString();

    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, response);

    if (!error) {
      bool newStreamingEnabled = doc["streamingEnabled"] | false;
      int newSessionId = doc["sessionId"] | 0;

      if (newStreamingEnabled && (!streamingEnabled || newSessionId != sessionId)) {
        sampleIndex = 0;
      }

      streamingEnabled = newStreamingEnabled;
      sessionId = newSessionId;

      Serial.print("CONTROL;streaming=");
      Serial.print(streamingEnabled ? 1 : 0);
      Serial.print(";sessionId=");
      Serial.println(sessionId);
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
  // Conectare ESP32 la reteaua WiFi
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

// Gestioneaza evenimentele WebSocket si afiseaza starea conexiunii
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

// Conectare WebSocket catre backend Spring Boot
void connectToWebSocket() {
  webSocket.setExtraHeaders("Origin: http://localhost:5173");
  webSocket.begin(BACKEND_HOST, BACKEND_PORT, BACKEND_PATH);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  webSocket.enableHeartbeat(15000, 3000, 2);
}

bool loadCalibration() {
  // Incarca profilul de calibrare BNO055 din memoria nevolatila
  adafruit_bno055_offsets_t calibrationData;

  size_t savedSize = preferences.getBytesLength("offsets");

  if (savedSize != sizeof(calibrationData)) {
    Serial.println("Nu exista calibrare salvata.");
    return false;
  }

  preferences.getBytes("offsets", &calibrationData, sizeof(calibrationData));
  bno.setSensorOffsets(calibrationData);

  Serial.println("Calibrare BNO055 incarcata din memoria ESP32.");
  return true;
}

void saveCalibration() {
  // Salveaza calibrarea BNO055 in memoria nevolatila
  uint8_t calSys = 0;
  uint8_t calGyr = 0;
  uint8_t calAcc = 0;
  uint8_t calMag = 0;

  bno.getCalibration(&calSys, &calGyr, &calAcc, &calMag);

  if (!bno.isFullyCalibrated()) {
    Serial.print("ACK;SAVE_CAL;ERROR;NOT_FULLY_CALIBRATED;");
    Serial.print(calSys);
    Serial.print(";");
    Serial.print(calAcc);
    Serial.print(";");
    Serial.print(calGyr);
    Serial.print(";");
    Serial.println(calMag);
    return;
  }

  adafruit_bno055_offsets_t calibrationData;
  bno.getSensorOffsets(calibrationData);

  preferences.putBytes("offsets", &calibrationData, sizeof(calibrationData));

  Serial.println("ACK;SAVE_CAL;OK");
}

void clearCalibration() {
  // Sterge calibrarea salvata
  preferences.remove("offsets");
  Serial.println("ACK;CLEAR_CAL;OK");
}

void printCalibrationStatus() {
  // Afiseaza statusul calibrarii
  uint8_t calSys = 0;
  uint8_t calGyr = 0;
  uint8_t calAcc = 0;
  uint8_t calMag = 0;

  bno.getCalibration(&calSys, &calGyr, &calAcc, &calMag);

  bool hasSavedCalibration = preferences.getBytesLength("offsets") == sizeof(adafruit_bno055_offsets_t);

  Serial.print("CAL;");
  Serial.print(calSys);
  Serial.print(";");
  Serial.print(calAcc);
  Serial.print(";");
  Serial.print(calGyr);
  Serial.print(";");
  Serial.print(calMag);
  Serial.print(";");
  Serial.println(hasSavedCalibration ? 1 : 0);
}

bool isZeroSample(
  imu::Vector<3> acc,
  imu::Vector<3> gyr,
  imu::Vector<3> mag,
  imu::Quaternion quat
) {
  // Evita trimiterea randurilor complet zero de la pornire
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
  // Citeste BNO055 si trimite sample-ul catre backend
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
  uint8_t calGyr = 0;
  uint8_t calAcc = 0;
  uint8_t calMag = 0;

  bno.getCalibration(&calSys, &calGyr, &calAcc, &calMag);

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

void handleSerialCommand(String command) {
  // Comenzi din Serial Monitor
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
    saveCalibration();
    return;
  }

  if (command == "CLEAR_CAL") {
    clearCalibration();
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
    Serial.println("STATUS");
    return;
  }

  Serial.println("ACK;UNKNOWN_COMMAND");
}

void readSerialCommands() {
  // Citeste comenzile trimise din Serial Monitor
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    handleSerialCommand(command);
  }
}

void setup() {
  // Pornire ESP32, BNO055, WiFi si WebSocket
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
  // Verifica daca backend-ul Spring Boot este accesibil din ESP32
  testBackendHttp();
  connectToWebSocket();

  Serial.println("ESP32 pregatit pentru KinetoLive.");
  Serial.println("Trimite HELP pentru comenzi.");
}

// Bucla principala pentru WebSocket, control backend si trimitere la 25 Hz
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