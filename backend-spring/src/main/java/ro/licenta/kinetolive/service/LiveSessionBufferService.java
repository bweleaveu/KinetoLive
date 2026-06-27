// Service pentru pastrarea temporara a esantioanelor live primite prin WebSocket
package ro.licenta.kinetolive.service;

import org.springframework.stereotype.Service;
import ro.licenta.kinetolive.dto.SensorSampleMessage;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LiveSessionBufferService {

    private final Map<Long, List<SensorSampleMessage>> sessionSamples = new ConcurrentHashMap<>();

    public int addSample(SensorSampleMessage sample) {
        if (sample.sessionId() == null) {
            throw new IllegalArgumentException("Session id is required.");
        }

        List<SensorSampleMessage> samples = sessionSamples.computeIfAbsent(
                sample.sessionId(),
                key -> Collections.synchronizedList(new ArrayList<>())
        );

        samples.add(sample);

        return samples.size();
    }

    public List<SensorSampleMessage> getSamples(Long sessionId) {
        List<SensorSampleMessage> samples = sessionSamples.get(sessionId);

        if (samples == null) {
            return List.of();
        }

        synchronized (samples) {
            return new ArrayList<>(samples);
        }
    }

    public int getSampleCount(Long sessionId) {
        List<SensorSampleMessage> samples = sessionSamples.get(sessionId);

        if (samples == null) {
            return 0;
        }

        return samples.size();
    }

    public boolean hasSession(Long sessionId) {
        return sessionSamples.containsKey(sessionId);
    }

    public void clearSession(Long sessionId) {
        sessionSamples.remove(sessionId);
    }

    public void clearAllSessions() {
        sessionSamples.clear();
    }
}