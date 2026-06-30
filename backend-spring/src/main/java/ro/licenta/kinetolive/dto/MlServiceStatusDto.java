// DTO pentru statusul microserviciului Python ML
package ro.licenta.kinetolive.dto;

public record MlServiceStatusDto(
        boolean online,
        String status,
        String service,
        Integer samplingFrequencyHz,
        Boolean modelsLoaded,
        Integer featureCount,
        String message
) {
}
