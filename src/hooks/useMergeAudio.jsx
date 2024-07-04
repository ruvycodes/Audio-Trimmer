// useMergeAudio hook: Merge audio files from provided URLs into a single audio Blob
import useEncode from "./useEncode"
const useMergeAudio = async (audioList) => {

    // Create an AudioContext instance
    const audioContext = new AudioContext();
    const decodedBuffers = [];

    // Decode each audio file from the provided list of URLs
    for (const audioUrl of audioList) {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        decodedBuffers.push(audioBuffer); // Store decoded audio buffers
    }

    // Calculate total length of merged audio buffer
    const totalLength = decodedBuffers.reduce((sum, buffer) => sum + buffer.length, 0);

    // Create a new AudioBuffer for the merged audio
    const mergedBuffer = audioContext.createBuffer(
        decodedBuffers[0].numberOfChannels,
        totalLength,
        decodedBuffers[0].sampleRate
    );

    let offset = 0; // Offset to track position in the merged buffer
    
    // Copy each decoded buffer's data to the merged buffer
    for (const buffer of decodedBuffers) {
        for (let channel = 0; channel < mergedBuffer.numberOfChannels; channel++) {
            mergedBuffer.copyToChannel(buffer.getChannelData(channel), channel, offset);
        }
        offset += buffer.length; // Update offset for next buffer
    }

    return useEncode(mergedBuffer); // Convert merged buffer to Blob
};

export default useMergeAudio