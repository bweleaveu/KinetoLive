// DTO pentru un esantion primit live de la senzorul BNO055
package ro.licenta.kinetolive.dto;

public record SensorSampleMessage(
        Long sessionId,
        Integer sampleIndex,

        Double accX,
        Double accY,
        Double accZ,

        Double gyrX,
        Double gyrY,
        Double gyrZ,

        Double magX,
        Double magY,
        Double magZ,

        Double quatW,
        Double quatX,
        Double quatY,
        Double quatZ,

        Integer calSys,
        Integer calAcc,
        Integer calGyr,
        Integer calMag
) {
}