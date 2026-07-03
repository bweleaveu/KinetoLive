import matplotlib
# Această linie forțează deschiderea unei ferestre interactive separate
matplotlib.use('TkAgg')

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# 1. Încărcarea datelor
# Schimbă aici numele fișierului în funcție de ce vrei să vizualizezi
file_path = 'test.txt'

# Citim datele. Separatorul este punct și virgulă ';' conform fișierelor tale
df = pd.read_csv(file_path, sep=';')

# Extragem componentele accelerometrului
# Vom folosi accelerometrul pentru a trasa "brațul" senzorului în spațiul 3D
x_data = df['acc_x'].values
y_data = df['acc_y'].values
z_data = df['acc_z'].values

# 2. Setarea ferestrei 3D pentru animație
fig = plt.figure(figsize=(8, 8))
ax = fig.add_subplot(111, projection='3d')

# Setăm limitele graficului (gravitația e ~9.8, deci o limită de +/- 15 e perfectă)
ax.set_xlim([-15, 15])
ax.set_ylim([-15, 15])
ax.set_zlim([-15, 15])
ax.set_xlabel('Axă X')
ax.set_ylabel('Axă Y')
ax.set_zlabel('Axă Z')
ax.set_title('Vizualizare 3D Live a Mișcării (Accelerometru)')

# Punctul de origine (0,0,0) - de aici pleacă vectorul
# Creăm o linie care va fi actualizată la fiecare frame (vectorul roșu)
line, = ax.plot([0, x_data[0]], [0, y_data[0]], [0, z_data[0]], color='red', lw=4, marker='o')


# 3. Funcția care actualizează animația frame cu frame
def update(num):
    # Setăm noile coordonate pentru capătul liniei (mișcarea senzorului)
    line.set_data_3d([0, x_data[num]], [0, y_data[num]], [0, z_data[num]])

    # Opțional: Schimbă titlul cu frame-ul curent pentru a urmări evoluția
    ax.set_title(f'Execuție exercițiu - Frame / Index timp: {num}')
    return line,


# 4. Generarea animației
# interval = timpul (în milisecunde) dintre frame-uri (cu cât e mai mic, cu atât se mișcă mai repede)
ani = animation.FuncAnimation(fig, update, frames=len(df), interval=20, blit=False)

# Afișarea graficului interactiv
plt.show()