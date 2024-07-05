// this hook will vary the volume with respect to time according to envelope points

const useApplyEnvelopeToAudio = async (audioURL , envelopeRef) => {
    const audioBuffer = await fetch(audioURL).then((response) => response.arrayBuffer());
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createBufferSource();
    const audioData = await audioCtx.decodeAudioData(audioBuffer);
    const gainNode = audioCtx.createGain();

    source.buffer = audioData;
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const envelopePoints = envelopeRef.current.getPoints();
    const duration = audioData.duration;

    // Sort envelope points by time if not already sorted
    envelopePoints.sort((a, b) => a.time - b.time);

    // Apply envelope points with ramping for smoother transitions
    const initialGain = envelopePoints[0].volume || 0; // Initial gain
    gainNode.gain.setValueAtTime(initialGain, 0);

    for (let i = 0; i < envelopePoints.length - 1; i++) {
        const { time: startTime, volume: startVolume } = envelopePoints[i];
        const { time: endTime, volume: endVolume } = envelopePoints[i + 1];

        // Linear ramp from startVolume to endVolume
        gainNode.gain.linearRampToValueAtTime(startVolume, startTime);
        gainNode.gain.linearRampToValueAtTime(endVolume, endTime);
    }

    // Set the last volume point
    const lastPoint = envelopePoints[envelopePoints.length - 1];
    gainNode.gain.setValueAtTime(lastPoint.volume, lastPoint.time);

    source.start();
    return audioCtx;
};

export default useApplyEnvelopeToAudio