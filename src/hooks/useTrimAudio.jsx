// useTrimAudio hook: Trim audio from a specified URL based on start and end points
const useTrimAudio = async (url, start, end) => {

    // Create an AudioContext instance
    const audioContext = new AudioContext();

    // Fetch audio data from the provided URL
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Calculate start and end samples based on time points and audio sample rate
    const startSample = Math.floor(start * audioBuffer.sampleRate);
    const endSample = Math.floor(end * audioBuffer.sampleRate);
    const frameCount = endSample - startSample;

    // Create a new AudioBuffer for the trimmed audio
    const trimmedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        frameCount,
        audioBuffer.sampleRate
    );

    // Copy trimmed audio data to the new buffer for each channel
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        const channelData = audioBuffer.getChannelData(i);
        trimmedBuffer.copyToChannel(channelData.subarray(startSample, endSample), i);
    }

    return trimmedBuffer;
};

export default useTrimAudio