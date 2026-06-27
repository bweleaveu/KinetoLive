// DTO pentru rezultatul analizei live si salvarea in baza de date
package ro.licenta.kinetolive.dto;

public record LiveSessionAnalysisResultDto(
        Long sessionId,
        boolean savedToDatabase,
        String message,
        MlAnalysisResponseDto mlResult,
        TherapySessionResponseDto savedSession
) {
}