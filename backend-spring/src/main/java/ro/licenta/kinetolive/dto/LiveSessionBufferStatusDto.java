// DTO pentru statusul bufferului live al unei sesiuni
package ro.licenta.kinetolive.dto;

public record LiveSessionBufferStatusDto(
        Long sessionId,
        Integer sampleCount,
        boolean active
) {
}