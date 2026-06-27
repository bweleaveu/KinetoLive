# Inregistreaza date reale BNO055 din ESP32 intr-un fisier .txt
import argparse
import time
from pathlib import Path

import serial


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


def is_sensor_line(line: str) -> bool:
    # Verifica daca linia are exact cele 17 valori asteptate
    parts = line.strip().split(";")

    if len(parts) != 17:
        return False

    try:
        for value in parts:
            float(value)
        return True
    except ValueError:
        return False


def main():
    # Citeste argumentele din linia de comanda
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", required=True, help="Portul ESP32, de exemplu COM5")
    parser.add_argument("--seconds", type=int, default=60, help="Durata inregistrarii")
    parser.add_argument("--output", default="recordings", help="Folderul de iesire")
    parser.add_argument("--exercise", default="e6", help="Cod exercitiu: e6, e7 sau e8")
    parser.add_argument("--subject", default="real_test", help="Nume subiect/test")
    parser.add_argument("--no-header", action="store_true", help="Nu scrie header in fisier")
    args = parser.parse_args()

    output_folder = Path(args.output)
    output_folder.mkdir(parents=True, exist_ok=True)

    timestamp = time.strftime("%Y%m%d_%H%M%S")
    output_file = output_folder / f"{args.subject}_{args.exercise}_{timestamp}.txt"

    print(f"Conectare la {args.port}...")
    print("Asigura-te ca Serial Monitor este inchis.")

    valid_lines = 0
    ignored_lines = 0

    with serial.Serial(args.port, 115200, timeout=1) as ser:
        time.sleep(2)

        print(f"Inregistrare pornita pentru {args.seconds} secunde.")
        print("Executa exercitiul acum.")
        print(f"Fisier: {output_file}")

        start_time = time.time()

        with output_file.open("w", encoding="utf-8") as file:
            if not args.no_header:
                file.write(";".join(COLUMN_NAMES) + "\n")

            while time.time() - start_time < args.seconds:
                raw_line = ser.readline().decode("utf-8", errors="ignore").strip()

                if not raw_line:
                    continue

                if is_sensor_line(raw_line):
                    file.write(raw_line + "\n")
                    valid_lines += 1
                else:
                    ignored_lines += 1

        print("Inregistrare terminata.")
        print(f"Linii valide salvate: {valid_lines}")
        print(f"Linii ignorate: {ignored_lines}")
        print(f"Fisier salvat: {output_file}")


if __name__ == "__main__":
    main()