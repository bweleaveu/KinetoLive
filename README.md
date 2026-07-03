# KinetoLive

KinetoLive este o aplicație web pentru monitorizarea exercițiilor de recuperare medicală folosind un senzor BNO055 conectat la ESP32, un backend Spring Boot, un microserviciu Python pentru analiza ML și un frontend React.

Aplicația permite medicului să gestioneze pacienți, să pornească sesiuni live, să primească eșantioane de la senzor prin WebSocket, să ruleze analiza ML și să salveze rezultatele pe fiecare sesiune.

## Arhitectură

```text
ESP32 + BNO055
      |
      | WiFi + WebSocket
      v
Spring Boot Backend
      |
      | PostgreSQL
      v
Bază de date KinetoLive
      |
      | REST API
      v
React Frontend

Spring Boot Backend
      |
      | HTTP request
      v
FastAPI ML Service
      |
      | modele .joblib
      v
Detecție exercițiu + evaluare calitate
```

Componente principale:

```text
backend-spring      Backend Java Spring Boot
frontend-react      Interfață web React
ml-service-python   Microserviciu Python FastAPI pentru ML
models              Modelele .joblib antrenate
esp32-firmware      Codul pentru ESP32 + BNO055
```

## Funcționalități

- autentificare doctor;
- dashboard general;
- administrare pacienți;
- adăugare, editare și ștergere pacienți;
- calibrare BNO055;
- folosire profil de calibrare salvat în ESP32;
- sesiune live prin WebSocket;
- afișare semnale accelerometru și giroscop;
- analiză ML pentru exercițiile 6, 7 și 8;
- detecție automată a exercițiului;
- clasificare calitate: Normal, Rapid, Amplitudine mică;
- salvare rezultate pe sesiune;
- istoric sesiuni;
- ștergere sesiuni salvate;
- profil și setări doctor;
- interfață bilingvă RO/EN;
- mod luminos/întunecat.

## Cerințe software

Instalează înainte:

```text
Java 21
Node.js + npm
Python 3.10+
PostgreSQL
Arduino IDE
```

Pentru firmware ESP32 sunt necesare bibliotecile Arduino:

```text
Adafruit BNO055
Adafruit Unified Sensor
ArduinoJson
WebSocketsClient
WiFi
HTTPClient
Preferences
Wire
```

## Configurare bază de date PostgreSQL

Aplicația folosește implicit baza de date:

```text
Database: kinetolive_db
User:     kinetolive_user
Password: kinetolive_password
Port:     5432
```

Exemplu comenzi PostgreSQL:

```sql
CREATE DATABASE kinetolive_db;
CREATE USER kinetolive_user WITH PASSWORD 'kinetolive_password';
GRANT ALL PRIVILEGES ON DATABASE kinetolive_db TO kinetolive_user;
```

În PostgreSQL poate fi necesar să oferi drepturi și pe schema `public`:

```sql
\c kinetolive_db
GRANT ALL ON SCHEMA public TO kinetolive_user;
```

Configurația este în:

```text
backend-spring/src/main/resources/application.properties
```

## Pornire backend Spring Boot

Într-un terminal:

```powershell
cd backend-spring
.\mvnw.cmd clean spring-boot:run
```

Pe Linux/macOS:

```bash
cd backend-spring
./mvnw clean spring-boot:run
```

Backend-ul pornește pe:

```text
http://localhost:8080
```

Linkuri utile:

```text
Health:  http://localhost:8080/api/health
Swagger: http://localhost:8080/swagger-ui.html
OpenAPI: http://localhost:8080/v3/api-docs
```

## Pornire ML service FastAPI

Într-un terminal separat:

```powershell
cd ml-service-python
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Pe Linux/macOS:

```bash
cd ml-service-python
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

ML service pornește pe:

```text
http://localhost:8000
```

Linkuri utile:

```text
Health:  http://localhost:8000/api/ml/health
Swagger: http://localhost:8000/docs
OpenAPI: http://localhost:8000/openapi.json
```

Modelele trebuie să fie disponibile în folderul:

```text
models
```

## Pornire frontend React

Într-un terminal separat:

```powershell
cd frontend-react
npm install
npm run dev
```

Frontend-ul pornește pe:

```text
http://localhost:5173
```

Fișierul de configurare pentru frontend este:

```text
frontend-react/.env.development
```

Exemplu configurație locală:

```env
VITE_API_BASE=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws/sensor
```

## Cont de test

La prima pornire, backend-ul creează automat un doctor de test:

```text
Email:    doctor@kinetolive.test
Password: doctor123
```

## Configurare ESP32

În firmware trebuie configurate rețeaua WiFi și IP-ul laptopului pe care rulează backend-ul Spring Boot.

Exemplu:

```cpp
const char* WIFI_SSID = "numele_retelei";
const char* WIFI_PASSWORD = "parola_retelei";

const char* BACKEND_HOST = "192.168.x.x";
const uint16_t BACKEND_PORT = 8080;
const char* BACKEND_PATH = "/ws/sensor";
```

`BACKEND_HOST` trebuie să fie IP-ul local al laptopului, nu `localhost`.

Pe Windows poți afla IP-ul cu:

```powershell
ipconfig
```

Caută adresa IPv4 a plăcii WiFi.

## Flux demo recomandat

1. Pornește PostgreSQL.
2. Pornește backend-ul Spring Boot.
3. Pornește ML service-ul FastAPI.
4. Pornește frontend-ul React.
5. Încarcă firmware-ul pe ESP32.
6. Intră în aplicație la `http://localhost:5173`.
7. Autentifică-te cu doctorul de test.
8. Alege sau adaugă un pacient.
9. Mergi la `Calibrare` și verifică starea BNO055.
10. Mergi la `Sesiune live`.
11. Alege exercițiul sau `Detecție automată`.
12. Pornește sesiunea.
13. Execută exercițiul.
14. Oprește sesiunea.
15. Rulează `Analizează` sau `Analizează și salvează`.
16. Verifică rezultatul în `Sesiuni`.

## Exerciții și calitate

Aplicația lucrează cu exercițiile:

```text
Exercițiul 6
Exercițiul 7
Exercițiul 8
Detecție automată
```

Calitățile evaluate sunt:

```text
Normal
Rapid
Amplitudine mică
```

Semnalele folosite pentru modelele ML sunt axele accelerometrului și giroscopului:

```text
acc_x, acc_y, acc_z, gyr_x, gyr_y, gyr_z
```

## Observații pentru demo

- Calibrează senzorul înainte de test.
- Folosește aceeași poziționare a senzorului pentru toate testele.
- Pentru demo, salvează câteva sesiuni bune înainte de prezentare.
- Dacă ESP32 nu trimite date, verifică IP-ul din firmware și conexiunea WebSocket.
- Dacă analiza nu pornește, verifică dacă ML service-ul rulează pe portul 8000.

## Curățare înainte de GitHub sau predare

Nu urca în repository foldere generate local:

```text
frontend-react/node_modules
ml-service-python/.venv
backend-spring/target
.idea
.env.local
__pycache__
```

Păstrează în repository:

```text
backend-spring/src
backend-spring/pom.xml
backend-spring/mvnw
backend-spring/mvnw.cmd
frontend-react/src
frontend-react/package.json
frontend-react/package-lock.json
ml-service-python/app
ml-service-python/requirements.txt
models
esp32-firmware
README.md
```

## Structură proiect

```text
KinetoLive
├── backend-spring
├── frontend-react
├── ml-service-python
├── models
├── esp32-firmware
└── README.md
```
