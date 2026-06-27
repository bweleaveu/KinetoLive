# Retrimite un fisier BNO055 .txt catre backend-ul Spring Boot prin WebSocket
import argparse
import json
import time
from pathlib import Path

import websocket


COLUMN_NAMES = [
    "acc_x",
    "acc_y",
    "acc_z",
    "gyr_x",
    "gyr_y",
    "gyr_z",
    "mag_x",
    "mag_y",
    "mag_z",
    "quat_w",
    "quat_x",
    "quat_y",
    "quat_z",
    "cal_sys",
    "cal_acc",
    "cal_gyr",
    "cal_mag",
]


def parse_sensor_line(line):
    # Transforma o linie din fisier in lista de valori numerice
    parts = line.strip().split(";")

    if len(parts) != 17:
        return None

    try:
        return [float(value) for value in parts]
    except ValueError:
        return None


def is_zero_sample(values):
    # Verifica daca linia este complet zero
    return all(value == 0 for value in values)


def build_payload(values, session_id, sample_index):
    # Construieste payload-ul asteptat de backend-ul KinetoLive
    return {
        "sessionId": session_id,
        "sampleIndex": sample_index,
        "accX": values[0],
        "accY": values[1],
        "accZ": values[2],
        "gyrX": values[3],
        "gyrY": values[4],
        "gyrZ": values[5],
        "magX": values[6],
        "magY": values[7],
        "magZ": values[8],
        "quatW": values[9],
        "quatX": values[10],
        "quatY": values[11],
        "quatZ": values[12],
        "calSys": int(values[13]),
        "calAcc": int(values[14]),
        "calGyr": int(values[15]),
        "calMag": int(values[16]),
    }


def main():
    # Citeste argumentele din linia de comanda
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", required=True, help="Fisierul .txt inregistrat")
    parser.add_argument("--session-id", type=int, required=True, help="ID-ul sesiunii din backend")
    parser.add_argument("--ws", default="ws://localhost:8080/ws/sensor", help="URL WebSocket backend")
    parser.add_argument("--hz", type=float, default=25.0, help="Frecventa de trimitere")
    parser.add_argument("--skip-zero", action="store_true", help="Sare peste liniile complet zero")
    args = parser.parse_args()

    input_file = Path(args.file)

    if not input_file.exists():
        raise FileNotFoundError(f"Fisierul nu exista: {input_file}")

    delay_seconds = 1.0 / args.hz

    print(f"Conectare la WebSocket: {args.ws}")
    ws = websocket.create_connection(args.ws)

    sent_count = 0
    ignored_count = 0

    try:
        with input_file.open("r", encoding="utf-8") as file:
            header = file.readline().strip()

            if header != ";".join(COLUMN_NAMES):
                print("Atentie: header-ul fisierului nu este identic cu formatul asteptat.")

            for line in file:
                values = parse_sensor_line(line)

                if values is None:
                    ignored_count += 1
                    continue

                if args.skip_zero and is_zero_sample(values):
                    ignored_count += 1
                    continue

                payload = build_payload(values, args.session_id, sent_count)

                ws.send(json.dumps(payload))
                sent_count += 1

                print(f"Trimis sample {sent_count}", end="\r")

                time.sleep(delay_seconds)

    finally:
        ws.close()

    print()
    print("Replay terminat.")
    print(f"Sample-uri trimise: {sent_count}")
    print(f"Linii ignorate: {ignored_count}")


if __name__ == "__main__":
    main()