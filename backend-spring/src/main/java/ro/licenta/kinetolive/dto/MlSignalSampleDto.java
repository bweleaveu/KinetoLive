// DTO pentru un esantion folosit de modelul ML
package ro.licenta.kinetolive.dto;

public record MlSignalSampleDto(
        Integer sampleIndex,
        Double accX,
        Double accY,
        Double accZ,
        Double gyrX,
        Double gyrY,
        Double gyrZ
) {
}