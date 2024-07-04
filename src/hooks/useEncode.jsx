// we are converting audio buffer to a wave blob , we can also use encoding libraries instead of this code if required

const useEncode = (audioBuffer) => {
    const numOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChannels * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);

    let offset = 0;

    // Helper function to write string data into the DataView buffer
    const writeString = (str) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
        offset += str.length;
    };

    // Write WAV header information into the DataView buffer :-

    // RIFF identifier
    writeString('RIFF');
    view.setUint32(offset, 36 + audioBuffer.length * numOfChannels * 2, true);
    offset += 4;

    // RIFF type
    writeString('WAVE');

    // Format chunk identifier
    writeString('fmt ');
    view.setUint32(offset, 16, true);
    offset += 4;

    // Format code
    view.setUint16(offset, 1, true);
    offset += 2;

    // Number of channels
    view.setUint16(offset, numOfChannels, true);
    offset += 2;

    // Sample rate
    view.setUint32(offset, audioBuffer.sampleRate, true);
    offset += 4;

    // Byte rate
    view.setUint32(offset, audioBuffer.sampleRate * numOfChannels * 2, true);
    offset += 4;

    // Block align
    view.setUint16(offset, numOfChannels * 2, true);
    offset += 2;

    // Bits per sample
    view.setUint16(offset, 16, true);
    offset += 2;

    // Data chunk identifier
    writeString('data');
    view.setUint32(offset, audioBuffer.length * numOfChannels * 2, true);
    offset += 4;

     // Write audio data into the DataView buffer
    for (let i = 0; i < audioBuffer.length; i++) {
        for (let channel = 0; channel < numOfChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
            offset += 2;
        }
    }

    return new Blob([buffer], { type: 'audio/wav' }); //return wave blob
};

export default useEncode